# HackfestFinetuners - BRD Generation System

AI-powered Business Requirements Document (BRD) generation from real-world communication sources (Slack, emails, meetings). This is a backend module that generates professional BRDs with Markdown, PDF, and DOCX export formats.

---

## 📋 Quick Overview

**What It Does:**
- Ingests communication data (Slack, emails, meeting transcripts)
- Filters noise and extracts requirements
- Generates structured BRDs with multiple export formats
- Validates sections and flags conflicts

**Export Formats:**
- ✅ **Markdown** - Plain text, version-control friendly
- ✅ **PDF** - Styled with auto-detected formatting (headings, bold, colors)
- ✅ **DOCX** - Template-based using your custom `brd.docx` template

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
# Navigate to project
cd HackfestFinetuners

# Install core dependencies
pip install -r "brd Module/requirements.txt"

# Install PDF support
pip install -r requirements-pdf.txt

# Install DOCX support
pip install python-docx

# Install FastAPI (for example server)
pip install -r requirements-api.txt
```

Or install everything at once:
```bash
pip install -r requirements-full.txt
```

### 2. Start the API Server

```bash
cd "brd Module"
uvicorn example_integration:app --reload
```

### 3. Test It

Visit: **http://localhost:8000/docs** (Interactive API documentation)

Or test via command line:
```bash
curl -X GET http://localhost:8000/api/health
```

---

## 📚 Installation Details

### System Requirements
- Python 3.8+
- PostgreSQL (for data storage, optional for demo)
- 100 MB disk space

### Core Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `psycopg2-binary` | PostgreSQL adapter | ≥2.9.0 |
| `python-dotenv` | Environment variables | ≥0.19.0 |
| `groq` | LLM API (generation) | Latest |
| `python-docx` | DOCX generation | ≥0.8.11 |
| `weasyprint` | PDF generation | ≥60.0 |
| `markdown` | Markdown parsing | ≥3.5.0 |
| `fastapi` | Web framework | ≥0.95.0 |
| `uvicorn` | ASGI server | ≥0.21.0 |

### Installation Options

**Option 1: Everything (Recommended)**
```bash
pip install -r requirements-full.txt
```

**Option 2: Modular Installation**
```bash
# Core
pip install -r "brd Module/requirements.txt"

# Add PDF export
pip install -r requirements-pdf.txt

# Add DOCX export
pip install python-docx

# Add FastAPI example
pip install -r requirements-api.txt
```

**Option 3: Minimal (Just Core)**
```bash
pip install -r "brd Module/requirements.txt"
```

### Environment Setup

Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@localhost/hackfest_db
GROQ_API_KEY=your_groq_api_key_here
```

---

## 🔌 API Reference

### Base URL
```
http://localhost:8000
```

### Endpoints

#### 1. Health Check
```
GET /api/health
```
Returns: `{"status":"ok","service":"brd-generation"}`

---

#### 2. Generate BRD
```
POST /api/brd/generate
```

**Request:**
```json
{
  "session_id": "session-001",
  "title": "Project Alpha BRD"
}
```

**Response:**
```json
{
  "snapshot_id": "snap-abc123",
  "status": "completed",
  "error": null
}
```

---

#### 3. Full Pipeline (Generate + Validate)
```
POST /api/brd/pipeline
```

**Request:**
```json
{
  "session_id": "session-001"
}
```

**Response:**
```json
{
  "snapshot_id": "snap-abc123",
  "status": "completed",
  "validation_status": "completed",
  "error": null
}
```

---

#### 4. Validate BRD
```
POST /api/brd/validate?session_id=session-001
```

**Response:**
```json
{
  "status": "completed",
  "message": "Validation passed"
}
```

---

#### 5. Export as Markdown
```
GET /api/brd/export/markdown?session_id=session-001&title=Project%20Alpha
```

**Returns:** Markdown text (text/markdown)

**cURL Example:**
```bash
curl http://localhost:8000/api/brd/export/markdown?session_id=session-001 > output.md
```

---

#### 6. Export as PDF
```
GET /api/brd/export/pdf?session_id=session-001&title=Project%20Alpha
```

**Returns:** PDF file (application/pdf)

**Features:**
- Auto-detects headings, bold, italic text
- Color-coded highlights ([CRITICAL:], [SUCCESS:], etc.)
- Professional styling with alternating table rows
- Smart page breaks

**cURL Example:**
```bash
curl http://localhost:8000/api/brd/export/pdf?session_id=session-001 > output.pdf
```

---

#### 7. Export as DOCX (Template-Based)
```
GET /api/brd/export/docx?session_id=session-001&title=Project%20Alpha
```

