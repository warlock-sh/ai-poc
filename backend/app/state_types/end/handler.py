"""
End StateHandler for the AGENTIC platform.
Handles execution of End states, which terminate a state graph execution.
"""

from typing import Dict, Any, List, Optional
import logging

from app.database import State, StateInput, StateOutput
from app.state_types.base.handler import StateHandler
from app.state_types.base.context import ExecutionContext

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EndStateHandler(StateHandler):
    """Handler for end states."""
    
    async def execute(self, state: State, context: ExecutionContext) -> Dict[str, Any]:
        """Execute an end state."""
        logger.info(f"Executing end state: {state.name} ({state.id})")
        
        # Get the final output value from inputs
        final_output = None
        for input_def in state.inputs:
            if input_def.name == "final_output":
                final_output = context.get_variable(f"{state.id}.{input_def.id}")
                break
        
        # Add to history
        context.add_history_entry(
            state_id=state.id,
            action="end",
            inputs={"final_output": final_output},
            outputs={}
        )
        
        # Set the final result in the context
        context.set_variable("final_result", final_output)
        
        # Mark execution as completed
        context.status = "completed"
        
        return {}
    
    @classmethod
    def get_default_inputs(cls, state_id: str) -> list:
        """Get default input definitions for End state."""
        return [
            StateInput(
                id=f"{state_id}-in-0",
                name="final_output",
                data_type="string",
                description="The final output of the execution"
            )
        ]
    
    @classmethod
    def get_default_outputs(cls, state_id: str) -> list:
        """Get default output definitions for End state."""
        # End states have no outputs
        return []
    
    @classmethod
    def get_default_config(cls) -> Dict[str, Any]:
        """Get default configuration for End state."""
        # End states don't need special configuration
        return {} 