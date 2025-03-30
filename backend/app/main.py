from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from bson import ObjectId
import os
import json
from uuid import uuid4
from fastapi import BackgroundTasks
from arq.connections import RedisSettings

from app.database import (
    connect_to_mongo, 
    close_mongo_connection, 
    Pipeline, 
    State, 
    StateInput, 
    StateOutput,
    Transition,
    AnthropicConfig,
    get_database
)
from app.execution import get_execution_engine, ExecutionContext
from app.integrations.anthropic import get_anthropic_client
from arq import create_pool

app = FastAPI()

# Add CORS middleware to allow the frontend container to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handlers for database connection
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Websocket connections for real-time updates
active_connections: Dict[str, WebSocket] = {}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            # Echo the message back
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        if client_id in active_connections:
            del active_connections[client_id]

@app.websocket("/ws/execution/{execution_id}")
async def execution_websocket(websocket: WebSocket, execution_id: str):
    """WebSocket endpoint for real-time pipeline execution updates."""
    await websocket.accept()
    
    # Create a callback for broadcasting execution updates
    async def broadcast_callback(data: Dict[str, Any]):
        await websocket.send_json(data)
    
    # Register the callback with the execution engine
    engine = get_execution_engine()
    engine.register_ws_callback(execution_id, broadcast_callback)
    
    try:
        # Keep the connection open until the client disconnects
        while True:
            # Check for incoming messages (we don't need to process them, just keep the connection alive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Unregister the callback when the client disconnects
        engine.unregister_ws_callback(execution_id)
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {str(e)}")
        engine.unregister_ws_callback(execution_id)

# API routes for pipelines
@app.get("/api/pipelines", response_model=List[Pipeline])
async def get_pipelines(db=Depends(get_database)):
    cursor = db.pipelines.find()
    pipelines = await cursor.to_list(length=1000)
    # Convert ObjectId to string for id field
    for pipeline in pipelines:
        pipeline["id"] = str(pipeline.get("_id"))
    return pipelines