**Returns:** DOCX file (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

**Features:**
- Auto-detects `brd.docx` template in `brd Module/` directory
- Fills template placeholders with BRD content
- Preserves your template's formatting and branding
- Falls back to generated DOCX if template not found

**Template Placeholders:**
```
{TITLE}                    → Document title
{SESSION_ID}               → Session identifier
{GENERATED_DATE}           → Generation timestamp
{EXECUTIVE_SUMMARY}        → Executive summary section
{FUNCTIONAL_REQUIREMENTS}  → Functional requirements
{STAKEHOLDER_ANALYSIS}     → Stakeholder analysis
{TIMELINE}                 → Project timeline
{DECISIONS}                → Key decisions
{ASSUMPTIONS}              → Assertions & assumptions
{SUCCESS_METRICS}          → Success metrics
```

**cURL Example:**
```bash
curl http://localhost:8000/api/brd/export/docx?session_id=session-001 > output.docx
```

---

## 🐍 Python Module API

Use the BRD module directly in your Python code:

```python
from sys import path
path.insert(0, 'brd Module')

from main import (
    run_full_pipeline,
    generate_brd,
    validate_brd_sections,
    export_markdown,
    export_pdf,
    export_docx
)

# Full pipeline
result = run_full_pipeline("session-001")

# Export to different formats
md = export_markdown("session-001", title="My BRD")
pdf = export_pdf("session-001", title="My BRD")
docx = export_docx("session-001", title="My BRD")

# Save to files
with open("output.pdf", "wb") as f:
    f.write(pdf)

with open("output.docx", "wb") as f:
    f.write(docx)
```

---

## 📁 Project Structure

```
HackfestFinetuners/
├── brd Module/                 # Main BRD generation module
│   ├── main.py                 # Public API functions
│   ├── exporter.py             # Markdown, PDF, DOCX export
│   ├── brd_pipeline.py         # BRD generation pipeline
│   ├── validator.py            # Semantic validation
│   ├── schema.py               # Data models
│   ├── storage.py              # Database operations
│   ├── example_integration.py   # FastAPI example with all endpoints
│   ├── brd.docx                # Your DOCX template
│   ├── requirements.txt         # Core dependencies
│   ├── API.md                  # Detailed API reference
│   ├── README.md               # Module-specific guide
│   └── tests/                  # Test files
├── Noise filter module/        # Data filtering (companion module)
├── Integration Module/         # Integration utilities
├── CompleteProjectDoc.md       # Full system architecture
├── requirements-full.txt       # All dependencies
├── requirements-api.txt        # FastAPI dependencies
├── requirements-pdf.txt        # PDF dependencies
└── README.md                   # This file
```

---

## 🎯 Usage Examples

### Example 1: Generate BRD via API

```bash
# Start server
cd "brd Module"
uvicorn example_integration:app --reload

# In another terminal
curl -X POST http://localhost:8000/api/brd/pipeline \
  -H "Content-Type: application/json" \
  -d '{"session_id":"demo-001"}'
```

### Example 2: Export to All Formats

```bash
SESSION_ID="demo-001"

# Markdown
curl http://localhost:8000/api/brd/export/markdown?session_id=$SESSION_ID > brd.md

# PDF
curl http://localhost:8000/api/brd/export/pdf?session_id=$SESSION_ID > brd.pdf

# DOCX (with template)
curl http://localhost:8000/api/brd/export/docx?session_id=$SESSION_ID > brd.docx
```

### Example 3: Python Integration (Flask)

```python
from flask import Flask, send_file
from io import BytesIO
import sys
sys.path.insert(0, 'brd Module')
from main import run_full_pipeline, export_docx

app = Flask(__name__)

@app.route("/generate/<session_id>", methods=["POST"])
def generate(session_id):
    result = run_full_pipeline(session_id)
    return result

@app.route("/download/<session_id>")
def download(session_id):
    docx_bytes = export_docx(session_id)
    return send_file(
        BytesIO(docx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        as_attachment=True,
        download_name=f"brd_{session_id}.docx"
    )

if __name__ == "__main__":
    app.run(debug=True)
```

### Example 4: JavaScript/Frontend

```javascript
// Generate BRD
async function generateBRD(sessionId) {
  const response = await fetch('/api/brd/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId })
  });
  
  const result = await response.json();
  console.log('Generated:', result.snapshot_id);
  return result;
}

// Download DOCX
async function downloadDOCX(sessionId) {
  const response = await fetch(`/api/brd/export/docx?session_id=${sessionId}`);
  const blob = await response.blob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brd_${sessionId}.docx`;
  a.click();
}

