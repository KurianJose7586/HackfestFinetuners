# AMI Meeting Corpus Workflow

Complete pipeline for ingesting AMI (Attributed Meeting corpus) transcripts into your BRD generation system.

## Overview

The AMI workflow **mirrors your existing email (Enron) workflow exactly**:

```
┌─────────────────┐
│   AMI Corpus    │  Load meeting transcripts (279 meetings)
├─────────────────┤
│  ami_parser.py  │  Parse to chunks (speaker, timestamp, text)
├─────────────────┤
│   init_db()     │  Initialize AKS database
├─────────────────┤
│ Heuristics +    │  Fast-pass rules for obvious noise/signals
│  Domain Gate    │  Skip LLM for low-signal content
├─────────────────┤
│   Classifier    │  Parallel LLM classification (5 labels)
└─────────────────┘
        ↓
   ├── Requirements
   ├── Decisions
   ├── Stakeholder Feedback
   ├── Timeline References
   └── Noise (suppressed)
        ↓
   Session in AKS DB
        ↓
   BRD Pipeline
   (brd_module/main.py)
```

---

## Quick Start

### 1. Install Dependencies

The AMI parser requires `datasets` for HuggingFace dataset loading (optional):

```bash
pip install datasets  # Optional, for direct HuggingFace loading
```

### 2. Test with Sample Data

Sample meeting corpus is provided in `sample_ami_meetings.json` (3 meetings from a remote control design project):

```bash
# Run test suite first
python test_ami_workflow.py

# Then run the full workflow on sample data
python main_ami.py sample_ami_meetings.json 3
```

This will:
- Parse 3 meetings → ~40 chunks
- Classify with heuristics + LLM
- Show confidence distribution
- Store in AKS database
- Output a session ID for BRD generation

### 3. Run on Full Dataset

**Option A: From Local JSON File**

If you've downloaded the corpus as JSON:

```bash
python main_ami.py meetings.json 50  # Process first 50 meetings
```

**Option B: From HuggingFace (requires `datasets` package)**

```bash
python main_ami.py --huggingface 50  # Load 50 meetings from HuggingFace
```

---

## File Structure

```
Noise filter module/
├── ami_parser.py              [NEW] Loads and parses AMI transcripts
├── main_ami.py                [NEW] Orchestrator (mirrors main.py)
├── test_ami_workflow.py        [NEW] Test suite
├── sample_ami_meetings.json    [NEW] Sample corpus (3 meetings)
├── classifier.py              [MODIFIED] Added meeting heuristics
├── main.py                    [EXISTING] Email workflow (unchanged)
├── enron_parser.py            [EXISTING] Email parser (unchanged)
├── storage.py                 [EXISTING] AKS database (unchanged)
└── schema.py                  [EXISTING] Data models (unchanged)
```

---

## Workflow Stages

### Stage 1: Parse Transcripts (`ami_parser.py`)

Handles multiple input formats:

**From HuggingFace Dataset:**
```python
from ami_parser import parse_to_chunks
chunks = parse_to_chunks(None, source_type="huggingface", n=50)
```

**From Local JSON:**
```python
chunks = parse_to_chunks("meetings.json", source_type="json", n=50)
```

**From List of Dicts:**
```python
chunks = parse_to_chunks(meeting_list, source_type="json")
```

Each chunk has:
- `source_ref`: Meeting ID + turn number (e.g., "AMI_ES2002a_turn_0005")
- `speaker`: Participant role (PM, Designer, etc.)
- `timestamp`: Turn duration (e.g., "00:05-00:12")
- `cleaned_text`: Boilerplate-free transcript
- `meeting_id`: Reference to source meeting
- `raw_text`: Original turn text

### Stage 2: Deduplicate (`content hash`)

Removes duplicate chunks by MD5 hash of cleaned text (prevents signal double-counting).

### Stage 3: Initialize AKS (`init_db()`)

Creates PostgreSQL tables if not already present:
- `classified_chunks` — stores labeled chunks
- `brd_sections` — stores generated BRD content
- Indexes for fast queries

### Stage 4: Heuristic Pre-filtering (`apply_heuristics`)

Fast classification without LLM (saves 80% of API calls):

| Pattern | Result | Rationale |
|---------|--------|-----------|
| `[crosstalk]`, `[laughter]` | NOISE | Unintelligible |
| "Let's take a break" (short) | NOISE | Meeting logistics |
| "deadline is Friday" | TIMELINE | Project schedule |
| "requires voice control" | LLM → | Needs semantic analysis |

**New meeting-specific patterns:**
```python
_CROSSTALK           # [crosstalk], [pause], [silence]
_MEETING_LOGISTICS   # breaks, continuations, filler words
_DISAGREEMENT        # "I disagree", "but I think", "won't work"
```

### Stage 5: Domain Gate (`has_signal_nouns`)

