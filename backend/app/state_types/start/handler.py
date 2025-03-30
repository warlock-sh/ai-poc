"""
Start StateHandler for the AGENTIC platform.
Handles execution of Start states, which initialize a state graph execution.
"""

from typing import Dict, Any, List, Optional
import logging

from app.database import State, StateInput, StateOutput
from app.state_types.base.handler import StateHandler
from app.state_types.base.context import ExecutionContext

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StartStateHandler(StateHandler):
    """Handler for start states."""
    
    async def execute(self, state: State, context: ExecutionContext) -> Dict[str, Any]:
        """Execute a start state."""
        logger.info(f"Executing start state: {state.name} ({state.id})")
        
        # Get input initial_prompt from context if available
        initial_prompt = context.get_variable("initial_prompt", "")
        
        outputs = {}
        for output_def in state.outputs:
            if output_def.name == "initial_prompt":
                variable_name = f"{state.id}.{output_def.id}"
                context.set_variable(variable_name, initial_prompt)
                outputs[output_def.id] = initial_prompt
        
        # Add to history
        context.add_history_entry(
            state_id=state.id,
            action="start",
            inputs={},
            outputs=outputs
        )
        
        return outputs
    
    @classmethod
    def get_default_inputs(cls, state_id: str) -> list:
        """Get default input definitions for Start state."""
        # Start states have no inputs
        return []
    
    @classmethod
    def get_default_outputs(cls, state_id: str) -> list:
        """Get default output definitions for Start state."""
        return [
            StateOutput(
                id=f"{state_id}-out-0",
                name="initial_prompt",
                data_type="string",
                description="The initial prompt to start the execution"
            )
        ]
    
    @classmethod
    def get_default_config(cls) -> Dict[str, Any]:
        """Get default configuration for Start state."""
        # Start states don't need special configuration
        return {} 