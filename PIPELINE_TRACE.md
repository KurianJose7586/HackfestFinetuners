## 🔍 Pipeline Trace - Track Your Data End-to-End

This script shows exactly how your meeting transcripts flow through the system:

```
Load → Ingest → Noise Filter → Check Signals → Check Noise → LLM Call → Export
```

### Quick Start

**Terminal 1 - Start the API:**
```bash
python start_api.py
```

**Terminal 2 - Run the pipeline trace:**
```bash
# With sample data
python test_pipeline_trace.py

# With your custom data
python test_pipeline_trace.py "Noise filter module/train_converted.json"
```

### What It Does

1. **STEP 1 - LOAD TRANSCRIPTS**
   - Reads your JSON file
   - Shows meeting count, total turns/chunks
   - Sample of first meeting

2. **STEP 2 - CREATE SESSION**
   - Creates unique session ID
   - All data tracked under this session

3. **STEP 3 - INGEST MEETING DATA**
   - Converts meetings to chunks
   - Sends to `/ingest/data` endpoint
   - Queues for classification

4. **STEP 4 - NOISE FILTERING & CLASSIFICATION** (Background)
   - Heuristics applied (fast, rule-based)
   - Optional LLM classification
   - 10-second wait for processing
   - Shows detected "signal" chunks

5. **STEP 5 - NOISE ITEMS** (What got filtered)
   - Shows chunks classified as noise
   - Examples of filtered content

6. **STEP 6 - SEND TO LLM**
   - Triggers BRD generation
   - Uses signal chunks only
   - Requires GROQ_CLOUD_API key (optional)

7. **STEP 7 - RETRIEVE RESULTS**
   - Gets generated BRD sections
   - Shows preview of each section

### Expected Output

```
======================================================================
STEP 1: LOAD MEETING TRANSCRIPTS
======================================================================

ℹ️  Loading from: Noise filter module/sample_ami_meetings.json
ℹ️  File size: 125.45 KB
✅ Loaded 3 meetings
✅ Total transcript turns: 35
ℹ️  Sample meeting ID: ES2011a
ℹ️  Sample summary: Project design discussion...
ℹ️  Sample turns: 15

======================================================================
STEP 2: CREATE SESSION
======================================================================

✅ Session created: 3f6a5a3a-85c1-40b5-8950-bf85b896dfee

======================================================================
STEP 3: INGEST MEETING DATA
======================================================================

ℹ️  Converting 3 meetings to 35 chunks
✅ Ingested 35 chunks
ℹ️  Queued for classification: 35

======================================================================
STEP 4: NOISE FILTERING & CLASSIFICATION (Background)
======================================================================

ℹ️  Classification running in background (heuristics + optional LLM)
ℹ️  Waiting 10 seconds for processing...
✅ Found 5 signal chunks (non-noise)
ℹ️  Sample signal - Label: requirement | Confidence: 0.95 | Text: The system should provide a dashboard for monitoring...

======================================================================
STEP 5: NOISE ITEMS (FILTERED OUT)
======================================================================

✅ Found 30 noise items (filtered)
ℹ️  Sample noise item: Let's take a break...

======================================================================
STEP 6: SEND TO LLM - BRD GENERATION
======================================================================

ℹ️  Triggering BRD generation with signal chunks...
✅ BRD generation initiated
ℹ️  BRD sections: 7
  - overview
  - goals_objectives
  - functional_requirements

======================================================================
STEP 7: RETRIEVE BRD RESULTS
======================================================================

✅ Retrieved 7 BRD sections
ℹ️  overview: The system aims to provide a unified dashboard...
ℹ️  goals_objectives: 1. Provide real-time monitoring...
ℹ️  functional_requirements: All requirements extracted from meetings...

======================================================================
SUMMARY: PIPELINE COMPLETE
======================================================================

✅ Total meetings processed: 3
✅ Signal chunks (kept): 5
✅ Noise chunks (filtered): 30
✅ Signal + Noise total: 35
✅ BRD sections generated: 7

✨ Pipeline trace complete!
```

### Key Metrics to Watch

- **Total turns/chunks**: How much data was ingested
- **Signal ratio**: % of chunks kept as signals vs noise
- **Confidence scores**: How confident the classifier was
- **BRD sections**: Were all 7 sections generated?

### Troubleshooting

**"Cannot connect to API"**
- Make sure `python start_api.py` is running in another terminal

**"File not found"**
- Check file path exists
- Use relative path from project root

**"No signal chunks found"**
- Meeting data might be all short/noise content
- Try with sample data first: `python test_pipeline_trace.py`

**"BRD generation skipped (no LLM key)"**
- Optional - system still works
- To enable: Add `GROQ_CLOUD_API=xxx` to `Noise filter module/.env`

### Next Steps

After confirming the pipeline works:
1. Run with your CSV data
2. Adjust classification rules if needed
3. Configure GROQ API key for LLM generation
4. Export final BRD to PDF/DOCX

---

**TL;DR**: This script shows you exactly how many meetings → chunks → signals → noise → LLM → results
