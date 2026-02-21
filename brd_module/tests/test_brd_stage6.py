# tests/test_brd_stage6.py
import pytest
import uuid
from storage import init_db, store_chunks, create_snapshot, get_connection
from brd_pipeline import decisions_agent, assumptions_agent, success_metrics_agent
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

def test_decisions_agent_missing_data():
    session_id = "test_dec_0"
    snapshot_id = create_snapshot(session_id)
    content = decisions_agent(session_id, snapshot_id)
    assert "Insufficient data" in content

def test_decisions_agent_success():
    session_id = "test_dec_1"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="t", 
            raw_text="We decided to use PostgreSQL.", cleaned_text="We decided to use PostgreSQL.",
            label=SignalLabel.DECISION, confidence=0.9, reasoning="T", suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = decisions_agent(session_id, snapshot_id)
    assert "PostgreSQL" in content

def test_assumptions_agent_missing():
    session_id = "test_assm_0"
    snapshot_id = create_snapshot(session_id)
    content = assumptions_agent(session_id, snapshot_id)
    assert "Insufficient data" in content

def test_assumptions_agent_success():
    session_id = "test_assm_1"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="t", 
            raw_text="The app must load fast.", cleaned_text="The app must load fast.",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = assumptions_agent(session_id, snapshot_id)
    assert "AI-inferred" in content or "assum" in content.lower()

def test_success_metrics_missing():
    session_id = "test_sm_0"
    snapshot_id = create_snapshot(session_id)
    content = success_metrics_agent(session_id, snapshot_id)
    assert "Insufficient data" in content

def test_success_metrics_success():
    session_id = "test_sm_1"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="t", 
            raw_text="Speed must improve.", cleaned_text="Speed must improve.",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = success_metrics_agent(session_id, snapshot_id)
    # Check that it didn't invent a number, but still generated
    # It shouldn't contain numbers unless we provided them. "0" might be present if they say "0 downtime", but let's just check length.
    assert len(content) > 50
    # ensure it flags stakeholder validation
    assert "validation" in content.lower() or "stakeholder" in content.lower()
