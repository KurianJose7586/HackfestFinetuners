# Implementation Strategy: Frontend–Backend Wiring & AMI Dataset Integration

---

## Part 1 — Frontend API Wiring

The frontend (`ps21-brd-agent/frontend`) is a **complete mock UI** built in Next.js 14 + TypeScript + Zustand. All data is currently hardcoded. The goal is to replace every mock/stub with a real `fetch()` call to our FastAPI backend.

### Step 1 — Create a Typed API Client

**File:** `ps21-brd-agent/frontend/src/lib/apiClient.ts`

Create a single file that wraps every backend endpoint with a typed async function. The backend runs at `http://localhost:8000`.

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function createSession() {
    const res = await fetch(`${BASE}/sessions/`, { method: "POST" });
    return res.json(); // { session_id, status }
}

export async function getChunks(sessionId: string, status = "signal") {
    const res = await fetch(`${BASE}/sessions/${sessionId}/chunks/?status=${status}`);
    return res.json(); // { chunks: ClassifiedChunk[] }
}

export async function restoreChunk(sessionId: string, chunkId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}/chunks/${chunkId}/restore`, { method: "POST" });
    return res.json();
}

export async function generateBRD(sessionId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}/brd/generate`, { method: "POST" });
    return res.json(); // { snapshot_id, message }
}

export async function getBRD(sessionId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}/brd/`);
    return res.json(); // { sections: {}, flags: [] }
}

export async function editBRDSection(sessionId: string, section: string, content: string, snapshotId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}/brd/sections/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, snapshot_id: snapshotId })
    });
    return res.json();
}

export async function exportBRD(sessionId: string) {
    const res = await fetch(`${BASE}/sessions/${sessionId}/brd/export`);
    return res.json(); // { markdown: string }
}
```

Add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `frontend/.env.local`.

---

### Step 2 — Wire Each Page

| Frontend File | Change |
|---|---|
| `store/useSessionStore.ts` | `addSession()` → call `createSession()`, use returned `session_id` |
| `app/signals/page.tsx` | Replace `const SIGNALS = [...]` with `useEffect(() => getChunks(sessionId))` |
| Signal card "Restore" button | Call `restoreChunk(sessionId, chunk.id)`, then refresh list |
| `store/useBRDStore.ts` | `generateSection()` → call `generateBRD(sessionId)`, then `getBRD(sessionId)` to populate |
| `app/brd/page.tsx` | Load sections from `getBRD(sessionId)` on mount |
| BRD inline editor Save | Call `editBRDSection()` |
| `app/export/page.tsx` | Download button → call `exportBRD(sessionId)`, trigger browser download |
| `app/dashboard/page.tsx` stats | Derive counts from `getChunks()` response by label type |

---

### Step 3 — Run Both Servers

**Backend:**
```bash
cd "c:\Users\Kurian Jose\Desktop\kurian stuff\hackfest2.0"
git checkout Kurian-branch
uvicorn api.main:app --reload --port 8000
```

**Frontend:**
```bash
cd ps21-brd-agent/frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The pipeline should now be fully wired.

---

## Part 2 — AMI Meeting Corpus Integration (Bonus Points)

The organizers have provided the **AMI Meeting Corpus** as a recommended bonus dataset.

### Why This Dataset is Valuable for Our System

The AMI corpus contains **279 meeting transcripts** from a scenario where participants play roles (Project Manager, Designer, etc.) taking a product from kickoff to completion. It is the **best possible test for our BRD generation pipeline** because:

- It contains real **requirements discussions**, **design decisions**, **stakeholder disagreements**, and **timeline references** — exactly the 4 signal labels we classify.
- The pre-existing **abstractive summaries** serve as ground truth to evaluate whether our agents correctly extracted the right signals.
- The meetings follow a **product development arc** from kickoff → design → iteration → delivery, which mirrors real BRD creation.

### Integration Plan

#### Step 1 — Download the Dataset

```bash
# Option A: HuggingFace
pip install datasets
python -c "from datasets import load_dataset; ds = load_dataset('knkarthick/AMI', split='train'); ds.to_json('ami_meetings.jsonl')"

# Option B: Direct download from https://groups.inf.ed.ac.uk/ami/corpus/
```

#### Step 2 — Write an AMI Parser

**File:** `Noise filter module/ami_parser.py`

Similar to `enron_parser.py`, this will:

1. Load `.words` transcription files (or the HuggingFace JSONL format).
2. Segment each meeting into **chunks by speaker turn** (each speaker utterance = one chunk).
3. Output a list of `dict` objects matching the classifier input format:
   ```python
   {
       "cleaned_text": "We need the device to be able to record at least 30 hours...",
       "speaker": "Project Manager (Role A)",
       "source_ref": "AMI_ES2002a.meeting",
       "source_type": "meeting_transcript"
   }
   ```

#### Step 3 — Integrate into the Pipeline

In `Noise filter module/main.py`, add a data source selector:

```python
# In main.py
DATA_SOURCE = "enron"  # or "ami"

if DATA_SOURCE == "ami":
    from ami_parser import load_ami_chunks
    raw_chunks = load_ami_chunks("path/to/ami_meetings.jsonl", max_meetings=10)
else:
    from enron_parser import load_emails
    raw_chunks = load_emails("emails.csv", max_emails=200)
```

#### Step 4 — Evaluate Against Ground Truth *(Bonus)*

The AMI corpus has pre-existing extractive and abstractive summaries. After running the full pipeline on an AMI meeting, compare:

- Our agent's `functional_requirements` output vs. the meeting's abstractive summary.
- Whether key decisions in our `decisions` section match the meeting summary.

This **demonstrates evaluation capability**, which is an explicit scoring criterion.

---

## Priority Order

| Priority | Task | Impact |
|---|---|---|
| 🔴 **P0** | Write `apiClient.ts` and wire `signals/page.tsx` + `useBRDStore.ts` | Live demo works end-to-end |
| 🔴 **P0** | Write `ami_parser.py` | Bonus dataset points |
| 🟡 **P1** | Wire dashboard stats + session creation | Demo feels polished |
| 🟡 **P1** | Wire export page download | Demo has a deliverable |
| 🟢 **P2** | Ground truth evaluation script | Evaluation / bonus |
| 🟢 **P2** | Iterative clarification loop | Architectural completeness |
