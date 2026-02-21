# BRD Generation Module - API Reference

**Note:** The web UI is the source of truth and controls the execution flow.

## Module Overview

The BRD module provides a set of functions to be called by the frontend after data ingestion is complete. The module handles:
1. BRD section generation from ingested signals
2. Semantic validation
3. Markdown export
4. PDF export

---

## Core Functions

### `run_full_pipeline(session_id: str) -> dict`

Executes the complete BRD generation and validation pipeline.

**Call this after the user has ingested data and confirmed the filtered signals.**

**Parameters:**
- `session_id` (str): Unique session identifier

**Returns:**
```python
{
    "snapshot_id": "abc123...",      # Version identifier
    "status": "completed",            # "completed" or "failed"
    "validation_status": "completed", # "completed" or "failed" 
    "error": None                     # Error message if failed
}
```

**Example:**
```python
from brd_module.main import run_full_pipeline

result = run_full_pipeline("session-001")
if result["status"] == "completed":
    print(f"Generated snapshot: {result['snapshot_id']}")
    if result["validation_status"] == "completed":
        print("Validation passed - ready for export")
```

---

### `generate_brd(session_id: str) -> dict`

Generate BRD sections only (without validation).

**Parameters:**
- `session_id` (str): Unique session identifier

**Returns:**
```python
{
    "snapshot_id": "abc123...",  # Version identifier
    "status": "completed",        # "completed" or "failed"
    "error": None                 # Error message if failed
}
```

---

### `validate_brd_sections(session_id: str) -> dict`

Run semantic validation on already-generated sections.

**Parameters:**
- `session_id` (str): Unique session identifier

**Returns:**
```python
{
    "status": "completed",  # "completed" or "failed"
    "error": None           # Error message if failed
}
```

---

### `export_markdown(session_id: str, title: str = "Business Requirements Document") -> str`

Export the BRD as Markdown text.

**Parameters:**
- `session_id` (str): Unique session identifier
- `title` (str, optional): Document title (default: "Business Requirements Document")

**Returns:**
- Markdown string with full BRD content

**Example:**
```python
from brd_module.main import export_markdown

markdown_text = export_markdown("session-001", title="Project Alpha BRD")
# Use to display in UI or save as .md file
```

---

### `export_pdf(session_id: str, title: str = "Business Requirements Document") -> bytes`

Export the BRD as PDF bytes.

**Automatic Formatting:**
- **Headings**: H1-H6 with progressive sizing and blue color scheme
- **Bold text**: Automatically styled dark and bold (**text**)
- **Italic text**: Automatically styled in gray (*text*)
- **Code blocks**: Light gray background with syntax preservation
- **Tables**: Professional styling with alternating row colors
- **Blockquotes**: Blue left border with light blue background
- **Highlight markers**: Color-coded highlights for important text:
  - `[CRITICAL: ...]` → Red highlight
  - `[SUCCESS: ...]` → Green highlight
  - `[INFO: ...]` → Blue highlight
  - `[WARNING: ...]` → Yellow highlight
- **Emojis**: Icons like 🔴 🟡 🔵 are sized and spaced properly
- **Page breaks**: Automatic for tables, code blocks, and large headings

**Parameters:**
- `session_id` (str): Unique session identifier
- `title` (str, optional): Document title (default: "Business Requirements Document")

**Returns:**
- PDF bytes (can be written to file or streamed to user)

**Raises:**
- `ImportError`: If weasyprint is not installed

**Example:**
```python
from brd_module.main import export_pdf

pdf_bytes = export_pdf("session-001", title="Project Alpha - Final BRD")

# Save to file
with open("brd_output.pdf", "wb") as f:
    f.write(pdf_bytes)

# Or stream to frontend via HTTP
from flask import send_file
from io import BytesIO
return send_file(BytesIO(pdf_bytes), mimetype="application/pdf", download_name="brd.pdf")
```

---

