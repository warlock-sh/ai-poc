"""
Base state type package for the AGENTIC platform.
Contains base classes and interfaces for all state types.
"""

from app.state_types.base.handler import StateHandler
from app.state_types.base.context import ExecutionContext

__all__ = ["StateHandler", "ExecutionContext"] 