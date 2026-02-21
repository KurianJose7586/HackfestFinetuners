# BRD Module - Backend Integration Guide (Hackathon Edition)

This is the **BRD Generation module**, a backend component that generates professional Business Requirements Documents from ingested and filtered signals.

**Key Principle:** The web UI is always the source of truth. This module is called by the frontend after data ingestion and filtering are complete.

**Scope:** Built for hackathon speed and feasibility. See `CompleteProjectDoc.md` for the full architecture philosophy.

---

## Architecture Overview

```
Frontend (Web UI)
    ↓
[Data Ingestion & Filtering]
    ↓
user confirms filtered signals
    ↓
Frontend calls: run_full_pipeline(session_id)
    ↓
BRD Module (this folder)
├── brd_pipeline.py      → Generate BRD sections
├── validator.py         → Semantic validation
├── exporter.py          → Markdown & PDF export
└── main.py              → Module API functions
    ↓
Returns: snapshot_id + validation status
    ↓
Frontend shows export options
    ↓
User clicks "Download PDF" or "View Markdown"
    ↓
Frontend calls: export_pdf() or export_markdown()
    ↓
File served to user
```

---

## Module Components

| File | Purpose |
|------|---------|
| **main.py** | Core API functions (generate, validate, export) |
| **brd_pipeline.py** | BRD section generation from signals |
| **validator.py** | Semantic validation & conflict detection |
| **exporter.py** | Markdown & PDF export with styling |
| **storage.py** | Database interaction for AKS & BRD storage |
| **schema.py** | Data models & database schema |
| **API.md** | Complete API reference for frontend |
| **requirements.txt** | Base dependencies |

---

## Installation (Quick Start - 5 minutes)

### 1. Install Core Dependencies
```bash
cd "brd Module"
pip install -r requirements.txt
```

### 2. Install All Export Formats (PDF + DOCX)
```bash
pip install -r ../requirements-full.txt
```

Or install individually:
```bash
# PDF export
pip install -r ../requirements-pdf.txt

# DOCX export (template-based)
pip install python-docx

# FastAPI example
pip install -r ../requirements-api.txt
```

### 3. Set Up Database (PostgreSQL)
```bash
# Create .env file in HackfestFinetuners root
echo "DATABASE_URL=postgresql://user:password@localhost/hackfest_db" > ../.env
```

**Don't have PostgreSQL?** For hackathon demo, use SQLite or in-memory mock:
```bash
# Alternative: Use SQLite for quick demo (modify storage.py to use sqlite3)
# Or: Use environment variable to mock data stores (see example_integration.py)
```

---

## Quick Start: Integrating with Your Frontend

### Fastest Path: Use the Example FastAPI Server
```bash
# Install API dependencies
pip install -r ../requirements-api.txt

# Run the example server
cd "brd Module"
uvicorn example_integration:app --reload

# Visit: http://localhost:8000/docs (interactive Swagger UI)
```

Then test with:
```bash
curl -X POST http://localhost:8000/api/brd/, runnable example with all endpoints \
  -H "Content-Type: application/json" \
  -d '{"session_id": "demo-001"}'
```

---

### Option A: FastAPI (Recommended for Hackathon)
```python
from fastapi import FastAPI
from brd_module.main import run_full_pipeline, export_pdf, export_markdown

app = FastAPI()

@app.post("/api/brd/generate")
async def generate(session_id: str):
    result = run_full_pipeline(session_id)
    return result

@app.get("/api/brd/export/pdf")
async def download_pdf(session_id: str):
    pdf_bytes = export_pdf(session_id)
    return StreamingResponse(iter([pdf_bytes]), media_type="application/pdf")
```

See `example_integration.py` for a complete example.

### Option B: Flask
```python
from flask import Flask, jsonify
from brd_module.main import run_full_pipeline

app = Flask(__name__)

@app.route("/api/brd/generate", methods=["POST"])
def generate_brd():
    session_id = request.json["session_id"]
    result = run_full_pipeline(session_id)
    return jsonify(result)
```

### Option C: Django
```python
from django.http import JsonResponse
from brd_module.main import run_full_pipeline

def generate_brd(request):
    session_id = request.POST.get("session_id")
    result = run_full_pipeline(session_id)
    return JsonResponse(result)
```

---

## Module Functions (API)

All functions are in `main.py`. Import them from your backend:

```python
from brd_module.main import (
    run_full_pipeline,       # Generation + Validation
    generate_brd,            # Generation only
    validate_brd_sections,   # Validation only
    export_markdown,         # Export to .md
    export_pdf,              # Export to .pdf (with styling)
    export_docx              # Export to .docx (template-based)
)
```

### Main Function: `run_full_pipeline(session_id)`

Called after user confirms filtered signals. Runs generation + validation.

```python
result = run_full_pipeline("session-001")
# {
#     "snapshot_id": "abc123...",
#     "status": "completed",
#     "validation_status": "completed",
#     "error": None
# }
```

### Export Functions

```python
# Get Markdown content
md_text = export_markdown(session_id, title="My BRD")

# Get PDF bytes (for download)
pdf_bytes = export_pdf(session_id, title="My BRD")

# Get DOCX bytes (uses template if available)
docx_bytes = export_docx(session_id, title="My BRD")
# Auto-detects brd.docx template in module directory
```

For detailed API reference, see **API.md** in this folder.

---

## State Model

- **Linear versioning**: Each generation creates a new snapshot
- **Snapshots are immutable**: Previous versions can always be retrieved
- **No round-trip editing**: Export is read-only (users edit in the UI, not in exported files)
- **Validation flags**: Attached to a session, user can acknowledge or refine

---

## Error Handling

All functions return dictionaries with `status` and `error` fields:

```python
result = run_full_pipeline(session_id)

if result["status"] == "failed":
    # Handle error
    error_msg = result["error"]
    show_error_to_user(error_msg)
else:
    # Proceed
    snapshot_id = result["snapshot_id"]
```

---

## Data Flow

### Input
The module expects:
- A valid `session_id` referencing an existing BRD session
- Pre-ingested and filtered signals in the Attributed Knowledge Store (AKS)
- Validation flags (if any) already populated

### Processing
1. **Generate**: Each section agent reads frozen AKS snapshot and generates its section
2. **Validate**: Semantic validation checks for conflicts and gaps
3. **Export**: Markdown or PDF is composed from latest snapshot

### Output
- **Markdown**: Plain text with formatting, ready for preview or .md file
- **PDF**: Professional styled document, ready for download or print
- **Status**: Indicates success/failure with detailed error messages

---

## Testing

```bash
# Test with Python directly
python -c "
from brd_module.main import run_full_pipeline, export_docx, export_pdf
result = run_full_pipeline('test-session-001')
print(result)

# Test DOCX export with template
docx_bytes = export_docx('test-session-001')
print('DOCX export:', len(docx_bytes), 'bytes')
"
```

Or use the FastAPI example:
```bash
# Run example server
cd brd\ Module
uvicorn example_integration:app --reload

# In another terminal:
curl -X POST http://localhost:8000/api/brd/pipeline \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-001"}'

# Test DOCX export (uses template)
curl http://localhost:8000/api/brd/export/docx?session_id=test-001 > output.docx

# Test PDF export
curl http://localhost:8000/api/brd/export/pdf?session_id=test-001 > output.pdf
```

## PDF Export Features

The PDF export **automatically detects and formats:**

✅ **Headings** - H1 through H6 with progressive sizing and color gradients  
✅ **Bold Text** - `**text**` renders dark and bold  
✅ **Italic Text** - `*text*` renders in gray italics  
✅ **Code Blocks** - Monospace with light gray background  
✅ **Tables** - Professional layout with alternating row colors  
✅ **Blockquotes** - Blue left border with light background  
✅ **Color-Coded Highlights** - Special markers like `[CRITICAL: ...]` get color backgrounds:
  - `[CRITICAL: ...]` → Red
  - `[SUCCESS: ...]` → Green  
  - `[INFO: ...]` → Blue
  - `[WARNING: ...]` → Yellow
✅ **Emojis** - Icons like 🔴 🟡 🔵 are properly sized and spaced  
✅ **Page Breaks** - Smart breaks for tables and large content blocks  

**Example markdown that renders beautifully in PDF:**
```markdown
# Project Alpha BRD

## Executive Summary
This is a **critical requirement** that needs immediate attention.

[CRITICAL: Deadline is March 15, 2026]

### Key Features
- **Feature A**: High priority (🔴 Important)
- **Feature B**: Medium priority (🟡 Important)
- **Feature C**: Low priority (🔵 Standard)

> **Note:** This is a quote that appears in a blue box
```

**No additional formatting needed** - just use standard Markdown and the PDF will look professional!

---

## DOCX Export Features (Template-Based)

The DOCX export uses your **brd.docx template** to maintain consistent formatting.