Skips LLM for low-signal content. Checks for project-relevant keywords:

```
system, feature, requirement, dashboard, report, integration, 
api, database, screen, workflow, user, access, security, audit, etc.
```

Text without these nouns → marked as NOISE without LLM call.

### Stage 6: LLM Classification (`classify_with_llm`)

For chunks passing heuristics + domain gate, call Groq LLM to classify into 5 labels:

1. **requirement** — "The system must support X"
2. **decision** — "We will use AWS"
3. **stakeholder_feedback** — User opinion about the product
4. **timeline_reference** — Project delivery dates
5. **noise** — Everything else

**Confidence thresholding:**
- ≥ 0.90 → Auto-accept
- 0.70–0.89 → Accept + flag for review
- < 0.70 → Force to noise + flag for review

### Stage 7: Store to AKS (`store_chunks`)

Saves all classified chunks to PostgreSQL with:
- Session ID (for BRD grouping)
- Classification labels + confidence
- Source references (for attribution)
- Flags for human review

---

## Output Example

When you run `main_ami.py sample_ami_meetings.json 3`:

```
Loading and parsing 3 AMI meetings...
  → 42 raw chunks parsed
  → 42 unique chunks after content deduplication

AKS Database initialized.
Classifying chunks with heuristics + LLM...
  → Done. 42 chunks classified.

--- PIPELINE PATH BREAKDOWN ---
  Heuristic (fast path):     12
  Domain gate (pre-LLM):      8
  LLM classified:            22
  └─ Auto-accepted:          18
  └─ Flagged for review:      4
  └─ Forced to noise:         0

=== CLASSIFICATION SUMMARY (AMI MEETING CORPUS) ===
  requirement                  15  ███████████████
  decision                      8  ████████
  stakeholder_feedback          6  ██████
  timeline_reference            3  ███
  noise                        10  ██████████
-----
  Total chunks:                42
  Suppressed (noise):          10
  Flagged for review:           4
  Session ID:        550e8400-e29b-41d4-a716-446655440000

NEXT STEPS
To run BRD generation, switch to brd_module folder and run:
  python main.py 550e8400-e29b-41d4-a716-446655440000
```

---

## Testing

Run the comprehensive test suite:

```bash
python test_ami_workflow.py
```

Tests cover:
1. ✓ Parsing (JSON, HuggingFace)
2. ✓ Deduplication
3. ✓ Heuristic classification
4. ✓ Domain gate (signal nouns)
5. ✓ Full LLM pipeline

---

## Integration with BRD Pipeline

After running `main_ami.py`, you get a session ID. Use it with the BRD generation:

```bash
cd ../brd_module
python main.py 550e8400-e29b-41d4-a716-446655440000
```

The BRD agents automatically query all signals (from both email AND meeting corpora) within the session to generate requirements, decisions, stakeholder feedback, etc.

---

## Comparison: Email vs. Meeting Workflows

| Aspect | Email (Enron) | Meeting (AMI) |
|--------|--------------|:-----|
| **Source** | CSV of emails | JSON/HuggingFace transcripts |
| **Parser** | `enron_parser.py` | `ami_parser.py` |
| **Entry Script** | `main.py` | `main_ami.py` |
| **Unit ID** | Message-ID | Meeting-ID + Turn |
| **Speaker** | From/X-From | Participant role |
| **Time Ref** | Date sent | Timestamp (mm:ss) |
| **Noise Patterns** | Bounces, disclaimers | Crosstalk, logistics |
| **Classifier** | Shared (no changes) | Shared + meeting heuristics |
| **Storage** | `classified_chunks` table | Same table |
| **BRD Pipeline** | Works as-is | Works as-is |

---

## Next Steps

### Immediate
- [ ] Test with sample data: `python test_ami_workflow.py`
- [ ] Run workflow: `python main_ami.py sample_ami_meetings.json 3`
- [ ] Verify signals in AKS database

### For Scale
- [ ] Download full AMI corpus from HuggingFace
- [ ] Process all 279 meetings: `python main_ami.py --huggingface 279`
- [ ] Combine email + meeting signals in single BRD generation

### Advanced
- [ ] Add meeting summary comparison (validate against pre-existing AMI summaries)
- [ ] Create `/api/routers/ami.py` endpoint for web ingestion
- [ ] Build speaker-centric analysis (aggregate by role)

---

## Troubleshooting

**"No chunks parsed"**
- Check JSON format matches expected structure
- Verify file exists at given path

**"GROQ_CLOUD_API not set"**
- Add to `.env`: `GROQ_CLOUD_API=your_api_key`

**LLM calls too slow**
- Heuristics + domain gate should skip ~50% of chunks
- If still slow, increase batch size or reduce n_meetings

**Low signal density**
- Some meetings are more procedural than others
- This is expected and normal
- BRD agents handle low-signal sections gracefully

