# tests/test_brd_stage8.py
import pytest
import uuid
from storage import init_db, store_brd_section, create_snapshot, get_connection
from validator import validate_brd

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

def test_validator_detects_gap():
    session_id = "test_val_1"
    snapshot_id = create_snapshot(session_id)
    
    # Store a placeholder
    store_brd_section(session_id, snapshot_id, "timeline", "Insufficient data to generate this section.", [])
    
    validate_brd(session_id)
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT section_name, flag_type, severity FROM brd_validation_flags WHERE session_id = %s", (session_id,))
            rows = cur.fetchall()
            assert len(rows) >= 1
            gap_flag = [r for r in rows if r[0] == "timeline" and r[1] == "gap"]
            assert len(gap_flag) == 1
            assert gap_flag[0][2] == "medium"
    finally:
        conn.close()

def test_validator_detects_contradiction():
    session_id = "test_val_2"
    snapshot_id = create_snapshot(session_id)
    
    # Store conflicting req/decisions
    store_brd_section(session_id, snapshot_id, "functional_requirements", "1. The system must support mobile.", [])
    store_brd_section(session_id, snapshot_id, "decisions", "1. We decided to build a desktop-only application.", [])
    
    validate_brd(session_id)
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT section_name, flag_type, severity, description FROM brd_validation_flags WHERE session_id = %s", (session_id,))
            rows = cur.fetchall()
            
            # Find cross_section contradiction
            conflict_flags = [r for r in rows if r[0] == "cross_section" and r[1] == "contradiction"]
            assert len(conflict_flags) == 1
            assert conflict_flags[0][2] == "high"
            # The AI description should mention desktop vs mobile
            desc = conflict_flags[0][3].lower()
            assert "desktop" in desc or "mobile" in desc
    finally:
        conn.close()
