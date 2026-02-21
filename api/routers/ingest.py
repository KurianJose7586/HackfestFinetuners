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
from classifier import classify_chunks

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
    Upload a CSV or TXT file of raw data for ingestion.
    For CSV: expects columns 'text', 'speaker' (optional), 'source_ref' (optional).
    For TXT: each non-empty line is treated as one chunk.
    Runs classification synchronously (for demo reliability) and returns chunk count.
    """
    try:
        contents = await file.read()
        filename = file.filename or "uploaded_file"
        chunk_dicts = []

        if filename.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(contents.decode("utf-8", errors="ignore")))
            for i, row in enumerate(reader):
                text = row.get("text") or row.get("body") or row.get("content") or ""
                if text.strip():
                    chunk_dicts.append({
                        "cleaned_text": text.strip(),
                        "source_ref": row.get("source_ref") or row.get("message-id") or f"{filename}:row{i}",
                        "speaker": row.get("speaker") or row.get("from") or "Unknown",
                        "source_type": source_type
                    })
        else:
            # Plain text: each paragraph / line is a chunk
            for i, line in enumerate(contents.decode("utf-8", errors="ignore").splitlines()):
                if line.strip():
                    chunk_dicts.append({
                        "cleaned_text": line.strip(),
                        "source_ref": f"{filename}:line{i}",
                        "speaker": "Unknown",
                        "source_type": source_type
                    })

        if not chunk_dicts:
            raise HTTPException(status_code=400, detail="No valid text chunks found in the uploaded file.")

        # Run synchronously so the frontend knows when it's done
        _process_and_store(session_id, chunk_dicts)

        return {
            "message": f"Upload complete. {len(chunk_dicts)} chunks classified and stored.",
            "chunk_count": len(chunk_dicts),
            "filename": filename
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/demo")
def ingest_demo_dataset(session_id: str, limit: int = 80):
    """
    Ingest a sample of the pre-downloaded Enron emails.csv directly from disk.
    Avoids uploading the 1.3 GB file through the browser.
    Reads `limit` rows (default 80), extracts email bodies, classifies, and stores.
    """
    import csv as _csv
    import re as _re

    emails_path = os.path.join(
        PROJECT_ROOT, "Noise filter module", "emails.csv", "emails.csv"
    )
    if not os.path.exists(emails_path):
        raise HTTPException(
            status_code=404,
            detail=f"Demo dataset not found at: {emails_path}"
        )

    def _parse_email(raw: str):
        """Extract From, Subject, and body from a raw RFC-2822 email string."""
        sender = "Unknown"
        subject = ""
        body_lines = []
        in_body = False

        for line in raw.splitlines():
            if not in_body:
                if line.strip() == "":
                    in_body = True
                elif line.lower().startswith("from:"):
                    sender = line[5:].strip()
                elif line.lower().startswith("subject:"):
                    subject = line[8:].strip()
            else:
                body_lines.append(line)

        body = " ".join(body_lines).strip()
        # Strip forwarding wrappers / excessive whitespace
        body = _re.sub(r"\s+", " ", body)
        return sender, subject, body

    chunk_dicts = []
    try:
        with open(emails_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = _csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= limit:
                    break
                raw_message = row.get("message", "")
                file_ref = row.get("file", f"enron:row{i}")
                sender, subject, body = _parse_email(raw_message)
                # Use the subject + body as the chunk text; skip empty bodies
                text = f"{subject} {body}".strip() if subject else body
                if len(text) < 20:
                    continue
                chunk_dicts.append({
                    "cleaned_text": text[:1500],  # cap at 1500 chars per chunk
                    "source_ref": file_ref,
                    "speaker": sender,
                    "source_type": "email",
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read demo dataset: {e}")

    if not chunk_dicts:
        raise HTTPException(status_code=400, detail="No usable email bodies found in dataset sample.")

    try:
        _process_and_store(session_id, chunk_dicts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {e}")

    return {
        "message": f"Demo dataset ingested. {len(chunk_dicts)} email chunks classified and stored.",
        "chunk_count": len(chunk_dicts),
        "filename": "emails.csv (demo sample)",
    }

