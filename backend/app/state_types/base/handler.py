"""
Base StateHandler interface for the AGENTIC platform.
All specific state type handlers should inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from app.database import State
from app.state_types.base.context import ExecutionContext

class StateHandler(ABC):
    """Abstract base class for handling different state types."""
    
    @abstractmethod
    async def execute(self, state: State, context: ExecutionContext) -> Dict[str, Any]:
        """
        Execute the state. Must be implemented by subclasses.
        
        Args:
            state: The state to execute
            context: The current execution context
            
        Returns:
            Dictionary of output values keyed by output ID
        """
        pass
    
    @classmethod
    @abstractmethod
    def get_default_inputs(cls, state_id: str) -> list:
        """
        Get default input definitions for this state type.
        
        Args:
            state_id: The ID of the state being created
            
        Returns:
            List of default input definitions
        """
        pass
    
    @classmethod
    @abstractmethod
    def get_default_outputs(cls, state_id: str) -> list:
        """
        Get default output definitions for this state type.
        
        Args:
            state_id: The ID of the state being created
            
        Returns:
            List of default output definitions
        """
        pass
    
    @classmethod
    @abstractmethod
    def get_default_config(cls) -> Dict[str, Any]:
        """
        Get default configuration for this state type.
        
        Returns:
            Dictionary of default configuration values
        """
        pass 