// Download PDF
async function downloadPDF(sessionId) {
  const response = await fetch(`/api/brd/export/pdf?session_id=${sessionId}`);
  const blob = await response.blob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brd_${sessionId}.pdf`;
  a.click();
}
```

---

## 💡 Key Features

### ✨ Automatic PDF Formatting
- Headings with progressive sizing and colors
- Bold text (`**text**`) auto-detected
- Italic text (`*text*`) auto-styled
- Code blocks with syntax preservation
- Tables with alternating row colors
- Blockquotes with colored borders
- Color-coded highlights: `[CRITICAL:]`, `[SUCCESS:]`, `[INFO:]`, `[WARNING:]`
- Emoji sizing and spacing
- Smart page breaks

### 📄 Template-Based DOCX Export
- Uses your `brd.docx` template
- Auto-fills placeholders
- Preserves formatting and branding
- Professional client-ready output

### ✅ Semantic Validation
- Detects conflicts and gaps
- Flags critical issues
- Provides validation status

### 🔄 Snapshot-Based Versioning
- Immutable snapshots per generation
- No overwrites
- Full rollback support

---

## ⚠️ Hackathon Scope (Intentional Limitations)

This is built for hackathon speed and feasibility:

- ✓ Single-user sessions
- ✓ Slack/email/meeting data handling
- ✓ Professional BRD generation
- ✓ Multiple export formats
- ✗ Multi-user auth (out of scope)
- ✗ Approval workflows (out of scope)
- ✗ Enterprise security (demo-only)

See `CompleteProjectDoc.md` for full design philosophy.

---

## 🐛 Troubleshooting

### Import Error: `ModuleNotFoundError: No module named 'groq'`
```bash
pip install groq
```

### PDF Export Error: `No module named 'weasyprint'`
```bash
pip install -r requirements-pdf.txt
```

### DOCX Export Error: `No module named 'docx'`
```bash
pip install python-docx
```

### Database Connection Error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env` file
- Ensure credentials are correct

### Server Won't Start
```bash
# Try without auto-reload
cd "brd Module"
uvicorn example_integration:app --no-reload
```

---

## 📖 Documentation

- **[API.md](brd%20Module/API.md)** - Complete API reference with examples
- **[brd Module/README.md](brd%20Module/README.md)** - Module setup and usage
- **[CompleteProjectDoc.md](CompleteProjectDoc.md)** - System architecture and design
- **[DOCX_EXPORT_GUIDE.md](DOCX_EXPORT_GUIDE.md)** - Template usage guide
- **[brd Module/example_integration.py](brd%20Module/example_integration.py)** - Working FastAPI example

---

## 📊 Module Capabilities

| Capability | Status | Notes |
|-----------|--------|-------|
| Markdown Export | ✅ Complete | Plain text, portable |
| PDF Export | ✅ Complete | Styled with auto-formatting |
| DOCX Export | ✅ Complete | Template-based |
| BRD Generation | ✅ Complete | From filtered signals |
| Semantic Validation | ✅ Complete | Conflict detection |
| FastAPI Integration | ✅ Complete | Full working example |
| REST API | ✅ Complete | 7 endpoints |
| Snapshot Versioning | ✅ Complete | Immutable, rollback-able |

---

## 🚀 Getting Started Commands

```bash
# 1. Install everything
pip install -r requirements-full.txt

# 2. Start the server
cd "brd Module"
uvicorn example_integration:app --reload

# 3. Test health check
curl http://localhost:8000/api/health

# 4. Generate BRD
curl -X POST http://localhost:8000/api/brd/pipeline \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-001"}'

# 5. Export to DOCX
curl http://localhost:8000/api/brd/export/docx?session_id=test-001 > brd.docx

# 6. Visit interactive docs
# Open: http://localhost:8000/docs
```

---

## 📝 License & Credits

Built for Hackathon (February 2026)  
Repository: [KurianJose7586/HackfestFinetuners](https://github.com/KurianJose7586/HackfestFinetuners)

---

## 🤝 Support

For detailed information on:
- **Architecture & Design:** See [CompleteProjectDoc.md](CompleteProjectDoc.md)
- **API Endpoints:** See [API.md](brd%20Module/API.md) in `brd Module/`
- **Module Usage:** See [README.md](brd%20Module/README.md) in `brd Module/`
- **DOCX Templates:** See [DOCX_EXPORT_GUIDE.md](DOCX_EXPORT_GUIDE.md)

All code is documented with docstrings. Check function signatures:
```bash
python -c "from brd_module.main import export_docx; help(export_docx)"
```

---

**Status:** ✅ Ready for use  
**Last Updated:** February 21, 2026  
**Python Version:** 3.8+
