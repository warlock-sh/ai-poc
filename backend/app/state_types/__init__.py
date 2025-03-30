"""
State type registry for the AGENTIC platform.
Provides a central registry for all state type handlers.
"""

from typing import Dict, Type, Optional

from app.state_types.base.handler import StateHandler
from app.state_types.llm.handler import LLMStateHandler
from app.state_types.start.handler import StartStateHandler
from app.state_types.end.handler import EndStateHandler

# Registry of state types and their handlers
STATE_HANDLERS: Dict[str, Type[StateHandler]] = {
    "start": StartStateHandler,
    "llm": LLMStateHandler,
    "end": EndStateHandler,
}

def get_handler_for_type(state_type: str) -> Optional[Type[StateHandler]]:
    """Get the handler class for a given state type."""
    return STATE_HANDLERS.get(state_type)

def register_handler(state_type: str, handler_class: Type[StateHandler]) -> None:
    """Register a new state handler."""
    STATE_HANDLERS[state_type] = handler_class

def get_all_state_types() -> Dict[str, Type[StateHandler]]:
    """Get all registered state types and their handlers."""
    return STATE_HANDLERS 