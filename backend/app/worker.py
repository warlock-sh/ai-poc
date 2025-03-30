"""
AGENTIC Worker module - Handles background execution of pipelines.
"""

from arq import create_pool
from arq.connections import RedisSettings
import asyncio
import logging
import os
from bson import ObjectId
from datetime import datetime

from app.execution import get_execution_engine
from app.database import Pipeline, connect_to_mongo, get_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

async def execute_pipeline_task(ctx, pipeline_id, pipeline_data, initial_prompt):
    """
    Task to execute a pipeline in the background.
    
    Args:
        ctx: The ARQ context
        pipeline_id: The ID of the pipeline to execute
        pipeline_data: The serialized pipeline data
        initial_prompt: The initial prompt to start the execution with
    """
    # Ensure DB connection (needed in worker context)
    await connect_to_mongo()
    db = await get_database()
    
    execution_id = pipeline_data.get("execution_id", "unknown")
    
    logger.info(f"[Worker] Starting execution of pipeline {pipeline_id} (execution: {execution_id})")
    logger.info(f"[Worker] Initial prompt: {initial_prompt[:50]}..." if len(initial_prompt) > 50 else initial_prompt)
    
    # Create a Pipeline object from the data
    pipeline = Pipeline(**pipeline_data)
    
    # Store execution start in database
    await db.executions.insert_one({
        "execution_id": execution_id,
        "pipeline_id": pipeline_id,
        "pipeline_name": pipeline.name,
        "status": "running",
        "started_at": datetime.now(),
        "initial_prompt": initial_prompt,
        "current_state_id": None,
        "current_state_name": None,
    })
    
    # Execute the pipeline
    engine = get_execution_engine()
    try:
        context = await engine.execute_pipeline(pipeline, initial_prompt)
        
        # Update execution status in database
        await db.executions.update_one(
            {"execution_id": execution_id},
            {"$set": {
                "status": context.status,
                "completed_at": datetime.now(),
                "final_result": context.get_variable("final_result", None),
            }}
        )
        
        logger.info(f"[Worker] Execution of pipeline {pipeline_id} completed with status: {context.status}")
        return {
            "execution_id": context.execution_id,
            "status": context.status,
            "pipeline_id": pipeline_id
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[Worker] Execution of pipeline {pipeline_id} failed: {error_msg}")
        
        # Update execution status in database
        await db.executions.update_one(
            {"execution_id": execution_id},
            {"$set": {
                "status": "error",
                "error": error_msg,
                "completed_at": datetime.now(),
            }}
        )
        
        # Try to notify clients about the error
        try:
            if execution_id in engine.active_contexts:
                context = engine.active_contexts[execution_id]
                context.status = "error"
                await engine.broadcast_update(execution_id, {
                    "type": "execution_error",
                    "execution_id": execution_id,
                    "status": "error",
                    "error": error_msg
                })
        except Exception as notify_error:
            logger.error(f"[Worker] Failed to send error notification: {str(notify_error)}")
        
        return {
            "execution_id": execution_id,
            "status": "error",
            "error": error_msg,
            "pipeline_id": pipeline_id
        }

async def startup(ctx):
    """Startup function for the worker."""
    logger.info("[Worker] Starting up AGENTIC worker...")
    # Ensure MongoDB connection
    await connect_to_mongo()
    logger.info("[Worker] Connected to MongoDB")

async def shutdown(ctx):
    """Shutdown function for the worker."""
    logger.info("[Worker] Shutting down AGENTIC worker...")

class WorkerSettings:
    """Settings for the ARQ worker."""
    redis_settings = RedisSettings(
        host=os.getenv("REDIS_HOST", "redis"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASSWORD", None)
    )
    functions = [execute_pipeline_task]
    on_startup = startup
    on_shutdown = shutdown
    job_timeout = 3600  # 1 hour timeout for jobs 