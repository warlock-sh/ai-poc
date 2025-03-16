# ai-poc
repository of proof of concept projects using llm's and agentic workflows

## A tool to build and manage agentic pipelines for different tasks using 3rd party api's like anthropic and openai

This tool hosts a simple web gui for viewing existing pipelines in a flow chart format. You can create, view, and update
pipelines through the UI. For each pipeline this application coordinates sending requests to different llm models and piping
the outputs of those models into other models (or the same model).

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

4. Access the API:
   - Main endpoint: http://localhost:8000
   - Items endpoint: http://localhost:8000/items/1
   - API documentation: http://localhost:8000/docs
