# tests/test_brd_stage3.py
import pytest
import uuid
from storage import init_db, store_chunks, create_snapshot, get_connection
from brd_pipeline import stakeholder_analysis_agent
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

def test_stakeholder_agent_missing_data():
    # Only 1 speaker -> generates placeholder
    session_id = "test_stk_1"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test1",
            raw_text="Test",
            cleaned_text="Test",
            label=SignalLabel.REQUIREMENT,
            confidence=0.9,
            reasoning="T",
            speaker="Alice",
            suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = stakeholder_analysis_agent(session_id, snapshot_id)
    assert "Insufficient data" in content

def test_stakeholder_agent_success():
    session_id = "test_stk_3"
    chunks = [
        ClassifiedChunk( # Speaker 1 captures role Product Manager
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test1",
            raw_text="As the product manager, I need mobile support.",
            cleaned_text="As the product manager, I need mobile support.",
            label=SignalLabel.STAKEHOLDER_FEEDBACK,
            confidence=0.9,
            reasoning="T",
            speaker="Alice",
            suppressed=False
        ),
        ClassifiedChunk( # Speaker 2 no role
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test2",
            raw_text="I don't like the new design.",
            cleaned_text="I don't like the new design.",
            label=SignalLabel.STAKEHOLDER_FEEDBACK,
            confidence=0.9,
            reasoning="T",
            speaker="Bob",
            suppressed=False
        ),
        ClassifiedChunk( # Speaker 3 no feedback, just requirement contribution
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test3",
            raw_text="Must be fast.",
            cleaned_text="Must be fast.",
            label=SignalLabel.REQUIREMENT,
            confidence=0.9,
            reasoning="T",
            speaker="Charlie",
            suppressed=False
        ),
        ClassifiedChunk( # Unknown speaker feedback -> check missing attribution handling
            chunk_id=str(uuid.uuid4()),
            session_id=session_id,
            source_ref="test4",
            raw_text="This is a general concern.",
            cleaned_text="This is a general concern.",
            label=SignalLabel.STAKEHOLDER_FEEDBACK,
            confidence=0.9,
            reasoning="T",
            speaker="",
            suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = stakeholder_analysis_agent(session_id, snapshot_id)
    
    lower_content = content.lower()
    
    # Assert 3 speakers present
    assert "alice" in lower_content
    assert "bob" in lower_content
    assert "charlie" in lower_content
    
    # Assert PM role for Alice
    assert "product manager" in lower_content
    
    # Assert Bob role unknown
    assert "role unknown" in lower_content

def test_stakeholder_agent_no_feedback_but_speakers():
    session_id = "test_stk_no_feedback"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="t", raw_text="t", cleaned_text="t",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", speaker="Alice", suppressed=False
        ),
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="t", raw_text="t", cleaned_text="t",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", speaker="Bob", suppressed=False
        ),
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="t", raw_text="t", cleaned_text="t",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", speaker="Charlie", suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    content = stakeholder_analysis_agent(session_id, snapshot_id)
    
    # Verify the table generates even without stakeholder_feedback
    lower_content = content.lower()
    assert "alice" in lower_content
    assert "bob" in lower_content
    assert "charlie" in lower_content
