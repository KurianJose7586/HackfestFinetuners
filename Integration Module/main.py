import os
from fastapi import FastAPI
from dotenv import load_dotenv
import uvicorn

# Import routers
from routes.gmail_routes import router as gmail_router
from routes.slack_routes import router as slack_router

# Load environment variables
load_dotenv()

app = FastAPI(title="Integration Module API")

# Include Routers
app.include_router(gmail_router)
app.include_router(slack_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Integration Module API.",
        "endpoints": {
            "gmail": "/gmail/login",
            "slack": "/slack/login"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
