import os
import sys
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(PROJECT_ROOT)

from brd_module.brd_pipeline import run_brd_generation
from brd_module.validator import validate_brd
from brd_module.exporter import export_brd, export_brd_to_docx
from brd_module.storage import get_latest_brd_sections, store_brd_section, get_connection

router = APIRouter(
    prefix="/sessions/{session_id}/brd",
    tags=["BRD"]
)

class EditSectionRequest(BaseModel):
    content: str
    snapshot_id: str

@router.post("/generate")
def generate_brd(session_id: str):
    """
    Trigger the multi-agent BRD generation pipeline synchronously.
    Runs all 7 agents (in parallel internally) and only returns 200 when
    all brd_sections rows are written. This avoids polling from the frontend.
    """
    try:
        # run_brd_generation is synchronous — it uses ThreadPoolExecutor internally
        # and only returns once all sections are stored.
        snapshot_id = run_brd_generation(session_id)
        # Validate immediately after generation completes
        validate_brd(session_id)
        return {"message": "BRD generation and validation completed.", "snapshot_id": snapshot_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def get_brd(session_id: str):
    """
    Retrieve the latest generated BRD sections and validation flags.
    """
    sections = get_latest_brd_sections(session_id)

    conn = get_connection()
    flags = []
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT section_name, flag_type, severity, description 
                FROM brd_validation_flags 
                WHERE session_id = %s
                ORDER BY severity DESC
            """, (session_id,))
            for r in cur.fetchall():
                flags.append({
                    "section_name": r[0],
                    "flag_type": r[1],
                    "severity": r[2],
                    "description": r[3]
                })
    except Exception:
        pass
    finally:
        conn.close()

    return {"session_id": session_id, "sections": sections, "flags": flags}

@router.put("/sections/{section_name}")
def edit_brd_section(session_id: str, section_name: str, body: EditSectionRequest):
    """
    Allow a human to manually edit a section (locks the section so AI won't overwrite it).
    """
    try:
        store_brd_section(
            session_id=session_id,
            snapshot_id=body.snapshot_id,
            section_name=section_name,
            content=body.content,
            source_chunk_ids=[],
            human_edited=True
        )
        return {"message": f"Section {section_name} updated successfully by human."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
def export_brd_document(session_id: str, format: str = "markdown"):
    """
    Export the compiled BRD document as a downloadable file.
    
    - format=markdown → returns .md file as text/plain download
    - format=docx     → returns .docx binary (requires python-docx)
    """
    try:
        if format == "docx":
            docx_bytes = export_brd_to_docx(session_id)
            return Response(
                content=docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename=brd_{session_id}.docx"
                }
            )
        else:
            # Default: Markdown as a downloadable text file
            markdown = export_brd(session_id)
            return Response(
                content=markdown.encode("utf-8"),
                media_type="text/plain",
                headers={
                    "Content-Disposition": f"attachment; filename=brd_{session_id}.md"
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
