"""
ExecutionContext for the AGENTIC platform.
Holds the current execution state and variables for a running state graph.
"""

from typing import Dict, Any, List, Optional
from uuid import uuid4
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExecutionContext:
    """Holds the current execution state and variables for a running state graph."""
    
    def __init__(self, pipeline_id: str):
        self.pipeline_id = pipeline_id
        self.execution_id = str(uuid4())
        self.variables = {}  # Store all variables during execution
        self.current_state_id = None
        self.history = []  # Track execution history
        self.status = "initialized"  # initialized, running, completed, error
        
    def set_variable(self, name: str, value: Any):
        """Set a variable in the execution context."""
        logger.info(f"Setting variable {name} = {value[:100] if isinstance(value, str) else value}")
        self.variables[name] = value
        
    def get_variable(self, name: str, default=None) -> Any:
        """Get a variable from the execution context."""
        return self.variables.get(name, default)
    
    def add_history_entry(self, state_id: str, action: str, inputs: Dict[str, Any], outputs: Dict[str, Any]):
        """Add an entry to the execution history."""
        entry = {
            "timestamp": str(uuid4())[:8],  # Simple timestamp for now
            "state_id": state_id,
            "action": action,
            "inputs": inputs,
            "outputs": outputs
        }
        self.history.append(entry)
        return entry 