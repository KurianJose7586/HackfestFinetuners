"""
storage.py
Handles all PostgreSQL database operations for the Attributed Knowledge Store (AKS).
"""

from __future__ import annotations

import json
import os
from typing import List, Tuple

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from pyparsing import Dict

from schema import ClassifiedChunk, SignalLabel

from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone
import sqlite3
import logging

logger = logging.getLogger(__name__)

# Load .env from the same directory as this script
_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

# Use fallback defaults if .env doesn't specify them
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "hackfest_aks")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres") # common default, update if needed
DB_TYPE = None  # Will be set to "sqlite" or "postgresql" based on availability

# SQLite database path
SQLITE_DB_PATH = _HERE / "aks_storage.db"

def get_connection() -> Tuple:
    """Returns a new connection to the database (PostgreSQL or SQLite fallback).
    
    Returns:
        Tuple: (connection, db_type_string) where db_type is 'postgresql' or 'sqlite'
    """
    global DB_TYPE
    
    # Try PostgreSQL first
    if DB_TYPE is None or DB_TYPE == "postgresql":
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            DB_TYPE = "postgresql"
            return conn, "postgresql"
        except (psycopg2.OperationalError, psycopg2.Error):
            DB_TYPE = "sqlite"
    
    # Fall back to SQLite
    if DB_TYPE == "sqlite":
        conn = sqlite3.connect(str(SQLITE_DB_PATH))
        conn.row_factory = sqlite3.Row  # Access columns by name
        return conn, "sqlite"
    
    raise RuntimeError("Could not establish database connection")

