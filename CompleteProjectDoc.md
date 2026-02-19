---

## PS21 – Business Requirements Document (BRD) Generation Agent

---

## Purpose of This Document

This document exists to keep the team aligned on:

- **What we are building**
- **Why we are building it this way**
- **Which risks we actively mitigate**
- **Which risks we knowingly accept for a hackathon**

Whenever a new feature or idea comes up, we should ask:

> **“Does this align with this document and PS21?”**
> 

If not, we cut it.

---

## 1. Project Overview

We are building an **AI-powered system that generates professional Business Requirements Documents (BRDs)** by **ingesting, filtering, and synthesizing information from real-world communication sources** such as Slack, emails, meeting transcripts, and documents.

Unlike typical AI document generators, our system:

- Does **not** generate a BRD from imagination
- Does **not** assume inputs are clean or complete
- Does **not** hide uncertainty or contradictions

Instead, it behaves like a **senior business analyst working with messy reality**:

- Collects fragmented information from multiple sources
- Filters noise explicitly
- Extracts project-relevant signals
- Synthesizes a structured, explainable BRD
- Keeps humans in control at all critical points

The core goal is **trustworthy, explainable BRD generation**, not impressive prose.

---

## 2. Core Problems We Are Solving

### 2.1 Business Problems

- Requirements are scattered across tools
- Communication is informal, repetitive, and noisy
- Manual BRD creation is slow and error-prone
- Contradictions surface late
- Existing tools assume requirements already exist

### 2.2 AI Problems

- LLMs hallucinate when information is missing
- Single-prompt generation hides failure modes
- Long interviews cause user fatigue
- Collaborative AI blurs accountability
- Silent data loss destroys trust

Our system is explicitly designed to counter these failure modes.

---

## 3. Guiding Principles

### 3.1 Ingest → Filter → Synthesize (Not Prompt → Document)

The BRD is **not the starting point**.

The system always follows this order:

1. Ingest reality
2. Normalize data
3. Filter noise
4. Extract signals
5. Build structured knowledge
6. Synthesize the BRD

Skipping steps is not allowed.

---

### 3.2 Draft → Refine, Not Interview First

We avoid interrogating users upfront.

Instead:

- Generate an **early, low-confidence draft**
- Clearly mark assumptions and gaps
- Ask **bounded, high-impact questions**
- Refine iteratively

This minimizes fatigue and increases trust.

---

### 3.3 AI Outputs Are Derived, Not Ground Truth

All AI outputs are:

- Derived from source data
- Versioned
- Invalidatable
- Overridable by humans

User decisions always win.

---

### 3.4 Accountability Over Collaboration

We avoid free-form “collaborative AI”.

Instead:

- Each BRD section has **one owning agent**
- Agents do not negotiate
- Agents do not overwrite each other
- Conflicts are surfaced, not resolved automatically

This mirrors how real organizations work.

---

## 4. End-to-End System Flow (Authoritative)

1. User creates a BRD session
2. User connects or uploads data sources
3. Sources are ingested
4. Data is normalized and chunked
5. Noise is classified (nothing deleted)
6. User reviews filtered items (optional gate)
7. Signals are stored with attribution
8. Draft BRD is generated
9. Clarification questions are asked (max 3/round)
10. Scope is confirmed (not frozen)
11. Detailed sections are generated
12. Validation flags conflicts and gaps
13. User resolves or acknowledges issues
14. Final BRD is composed
15. Snapshot export (DOCX / PDF)

The web UI is always the source of truth.

---

## 5. System Architecture (Conceptual)

```
Source Connectors
(Slack / Email / Meetings)
        ↓
Source Ingestion Layer
        ↓
Normalization & Chunking
        ↓
Noise Classification
        ↓
Attributed Knowledge Store (AKS)
        ↓
BRD Generation Pipeline
        ↓
Validation & Review
        ↓
Final BRD + Export
```

The system is **state-driven**, not conversation-driven.

---

## 6. Source Ingestion

### 6.1 Supported Sources

### Real integration (mandatory)

- **Slack (read-only)**
    - One workspace
    - Selected channels
    - Real Slack API

### Simulated integrations

- Email threads (uploaded)
- Meeting transcripts (uploaded)
- Documents (uploaded)

This satisfies PS21 honestly without overbuilding.

---

### 6.2 Slack Integration Scope (Explicit)

- Read-only
- Channels only (no DMs)
- Threads flattened with parent context
- Reactions treated as weak signals (optional)
- Rate-limited ingestion with retries

No claim of enterprise completeness.

---

## 7. Normalization & Chunking

Before AI reasoning:

- Inputs are split into logical chunks
- Speaker, timestamp, and source are preserved
- Boilerplate is removed
- Chunk size is heuristic-based (hackathon scale)

No inference occurs here.

---

## 8. Noise Filtering & Signal Extraction

### 8.1 Classification Categories

Each chunk is classified as:

- Requirement
- Decision
- Stakeholder feedback / concern
- Timeline reference
- Noise

