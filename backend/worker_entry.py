#!/usr/bin/env python
"""
AGENTIC Worker Entry Point
This script provides a clean entry point for starting the ARQ worker
without causing import warnings.
"""

from arq.worker import run_worker
from app.worker import WorkerSettings

if __name__ == "__main__":
    run_worker(WorkerSettings) 