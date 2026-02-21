"""
Example: BRD Module Integration with FastAPI

This demonstrates how the frontend backend should integrate with the BRD module.
Adapt this pattern to your framework (Flask, Django, etc.).

SETUP:
------
Before running this example, install dependencies:
    pip install -r ../requirements-api.txt    # FastAPI + uvicorn
    pip install -r requirements.txt            # BRD module core
    pip install -r ../requirements-pdf.txt     # PDF export (optional)

RUNNING:
--------
    uvicorn example_integration:app --reload
    
Then visit: http://localhost:8000/docs (interactive API docs)
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
from io import BytesIO

# Import BRD module functions (relative import - same directory)
from main import (
    run_full_pipeline,
    generate_brd,
    validate_brd_sections,
    export_markdown,
    export_pdf,
    export_docx
)

app = FastAPI(title="BRD Generation API")


# ============================================================================
# Request/Response Models
# ============================================================================

class BRDGenerationRequest(BaseModel):
    session_id: str
    title: Optional[str] = "Business Requirements Document"


class PipelineResponse(BaseModel):
    snapshot_id: Optional[str]
    status: str  # "completed" or "failed"
    validation_status: Optional[str]
    error: Optional[str]


# ============================================================================
# Pipeline Endpoints
# ============================================================================

@app.post("/api/brd/generate", response_model=PipelineResponse)
async def api_generate_brd(request: BRDGenerationRequest):
    """
    Trigger BRD generation after user has confirmed filtered signals.
    
    POST /api/brd/generate
    {
        "session_id": "session-001",
        "title": "Project Alpha BRD"
    }
    """
    result = generate_brd(request.session_id)
    
    if result["status"] == "failed":
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result


@app.post("/api/brd/pipeline", response_model=PipelineResponse)
async def api_run_pipeline(request: BRDGenerationRequest):
    """
    Run complete pipeline: generate + validate.
    
    POST /api/brd/pipeline
    {
        "session_id": "session-001"
    }
    """
    result = run_full_pipeline(request.session_id)
    
    if result["status"] == "failed":
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result


@app.post("/api/brd/validate")
async def api_validate_brd(session_id: str):
    """
    Validate already-generated BRD sections.
    
    POST /api/brd/validate?session_id=session-001
    """
    result = validate_brd_sections(session_id)
    
    if result["status"] == "failed":
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"status": "completed", "message": "Validation passed"}


# ============================================================================
# Export Endpoints
# ============================================================================

@app.get("/api/brd/export/markdown")
async def api_export_markdown(session_id: str, title: str = "Business Requirements Document"):
    """
    Export BRD as Markdown text.
    
    GET /api/brd/export/markdown?session_id=session-001&title=Project%20Alpha
    
    Returns: Markdown text (Content-Type: text/markdown)
    """
    try:
        markdown_text = export_markdown(session_id, title)
        return {
            "content": markdown_text,
            "format": "markdown",
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/brd/export/pdf")
async def api_export_pdf(session_id: str, title: str = "Business Requirements Document"):
    """
    Export BRD as PDF file.
    
    GET /api/brd/export/pdf?session_id=session-001&title=Project%20Alpha
    
    Returns: PDF file for download
    """
    try:
        pdf_bytes = export_pdf(session_id, title)
        
        # Stream PDF to user
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=brd_{session_id}.pdf"}
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF export requires weasyprint. Install: pip install weasyprint"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/brd/export/docx")
async def api_export_docx(session_id: str, title: str = "Business Requirements Document"):
    """
    Export BRD as DOCX file (using template if available).
    
    GET /api/brd/export/docx?session_id=session-001&title=Project%20Alpha
    
    Auto-detects template at: brd Module/brd.docx
    Falls back to generating DOCX from scratch if template not found.
    
    Returns: DOCX file for download with professional formatting
    """
    try:
        docx_bytes = export_docx(session_id, title)
        
        # Stream DOCX to user
        return StreamingResponse(
            iter([docx_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=brd_{session_id}.docx"}
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="DOCX export requires python-docx. Install: pip install python-docx"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Health Check
# ============================================================================

@app.get("/api/health")
async def health_check():
    """Verify BRD module is accessible."""
    return {"status": "ok", "service": "brd-generation"}


# ============================================================================
# Usage Examples (for testing)
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Run with: uvicorn example_integration:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)


"""
=============================================================================
CURL Examples for Testing:
=============================================================================

1. Run full pipeline:
   curl -X POST http://localhost:8000/api/brd/pipeline \
     -H "Content-Type: application/json" \
     -d '{"session_id": "session-001"}'

2. Generate BRD only:
   curl -X POST http://localhost:8000/api/brd/generate \
     -H "Content-Type: application/json" \
     -d '{"session_id": "session-001", "title": "Project Alpha BRD"}'

3. Validate sections:
   curl -X POST "http://localhost:8000/api/brd/validate?session_id=session-001"

4. Export as Markdown:
   curl -X GET "http://localhost:8000/api/brd/export/markdown?session_id=session-001" \
     > output.md

5. Export as PDF:
   curl -X GET "http://localhost:8000/api/brd/export/pdf?session_id=session-001" \
     > output.pdf

=============================================================================
Frontend (React/Vue) Integration Example:
=============================================================================

// After user confirms filtered signals
async function generateBRD(sessionId) {
  const response = await fetch('/api/brd/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId })
  });
  
  const result = await response.json();
  
  if (result.status === 'completed') {
    console.log('BRD generated:', result.snapshot_id);
    // Show export buttons
  }
}

// Export to PDF
async function downloadPDF(sessionId) {
  const response = await fetch(`/api/brd/export/pdf?session_id=${sessionId}`);
  const blob = await response.blob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brd_${sessionId}.pdf`;
  a.click();
}

// Export to Markdown
async function viewMarkdown(sessionId) {
  const response = await fetch(`/api/brd/export/markdown?session_id=${sessionId}`);
  const data = await response.json();
  
  // Display markdown in editor or preview
  showMarkdownPreview(data.content);
}
"""
