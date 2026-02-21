import os
import sys
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import markdown

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

# CSS stylesheet for HTML rendering
BRD_HTML_STYLES = """
<style>
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
}

.brd-section {
    background-color: white;
    margin-bottom: 30px;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.section-title {
    border-bottom: 3px solid #0066cc;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

h1 {
    color: #0066cc;
    font-size: 2.2em;
    margin-top: 0;
}

h2 {
    color: #0066cc;
    font-size: 1.8em;
    margin-top: 25px;
    margin-bottom: 15px;
}

h3 {
    color: #0099ff;
    font-size: 1.4em;
    margin-top: 20px;
    margin-bottom: 12px;
}

h4, h5, h6 {
    color: #333;
    margin-top: 15px;
    margin-bottom: 10px;
}

p {
    margin-bottom: 12px;
}

ul, ol {
    margin-bottom: 15px;
    padding-left: 30px;
}

li {
    margin-bottom: 8px;
}

code {
    background-color: #f4f4f4;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    color: #d63384;
}

pre {
    background-color: #f4f4f4;
    padding: 15px;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 15px;
}

pre code {
    color: #000;
    padding: 0;
}

blockquote {
    border-left: 4px solid #0066cc;
    padding-left: 15px;
    margin: 0 0 15px 0;
    color: #666;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
}

table th {
    background-color: #0066cc;
    color: white;
    padding: 12px;
    text-align: left;
}

table td {
    border: 1px solid #ddd;
    padding: 12px;
}

table tr:nth-child(even) {
    background-color: #f9f9f9;
}

.flag-warning {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 12px;
    margin-bottom: 15px;
    border-radius: 4px;
}

.flag-error {
    background-color: #f8d7da;
    border-left: 4px solid #dc3545;
    padding: 12px;
    margin-bottom: 15px;
    border-radius: 4px;
}
</style>
"""

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
def get_brd(session_id: str, format: str = "html"):
    """
    Retrieve the latest generated BRD sections and validation flags.
    
    - format=html (default) → returns sections as HTML with proper styling
    - format=markdown → returns raw markdown content
    """
    sections = get_latest_brd_sections(session_id)
    
    # Convert markdown to HTML if requested
    if format.lower() == "html":
        html_sections = {}
        for section_name, content in sections.items():
            html_sections[section_name] = markdown.markdown(
                content,
                extensions=['tables', 'fenced_code', 'toc']
            )
        sections = html_sections

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

    return {
        "session_id": session_id,
        "format": format.lower(),
        "sections": sections,
        "flags": flags
    }

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
    - format=html     → returns .html file with styling
    - format=docx     → returns .docx binary (requires python-docx)
    """
    try:
        sections = get_latest_brd_sections(session_id)
        
        if format == "html":
            # Build HTML with embedded styles
            html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BRD - {session_id}</title>
    {BRD_HTML_STYLES}
</head>
<body>
    <h1>Business Requirements Document</h1>
    <p><strong>Session ID:</strong> {session_id}</p>
    <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;">
"""
            for section_name, content in sections.items():
                html_content += f'''
    <div class="brd-section">
        <div class="section-title"><h2>{section_name.replace("_", " ").title()}</h2></div>
        {markdown.markdown(content, extensions=['tables', 'fenced_code', 'toc'])}
    </div>
'''
            html_content += """
</body>
</html>
"""
            return Response(
                content=html_content.encode("utf-8"),
                media_type="text/html",
                headers={
                    "Content-Disposition": f"attachment; filename=brd_{session_id}.html"
                }
            )
        elif format == "docx":
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
            markdown_content = export_brd(session_id)
            return Response(
                content=markdown_content.encode("utf-8"),
                media_type="text/plain",
                headers={
                    "Content-Disposition": f"attachment; filename=brd_{session_id}.md"
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
