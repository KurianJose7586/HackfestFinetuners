import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict

from brd_module.storage import get_connection, get_latest_brd_sections

def _get_cursor(conn, db_type, dict_cursor=False):
    if db_type == "postgres" and dict_cursor:
        from psycopg2.extras import RealDictCursor
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()

def create_new_version(
    session_id: str,
    edit_id: Optional[str],
    section_name: str,
    content: str,
    origin: str,
    snapshot_id: Optional[str] = None
) -> str:
    """Stores a new version of a BRD section, bridging the gap between old and new state."""
    conn, db_type = get_connection()
    try:
        # Get latest version number
        cur = _get_cursor(conn, db_type)
        query = "SELECT MAX(version_number) FROM brd_sections WHERE session_id = %s AND section_name = %s"
        if db_type == "sqlite": query = query.replace("%s", "?")
        cur.execute(query, (session_id, section_name))
        row = cur.fetchone()
        version_number = (row[0] or 0) + 1
        
        # If snapshot_id is missing, try to inherit from latest section in this session
        if not snapshot_id:
            query = "SELECT snapshot_id FROM brd_sections WHERE session_id = %s ORDER BY version_number DESC LIMIT 1"
            if db_type == "sqlite": query = query.replace("%s", "?")
            cur.execute(query, (session_id,))
            row = cur.fetchone()
            snapshot_id = row[0] if row else "adhoc-snapshot"

        version_id = str(uuid.uuid4())
        
        # We'll use the existing brd_sections table but ensure we have the new logic
        query = """
            INSERT INTO brd_sections (
                section_id, session_id, snapshot_id, section_name, 
                version_number, content, source_chunk_ids, human_edited, generated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        if db_type == "sqlite": query = query.replace("%s", "?")
        
        cur.execute(query, (
            version_id, session_id, snapshot_id, section_name, 
            version_number, content, json.dumps([]), (origin == "human"), 
            datetime.now(timezone.utc)
        ))
        conn.commit()
    finally:
        conn.close()
    return version_id

def is_section_locked(session_id: str, section_name: str) -> bool:
    conn, db_type = get_connection()
    try:
        cur = _get_cursor(conn, db_type)
        query = "SELECT human_edited FROM brd_sections WHERE session_id = %s AND section_name = %s ORDER BY version_number DESC LIMIT 1"
        if db_type == "sqlite": query = query.replace("%s", "?")
        cur.execute(query, (session_id, section_name))
        row = cur.fetchone()
        return bool(row[0]) if row else False
    finally:
        conn.close()

def get_section_content(session_id: str, section_name: str) -> str:
    conn, db_type = get_connection()
    try:
        cur = _get_cursor(conn, db_type)
        query = "SELECT content FROM brd_sections WHERE session_id = %s AND section_name = %s ORDER BY version_number DESC LIMIT 1"
        if db_type == "sqlite": query = query.replace("%s", "?")
        cur.execute(query, (session_id, section_name))
        row = cur.fetchone()
        return row[0] if row else ""
    finally:
        conn.close()

def get_current_snapshot_id(session_id: str) -> str:
    from brd_module.storage import get_current_snapshot_id
    return get_current_snapshot_id(session_id)