### `export_docx(session_id: str, title: str = "Business Requirements Document", template_path: str = None) -> bytes`

Export the BRD as DOCX using template format.

**Template-Based Generation:**
- Automatically detects `brd.docx` template in the BRD module directory
- Fills template placeholders with BRD content
- Falls back to generating DOCX from scratch if no template found

**Supported Placeholders in Template:**
```
{TITLE}                     → Document title
{SESSION_ID}                → Session identifier
{GENERATED_DATE}            → Generation timestamp
{EXECUTIVE_SUMMARY}         → Executive summary section
{FUNCTIONAL_REQUIREMENTS}   → Functional requirements section
{STAKEHOLDER_ANALYSIS}      → Stakeholder analysis section
{TIMELINE}                  → Project timeline section
{DECISIONS}                 → Key decisions section
{ASSUMPTIONS}               → Assertions & assumptions section
{SUCCESS_METRICS}           → Success metrics section
```

**Example Template Structure:**
Your `brd.docx` template can contain:
```
# {TITLE}

Session: {SESSION_ID}
Generated: {GENERATED_DATE}

## Executive Summary
{EXECUTIVE_SUMMARY}

## Functional Requirements
{FUNCTIONAL_REQUIREMENTS}

## Stakeholder Analysis
{STAKEHOLDER_ANALYSIS}

... and so on
```

**Parameters:**
- `session_id` (str): Unique session identifier
- `title` (str, optional): Document title (default: "Business Requirements Document")
- `template_path` (str, optional): Optional path to custom template. If None, auto-detects `brd.docx`

**Returns:**
- DOCX bytes (can be written to file or streamed to user)

**Raises:**
- `ImportError`: If python-docx is not installed

**Example:**
```python
from brd_module.main import export_docx

# Auto-detects brd.docx template
docx_bytes = export_docx("session-001", title="Project Alpha BRD")

# Save to file
with open("brd_output.docx", "wb") as f:
    f.write(docx_bytes)

# Or use custom template
docx_bytes = export_docx(
    "session-001",
    template_path="/path/to/custom_template.docx"
)

# Stream to frontend
from fastapi.responses import StreamingResponse
return StreamingResponse(
    iter([docx_bytes]),
    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    headers={"Content-Disposition": "attachment; filename=brd.docx"}
)
```

---

---

## Typical Frontend Flow

```
1. User uploads/connects data sources
   ↓
2. Frontend calls noise filter module
   ↓
3. User reviews filtered items
   ↓
4. Frontend calls: run_full_pipeline(session_id)
   ↓
5. Pipeline returns snapshot_id + validation status
   ↓
6. User clicks "Export"
   ├─ Frontend calls: export_markdown(session_id) [optional]
   └─ Frontend calls: export_pdf(session_id)
   ↓
7. Frontend serves file to user
```

---

## Installation & Dependencies

**Required:**
```bash
pip install -r requirements.txt
```

**For PDF export:**
```bash
pip install weasyprint markdown
```

Or use the dedicated file:
```bash
pip install -r requirements-pdf.txt
```

---

## State Model

- **Append-only versioning**: Each generation creates a new snapshot
- **Rollback**: Select an earlier snapshot_id to retrieve that version
- **No round-trip editing**: Export is snapshot-only (read-only)
- **Validation flags**: Are attached to a session, not locked

---

## Error Handling

All functions return dictionaries with an `"error"` field. Check `status` before proceeding:

```python
result = run_full_pipeline(session_id)
if result["status"] == "failed":
    print(f"Error: {result['error']}")
    # Show error to user
else:
    # Proceed with export
```

---

## API Design Principles

✓ **Stateless functions**: Idempotent calls, no side effects  
✓ **Explicit returns**: All data flows through return values  
✓ **No CLI parsing**: Frontend controls execution flow  
✓ **Web-UI driven**: The UI is the source of truth  
✓ **Module-importable**: Clean Python functions, no subprocess calls  