### 8.2 No Silent Data Loss (Critical Fix)

- Noise is **suppressed, not deleted**
- User can review discarded items
- Misclassified items can be restored

This prevents silent failure.

---

## 9. Attributed Knowledge Store (AKS)

### 9.1 Purpose

AKS is the **bridge between raw data and BRD generation**.

It stores **structured, attributed signals**, not documents.

---

### 9.2 Guarantees (Explicit)

- Append-only
- Immutable extracted items
- Attribution never overwritten
- Stored in PostgreSQL (JSONB)
- Regenerable from raw sources

If AKS is lost, it can be rebuilt deterministically.

---

### 9.3 What Each Item Contains

- Cleaned text
- Signal type
- Source type
- Source reference (channel/file/timestamp)
- Speaker (if available)
- Extraction confidence

---

## 10. BRD Generation Phase (Explicit & Ordered)

### 10.1 Draft BRD Generation

The first BRD draft is generated directly from AKS and includes:

- Executive Summary
- Business Objectives
- Stakeholder Analysis
- Functional Requirements
- Non-Functional Requirements
- Assumptions
- Success Metrics
- Timeline

If data is missing:

- The section explicitly states that

No hallucinated timelines or metrics.

---

### 10.2 Section Ownership (Multi-Agent Rationale)

Each section is owned by a dedicated agent:

- Executive Summary Agent
- Stakeholder Agent
- Functional Requirements Agent
- Non-Functional Requirements Agent
- Assumptions Agent
- Timeline Agent
- Success Metrics Agent

Agents:

- Read a frozen state snapshot
- Write only to their section
- Never modify shared assumptions

---

### 10.3 Iterative Editing

Natural language edits are classified as:

- Regenerate from sources
- Rewrite existing text
- Add/remove specific items

If ambiguous:

- One clarification question is asked
- No silent assumptions

---

## 11. Validation Strategy

### 11.1 Rule-Based Validation

- Scope vs requirement mismatch
- Platform contradictions
- Keyword conflicts

### 11.2 AI Semantic Validation

- Detects subtle tensions
- Provides reasoning
- Flags only high-confidence issues

Validation **never auto-fixes** content.

---

## 12. State Model & Versioning (Clarified)

The system uses:

- **Linear, append-only versioned snapshots**
- Not a branching state machine
- Not Git-style merges

Rollback = select earlier version.

---

## 13. Parallel Agent Execution (Corrected)

Parallelism is:

- Limited
- Non-interactive
- Section-isolated

Agents:

- Do not wait on each other
- Do not share mutable fields
- Conflicts are handled post-generation

Parallelism is a performance optimization only.

---

## 14. Human-in-the-Loop Control

### 14.1 Manual Edits

- Manually edited items are locked
- AI cannot overwrite them
- Validation can still flag inconsistencies

This prevents drift without removing authority.

---

## 15. Visuals & Diagrams

- Generate simple process flows
- Render via Mermaid / PlantUML
- Tied to structured state

No heavy visualization tooling.

---

## 16. Export Strategy

- Dashboard = source of truth
- DOCX / PDF = snapshot
- Version metadata included
- No round-trip editing guarantee

---

## 17. Security & Safety Baseline (Hackathon-Level)

- Single-user sessions
- Slack tokens stored securely via env vars
- Prompt injection mitigated by treating source text as untrusted
- No claims of GDPR or enterprise compliance

---

## 18. Explicitly Out of Scope

We intentionally do not:

- Build full Gmail OAuth
- Support multi-workspace Slack
- Auto-resolve conflicts
- Build approval workflows
- Provide enterprise security guarantees

---

## 19. One-Sentence Internal Summary

> **We are building a system that turns messy real-world communication into a clean, explainable, and trustworthy Business Requirements Document.**
> 

---

# 📋 Risk Register

| ID | Risk | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R1 | Misclassification of noise | Loss of requirements | Human review of filtered items | Mitigated |
| R2 | Prompt injection via Slack | Model manipulation | Treat source as untrusted input | Mitigated |
| R3 | Citation drift | Misleading attribution | Snapshot-based citations | Mitigated |
| R4 | Locked content inconsistency | Drift over iterations | Validation flags locked items | Mitigated |
| R5 | Slack API rate limits | Ingestion failure | Bounded fetch + retries | Mitigated |
| R6 | AKS corruption | Loss of explainability | Regenerate from raw sources | Accepted |
| R7 | JSONB performance | Slower queries | Hackathon-scale data only | Accepted |
| R8 | No approval workflow | Incomplete governance | Explicitly out of scope | Accepted |
| R9 | Limited auth model | Security concerns | Demo-only scope | Accepted |
| R10 | Cost explosion from edits | Budget risk | Rate limiting edits | Mitigated |

---

## Final Direction Check

✔ Architecture issues addressed

✔ Vulnerabilities acknowledged

✔ Guardrails defined

✔ Scope remains hackathon-feasible