def init_db():
    """Creates the classified_chunks table if it does not exist."""
    conn, db_type = get_connection()
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            # SQLite uses TEXT for UUID and JSON, and INTEGER for BOOLEAN (0/1)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS classified_chunks (
                    chunk_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    source_ref TEXT,
                    label TEXT,
                    suppressed INTEGER DEFAULT 0,
                    manually_restored INTEGER DEFAULT 0,
                    flagged_for_review INTEGER DEFAULT 0,
                    created_at TEXT,
                    data TEXT
                );
            """)
            
            # Create indexes
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_label ON classified_chunks(label);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_suppressed ON classified_chunks(suppressed);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_session ON classified_chunks(session_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_source_ref ON classified_chunks(source_ref);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_flagged ON classified_chunks(flagged_for_review);")
            
            # BRD tables
            cur.execute("""
                CREATE TABLE IF NOT EXISTS brd_snapshots (
                    snapshot_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    created_at TEXT,
                    chunk_ids TEXT
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS brd_sections (
                    section_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    snapshot_id TEXT,
                    section_name TEXT,
                    version_number INTEGER DEFAULT 1,
                    content TEXT,
                    source_chunk_ids TEXT,
                    is_locked INTEGER DEFAULT 0,
                    human_edited INTEGER DEFAULT 0,
                    generated_at TEXT,
                    data TEXT
                );
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS brd_validation_flags (
                    flag_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    section_name TEXT,
                    flag_type TEXT,
                    description TEXT,
                    severity TEXT,
                    auto_resolvable INTEGER DEFAULT 0,
                    created_at TEXT
                );
            """)
            
            cur.execute("CREATE INDEX IF NOT EXISTS idx_brd_sections_session ON brd_sections(session_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_brd_snapshots_session ON brd_snapshots(session_id);")
            
            conn.commit()
        else:  # PostgreSQL
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
                
                cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_label ON classified_chunks(label);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_suppressed ON classified_chunks(suppressed);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_session ON classified_chunks(session_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_source_ref ON classified_chunks(source_ref);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_classified_chunks_flagged ON classified_chunks(flagged_for_review);")
                
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

    conn, db_type = get_connection()
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            insert_query = """
                INSERT OR IGNORE INTO classified_chunks (
                    chunk_id, session_id, source_ref, label, suppressed, 
                    manually_restored, flagged_for_review, created_at, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            for c in chunks:
                data_json = c.model_dump(mode="json")
                # Handle created_at - might be string already or datetime object
                created_at_val = c.created_at
                if created_at_val and hasattr(created_at_val, 'isoformat'):
                    created_at_val = created_at_val.isoformat()
                
                cur.execute(insert_query, (
                    str(c.chunk_id),
                    c.session_id,
                    c.source_ref,
                    c.label.value,
                    1 if c.suppressed else 0,
                    1 if c.manually_restored else 0,
                    1 if c.flagged_for_review else 0,
                    created_at_val,
                    json.dumps(data_json)
                ))
            conn.commit()
        else:  # PostgreSQL
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
                    
                execute_values(cur, insert_query, values)
            conn.commit()
    finally:
        conn.close()

def get_active_signals(session_id: str = None) -> List[ClassifiedChunk]:
    """Retrieves active signals, optionally filtered by session_id at DB level."""
    conn, db_type = get_connection()
    results = []
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            if session_id:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE session_id = ? AND (suppressed = 0 OR manually_restored = 1)
                    ORDER BY created_at ASC;
                """, (session_id,))
            else:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE suppressed = 0 OR manually_restored = 1
                    ORDER BY created_at ASC;
                """)
            rows = cur.fetchall()
            for row in rows:
                data = json.loads(row[0]) if isinstance(row[0], str) else row[0]
                results.append(ClassifiedChunk.model_validate(data))
        else:  # PostgreSQL
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
    conn, db_type = get_connection()
    results = []
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            if session_id:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE session_id = ? AND suppressed = 1 AND manually_restored = 0
                    ORDER BY created_at ASC;
                """, (session_id,))
            else:
                cur.execute("""
                    SELECT data FROM classified_chunks 
                    WHERE suppressed = 1 AND manually_restored = 0
                    ORDER BY created_at ASC;
                """)
            rows = cur.fetchall()
            for row in rows:
                data = json.loads(row[0]) if isinstance(row[0], str) else row[0]
                results.append(ClassifiedChunk.model_validate(data))
        else:  # PostgreSQL
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
    conn, db_type = get_connection()
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            # First get the current data
            cur.execute("SELECT data FROM classified_chunks WHERE chunk_id = ?", (chunk_id,))
            row = cur.fetchone()
            if row:
                data = json.loads(row[0]) if isinstance(row[0], str) else row[0]
                data['suppressed'] = False
                data['manually_restored'] = True
                cur.execute("""
                    UPDATE classified_chunks
                    SET suppressed = 0, manually_restored = 1, data = ?
                    WHERE chunk_id = ?
                """, (json.dumps(data), chunk_id))
            conn.commit()
        else:  # PostgreSQL
            with conn.cursor() as cur:
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
    chunk_ids = [str(c.chunk_id) for c in active_signals]
    
    conn, db_type = get_connection()
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO brd_snapshots (snapshot_id, session_id, created_at, chunk_ids)
                VALUES (?, ?, ?, ?)
            """, (snapshot_id, session_id, datetime.now(timezone.utc).isoformat(), json.dumps(chunk_ids)))
            conn.commit()
        else:  # PostgreSQL
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
    conn, db_type = get_connection()
    results = []
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            cur.execute("SELECT chunk_ids FROM brd_snapshots WHERE snapshot_id = ?", (snapshot_id,))
            row = cur.fetchone()
            if not row or not row[0]:
                return []
                
            chunk_ids = json.loads(row[0]) if isinstance(row[0], str) else row[0]
            if not chunk_ids:
                return []
                
            placeholders = ",".join(["?" for _ in chunk_ids])
            query = f"SELECT data FROM classified_chunks WHERE chunk_id IN ({placeholders})"
            params = list(chunk_ids)
            
            if label_filter:
                query += " AND label = ?"
                params.append(label_filter)
                
            cur.execute(query, params)
            rows = cur.fetchall()
            for r in rows:
                data = json.loads(r[0]) if isinstance(r[0], str) else r[0]
                results.append(ClassifiedChunk.model_validate(data))
        else:  # PostgreSQL
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
    conn, db_type = get_connection()
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            # Get next version number
            cur.execute("""
                SELECT COALESCE(MAX(version_number), 0) + 1 
                FROM brd_sections 
                WHERE session_id = ? AND section_name = ?
            """, (session_id, section_name))
            version_row = cur.fetchone()
            version_number = version_row[0] if version_row else 1
            
            section_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO brd_sections (
                    section_id, session_id, snapshot_id, section_name, 
                    version_number, content, source_chunk_ids, generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (section_id, session_id, snapshot_id, section_name, version_number, content, json.dumps(source_chunk_ids), datetime.now(timezone.utc).isoformat()))
            conn.commit()
        else:  # PostgreSQL
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
    conn, db_type = get_connection()
    sections = {}
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            cur.execute("""
                SELECT section_name, content 
                FROM brd_sections 
                WHERE session_id = ?
                ORDER BY version_number DESC
            """, (session_id,))
            rows = cur.fetchall()
            for r in rows:
                section_name = r[0]
                content = r[1]
                if section_name not in sections:
                    sections[section_name] = content
        else:  # PostgreSQL
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
    conn, db_type = get_connection()
    copied = 0
    try:
        if db_type == "sqlite":
            cur = conn.cursor()
            # Clear destination first
            cur.execute("DELETE FROM classified_chunks WHERE session_id = ?", (dst_session_id,))

            cur.execute(
                "SELECT chunk_id, source_ref, label, suppressed, manually_restored, "
                "flagged_for_review, created_at, data FROM classified_chunks WHERE session_id = ?",
                (src_session_id,)
            )
            rows = cur.fetchall()
            for row in rows:
                new_id = str(uuid.uuid4())
                data = json.loads(row[7]) if isinstance(row[7], str) else row[7]
                data['session_id'] = dst_session_id
                data['chunk_id'] = new_id
                cur.execute(
                    """
                    INSERT OR IGNORE INTO classified_chunks
                        (chunk_id, session_id, source_ref, label, suppressed,
                         manually_restored, flagged_for_review, created_at, data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        new_id,
                        dst_session_id,
                        row[1],  # source_ref
                        row[2],  # label
                        1 if row[3] else 0,  # suppressed
                        1 if row[4] else 0,  # manually_restored
                        1 if row[5] else 0,  # flagged_for_review
                        datetime.now(timezone.utc).isoformat(),
                        json.dumps(data),
                    )
                )
                copied += 1
            conn.commit()
        else:  # PostgreSQL
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


