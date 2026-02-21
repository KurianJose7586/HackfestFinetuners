import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from exporter import export_brd_to_docx

session_id = "c00387ab-855b-4055-a8ac-fc28550dd619"
print(f"Testing DOCX export for session: {session_id}")

try:
    docx_file = f"brd_output_{session_id}.docx"
    export_brd_to_docx(session_id, output_file=docx_file)
    print(f"✅ Successfully created {docx_file}")
except Exception as e:
    print(f"❌ Failed to create DOCX: {e}")
