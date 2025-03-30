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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
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
        logger.info(f"Registered WebSocket callback for execution: {execution_id}")
    
    def unregister_ws_callback(self, execution_id: str):
        """Unregister a WebSocket callback."""
        if execution_id in self.ws_callbacks:
            del self.ws_callbacks[execution_id]
            logger.info(f"Unregistered WebSocket callback for execution: {execution_id}")
    
    async def broadcast_update(self, execution_id: str, data: Dict[str, Any]):
        """Broadcast an update to registered WebSocket clients."""
        callback = self.ws_callbacks.get(execution_id)
        if callback:
            try:
                await callback(data)
                logger.debug(f"Broadcast update for execution {execution_id}: {data.get('type')}")
            except Exception as e:
                logger.error(f"Error broadcasting update for {execution_id}: {str(e)}")
        else:
            logger.debug(f"No WebSocket callback registered for execution {execution_id}")
    
    async def create_execution(self, pipeline: Pipeline, initial_prompt: str = "") -> ExecutionContext:
        """Create a new execution context for a pipeline."""
        context = ExecutionContext(pipeline_id=pipeline.id)
        context.set_variable("initial_prompt", initial_prompt)
        self.active_contexts[context.execution_id] = context
        
        # Store the execution ID in the pipeline data for worker reference
        pipeline.execution_id = context.execution_id
        
        logger.info(f"Created execution context {context.execution_id} for pipeline {pipeline.id}")
        return context
    
    async def execute_state(self, state: State, context: ExecutionContext) -> Dict[str, Any]:
        """Execute a single state in the pipeline."""
        logger.info(f"[Execution:{context.execution_id}] Executing state '{state.name}' (ID: {state.id}, Type: {state.type})")
        
        # Try to update execution status in database if we're running in a worker
        try:
            from app.database import get_database
            db = await get_database()
            await db.executions.update_one(
                {"execution_id": context.execution_id},
                {"$set": {
                    "current_state_id": state.id,
                    "current_state_name": state.name
                }}
            )
            logger.debug(f"Updated execution status in database for {context.execution_id}")
        except Exception as e:
            logger.warning(f"Could not update execution status in database: {str(e)}")
        
        handler_class = get_handler_for_type(state.type)
        if not handler_class:
            error_msg = f"No handler registered for state type: {state.type}"
            logger.error(f"[Execution:{context.execution_id}] {error_msg}")
            raise ValueError(error_msg)
        
        context.current_state_id = state.id
        context.status = "running"
        
        # Broadcast execution started for this state
        await self.broadcast_update(context.execution_id, {
            "type": "state_started",
            "state_id": state.id,
            "state_name": state.name,
            "state_type": state.type,
            "status": "running",
            "execution_id": context.execution_id
        })
        
        handler = handler_class()
        
        try:
            outputs = await handler.execute(state, context)
            
            # Log the outputs (truncated for readability)
            log_outputs = {}
            for key, value in outputs.items():
                if isinstance(value, str) and len(value) > 100:
                    log_outputs[key] = value[:100] + "..."
                else:
                    log_outputs[key] = value
            
            logger.info(f"[Execution:{context.execution_id}] Completed state '{state.name}' with outputs: {log_outputs}")
            
            # Broadcast execution completed for this state
            await self.broadcast_update(context.execution_id, {
                "type": "state_completed",
                "state_id": state.id,
                "state_name": state.name,
                "outputs": outputs,
                "status": "completed",
                "execution_id": context.execution_id
            })
            
            return outputs
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[Execution:{context.execution_id}] Error in state '{state.name}': {error_msg}")
            
            # Broadcast execution error
            await self.broadcast_update(context.execution_id, {
                "type": "state_error",
                "state_id": state.id,
                "state_name": state.name,
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
        logger.info(f"[Execution:{context.execution_id}] Transition from '{source_state.name}' to '{target_state.name}'")
        
        # Find source output
        source_output = None
        for output in source_state.outputs:
            if output.id == transition.source_output_id:
                source_output = output
                break
        
        if not source_output:
            error_msg = f"Source output {transition.source_output_id} not found"
            logger.error(f"[Execution:{context.execution_id}] {error_msg}")
            raise ValueError(error_msg)
        
        # Find target input
        target_input = None
        for input_def in target_state.inputs:
            if input_def.id == transition.target_input_id:
                target_input = input_def
                break
        
        if not target_input:
            error_msg = f"Target input {transition.target_input_id} not found"
            logger.error(f"[Execution:{context.execution_id}] {error_msg}")
            raise ValueError(error_msg)
        
        # Get value from source output
        source_value = context.get_variable(f"{source_state.id}.{source_output.id}")
        
        # Log the value being passed (truncated for readability)
        log_value = source_value
        if isinstance(log_value, str) and len(log_value) > 100:
            log_value = log_value[:100] + "..."
        
        logger.info(f"[Execution:{context.execution_id}] Passing value from '{source_output.name}' to '{target_input.name}': {log_value}")
        
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
            "source_name": source_state.name,
            "target_id": target_state.id,
            "target_name": target_state.name,
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
        # Check if context already exists (in case of worker execution)
        execution_id = getattr(pipeline, 'execution_id', None)
        if execution_id and execution_id in self.active_contexts:
            context = self.active_contexts[execution_id]
            logger.info(f"[Execution:{execution_id}] Using existing execution context for pipeline '{pipeline.name}'")
        else:
            # Create execution context
            context = await self.create_execution(pipeline, initial_prompt)
            logger.info(f"[Execution:{context.execution_id}] Starting execution of pipeline '{pipeline.name}'")
            logger.info(f"[Execution:{context.execution_id}] Initial prompt: {initial_prompt[:50]}..." if len(initial_prompt) > 50 else initial_prompt)
        
        # Broadcast execution started
        await self.broadcast_update(context.execution_id, {
            "type": "execution_started",
            "execution_id": context.execution_id,
            "pipeline_id": pipeline.id,
            "pipeline_name": pipeline.name,
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
                error_msg = "No start state found in pipeline"
                logger.error(f"[Execution:{context.execution_id}] {error_msg}")
                raise ValueError(error_msg)
            
            # Start execution from the start state
            current_state = start_state
            
            while current_state:
                # Check if execution was paused or terminated
                if context.status in ["paused", "terminated"]:
                    logger.info(f"[Execution:{context.execution_id}] Execution {context.status} at state '{current_state.name}'")
                    break
                
                # Execute current state
                outputs = await self.execute_state(current_state, context)
                
                # Add a small delay to allow UI updates
                await asyncio.sleep(0.1)
                
                # Find outgoing transitions
                transitions = await self.find_outgoing_transitions(pipeline, current_state.id)
                
                if not transitions:
                    # No more transitions, we're done
                    logger.info(f"[Execution:{context.execution_id}] No outgoing transitions from '{current_state.name}', ending execution")
                    break
                
                # For now, just take the first transition
                # In future versions, we could implement conditional transitions
                next_transition = transitions[0]
                
                # Find target state
                next_state = await self.find_state_by_id(pipeline, next_transition.target_id)
                
                if not next_state:
                    error_msg = f"Target state {next_transition.target_id} not found"
                    logger.error(f"[Execution:{context.execution_id}] {error_msg}")
                    raise ValueError(error_msg)
                
                # Execute transition
                await self.execute_transition(next_transition, current_state, next_state, context)
                
                # Move to next state
                current_state = next_state
            
            # Mark execution as completed if not already marked
            if context.status not in ["paused", "terminated", "error"]:
                context.status = "completed"
                logger.info(f"[Execution:{context.execution_id}] Execution completed successfully")
            
            # Get final result
            final_result = context.get_variable("final_result", "No final result available")
            
            # Broadcast execution completed
            await self.broadcast_update(context.execution_id, {
                "type": "execution_completed",
                "execution_id": context.execution_id,
                "status": context.status,
                "final_result": final_result,
                "history": context.history,
                "variables": {k: (v if isinstance(v, (str, int, float, bool, type(None))) else str(v)) 
                               for k, v in context.variables.items()}
            })
            
            return context
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[Execution:{context.execution_id}] Error executing pipeline: {error_msg}")
            
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

    async def pause_execution(self, execution_id: str) -> bool:
        """Pause an execution in progress."""
        if execution_id in self.active_contexts:
            context = self.active_contexts[execution_id]
            context.status = "paused"
            logger.info(f"[Execution:{execution_id}] Execution paused")
            
            # Broadcast pause notification
            await self.broadcast_update(execution_id, {
                "type": "execution_paused",
                "execution_id": execution_id,
                "status": "paused"
            })
            
            return True
        return False

    async def resume_execution(self, execution_id: str) -> bool:
        """Resume a paused execution."""
        if execution_id in self.active_contexts:
            context = self.active_contexts[execution_id]
            if context.status == "paused":
                context.status = "running"
                logger.info(f"[Execution:{execution_id}] Execution resumed")
                
                # Broadcast resume notification
                await self.broadcast_update(execution_id, {
                    "type": "execution_resumed",
                    "execution_id": execution_id,
                    "status": "running"
                })
                
                return True
        return False

    async def terminate_execution(self, execution_id: str) -> bool:
        """Terminate an execution in progress."""
        if execution_id in self.active_contexts:
            context = self.active_contexts[execution_id]
            context.status = "terminated"
            logger.info(f"[Execution:{execution_id}] Execution terminated")
            
            # Broadcast termination notification
            await self.broadcast_update(execution_id, {
                "type": "execution_terminated",
                "execution_id": execution_id,
                "status": "terminated"
            })
            
            return True
        return False

# Create a singleton instance
_engine = None

def get_execution_engine() -> ExecutionEngine:
    """Get or create the execution engine singleton."""
    global _engine
    if _engine is None:
        _engine = ExecutionEngine()
    return _engine 