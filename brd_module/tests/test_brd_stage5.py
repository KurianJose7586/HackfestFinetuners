# tests/test_brd_stage5.py
import pytest
import uuid
from storage import init_db, store_chunks, create_snapshot, store_brd_section, get_connection
from brd_pipeline import executive_summary_agent
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

def test_exec_summary_agent():
    session_id = "test_exec_1"
    
    # Needs to see some signals to report "N signals from M sources"
    chunks = [
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="doc1", 
            raw_text="Launch is targeting Q3.", cleaned_text="Launch is targeting Q3.",
            label=SignalLabel.TIMELINE_REFERENCE, confidence=0.9, reasoning="T", suppressed=False
        ),
        ClassifiedChunk(
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="doc2", 
            raw_text="Mobile app is required.", cleaned_text="Mobile app is required.",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", suppressed=False
        )
    ]
    store_chunks(chunks)
    snapshot_id = create_snapshot(session_id)
    
    # Manually store some sections so it can read them
    store_brd_section(session_id, snapshot_id, "functional_requirements", "1. The system shall support mobile.", [])
    store_brd_section(session_id, snapshot_id, "timeline", "Launch is Q3.", [])
    store_brd_section(session_id, snapshot_id, "stakeholder_analysis", "Insufficient data to generate this section.", [])
    
    content = executive_summary_agent(session_id, snapshot_id)
    
    lower_content = content.lower()
    
    # Needs to synthesize something about mobile or Q3
    assert "mobile" in lower_content or "q3" in lower_content
    
    # Needs honest completeness statement
    assert "2 signals" in lower_content
    assert "2 source" in lower_content
    
    # Should mention stakeholder analysis was insufficient
    assert "stakeholder" in lower_content and "insufficient data" in lower_content or "stakeholder" in lower_content and "incomplete" in lower_content or "missing" in lower_content
