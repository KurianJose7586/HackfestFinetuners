# Noise Filter Module – Implementation Strategy

> **Data Source (Hackathon):** The Enron Email Dataset (CMU CALO version, ~500k emails from ~150 employees) is the primary real-world email corpus provided by the hackathon organisers.

## Overview

The Noise Filter Module sits between the **Normalization & Chunking** layer and the **Attributed Knowledge Store (AKS)**. Its job is to classify each normalized chunk of text into a meaningful signal category or mark it as noise — without ever deleting data.

This module is critical to the system's trustworthiness guarantee: **no silent data loss**.

---

## Position in the Pipeline

```
Normalization & Chunking
        ↓
[ Noise Filter Module ]   ← YOU ARE HERE
        ↓
Attributed Knowledge Store (AKS)
```

---

## 1. Enron Email Dataset – Structure & Parsing

### 1.1 Dataset Format

The dataset is available as a **CSV file** (e.g. `emails.csv`) where each row is one email. Key columns:

| Column | Description |
|---|---|
| `Message-ID` | Unique email identifier |
| `Date` | Send timestamp (ISO / RFC 2822) |
| `From` | Sender email address |
| `To` | Recipient(s), comma-separated |
| `Subject` | Email subject line |
| `X-From` / `X-To` | Full names of sender/recipients |
| `X-Folder` | Mailbox folder (e.g. `_sent_mail`, `inbox`) |
| `X-Origin` | Owning employee mailbox |
| `body` | Full email body text |

### 1.2 Pre-processing Before Classification

Before a chunk reaches the classifier, the ingestion layer must:

1. **Parse the CSV** row-by-row using `pandas` or `csv.DictReader`
2. **Strip email boilerplate** — forwarded message headers (`-----Original Message-----`), legal disclaimers, auto-signatures
3. **Flatten threads** — if the body contains quoted reply chains, split into individual turn chunks, preserving the `From` and `Date` of each turn
4. **Normalize encoding** — handle `quoted-printable` and `7bit` encoded bodies
5. **Deduplicate** — emails forwarded across multiple mailboxes appear multiple times; deduplicate by `Message-ID`
6. **Assign source metadata** — each chunk carries: `source_type: email`, `source_ref: Message-ID`, `speaker: X-From`, `timestamp: Date`, `folder: X-Folder`

### 1.3 Enron-Specific Noise Patterns

The Enron corpus has well-known noise characteristics the heuristic pre-filter must handle:

| Pattern | Example | Action |
|---|---|---|
| Auto-generated system mail | `Delivery Status Notification`, `Out of Office` | → `noise` |
| Legal disclaimer footers | `This message is intended only for the use of...` | Strip before classification |
| Forwarded boilerplate | `-----Original Message-----` headers | Strip; classify underlying content |
| Calendar/meeting invites | `You have been invited to a meeting...` | → `timeline_reference` |
| Short social messages | `Thanks`, `Sounds good`, `👍` | → `noise` (heuristic) |
| Internal mailing list blasts | Sent to >20 recipients with no personal body | → `noise` |
| Duplicate emails | Same `Message-ID` in multiple mailboxes | Deduplicate; keep one |

---

## 2. Classification Categories

Every chunk passed into this module must be assigned **exactly one** of the following labels:

| Label | Description |
|---|---|
| `requirement` | A functional or non-functional need expressed by a stakeholder |
| `decision` | A confirmed choice or direction agreed upon by the team |
| `stakeholder_feedback` | A concern, opinion, or preference from a stakeholder |
| `timeline_reference` | A date, deadline, milestone, or scheduling reference |
| `noise` | Greetings, off-topic chatter, filler, duplicates, or irrelevant content |

---

## 3. No Silent Data Loss (Critical Constraint)

> This is a hard requirement from the project BRD.

- Chunks classified as `noise` are **suppressed, not deleted**
- All noise-classified chunks are stored with their classification label and confidence score
- The user can review the suppressed items via the UI
- Any item can be **manually restored** to a signal category by the user
- Restoration is logged and versioned

This prevents the system from silently discarding requirements that were misclassified.

---

## 4. Classification Approach

### Step 1 – Rule-Based Pre-filter (Fast Path)

In addition to general heuristics, apply **Enron-specific** rules (see Section 1.3 above):

Apply lightweight heuristics before invoking the LLM:

