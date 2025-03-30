#!/bin/bash
set -e

# Log the Python environment
echo "Python $(python --version)"

# Generate a detailed requirements list with all dependencies
echo "Generating frozen requirements list..."
pip freeze > /backend/frozen_requirements.txt
echo "Frozen requirements saved to /backend/frozen_requirements.txt"

# Compare requirements with those from requirements.txt
echo "Comparing with specified requirements..."
echo "--- Direct dependencies from requirements.txt ---"
cat /backend/requirements.txt
echo "----------------------------------------"

# Optional: Output a diff of required vs installed packages for visibility
echo "Checking for dependency version differences..."
for pkg in $(grep -v '#' /backend/requirements.txt | cut -d'=' -f1); do
  spec=$(grep "^$pkg==" /backend/requirements.txt 2>/dev/null || echo "$pkg: not specified")
  installed=$(grep "^$pkg==" /backend/frozen_requirements.txt 2>/dev/null || echo "$pkg: not installed")
  if [ "$spec" != "$installed" ]; then
    echo "DIFF: $spec → $installed"
  fi
done

# Start the FastAPI application
echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 