# tests/test_brd_stage4.py
import pytest
import uuid
from storage import init_db, store_chunks, create_snapshot, get_connection
from brd_pipeline import timeline_agent
from schema import ClassifiedChunk, SignalLabel

def setup_module(module):
    init_db()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE classified_chunks CASCADE;")
            cur.execute("TRUNCATE TABLE brd_snapshots CASCADE;")
            cur.execute("TRUNCATE TABLE brd_sections CASCADE;")
        conn.commit()
    finally:
        conn.close()

def test_timeline_agent_missing_data():
    session_id = "test_time_0"
    snapshot_id = create_snapshot(session_id)
    content = timeline_agent(session_id, snapshot_id)
    assert "No project timeline" in content

def test_timeline_agent_success():
    session_id = "test_time_3"
    chunks = [
        ClassifiedChunk( # Q3
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test1",
            raw_text="Launch is targeting Q3.",
            cleaned_text="Launch is targeting Q3.",
            label=SignalLabel.TIMELINE_REFERENCE,
            confidence=0.9,
            reasoning="T",
            suppressed=False
        ),
        ClassifiedChunk( # Specific date
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test2",
            raw_text="The code freeze is March 15th.",
            cleaned_text="The code freeze is March 15th.",
            label=SignalLabel.TIMELINE_REFERENCE,
            confidence=0.9,
            reasoning="T",
            suppressed=False
        ),
        ClassifiedChunk( # End of year (Missing specific date, milestone)
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test3",
            raw_text="Must be done by end of year.",
            cleaned_text="Must be done by end of year.",
            label=SignalLabel.TIMELINE_REFERENCE,
            confidence=0.9,
            reasoning="T",
            suppressed=False
        ),
        ClassifiedChunk( # Meeting
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test4",
            raw_text="Let's grab lunch at 12.",
            cleaned_text="Let's grab lunch at 12.",
            label=SignalLabel.TIMELINE_REFERENCE,
            confidence=0.9,
            reasoning="T",
            suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = timeline_agent(session_id, snapshot_id)
    
    lower_content = content.lower()
    assert "q3" in lower_content
    assert "march 15" in lower_content
    assert "end of year" in lower_content
    
    # Needs to ignore the lunch meeting as it's not a milestone
    assert "lunch" not in lower_content
