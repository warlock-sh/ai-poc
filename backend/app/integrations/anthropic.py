"""
Anthropic LLM integration for the AGENTIC platform.
This module handles communication with Anthropic's Claude API.
"""

import os
import json
from typing import Dict, Any, List, Optional
import anthropic
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AnthropicResponse(BaseModel):
    content: str
    model: str
    usage: Dict[str, int]
    raw_response: Optional[Dict[str, Any]] = None
    
class AnthropicClient:
    """Client for interacting with Anthropic's Claude API."""
    
    def __init__(self):
        """Initialize the Anthropic client."""
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
    
    async def generate_completion(self, 
                          prompt: str, 
                          model: str = "claude-3-7-sonnet-20250219",
                          temperature: float = 0.7,
                          max_tokens: int = 1000,
                          system_prompt: Optional[str] = None) -> AnthropicResponse:
        """
        Generate a completion from Claude.
        
        Args:
            prompt: The user prompt to send to Claude
            model: Which Claude model to use
            temperature: Controls randomness (0-1)
            max_tokens: Maximum tokens in the response
            system_prompt: Optional system prompt to set context
            
        Returns:
            AnthropicResponse with the completion
        """
        messages = [{"role": "user", "content": prompt}]
        
        try:
            # Using the updated API
            message_params = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }
            
            # Only add system if it's provided
            if system_prompt:
                message_params["system"] = system_prompt
            
            # Use sync client since the async client isn't needed in this version
            response = self.client.messages.create(**message_params)
            
            # Extract the text content from the response
            content = response.content[0].text
            
            # Return structured response
            return AnthropicResponse(
                content=content,
                model=response.model,
                usage={
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens
                },
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else vars(response)
            )
            
        except Exception as e:
            # Handle API errors
            error_msg = f"Anthropic API error: {str(e)}"
            raise Exception(error_msg)

# Create a singleton instance
_client = None

def get_anthropic_client() -> AnthropicClient:
    """Get or create the Anthropic client singleton."""
    global _client
    if _client is None:
        _client = AnthropicClient()
    return _client 