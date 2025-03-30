"""
AGENTIC Execution Engine - Handles runtime execution of state graphs.
"""

import json
from typing import Dict, Any, List, Optional, Callable
from uuid import uuid4
import logging
import asyncio

from app.database import Pipeline, State, Transition
from app.state_types.base.context import ExecutionContext
from app.state_types import get_handler_for_type

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExecutionEngine:
    """Manages the execution of an AGENTIC state graph."""
    
    def __init__(self):
        # Active execution contexts
        self.active_contexts = {}
        # WebSocket callbacks for broadcasting updates
        self.ws_callbacks = {}
    
    def register_ws_callback(self, execution_id: str, callback: Callable):
        """Register a WebSocket callback for an execution."""
        self.ws_callbacks[execution_id] = callback
    
    def unregister_ws_callback(self, execution_id: str):
        """Unregister a WebSocket callback."""
        if execution_id in self.ws_callbacks:
            del self.ws_callbacks[execution_id]
    
    async def broadcast_update(self, execution_id: str, data: Dict[str, Any]):
        """Broadcast an update to registered WebSocket clients."""
        callback = self.ws_callbacks.get(execution_id)
        if callback:
            try:
                await callback(data)
            except Exception as e:
                logger.error(f"Error broadcasting update: {str(e)}")
    
    async def create_execution(self, pipeline: Pipeline, initial_prompt: str = "") -> ExecutionContext:
        """Create a new execution context for a pipeline."""
        context = ExecutionContext(pipeline_id=pipeline.id)
        context.set_variable("initial_prompt", initial_prompt)
        self.active_contexts[context.execution_id] = context
        return context
    
    async def execute_state(self, state: State, context: ExecutionContext) -> Dict[str, Any]:
        """Execute a single state in the pipeline."""
        handler_class = get_handler_for_type(state.type)
        if not handler_class:
            raise ValueError(f"No handler registered for state type: {state.type}")
        
        context.current_state_id = state.id
        context.status = "running"
        
        # Broadcast execution started for this state
        await self.broadcast_update(context.execution_id, {
            "type": "state_started",
            "state_id": state.id,
            "status": "running",
            "execution_id": context.execution_id
        })
        
        handler = handler_class()
        
        try:
            outputs = await handler.execute(state, context)
            
            # Broadcast execution completed for this state
            await self.broadcast_update(context.execution_id, {
                "type": "state_completed",
                "state_id": state.id,
                "outputs": outputs,
                "status": "completed",
                "execution_id": context.execution_id
            })
            
            return outputs
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error executing state {state.id}: {error_msg}")
            
            # Broadcast execution error
            await self.broadcast_update(context.execution_id, {
                "type": "state_error",
                "state_id": state.id,
                "error": error_msg,
                "status": "error",
                "execution_id": context.execution_id
            })
            
            # Set context status to error
            context.status = "error"
            raise
    
    async def execute_transition(self, transition: Transition, source_state: State, 
                                target_state: State, context: ExecutionContext) -> None:
        """Execute a transition between states, mapping outputs to inputs."""
        # Find source output
        source_output = None
        for output in source_state.outputs:
            if output.id == transition.source_output_id:
                source_output = output
                break
        
        if not source_output:
            raise ValueError(f"Source output {transition.source_output_id} not found")
        
        # Find target input
        target_input = None
        for input_def in target_state.inputs:
            if input_def.id == transition.target_input_id:
                target_input = input_def
                break
        
        if not target_input:
            raise ValueError(f"Target input {transition.target_input_id} not found")
        
        # Get value from source output
        source_value = context.get_variable(f"{source_state.id}.{source_output.id}")
        
        # Set value to target input
        context.set_variable(f"{target_state.id}.{target_input.id}", source_value)
        
        # Add to history
        context.add_history_entry(
            state_id=f"{source_state.id}->{target_state.id}",
            action="transition",
            inputs={source_output.name: source_value if isinstance(source_value, str) else str(source_value)[:100]},
            outputs={target_input.name: source_value if isinstance(source_value, str) else str(source_value)[:100]}
        )
        
        # Broadcast transition executed
        await self.broadcast_update(context.execution_id, {
            "type": "transition_executed",
            "source_id": source_state.id,
            "target_id": target_state.id,
            "execution_id": context.execution_id
        })
    
    async def find_state_by_id(self, pipeline: Pipeline, state_id: str) -> Optional[State]:
        """Find a state in the pipeline by its ID."""
        for state in pipeline.states:
            if state.id == state_id:
                return state
        return None
    
    async def find_outgoing_transitions(self, pipeline: Pipeline, state_id: str) -> List[Transition]:
        """Find all transitions that start from the given state."""
        return [t for t in pipeline.transitions if t.source_id == state_id]
    
    async def execute_pipeline(self, pipeline: Pipeline, initial_prompt: str = "") -> ExecutionContext:
        """Execute an entire pipeline from start to finish."""
        # Create execution context
        context = await self.create_execution(pipeline, initial_prompt)
        
        # Broadcast execution started
        await self.broadcast_update(context.execution_id, {
            "type": "execution_started",
            "execution_id": context.execution_id,
            "pipeline_id": pipeline.id,
            "status": "initialized"
        })
        
        try:
            # Find start state
            start_state = None
            for state in pipeline.states:
                if state.type == "start":
                    start_state = state
                    break
            
            if not start_state:
                raise ValueError("No start state found in pipeline")
            
            # Start execution from the start state
            current_state = start_state
            
            while current_state:
                # Execute current state
                outputs = await self.execute_state(current_state, context)
                
                # Add a small delay to allow UI updates
                await asyncio.sleep(0.1)
                
                # Find outgoing transitions
                transitions = await self.find_outgoing_transitions(pipeline, current_state.id)
                
                if not transitions:
                    # No more transitions, we're done
                    break
                
                # For now, just take the first transition
                # In future versions, we could implement conditional transitions
                next_transition = transitions[0]
                
                # Find target state
                next_state = await self.find_state_by_id(pipeline, next_transition.target_id)
                
                if not next_state:
                    raise ValueError(f"Target state {next_transition.target_id} not found")
                
                # Execute transition
                await self.execute_transition(next_transition, current_state, next_state, context)
                
                # Move to next state
                current_state = next_state
            
            # Mark execution as completed if not already marked
            if context.status != "completed":
                context.status = "completed"
                
            # Get final result
            final_result = context.get_variable("final_result", "No final result available")
            
            # Broadcast execution completed
            await self.broadcast_update(context.execution_id, {
                "type": "execution_completed",
                "execution_id": context.execution_id,
                "status": "completed",
                "final_result": final_result,
                "history": context.history,
                "variables": {k: (v if isinstance(v, (str, int, float, bool, type(None))) else str(v)) 
                               for k, v in context.variables.items()}
            })
            
            return context
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error executing pipeline: {error_msg}")
            
            # Mark execution as error
            context.status = "error"
            
            # Broadcast execution error
            await self.broadcast_update(context.execution_id, {
                "type": "execution_error",
                "execution_id": context.execution_id,
                "status": "error",
                "error": error_msg
            })
            
            raise

# Create a singleton instance
_engine = None

def get_execution_engine() -> ExecutionEngine:
    """Get or create the execution engine singleton."""
    global _engine
    if _engine is None:
        _engine = ExecutionEngine()
    return _engine 