✅ **Template Auto-Detection** - Automatically finds `brd.docx` in the BRD module directory  
✅ **Placeholder Mapping** - Fills template with BRD sections:
  - `{TITLE}` → Document title
  - `{SESSION_ID}` → Session ID
  - `{GENERATED_DATE}` → Generation timestamp
  - `{EXECUTIVE_SUMMARY}` → Executive summary content
  - `{FUNCTIONAL_REQUIREMENTS}` → Functional requirements
  - `{STAKEHOLDER_ANALYSIS}` → Stakeholder analysis
  - `{TIMELINE}` → Project timeline
  - `{DECISIONS}` → Key decisions
  - `{ASSUMPTIONS}` → Assumptions
  - `{SUCCESS_METRICS}` → Success metrics
✅ **Professional Formatting** - Maintains your template's styles and branding  
✅ **Fallback Generation** - Creates DOCX from scratch if no template found

**Using your template:**
1. Place your formatted `brd.docx` template in the `brd Module` folder
2. Add placeholders like `{EXECUTIVE_SUMMARY}` where you want content
3. Export will automatically fill in the sections

**Export DOCX:**
```python
from brd_module.main import export_docx

docx_bytes = export_docx("session-001", title="Project Alpha BRD")
# Saves with template formatting
```

---

### Direct Python Test
```bash
python -c "
from main import run_full_pipeline
result = run_full_pipeline('demo-session')
print('Status:', result.get('status'))
print('Snapshot:', result.get('snapshot_id'))
"
```

### Using the FastAPI Example (Easiest)
```bash
# Terminal 1: Start the server
cd "brd Module"
uvicorn example_integration:app --reload

# Terminal 2: Test endpoints
curl -X POST http://localhost:8000/api/brd/pipeline \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-001"}'

curl http://localhost:8000/api/brd/export/pdf?session_id=test-001 > output.pdf
```

Visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

---

## Hackathon Considerations

### ✓ What You Get
- Fast BRD generation from signals
- Both Markdown & PDF export
- Semantic validation
- Ready-to-us (In Order of Priority)

1. **Get it running** (5 min)
   ```bash
   pip install -r requirements.txt -r ../requirements-api.txt
   uvicorn example_integration:app --reload
   ```

2. **Test the API** (2 min)
   - Visit http://localhost:8000/docs
   - Click "Try it out" on `/api/brd/pipeline`

- **Architecture Details:** See `CompleteProjectDoc.md` in parent directory
- **API Reference:** See `API.md` in this folder
- **Example Integration:** See `example_integration.py` with full FastAPI implementation
- **Questions?** Check module docstrings: `python -c "from main import run_full_pipeline; help(run_full_pipeline)"`
   - See `API.md` for function signatures
   - See `example_integration.py` for endpoint patterns
   - Adapt to your framework (React, Vue, etc.)

4. **Export PDFs** (optional)
   - If weasyprint install fails, fall back to Markdown export
   - PDF is nice-to-have, not critical for hackathon

5. **Demo** 
   - Use the FastAPI Swagger UI to show generation pipeline
   - Download PDF as proof data)
- **Demo-level security** (not production-ready)

See `CompleteProjectDoc.md` for detailed design decisions and risk register.

---

## Troubleshooting (Hackathon Edition)

✓ **State-driven, not CLI-driven**: Module exposes functions, not CLI commands  
✓ **Web UI is source of truth**: Frontend controls execution flow  
✓ **Explainable outputs**: All results derived from source data  
✓ **Append-only versioning**: No overwrites, always can roll back  
✓ **Human in control**: Validation flags, not auto-fixes  
✓ **No hallucination**: Missing data explicitly stated, not invented  

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'psycopg2'"
```bash
pip install psycopg2-binary
```

### "PDF export failed: ImportError: No module named 'weasyprint'"
```bash
pip install -r ../requirements-pdf.txt
```

### "Database connection failed"
- Check `DATABASE_URL` in `.env` file
- Verify PostgreSQL is running
- Check credentials

### "Session not found"
- Verify `session_id` exists in the database
- Ensure data has been ingested and filtered before calling pipeline

---

## Next Steps

1. **Integrate** with your frontend API (see `example_integration.py`)
2. **Test** the pipeline with sample data
3. **Handle errors** gracefully in your UI
4. **Stream PDFs** directly to users without saving to disk
5. **Cache** exports if performance is needed

---

## Contact & Support

Refer to `CompleteProjectDoc.md` for the full system architecture and design philosophy.
