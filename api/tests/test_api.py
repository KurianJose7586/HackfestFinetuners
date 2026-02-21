import pytest
from fastapi.testclient import TestClient
import uuid

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_create_session():
    response = client.post("/sessions/")
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["status"] == "created"
    
    # Test get session
    sess_id = data["session_id"]
    get_res = client.get(f"/sessions/{sess_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "active"

def test_ingest_data_background():
    # We won't test full LLM execution, but we'll ensure the endpoint accepts the schema
    payload = {
        "chunks": [
            {
                "source_type": "slack",
                "source_ref": "msg_1",
                "speaker": "Alice",
                "text": "The login button needs to be blue."
            }
        ]
    }
    response = client.post("/sessions/test-session-123/ingest/data", json=payload)
    assert response.status_code == 200
    assert "background" in response.json()["message"]

def test_review_chunks_endpoint():
    # Should be empty or successful 200 list
    response = client.get("/sessions/test-session-123/chunks?status=signal")
    assert response.status_code == 200
    assert "chunks" in response.json()

def test_edit_brd_section():
    # Tests the human editing route doesn't crash
    # Note: Requires snapshot_id which we'll mock
    payload = {
        "content": "This is a manually edited executive summary.",
        "snapshot_id": str(uuid.uuid4())
    }
    response = client.put("/sessions/test-session-123/brd/sections/executive_summary", json=payload)
    assert response.status_code == 200
    assert "updated successfully by human" in response.json()["message"]