@app.get("/api/pipelines/{pipeline_id}", response_model=Pipeline)
async def get_pipeline(pipeline_id: str, db=Depends(get_database)):
    # Convert string id to ObjectId for MongoDB
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    pipeline = await db.pipelines.find_one({"_id": object_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
        
    pipeline["id"] = str(pipeline.get("_id"))
    return pipeline

@app.post("/api/pipelines", response_model=Pipeline)
async def create_pipeline(pipeline: Pipeline, db=Depends(get_database)):
    pipeline_dict = pipeline.model_dump(exclude={"id"})
    result = await db.pipelines.insert_one(pipeline_dict)
    created_pipeline = await db.pipelines.find_one({"_id": result.inserted_id})
    created_pipeline["id"] = str(created_pipeline.get("_id"))
    return created_pipeline

@app.put("/api/pipelines/{pipeline_id}", response_model=Pipeline)
async def update_pipeline(pipeline_id: str, pipeline: Pipeline, db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Exclude id from update
    pipeline_dict = pipeline.model_dump(exclude={"id"})
    
    # Update the pipeline
    result = await db.pipelines.update_one(
        {"_id": object_id}, 
        {"$set": pipeline_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Return the updated pipeline
    updated_pipeline = await db.pipelines.find_one({"_id": object_id})
    updated_pipeline["id"] = str(updated_pipeline.get("_id"))
    return updated_pipeline

# State management
@app.post("/api/pipelines/{pipeline_id}/states", response_model=State)
async def add_state(pipeline_id: str, state: State, db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Make sure pipeline exists
    pipeline = await db.pipelines.find_one({"_id": object_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # If state doesn't have an ID, generate one
    if not state.id:
        state.id = str(uuid4())
    
    # Get the appropriate handler for this state type
    from app.state_types import get_handler_for_type
    
    handler_class = get_handler_for_type(state.type)
    if not handler_class:
        raise HTTPException(status_code=400, detail=f"Unsupported state type: {state.type}")
    
    # Apply default inputs/outputs/config
    # But don't override any that were already provided
    if not state.inputs:
        state.inputs = handler_class.get_default_inputs(state.id)
    
    if not state.outputs:
        state.outputs = handler_class.get_default_outputs(state.id)
    
    if not state.config:
        state.config = handler_class.get_default_config()
    
    # Add state to pipeline
    result = await db.pipelines.update_one(
        {"_id": object_id}, 
        {"$push": {"states": state.model_dump()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to add state")
    
    return state

@app.put("/api/pipelines/{pipeline_id}/states/{state_id}", response_model=State)
async def update_state(pipeline_id: str, state_id: str, state: State, db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Ensure state ID matches path param
    if state.id != state_id:
        raise HTTPException(status_code=400, detail="State ID in body must match path parameter")
    
    # Update state in pipeline
    result = await db.pipelines.update_one(
        {"_id": object_id, "states.id": state_id}, 
        {"$set": {"states.$": state.model_dump()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pipeline or state not found")
    
    return state

@app.delete("/api/pipelines/{pipeline_id}/states/{state_id}")
async def delete_state(pipeline_id: str, state_id: str, db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Remove state from pipeline
    result = await db.pipelines.update_one(
        {"_id": object_id}, 
        {"$pull": {"states": {"id": state_id}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Also remove any transitions connected to this state
    await db.pipelines.update_one(
        {"_id": object_id}, 
        {"$pull": {"transitions": {"$or": [
            {"source_id": state_id},
            {"target_id": state_id}
        ]}}}
    )
    
    return {"message": f"State {state_id} deleted"}

# Transition management
@app.post("/api/pipelines/{pipeline_id}/transitions", response_model=Transition)
async def add_transition(pipeline_id: str, transition: Transition, db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Make sure pipeline exists
    pipeline = await db.pipelines.find_one({"_id": object_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # If transition doesn't have an ID, generate one
    if not transition.id:
        transition.id = str(uuid4())
    
    # Add transition to pipeline
    result = await db.pipelines.update_one(
        {"_id": object_id}, 
        {"$push": {"transitions": transition.model_dump()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to add transition")
    
    return transition

@app.delete("/api/pipelines/{pipeline_id}/transitions/{transition_id}")
async def delete_transition(pipeline_id: str, transition_id: str, db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Remove transition from pipeline
    result = await db.pipelines.update_one(
        {"_id": object_id}, 
        {"$pull": {"transitions": {"id": transition_id}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return {"message": f"Transition {transition_id} deleted"}

# Execution endpoints
@app.post("/api/pipelines/{pipeline_id}/execute")
async def execute_pipeline(pipeline_id: str, data: Dict[str, Any], db=Depends(get_database)):
    try:
        object_id = ObjectId(pipeline_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Get the pipeline
    pipeline_doc = await db.pipelines.find_one({"_id": object_id})
    if not pipeline_doc:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Convert id to string for serialization
    pipeline_doc["id"] = str(pipeline_doc.get("_id"))
    del pipeline_doc["_id"]  # Remove ObjectId which can't be serialized
    
    # Get the initial prompt from request data
    initial_prompt = data.get("initial_prompt", "")
    
    # Create execution context
    engine = get_execution_engine()
    context = await engine.create_execution(Pipeline(**pipeline_doc), initial_prompt)
    
    # Create Redis connection for enqueueing task
    redis = await create_pool(RedisSettings(host="redis"))
    
    # Enqueue the task
    job = await redis.enqueue_job(
        'execute_pipeline_task', 
        pipeline_id,
        pipeline_doc,
        initial_prompt
    )
    
    logger.info(f"Enqueued pipeline execution task with job ID: {job.job_id}")
    
    # Return execution ID immediately
    return {
        "execution_id": context.execution_id,
        "status": "initialized",
        "message": "Execution started. Connect to WebSocket for real-time updates."
    }

# Testing endpoints
@app.post("/api/test/anthropic")
async def test_anthropic(data: Dict[str, Any]):
    """Test the Anthropic API with a simple prompt."""
    try:
        prompt = data.get("prompt", "Say hello!")
        model = data.get("model", "claude-3-7-sonnet-20250219")
        
        client = get_anthropic_client()
        response = await client.generate_completion(
            prompt=prompt,
            model=model
        )
        
        return {
            "content": response.content,
            "model": response.model,
            "usage": response.usage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
