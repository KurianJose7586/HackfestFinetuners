import os
import sys
from fastapi import APIRouter, HTTPException

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(PROJECT_ROOT)

from brd_module.storage import get_noise_items, get_active_signals, restore_noise_item

router = APIRouter(
    prefix="/sessions/{session_id}/chunks",
    tags=["Review"]
)

@router.get("/")
def get_session_chunks(session_id: str, status: str = "signal"):
    """
    Retrieve chunks for a session with filtering options (?status=noise or ?status=signal).
    """
    if status == "noise":
        items = get_noise_items()
    else:
        items = get_active_signals()
        
    # In-memory filter for the session
    session_items = [item for item in items if getattr(item, 'session_id', None) == session_id]
    
    return {
        "session_id": session_id,
        "status_filter": status,
        "count": len(session_items),
        "chunks": session_items
    }

@router.post("/{chunk_id}/restore")
def restore_chunk(session_id: str, chunk_id: str):
    """
    Manually restore a suppressed noise chunk back to an active signal in the AKS.
    """
    try:
        restore_noise_item(chunk_id)
        return {"message": f"Chunk {chunk_id} restored to active signals."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
