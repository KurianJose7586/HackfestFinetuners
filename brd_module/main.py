"""
BRD Generation Module - API for Frontend Integration

This module provides core functions for BRD generation, validation, and export.
The web UI is the source of truth and controls the execution flow.

Exported Functions:
- generate_brd(session_id) -> dict
- validate_brd_sections(session_id) -> dict  
- export_markdown(session_id, title) -> str
- export_pdf(session_id, title) -> bytes
- export_docx(session_id, title, template_path) -> bytes
"""
import sys
import os
from brd_module.brd_pipeline import run_brd_generation
from brd_module.validator import validate_brd
from brd_module.exporter import export_brd, export_brd_to_pdf, export_brd_to_docx


def generate_brd(session_id: str) -> dict:
    """
    Generate BRD sections from ingested data.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        dict with keys:
            - snapshot_id: Version identifier for this generation
            - status: "completed" or "failed"
            - error: Error message if failed
    """
    try:
        snapshot_id = run_brd_generation(session_id)
        return {
            "snapshot_id": snapshot_id,
            "status": "completed",
            "error": None
        }
    except Exception as e:
        return {
            "snapshot_id": None,
            "status": "failed",
            "error": str(e)
        }


def validate_brd_sections(session_id: str) -> dict:
    """
    Run semantic validation on generated BRD sections.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        dict with keys:
            - status: "completed" or "failed"
            - validation_flags: List of flags if any
            - error: Error message if failed
    """
    try:
        validate_brd(session_id)
        return {
            "status": "completed",
            "error": None
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


def export_markdown(session_id: str, title: str = "Business Requirements Document") -> str:
    """
    Export BRD as Markdown.
    
    Args:
        session_id: Unique session identifier
        title: Document title
        
    Returns:
        Markdown string
    """
    return export_brd(session_id, title)


def export_pdf(session_id: str, title: str = "Business Requirements Document") -> bytes:
    """
    Export BRD as PDF.
    
    Args:
        session_id: Unique session identifier
        title: Document title
        
    Returns:
        PDF bytes
        
    Raises:
        ImportError: If weasyprint is not installed
    """
    return export_brd_to_pdf(session_id, output_file=None, title=title)


def export_docx(session_id: str, title: str = "Business Requirements Document", template_path: str = None) -> bytes:
    """
    Export BRD as DOCX using template if available.
    
    Template-based approach:
    - If template found at template_path or auto-detected 'brd.docx', uses that format
    - Template can contain placeholders: {TITLE}, {SESSION_ID}, {EXECUTIVE_SUMMARY}, etc.
    - Falls back to generating DOCX from scratch if no template found
    
    Args:
        session_id: Unique session identifier
        title: Document title
        template_path: Optional path to brd.docx template file. 
                      If None, looks for 'brd.docx' in BRD module directory
        
    Returns:
        DOCX bytes
        
    Raises:
        ImportError: If python-docx is not installed
    """
    return export_brd_to_docx(session_id, output_file=None, title=title, template_path=template_path)


def run_full_pipeline(session_id: str) -> dict:
    """
    Run the complete BRD generation pipeline (generation + validation).
    
    This is called by the frontend after data ingestion is complete.
    The frontend then decides whether to export and in which formats.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        dict with keys:
            - snapshot_id: Version identifier
            - status: "completed" or "failed"
            - validation_status: "completed" or "failed"
            - error: Error message if failed
    """
    # Step 1: Generate BRD sections
    gen_result = generate_brd(session_id)
    if gen_result["status"] == "failed":
        return {
            "snapshot_id": None,
            "status": "failed",
            "validation_status": None,
            "error": f"Generation failed: {gen_result['error']}"
        }
    
    # Step 2: Validate sections
    val_result = validate_brd_sections(session_id)
    
    return {
        "snapshot_id": gen_result["snapshot_id"],
        "status": "completed",
        "validation_status": val_result["status"],
        "error": val_result.get("error")
    }
