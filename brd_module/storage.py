"""
storage.py
Handles all PostgreSQL database operations for the Attributed Knowledge Store (AKS).
"""

from __future__ import annotations

import json
import os
from typing import List

import psycopg2
from psycopg2.extras import RealDictCursor

from schema import ClassifiedChunk, SignalLabel

from dotenv import load_dotenv
from pathlib import Path
import sqlite3
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
DB_PASS = os.getenv("DB_PASS", "postgres")

def get_connection():
    """Returns a connection to PostgreSQL if available, otherwise falls back to SQLite."""
    try:
        # Try PostgreSQL first
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=2
        )
        return conn, "postgres"
    except Exception:
        # Fallback to SQLite
        sqlite_path = os.path.join(_HERE, "aks_storage.db")
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"

def execute_query(conn, type, query, params=None, fetch=False):
    """Abstraction to handle parameter naming differences and cursor behavior."""
    if type == "sqlite":
        query = query.replace("%s", "?")
    
    # In SQLite, the connection context manager handles transactions. 
    # We still need a cursor to execute and fetch.
    cur = conn.cursor()
    if type == "postgres" and fetch:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
    try:
        cur.execute(query, params or ())
        if fetch:
            if type == "sqlite":
                return [dict(row) for row in cur.fetchall()]
            return cur.fetchall()
        if type == "postgres":
            conn.commit()
    finally:
        cur.close()
    return None

def init_db():
    """Creates the necessary tables using a compatible schema for both PG and SQLite."""
    conn, db_type = get_connection()
    try:
        # Use TEXT for UUID/JSONB in SQLite compatibility
        json_type = "JSONB" if db_type == "postgres" else "TEXT"
        uuid_type = "UUID" if db_type == "postgres" else "TEXT"
        
        queries = [
            f"""
                CREATE TABLE IF NOT EXISTS classified_chunks (
                    chunk_id {uuid_type} PRIMARY KEY,
                    session_id VARCHAR(255),
                    source_ref VARCHAR(255),
                    label VARCHAR(50),
                    suppressed BOOLEAN,
                    manually_restored BOOLEAN,
                    flagged_for_review BOOLEAN,
                    created_at TIMESTAMP,
                    data {json_type}
                );
            """,
            "CREATE INDEX IF NOT EXISTS idx_chunks_sess ON classified_chunks(session_id);",
            f"""
                CREATE TABLE IF NOT EXISTS brd_snapshots (
                    snapshot_id {uuid_type} PRIMARY KEY,
                    session_id VARCHAR(255),
                    created_at TIMESTAMP,
                    chunk_ids {json_type}
                );
            """,
            f"""
                CREATE TABLE IF NOT EXISTS brd_sections (
                    section_id {uuid_type} PRIMARY KEY,
                    session_id VARCHAR(255),
                    snapshot_id {uuid_type},
                    section_name VARCHAR(100),
                    version_number INTEGER DEFAULT 1,
                    content TEXT,
                    source_chunk_ids {json_type},
                    is_locked BOOLEAN DEFAULT FALSE,
                    human_edited BOOLEAN DEFAULT FALSE,
                    generated_at TIMESTAMP,
                    data {json_type}
                );
            """,
            f"""
                CREATE TABLE IF NOT EXISTS brd_validation_flags (
                    flag_id {uuid_type} PRIMARY KEY,
                    session_id VARCHAR(255),
                    section_name VARCHAR(100),
                    flag_type VARCHAR(50),
                    description TEXT,
                    severity VARCHAR(20),
                    auto_resolvable BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP
                );
            """
        ]
        
        for q in queries:
            execute_query(conn, db_type, q)
            
    finally:
        conn.close()

def store_chunks(chunks: List[ClassifiedChunk]):
    """Batch inserts chunks with DB fallback support."""
    if not chunks: return

    conn, db_type = get_connection()
    try:
        query = """
            INSERT INTO classified_chunks (
                chunk_id, session_id, source_ref, label, suppressed, 
                manually_restored, flagged_for_review, created_at, data
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """
        if db_type == "sqlite":
            query = query.replace("%s", "?").replace(";", "")
            # SQLite doesn't have ON CONFLICT DO NOTHING in the same way for bulk usually, 
            # but we can use OR IGNORE
            query = query.replace("INSERT INTO", "INSERT OR IGNORE INTO")

        values = []
        for c in chunks:
            data_json = c.model_dump(mode="json")
            values.append((
                str(c.chunk_id),
                c.session_id,
                c.source_ref,
                c.label.value,
                c.suppressed,
                c.manually_restored,
                c.flagged_for_review,
                c.created_at.isoformat() if hasattr(c.created_at, 'isoformat') else str(c.created_at),
                json.dumps(data_json)
            ))
        
        with conn.cursor() if db_type == "postgres" else conn as cur:
            cur.executemany(query, values)
            if db_type == "postgres": conn.commit()
    finally:
        conn.close()

def get_active_signals(session_id: str = None) -> List[ClassifiedChunk]:
    """Retrieves all active chunks using abstracted query execution, optionally filtered by session."""
    conn, db_type = get_connection()
    try:
        if session_id:
            query = "SELECT data FROM classified_chunks WHERE session_id = %s AND (suppressed = FALSE OR manually_restored = TRUE) ORDER BY created_at ASC"
            params = (session_id,)
        else:
            query = "SELECT data FROM classified_chunks WHERE suppressed = FALSE OR manually_restored = TRUE ORDER BY created_at ASC"
            params = None
        rows = execute_query(conn, db_type, query, params=params, fetch=True)
        return [ClassifiedChunk.model_validate(json.loads(r['data']) if isinstance(r['data'], str) else r['data']) for r in rows]
    finally:
        conn.close()

def get_noise_items(session_id: str = None) -> List[ClassifiedChunk]:
    """Retrieves noise chunks using abstracted query execution, optionally filtered by session."""
    conn, db_type = get_connection()
    try:
        if session_id:
            query = "SELECT data FROM classified_chunks WHERE session_id = %s AND suppressed = TRUE AND manually_restored = FALSE ORDER BY created_at ASC"
            params = (session_id,)
        else:
            query = "SELECT data FROM classified_chunks WHERE suppressed = TRUE AND manually_restored = FALSE ORDER BY created_at ASC"
            params = None
        rows = execute_query(conn, db_type, query, params=params, fetch=True)
        return [ClassifiedChunk.model_validate(json.loads(r['data']) if isinstance(r['data'], str) else r['data']) for r in rows]
    finally:
        conn.close()

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

def store_brd_section(session_id: str, snapshot_id: str, section_name: str, content: str, source_chunk_ids: List[str], human_edited: bool = False):
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
                    version_number, content, source_chunk_ids, human_edited, generated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (section_id, session_id, snapshot_id, section_name, version_number, content, json.dumps(source_chunk_ids), human_edited, datetime.now(timezone.utc)))
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
