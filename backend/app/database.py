from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
import os
from bson import ObjectId

class StateInput(BaseModel):
    id: str
    name: str
    data_type: str
    description: Optional[str] = None

class StateOutput(BaseModel):
    id: str
    name: str
    data_type: str
    description: Optional[str] = None
    
class State(BaseModel):
    id: str
    type: str  # "start", "llm", "process", "end", etc.
    name: str
    description: Optional[str] = None
    position: Dict[str, float]  # {x: 100, y: 100}
    inputs: List[StateInput] = []
    outputs: List[StateOutput] = []
    config: Optional[Dict[str, Any]] = None  # Type-specific configuration

class Transition(BaseModel):
    id: str
    source_id: str
    target_id: str
    source_output_id: str
    target_input_id: str
    label: Optional[str] = None

class Pipeline(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    states: List[State] = []
    transitions: List[Transition] = []
    nodes: List[Dict[str, Any]] = []  # Legacy field for compatibility
    edges: List[Dict[str, Any]] = []  # Legacy field for compatibility
    execution_id: Optional[str] = None  # For tracking active executions
    
    # Add model config for Pydantic v2 compatibility
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class AnthropicConfig(BaseModel):
    model: str = "claude-3-7-sonnet-20250219" 
    temperature: float = 0.7
    max_tokens: int = 1000
    system_prompt: Optional[str] = None

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