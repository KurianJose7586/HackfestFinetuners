"""
storage.py
Handles all PostgreSQL database operations for the Attributed Knowledge Store (AKS).
"""

from __future__ import annotations

import json
import os
from typing import List

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

from schema import ClassifiedChunk, SignalLabel

from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Load .env from the same directory as this script
_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

# Use fallback defaults if .env doesn't specify them
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "hackfest_aks")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres") # common default, update if needed

def get_connection():
    """Returns a new connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

def init_db():
    """Creates the classified_chunks table if it does not exist."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS classified_chunks (
                    chunk_id UUID PRIMARY KEY,
                    session_id VARCHAR(255),
                    source_ref VARCHAR(255),
                    label VARCHAR(50),
                    suppressed BOOLEAN,
                    manually_restored BOOLEAN,
                    flagged_for_review BOOLEAN,
                    created_at TIMESTAMP WITH TIME ZONE,
                    data JSONB
                );
            """)
            
            # Create indexes for the columns we filter by
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_label ON classified_chunks(label);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_suppressed ON classified_chunks(suppressed);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_session ON classified_chunks(session_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_source_ref ON classified_chunks(source_ref);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_flagged ON classified_chunks(flagged_for_review);")
            
            # BRD Pipeline Tables
            cur.execute("""
                CREATE TABLE IF NOT EXISTS brd_snapshots (
                    snapshot_id UUID PRIMARY KEY,
                    session_id VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE,
                    chunk_ids JSONB
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS brd_sections (
                    section_id UUID PRIMARY KEY,
                    session_id VARCHAR(255),
                    snapshot_id UUID,
                    section_name VARCHAR(100),
                    version_number INTEGER DEFAULT 1,
                    content TEXT,
                    source_chunk_ids JSONB,
                    is_locked BOOLEAN DEFAULT FALSE,
                    human_edited BOOLEAN DEFAULT FALSE,
                    generated_at TIMESTAMP WITH TIME ZONE,
                    data JSONB
                );
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS brd_validation_flags (
                    flag_id UUID PRIMARY KEY,
                    session_id VARCHAR(255),
                    section_name VARCHAR(100),
                    flag_type VARCHAR(50),
                    description TEXT,
                    severity VARCHAR(20),
                    auto_resolvable BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE
                );
            """)
            
            cur.execute("CREATE INDEX IF NOT EXISTS idx_brd_sections_session ON brd_sections(session_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_brd_snapshots_session ON brd_snapshots(session_id);")
            
        conn.commit()
    finally:
        conn.close()

def store_chunks(chunks: List[ClassifiedChunk]):
    """Batch inserts a list of ClassifiedChunk objects into the database."""
    if not chunks:
        return

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            insert_query = """
                INSERT INTO classified_chunks (
                    chunk_id, session_id, source_ref, label, suppressed, 
                    manually_restored, flagged_for_review, created_at, data
                ) VALUES %s
                ON CONFLICT (chunk_id) DO NOTHING
            """
            
            values = []
            for c in chunks:
                # Convert Pydantic model to a dumpable dictionary
                data_json = c.model_dump(mode="json")
                values.append((
                    c.chunk_id,
                    c.session_id,
                    c.source_ref,
                    c.label.value,
                    c.suppressed,
                    c.manually_restored,
                    c.flagged_for_review,
                    c.created_at,
                    json.dumps(data_json)
                ))
                
            # Single multi-row INSERT instead of one INSERT per row
            execute_values(cur, insert_query, values)
        conn.commit()
    finally:
        conn.close()

def get_active_signals(session_id: str = None) -> List[ClassifiedChunk]:
    """Retrieves active signals, optionally filtered by session_id at DB level."""
    conn = get_connection()
    results = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if session_id:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE session_id = %s AND (suppressed = FALSE OR manually_restored = TRUE)
                    ORDER BY created_at ASC;
                """, (session_id,))
            else:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE suppressed = FALSE OR manually_restored = TRUE
                    ORDER BY created_at ASC;
                """)
            rows = cur.fetchall()
            for row in rows:
                results.append(ClassifiedChunk.model_validate(row['data']))
    finally:
        conn.close()
    return results

def get_noise_items(session_id: str = None) -> List[ClassifiedChunk]:
    """Retrieves noise chunks, optionally filtered by session_id at DB level."""
    conn = get_connection()
    results = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if session_id:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE session_id = %s AND suppressed = TRUE AND manually_restored = FALSE
                    ORDER BY created_at ASC;
                """, (session_id,))
            else:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE suppressed = TRUE AND manually_restored = FALSE
                    ORDER BY created_at ASC;
                """)
            rows = cur.fetchall()
            for row in rows:
                results.append(ClassifiedChunk.model_validate(row['data']))
    finally:
        conn.close()
    return results

def restore_noise_item(chunk_id: str):
    """
    Manually restores a misclassified noise chunk back to an active signal.
    Updates both the indexed columns and the JSONB payload.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # We must update the index columns AND the JSONB data to keep them in sync.
            cur.execute("""
                UPDATE classified_chunks
                SET suppressed = FALSE,
                    manually_restored = TRUE,
                    data = jsonb_set(
                        jsonb_set(data, '{suppressed}', 'false'::jsonb),
                        '{manually_restored}', 'true'::jsonb
                    )
                WHERE chunk_id = %s;
            """, (chunk_id,))
        conn.commit()
    finally:
        conn.close()

