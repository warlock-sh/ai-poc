from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from bson import ObjectId

class Pipeline(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    
    # Add model config for Pydantic v2 compatibility
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

# Global variables for database connection
client = None
db = None

async def get_database():
    return db

async def connect_to_mongo():
    global client, db
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/pipeline_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_default_database()
    
async def close_mongo_connection():
    global client
    if client:
        client.close() 