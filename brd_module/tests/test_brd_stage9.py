# tests/test_brd_stage9.py
import pytest
from storage import init_db, store_brd_section, create_snapshot, get_connection
from validator import store_validation_flag
from exporter import export_brd

def setup_module(module):
    init_db()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE classified_chunks CASCADE;")
            cur.execute("TRUNCATE TABLE brd_snapshots CASCADE;")
            cur.execute("TRUNCATE TABLE brd_sections CASCADE;")
            cur.execute("TRUNCATE TABLE brd_validation_flags CASCADE;")
        conn.commit()
    finally:
        conn.close()

def test_export_brd_success():
    session_id = "test_exp_1"
    snapshot_id = create_snapshot(session_id)
    
    # Store some mock sections
    store_brd_section(session_id, snapshot_id, "executive_summary", "This is the summary.", [])
    store_brd_section(session_id, snapshot_id, "functional_requirements", "1. Req A", [])
    
    # Store a mock flag
    store_validation_flag(session_id, "functional_requirements", "gap", "Missing data", "high")
    
    md_output = export_brd(session_id)
    
    # Assert headers exist
    assert "# Business Requirements Document" in md_output
    assert "1. Executive Summary" in md_output
    assert "This is the summary." in md_output
    assert "2. Functional Requirements" in md_output
    assert "1. Req A" in md_output
    
    # Missing sections should have a placeholder
    assert "*(Section not generated)*" in md_output
    
    # Assert validation block exists
    assert "🚨 Validation Flags Required Review" in md_output
    assert "🔴" in md_output # High severity icon
    assert "Missing data" in md_output
