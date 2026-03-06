"""
integration_pipeline.py
Provides a clean interface for external ingestion modules (PDF, Gmail, Slack) 
to feed data into the Noise Filter classification and storage pipeline.
"""

from __future__ import annotations

import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv

# Load .env from the same directory as this script
_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

from classifier import classify_chunks
from enron_parser import flatten_thread, strip_boilerplate
from storage import init_db, store_chunks
from schema import ClassifiedChunk, SignalLabel

def process_external_content(
    text: str,
    speaker: str = "Unknown",
    source_ref: str = "",
    subject: str = "",
    source_type: str = "document",
    session_id: str = None
) -> str:
    """
    Chunks, classifies, and stores extracted text from external sources.
    
    Args:
        text: The raw text extracted from the external source.
        speaker: The person who authored the content.
        source_ref: A reference ID (message ID, filename, etc.)
        subject: The subject of the communication.
        source_type: 'email', 'slack', 'document', etc.
        session_id: The BRD session ID to associate with this data.
        
    Returns:
        The session_id used.
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    logging.info(f"Processing external content from {source_type}: {source_ref}")

    # 1. Chunking & Basic Cleaning
    # We use enron_parser logic to flatten threads and strip boilerplate
    raw_chunks = flatten_thread(text)
    
    chunks_to_classify = []
    for raw in raw_chunks:
        cleaned = strip_boilerplate(raw)
        if not cleaned or not cleaned.strip():
            continue
            
        chunks_to_classify.append({
            "source_ref": source_ref,
            "speaker": speaker,
            "raw_text": raw,
            "cleaned_text": cleaned,
            "subject": subject
        })

    if not chunks_to_classify:
        logging.warning("No valid content chunks found to classify.")
        return session_id

    # 2. Classification
    api_key = os.getenv("GROQ_CLOUD_API")
    if not api_key:
        logging.error("GROQ_CLOUD_API not set in .env")
        raise RuntimeError("GROQ_CLOUD_API not set")

    classified = classify_chunks(chunks_to_classify, api_key=api_key)

    # 3. Storage
    # Ensure DB is initialized
    init_db()
    
    # Associate with session
    for c in classified:
        c.session_id = session_id
        c.source_type = source_type

    store_chunks(classified)
    
    logging.info(f"Successfully processed and stored {len(classified)} chunks for session {session_id}")
    return session_id

if __name__ == "__main__":
    # Test run
    logging.basicConfig(level=logging.INFO)
    test_text = "The system must support PDF export. Alice said it is a priority."
    sid = process_external_content(test_text, speaker="Alice", source_ref="test-123")
    print(f"Test completed. Session ID: {sid}")