def create_snapshot(session_id: str) -> str:
    """
    Creates a frozen snapshot of all active signals from AKS via get_active_signals().
    Records their chunk IDs in brd_snapshots and returns the snapshot_id.
    """
    snapshot_id = str(uuid.uuid4())
    active_signals = get_active_signals(session_id=session_id)
    chunk_ids = [c.chunk_id for c in active_signals]
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO brd_snapshots (snapshot_id, session_id, created_at, chunk_ids)
                VALUES (%s, %s, %s, %s)
            """, (snapshot_id, session_id, datetime.now(timezone.utc), json.dumps(chunk_ids)))
        conn.commit()
    finally:
        conn.close()
        
    return snapshot_id

def get_signals_for_snapshot(snapshot_id: str, label_filter: str = None) -> List[ClassifiedChunk]:
    """
    Queries AKS for chunks whose IDs are in the snapshot's chunk_ids array,
    optionally filtered by label.
    """
    conn = get_connection()
    results = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT chunk_ids FROM brd_snapshots WHERE snapshot_id = %s", (snapshot_id,))
            row = cur.fetchone()
            if not row or not row['chunk_ids']:
                return []
                
            chunk_ids = row['chunk_ids']
            if not chunk_ids:
                return []
                
            query = "SELECT data FROM classified_chunks WHERE chunk_id = ANY(%s::uuid[])"
            params = [chunk_ids]
            
            if label_filter:
                query += " AND label = %s"
                params.append(label_filter)
                
            cur.execute(query, params)
            rows = cur.fetchall()
            for r in rows:
                results.append(ClassifiedChunk.model_validate(r['data']))
    finally:
        conn.close()
    return results

def store_brd_section(session_id: str, snapshot_id: str, section_name: str, content: str, source_chunk_ids: List[str]):
    """Stores a generated BRD section with automatic version incrementing."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Get next version number
            cur.execute("""
                SELECT COALESCE(MAX(version_number), 0) + 1 
                FROM brd_sections 
                WHERE session_id = %s AND section_name = %s
            """, (session_id, section_name))
            version_row = cur.fetchone()
            version_number = version_row[0] if version_row else 1
            
            section_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO brd_sections (
                    section_id, session_id, snapshot_id, section_name, 
                    version_number, content, source_chunk_ids, generated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (section_id, session_id, snapshot_id, section_name, version_number, content, json.dumps(source_chunk_ids), datetime.now(timezone.utc)))
        conn.commit()
    finally:
        conn.close()

def get_latest_brd_sections(session_id: str) -> Dict[str, str]:
    """Returns the latest generated content for each section name in a session."""
    conn = get_connection()
    sections = {}
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT section_name, content 
                FROM brd_sections 
                WHERE session_id = %s
                ORDER BY version_number DESC
            """, (session_id,))
            rows = cur.fetchall()
            for r in rows:
                if r['section_name'] not in sections:
                    sections[r['section_name']] = r['content']
    finally:
        conn.close()
    return sections


def copy_session_chunks(src_session_id: str, dst_session_id: str) -> int:
    """
    Copy all classified chunks from src_session_id into dst_session_id.
    Clears dst_session_id first so repeated calls don't accumulate duplicates.
    Updates the session_id field inside the stored JSONB data blob too.
    Returns the number of chunks copied.
    """
    conn = get_connection()
    copied = 0
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Clear destination first to avoid duplicate accumulation
            cur.execute("DELETE FROM classified_chunks WHERE session_id = %s", (dst_session_id,))

            cur.execute(
                "SELECT chunk_id, source_ref, label, suppressed, manually_restored, "
                "flagged_for_review, created_at, data FROM classified_chunks WHERE session_id = %s",
                (src_session_id,)
            )
            rows = cur.fetchall()
            for row in rows:
                new_id = str(uuid.uuid4())
                data = row['data'] if isinstance(row['data'], dict) else json.loads(row['data'])
                data['session_id'] = dst_session_id
                data['chunk_id'] = new_id
                cur.execute(
                    """
                    INSERT INTO classified_chunks
                        (chunk_id, session_id, source_ref, label, suppressed,
                         manually_restored, flagged_for_review, created_at, data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (chunk_id) DO NOTHING
                    """,
                    (
                        new_id,
                        dst_session_id,
                        row['source_ref'],
                        row['label'],
                        row['suppressed'],
                        row['manually_restored'],
                        row['flagged_for_review'],
                        datetime.now(timezone.utc),
                        json.dumps(data),
                    )
                )
                copied += 1
        conn.commit()
    finally:
        conn.close()
    return copied


