import sys
import os

# Add parent directory to path since we are in the brd Module folder
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from exporter import export_brd_to_pdf, export_brd_to_docx

# Using the session ID from your open markdown file
session_id = "c00387ab-855b-4055-a8ac-fc28550dd619"

print(f"Testing PDF and DOCX export for session: {session_id}")

try:
    print("Exporting to PDF...")
    pdf_file = f"brd_output_{session_id}.pdf"
    export_brd_to_pdf(session_id, output_file=pdf_file)
    print(f"✅ Successfully created {pdf_file}")
except Exception as e:
    print(f"❌ Failed to create PDF: {e}")

try:
    print("Exporting to DOCX...")
    docx_file = f"brd_output_{session_id}.docx"
    export_brd_to_docx(session_id, output_file=docx_file)
    print(f"✅ Successfully created {docx_file}")
except Exception as e:
    print(f"❌ Failed to create DOCX: {e}")
