from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from bson import ObjectId

from app.database import connect_to_mongo, close_mongo_connection, Pipeline, get_database

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
