#!/usr/bin/env python3
"""
Start the FastAPI server properly with correct imports.
Run from the root directory.
"""

import os
import sys
import subprocess

# Get the root directory of this project
root_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(root_dir)

# Set PYTHONPATH to include root so imports work
env = os.environ.copy()
env["PYTHONPATH"] = root_dir + os.pathsep + env.get("PYTHONPATH", "")

print("="*70)
print("🚀 Starting BRD Generation API")
print("="*70)
print(f"Root directory: {root_dir}")
print(f"PYTHONPATH: {env['PYTHONPATH']}")
print()

# Start uvicorn with the correct module path
cmd = [
    sys.executable,
    "-m",
    "uvicorn",
    "api.main:app",
    "--reload",
    "--port",
    "8000",
    "--host",
    "127.0.0.1"
]

print(f"Running: {' '.join(cmd)}\n")
subprocess.run(cmd, env=env)
