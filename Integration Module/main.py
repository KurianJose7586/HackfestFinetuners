from fastapi import FastAPI
from dotenv import load_dotenv
import uvicorn
import os

# Load environment variables FIRST
load_dotenv()

# Import routers
from routes.gmail_routes import router as gmail_router
from routes.slack_routes import router as slack_router
from routes.pdf_routes import router as pdf_router

app = FastAPI(title="Integration Module API")

# Include Routers
app.include_router(gmail_router)
app.include_router(slack_router)
app.include_router(pdf_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Integration Module API.",
        "endpoints": {
            "gmail": "/gmail/login",
            "slack": "/slack/login",
            "pdf": "/pdf/parse"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
