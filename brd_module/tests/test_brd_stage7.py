# tests/test_brd_stage7.py
import pytest
import uuid
from storage import init_db, store_chunks, get_connection
from brd_pipeline import run_brd_generation
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

def test_run_brd_generation_orchestrator():
    session_id = "test_orch_1"
    
    # Insert some data
    chunks = [
        ClassifiedChunk( # Requirement
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="doc1", 
            raw_text="Launch is targeting Q3.", cleaned_text="Launch is targeting Q3.",
            label=SignalLabel.TIMELINE_REFERENCE, confidence=0.9, reasoning="T", suppressed=False
        ),
        ClassifiedChunk( # Requirement
            chunk_id=str(uuid.uuid4()), session_id=session_id, source_ref="doc2", 
            raw_text="The system shall support mobile.", cleaned_text="The system shall support mobile.",
            label=SignalLabel.REQUIREMENT, confidence=0.9, reasoning="T", suppressed=False
        )
    ]
    store_chunks(chunks)
    
    # 1. Run full orchestrator
    snapshot_id_1 = run_brd_generation(session_id)
    assert snapshot_id_1 is not None
    
    # 2. Verify all 7 section rows are created
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT section_name, generated_at, version_number FROM brd_sections WHERE session_id = %s", (session_id,))
            rows = cur.fetchall()
            assert len(rows) == 7
            
            # Map sections and times
            section_times = {r[0]: r[1] for r in rows}
            assert "executive_summary" in section_times
            assert "functional_requirements" in section_times
            assert "stakeholder_analysis" in section_times
            assert "timeline" in section_times
            assert "decisions" in section_times
            assert "assumptions" in section_times
            assert "success_metrics" in section_times
            
            # Verify executive summary ran after the rest (timestamp later)
            exec_time = section_times["executive_summary"]
            for s, t in section_times.items():
                if s != "executive_summary":
                    assert t <= exec_time
                    
    finally:
        conn.close()
        
    # 3. Run orchestrator twice and verify version_number = 2 is created
    run_brd_generation(session_id)
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM brd_sections WHERE session_id = %s", (session_id,))
            total_rows = cur.fetchone()[0]
            assert total_rows == 14 # 7 from first run, 7 from second
            
            cur.execute("SELECT COUNT(*) FROM brd_sections WHERE session_id = %s AND version_number = 2", (session_id,))
            v2_rows = cur.fetchone()[0]
            assert v2_rows == 7
    finally:
        conn.close()
