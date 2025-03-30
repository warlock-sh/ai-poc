FROM python:3.9-slim

WORKDIR /backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY ./backend/app /backend/app
COPY ./backend/start.sh /backend/start.sh

# Make the startup script executable
RUN chmod +x /backend/start.sh

EXPOSE 8000

# Use the startup script instead of directly running uvicorn
CMD ["/backend/start.sh"] 