- **Noise heuristics**: chunks shorter than N tokens, pure emoji/reaction content, known boilerplate patterns (e.g. "sounds good", "👍", "thanks!")
- **Timeline heuristics**: chunks containing date patterns (e.g. `Q3`, `by Friday`, `March 15`)
- Chunks that pass heuristics confidently are labeled immediately and skip the LLM call

### Step 2 – LLM Classification (Main Path)

For chunks that are not confidently classified by heuristics:

- Send chunk text + source metadata (speaker, source type, timestamp) to the LLM
- Prompt instructs the LLM to return:
  - `label`: one of the five categories above
  - `confidence`: float 0.0–1.0
  - `reasoning`: one-sentence explanation (for auditability)
- Source text is treated as **untrusted input** — prompt injection mitigated by strict prompt structure

### Step 3 – Confidence Thresholding

| Confidence | Action |
|---|---|
| ≥ 0.85 | Accept classification automatically |
| 0.60 – 0.84 | Accept but flag for optional user review |
| < 0.60 | Default to `noise`, always surface for user review |

---

## 5. Output Schema

Each classified chunk produces a record with the following fields:

```json
{
  "chunk_id": "uuid",
  "session_id": "uuid",
  "source_type": "email",
  "source_ref": "Message-ID (e.g. <12345.67890@enron.com>)",
  "speaker": "X-From field (full name) or null",
  "raw_text": "original chunk text",
  "cleaned_text": "normalized text",
  "label": "requirement | decision | stakeholder_feedback | timeline_reference | noise",
  "confidence": 0.91,
  "reasoning": "Describes a specific user-facing feature requirement.",
  "suppressed": false,
  "manually_restored": false,
  "created_at": "ISO8601 timestamp"
}
```

- `suppressed: true` means the chunk is noise-classified and hidden from the main pipeline
- `manually_restored: true` means the user overrode the classification

---

## 6. Storage

- All classified chunks (including noise) are written to **PostgreSQL** using a `JSONB` column for the full record
- A separate indexed column stores `label` and `suppressed` for efficient filtering
- The AKS only reads records where `label != 'noise' OR manually_restored = true`

---

## 7. User Review Interface (UI Contract)

The module must expose the following data to the frontend:

- **Signal feed**: chunks with `suppressed = false`, grouped by label
- **Noise review panel**: chunks with `suppressed = true`, showing `raw_text`, `confidence`, and `reasoning`
- **Restore action**: sets `suppressed = false`, `manually_restored = true`, logs the event

---

## 8. Hackathon Scope Constraints

- **Data source**: Enron Email Dataset CSV (~500k emails; use a representative subset of ~1,000–5,000 emails for demo)
- **LLM**: Gemini (via existing project API setup)
- No fine-tuning; classification is zero-shot with a well-structured prompt
- Batch processing preferred over per-chunk API calls where possible
- No streaming classification — process after full ingestion of a source
- Performance target: classify a 1,000-email subset in under 60 seconds
- Deduplication by `Message-ID` is mandatory before classification

---

## 9. Error Handling

| Failure | Behavior |
|---|---|
| LLM API timeout | Retry once; if still failing, label chunk as `noise` with `confidence: 0.0` and flag for review |
| Malformed LLM response | Log error, label as `noise`, flag for review |
| DB write failure | Retry with exponential backoff; surface error to session log |

---

## 10. Files & Responsibilities

```
Noise filter module/
├── implentationStrategy.md     ← This document
├── enron_parser.py             ← CSV ingestion, deduplication, thread flattening
├── classifier.py               ← Core classification logic (heuristics + LLM)
├── prompts.py                  ← LLM prompt templates
├── schema.py                   ← Output schema / Pydantic models
├── storage.py                  ← DB write logic
└── tests/
    ├── test_enron_parser.py
    ├── test_classifier.py
    └── test_heuristics.py
```

---

## 11. Definition of Done

- [ ] Enron CSV parser implemented (`enron_parser.py`)
- [ ] Deduplication by `Message-ID` working
- [ ] Thread flattening and boilerplate stripping working
- [ ] Enron-specific noise heuristics implemented
- [ ] Heuristic pre-filter implemented and tested
- [ ] LLM classification working with correct output schema
- [ ] Confidence thresholding applied
- [ ] All chunks (including noise) written to DB
- [ ] Suppressed items retrievable via API
- [ ] Manual restore action implemented
- [ ] Unit tests cover all five label categories and Enron-specific edge cases
- [ ] Integration tested against a real Enron CSV subset (≥ 500 emails)