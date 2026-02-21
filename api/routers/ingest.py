import os
import sys
import csv
import io
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from typing import List

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(PROJECT_ROOT)
sys.path.append(os.path.join(PROJECT_ROOT, "Noise filter module"))

from brd_module.storage import store_chunks
from storage import copy_session_chunks
from classifier import classify_chunks

# Session ID of the pre-classified 300-email Enron demo cache
DEMO_CACHE_SESSION_ID = os.environ.get("DEMO_CACHE_SESSION_ID", "default_session")

router = APIRouter(
    prefix="/sessions/{session_id}/ingest",
    tags=["Ingestion"]
)

class RawDataChunk(BaseModel):
    source_type: str
    source_ref: str
    speaker: str = "Unknown"
    text: str

class IngestRequest(BaseModel):
    chunks: List[RawDataChunk]

def _load_api_key():
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_ROOT, "Noise filter module", ".env"))
    return os.environ.get("GROQ_CLOUD_API")

def _process_and_store(sess_id: str, chunk_dicts: list):
    """Core classify + store logic shared by both ingest endpoints."""
    api_key = _load_api_key()
    classified = classify_chunks(chunk_dicts, api_key=api_key)
    for c in classified:
        c.session_id = sess_id
    store_chunks(classified)

@router.post("/data")
def ingest_data(session_id: str, request: IngestRequest, background_tasks: BackgroundTasks):
    """
    Receives raw data chunks (JSON) from external connectors (e.g. Slack ingestion script).
    Routes them through noise classification in the background.
    """
    chunk_dicts = [
        {
            "cleaned_text": rc.text,
            "source_ref": rc.source_ref,
            "speaker": rc.speaker,
            "source_type": rc.source_type
        } for rc in request.chunks
    ]
    background_tasks.add_task(_process_and_store, session_id, chunk_dicts)
    return {"message": f"Processing {len(request.chunks)} chunks in the background for session {session_id}."}

@router.post("/upload")
async def upload_file(
    session_id: str,
    file: UploadFile = File(...),
    source_type: str = Form("email")
):
    """
    DEMO MODE: Accepts and discards any uploaded file, then copies pre-classified
    chunks from DEMO_CACHE_SESSION_ID into this session — instant DB copy.
    """
    await file.read()  # discard — we never process the real file
    filename = file.filename or "uploaded_file"

    try:
        copied = copy_session_chunks(DEMO_CACHE_SESSION_ID, session_id)
        if copied > 0:
            return {
                "message": f"Upload complete. {copied} chunks classified and stored.",
                "chunk_count": copied,
                "filename": filename,
                "demo_mode": True,
            }
        raise HTTPException(
            status_code=503,
            detail="Demo cache is empty. Run the /demo endpoint first to seed it."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")



@router.post("/demo")
async def ingest_demo_dataset(session_id: str, limit: int = 80):
    """
    Streaming: returns text/plain lines live via StreamingResponse.
    Watch with:  curl -N -X POST <url>
    """
    import csv as _csv
    import re as _re
    import queue as _queue
    import threading as _threading
    from fastapi.responses import StreamingResponse

    emails_path = os.path.join(
        PROJECT_ROOT, "Noise filter module", "emails.csv"
    )
    if not os.path.exists(emails_path):
        raise HTTPException(status_code=404, detail=f"Demo dataset not found at: {emails_path}")

    def _parse_email(raw: str):
        sender, subject, body_lines, in_body = "Unknown", "", [], False
        for line in raw.splitlines():
            if not in_body:
                if line.strip() == "": in_body = True
                elif line.lower().startswith("from:"): sender = line[5:].strip()
                elif line.lower().startswith("subject:"): subject = line[8:].strip()
            else:
                body_lines.append(line)
        body = _re.sub(r"\s+", " ", " ".join(body_lines).strip())
        return sender, subject, body

    log_q: _queue.Queue = _queue.Queue()
    DONE = object()

    def run_pipeline():
        def log(msg): log_q.put(msg + "\n")

        log(f"[DEMO INGEST] ▶  Reading up to {limit} emails from Enron dataset...")
        chunk_dicts = []
        try:
            with open(emails_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = _csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= limit: break
                    sender, subject, body = _parse_email(row.get("message", ""))
                    text = f"{subject} {body}".strip() if subject else body
                    if len(text) < 20: continue
                    chunk_dicts.append({
                        "cleaned_text": text[:1500],
                        "source_ref": row.get("file", f"enron:row{i}"),
                        "speaker": sender,
                        "source_type": "email",
                    })
                    if (i + 1) % 50 == 0:
                        log(f"[DEMO INGEST]   Parsed {i+1}/{limit} rows — {len(chunk_dicts)} valid chunks so far")
        except Exception as e:
            log(f"[DEMO INGEST] ❌ Parse error: {e}")
            log_q.put(DONE); return

        log(f"[DEMO INGEST] ✔  Parsed {len(chunk_dicts)} chunks — starting classification...")
        log(f"[DEMO INGEST]    Heuristic filter → Domain gate → Groq LLM (Llama 4 Maverick)")
        log(f"[DEMO INGEST] {'─'*60}")

        if not chunk_dicts:
            log("[DEMO INGEST] ❌ No usable email bodies found."); log_q.put(DONE); return

        try:
            api_key = _load_api_key()
            classified = classify_chunks(chunk_dicts, api_key=api_key, log_fn=log)
            for c in classified:
                c.session_id = session_id
            from storage import store_chunks as _store
            _store(classified)
            log(f"[DEMO INGEST] {'─'*60}")
            log(f"[DEMO INGEST] ✅ Complete! {len(classified)} chunks stored for session '{session_id}'.")
        except Exception as e:
            log(f"[DEMO INGEST] ❌ Classification error: {e}")

        log_q.put(DONE)

    _threading.Thread(target=run_pipeline, daemon=True).start()

    async def stream():
        import asyncio
        loop = asyncio.get_event_loop()
        while True:
            item = await loop.run_in_executor(None, log_q.get)
            if item is DONE:
                break
            yield item

    return StreamingResponse(stream(), media_type="text/plain",
                             headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})


