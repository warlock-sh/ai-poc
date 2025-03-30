# ai-poc
Repository for building autonomous agent systems with dynamic state management and extensible capabilities

## AGENTIC Platform
**A**utonomous **G**raph **E**xecution **N**etwork for **T**ask-oriented **I**ntelligent **C**oordination

This application enables the creation and management of AI agents through visual state graphs. Key features include:

- **Dynamic State Graph Definition**: Create and modify finite state machine workflows that define agent behavior
- **Multi-Agent Management**: Maintain a registry of agents with persistent storage for configurations and state histories
- **Real-Time Execution Visualization**: Monitor active agents with live progress tracking through their state graphs
- **Extensible Integration System**: Add new capabilities through modular plugins (APIs, LLMs, services)

### Core Concepts

1. **AGENTIC State Graphs**:
   - Visual workflows defining an agent's decision-making process
   - Nodes represent capabilities/actions (LLM queries, API calls, conditional logic)
   - Edges define transition rules between states
   - Supports parallel execution paths and nested graphs

2. **AGENTIC Instances**:
   - Individual runtime executions of State Graphs
   - Maintain conversation history and execution state
   - Stored in PostgreSQL database for persistence
   - Can be activated/deactivated while retaining memory

3. **AGENTIC Runtime**:
   - Web-based interface for initiating and monitoring agents
   - Visual highlighting of active nodes during execution
   - Chat interface for user<->agent interaction
   - Historical tracing of agent decisions and state transitions

### Key Features

**AGENTIC Graph Editor**
- Drag-and-drop interface for creating/modifying agent workflows
- Pre-built templates for common agent patterns
- Version control for agent configurations

**AGENTIC Orchestrator**
- Database-backed storage for agent definitions and instances
- Bulk operations for starting/stopping agent groups
- Performance metrics and analytics tracking

**AGENTIC Integration Hub**
- Modular architecture for adding new capabilities:
  - LLM Providers (Anthropic, OpenAI, etc.)
  - API Services (Google, AWS, custom)
  - Data Processing Modules
- Secure credential management for integrations
- Sandboxed execution environment for plugins

### Building and Running with Docker Compose

1. Start the application:
   ```
   docker-compose up
   ```

2. Run in detached mode (background):
   ```
   docker-compose up -d
   ```

3. Stop the application:
   ```
   docker-compose down
   ```

4. Access the application:
   - Frontend: http://localhost:5173
   - API Backend: http://localhost:8000
   - API documentation: http://localhost:8000/docs

