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
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (chunk_id) DO NOTHING;
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
                
            cur.executemany(insert_query, values)
        conn.commit()
    finally:
        conn.close()

def get_active_signals() -> List[ClassifiedChunk]:
    """Retrieves all chunks that are either true signals or were manually restored from noise."""
    conn = get_connection()
    results = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
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

def get_noise_items() -> List[ClassifiedChunk]:
    """Retrieves chunks that are suppressed (noise) and haven't been manually restored."""
    conn = get_connection()
    results = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
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
