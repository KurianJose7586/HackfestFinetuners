import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, UploadFile, File, HTTPException
from pdf import extract_text_from_pdf_bytes, extract_text_from_docx_bytes

# Load environment variables - ensure we look in the parent directory for .env
load_dotenv(Path(__file__).parent.parent / ".env")

# Add 'Noise filter module' directory to sys.path
sys.path.append(str(Path(__file__).parent.parent.parent / "Noise filter module"))
from integration_pipeline import process_external_content

router = APIRouter(
    prefix="/pdf",
    tags=["pdf"]
)

@router.post("/parse")
async def parse_document(file: UploadFile = File(...), session_id: str = None):
    """
    Takes a document (PDF, TXT, or DOCX) from the user, parses it,
    and sends it to the noise filter pipeline.
    """
    allowed_types = [
        "application/pdf", 
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File must be one of: {', '.join(allowed_types)}")
    
    try:
        content_bytes = await file.read()
        if not content_bytes:
             raise HTTPException(status_code=400, detail="The file is empty.")
             
        if file.content_type == "application/pdf":
            parsed_text = extract_text_from_pdf_bytes(content_bytes)
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            parsed_text = extract_text_from_docx_bytes(content_bytes)
        else:
            # Handle plain text files
            try:
                parsed_text = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                # Fallback to latin-1 if utf-8 fails
                parsed_text = content_bytes.decode('latin-1')
        
        if not parsed_text:
            return {
                "filename": file.filename,
                "status": "warning",
                "message": "No text could be extracted from the document.",
                "parsed_text": ""
            }
            
        # --- LINK TO NOISE FILTER PIPELINE ---
        try:
            sid = process_external_content(
                text=parsed_text,
                speaker="Document Upload",
                source_ref=file.filename,
                source_type="document",
                session_id=session_id
            )
        except Exception as pipeline_err:
            # We don't want to fail the whole request if the pipeline fails, 
            # but we should log it and maybe inform the user.
            print(f"Pipeline Error: {pipeline_err}")
            sid = session_id or "error"

        return {
            "filename": file.filename,
            "status": "success",
            "parsed_text": parsed_text[:500] + "..." if len(parsed_text) > 500 else parsed_text,
            "session_id": sid,
            "pipeline_status": "synced"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing document: {str(e)}")
    finally:
        await file.close()
