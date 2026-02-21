# tests/test_brd_stage2.py
import pytest
import uuid
from storage import init_db, store_chunks, create_snapshot, get_connection
from brd_pipeline import functional_requirements_agent
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

def test_functional_req_agent_0_signals():
    session_id = "test_req_0"
    snapshot_id = create_snapshot(session_id)
    
    content = functional_requirements_agent(session_id, snapshot_id)
    assert "Insufficient data" in content
    
    # Check DB
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT content, source_chunk_ids FROM brd_sections WHERE session_id = %s", (session_id,))
            row = cur.fetchone()
            assert row is not None
            assert "Insufficient data" in row[0]
            assert row[1] == []
    finally:
        conn.close()

def test_functional_req_agent_with_signals():
    session_id = "test_req_5"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test1",
            raw_text="The system must support mobile.",
            cleaned_text="The system must support mobile.",
            label=SignalLabel.REQUIREMENT,
            confidence=0.9,
            reasoning="T",
            suppressed=False
        ),
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test2",
            raw_text="The system is desktop-only.",
            cleaned_text="The system is desktop-only.",
            label=SignalLabel.REQUIREMENT,
            confidence=0.9,
            reasoning="T",
            suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = functional_requirements_agent(session_id, snapshot_id)
    
    # Needs to flag contradiction
    assert "contradict" in content.lower() or "gap" in content.lower() or "conflict" in content.lower()
    assert "mobile" in content.lower()
    
    # Check DB
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT content, source_chunk_ids FROM brd_sections WHERE session_id = %s", (session_id,))
            row = cur.fetchone()
            assert row is not None
            assert len(row[1]) == 2
            assert chunks[0].chunk_id in row[1]
    finally:
        conn.close()
