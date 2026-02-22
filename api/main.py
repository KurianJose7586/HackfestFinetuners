import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys

# Add the parent directory and nested modules so we can import them
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)

try:
    from api.routers import sessions, ingest, review, brd
except ImportError:
    from routers import sessions, ingest, review, brd

try:
    from brd_module.storage import init_db
except ImportError:
    print("Warning: Could not import brd_module.storage")

# Initialize database (PG or SQLite fallback) on startup
try:
    init_db()
except NameError:
    print("Warning: Database initialization skipped (init_db not available)")
except Exception as e:
    print(f"Warning: Database initialization failed: {e}")

app = FastAPI(
    title="BRD Generation API",
    description="API for the Attributed Knowledge Store and BRD Generation Pipeline",
    version="1.0.0"
)

# Allow frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(ingest.router)
app.include_router(review.router)
app.include_router(brd.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "BRD Generation API is running."}
