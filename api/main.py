import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys

# Add the parent directory and nested modules so we can import them
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .routers import sessions, ingest, review, brd
from integration_module.routes import gmail_routes, slack_routes, pdf_routes
from brd_module.storage import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database (PG or SQLite fallback) AFTER uvicorn has bound the port
    port = os.getenv("PORT", "unknown")
    print(f"INFO: BRD Generation API starting up on port {port}...")
    try:
        init_db()
        print("INFO: Database initialized successfully.")
    except Exception as e:
        print(f"WARNING: Database initialization failed: {e}")
    
    print("INFO: API is ready to receive requests.")
    yield  # App runs here
    print("INFO: API shutting down...")


app = FastAPI(
    title="BRD Generation API",
    description="API for the Attributed Knowledge Store and BRD Generation Pipeline",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(gmail_routes.router)
app.include_router(slack_routes.router)
app.include_router(pdf_routes.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "BRD Generation API is running."}
