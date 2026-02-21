# BRD Generation Pipeline — Implementation Strategy

---

## Position in the System

```
Attributed Knowledge Store (AKS)
        ↓
[ BRD Generation Pipeline ]  ← YOU ARE HERE
        ↓
Validation & Review
        ↓
Final BRD + Export
```

---

## Foundational Decisions Before Writing Any Code

**LLM:** Use the same Groq + Maverick setup already working in your noise filter. No new API keys or clients needed.

**Storage:** Add a `brd_sections` table to your existing PostgreSQL database. Each agent writes to its own row. Sections are versioned by `session_id` and `version_number`.

**Agent design:** Each agent is a standalone Python function, not a class or microservice. It takes a session ID, queries AKS directly, and writes its output to `brd_sections`. Agents do not call each other.

**Frozen snapshot principle:** When a generation run begins, the current state of AKS signals is captured as a snapshot ID. All agents in that run read from the same snapshot. This implements the "frozen state" guarantee from your project BRD.

**Missing data behavior:** If an agent queries AKS and finds no relevant signals, it writes an explicit placeholder like "Insufficient data to generate this section. No requirement signals were found in the provided sources." It never hallucinates content.

---

## Database Addition Required Before Stage 1

Add this table to your existing PostgreSQL schema before any agent code is written. Add it to your `storage.py` `init_db()` function:

**Table: `brd_sections`**

Columns needed are `section_id` as UUID primary key, `session_id` as VARCHAR indexed, `snapshot_id` as VARCHAR to tie the section to a specific AKS snapshot, `section_name` as VARCHAR for the agent that owns this row, `version_number` as INTEGER defaulting to 1, `content` as TEXT for the generated markdown, `source_chunk_ids` as JSONB array of chunk IDs used to generate this section for attribution, `is_locked` as BOOLEAN defaulting to false for human edit protection, `human_edited` as BOOLEAN defaulting to false, `generated_at` as TIMESTAMP, and `data` as JSONB for any additional metadata.

**Table: `brd_snapshots`**

Columns needed are `snapshot_id` as UUID primary key, `session_id` as VARCHAR, `created_at` as TIMESTAMP, and `chunk_ids` as JSONB array of all AKS chunk IDs included in this snapshot.

---

## Stage 1 — Snapshot Creation and Agent Infrastructure

### What to Build

**`brd_pipeline.py`** — the orchestrator file that coordinates all agents.

**Snapshot function:** Before any agent runs, call `create_snapshot(session_id)` which queries all active signals from AKS using your existing `get_active_signals()` function, records their chunk IDs in `brd_snapshots`, and returns a `snapshot_id`. All agents receive this snapshot ID and query only the chunks listed in it.

**Base agent structure:** Every agent follows this exact pattern. It receives `session_id` and `snapshot_id`. It calls a `get_signals_for_snapshot(snapshot_id, label_filter)` function that returns only chunks from that snapshot matching the requested label. It builds a prompt. It calls the LLM. It writes the result to `brd_sections` with the correct `section_name` and the list of `source_chunk_ids` it used. It returns the generated content.

**`get_signals_for_snapshot(snapshot_id, label_filter)`:** Queries AKS for chunks whose IDs are in the snapshot's `chunk_ids` array, optionally filtered by label. This is the only AKS query function agents are allowed to call — they cannot query AKS directly.

**Rate limit handler:** Reuse the exact same retry logic already in your `classifier.py`. Do not rewrite it.

### Tests for Stage 1

Create a test session, insert 10 synthetic classified chunks into AKS covering all five label types, call `create_snapshot()` and verify a snapshot record is created with exactly 10 chunk IDs. Call `get_signals_for_snapshot()` with `label_filter='requirement'` and verify only requirement-labelled chunks are returned. Call `get_signals_for_snapshot()` with no filter and verify all 10 are returned. Insert 2 more chunks into AKS after snapshot creation, call `get_signals_for_snapshot()` again and verify the count is still 10 — the snapshot must be frozen.

---

## Stage 2 — Functional Requirements Agent

### What to Build

Build this agent first. It has the highest signal density from your AKS data and is the most compelling demo section.

**Input:** All chunks from the snapshot with `label = 'requirement'`.

**Prompt design:** The prompt must do four things. First establish the agent role — it is a senior business analyst synthesizing requirements into a formal BRD section. Second provide all requirement chunks with their speaker and source reference. Third instruct it to group related requirements, number them, and write each as a clear functional requirement statement in the format "The system shall..." Fourth instruct it to explicitly flag any requirements that appear contradictory or incomplete rather than silently resolving them.

**Explicit missing data handling:** If zero requirement chunks are passed, the agent must return the placeholder text without calling the LLM at all. This saves tokens and prevents hallucination.

**Output format:** The agent writes structured markdown with numbered requirements grouped by theme. Each requirement includes an inline attribution showing which source chunk it was derived from, formatted as a footnote reference.

**Write to database:** Store the generated content in `brd_sections` with `section_name = 'functional_requirements'`, the list of chunk IDs used, and `version_number = 1`.

### Tests for Stage 2

Feed the agent 5 synthetic requirement chunks and verify a `brd_sections` row is created with `section_name = 'functional_requirements'`. Verify the `source_chunk_ids` array contains exactly the 5 chunk IDs provided. Verify the generated content contains numbered requirements. Feed the agent 0 requirement chunks and verify the placeholder text is written to the database without an LLM call being made. Feed the agent two contradictory requirements — one saying "The system must support mobile" and one saying "The system is desktop-only" — and verify the output flags the contradiction rather than silently picking one.

---

## Stage 3 — Stakeholder Analysis Agent

### What to Build

**Input:** All chunks from the snapshot with `label = 'stakeholder_feedback'`, plus the speaker field from all non-noise chunks to extract unique stakeholder names.

**What it generates:** A stakeholder table identifying each named speaker found in the signals, their apparent role based on context, their concerns or preferences extracted from feedback chunks, and their influence on the project as inferred from how many signals they contributed.

**Missing data handling:** If fewer than 2 unique speakers are found, write the placeholder. Do not fabricate stakeholder names.

**Important constraint:** The agent must not invent stakeholder roles. It can only infer role from what is explicitly stated or strongly implied in the source text. If role cannot be determined, it writes "Role unknown."

### Tests for Stage 3

Feed chunks from three different speakers and verify the output contains three stakeholder entries. Feed chunks where one speaker says "I am the product manager" and verify that role is captured. Feed chunks with no speaker metadata and verify the output explicitly states speaker attribution was unavailable rather than inventing names. Feed zero stakeholder feedback chunks but chunks from 3 speakers and verify the agent still generates stakeholder entries based on speaker presence even without explicit feedback.

---

## Stage 4 — Timeline Agent

### What to Build

**Input:** All chunks from the snapshot with `label = 'timeline_reference'`.

**What it generates:** A chronological list of project milestones and deadlines extracted from the signals. Each entry includes the date or timeframe mentioned, what it refers to, and the source attribution.

**Critical constraint:** The agent must only include dates and timeframes explicitly mentioned in the source chunks. It must never infer or estimate dates not present in the data. If a deadline is mentioned without a specific date, it writes the deadline description with "Date not specified" rather than guessing.

**Missing data handling:** If zero timeline chunks exist, write "No project timeline information was found in the provided sources. Timeline must be established through stakeholder clarification."

### Tests for Stage 4

Feed 3 timeline chunks mentioning Q3, a specific date, and "end of year" respectively and verify all three appear in the output. Feed a timeline chunk that mentions a meeting time rather than a project deadline and verify the agent does not include it as a project milestone — this tests that the agent applies judgment even to pre-filtered signals. Feed zero timeline chunks and verify the explicit placeholder is written.

---

## Stage 5 — Executive Summary Agent

### What to Build

This agent runs last because it synthesises from the other sections, not directly from AKS signals.

**Input:** The generated content from all other `brd_sections` rows for this session and snapshot, plus the count of signals by type from AKS.

**What it generates:** A 3-5 paragraph executive summary covering what the project is trying to achieve based on the requirements found, who the key stakeholders are, what the major constraints or risks are based on decisions and feedback, and an honest assessment of data completeness — explicitly stating which sections had insufficient data.

**Honest completeness statement:** The last paragraph must always include a sentence like "This BRD was generated from N signals extracted from M source documents. Sections marked with insufficient data require additional stakeholder input before the document can be considered complete."

**Runs last:** The orchestrator calls this agent only after all other agents have written their sections.

### Tests for Stage 5

Run all previous agents first against a test session, then run the Executive Summary agent and verify it references content from at least two other sections. Verify the completeness statement is present in every generated summary regardless of data quality. Run with a session where all sections have placeholder content and verify the summary explicitly states the BRD is incomplete rather than fabricating a positive summary.

---

## Stage 6 — Remaining Agents (Decisions, Assumptions, Success Metrics)

### What to Build

These three agents follow the same pattern as Stage 2 and can be built in parallel.

**Decisions Agent:** Input is `label = 'decision'` chunks. Outputs a numbered list of confirmed project decisions with source attribution. Flags decisions that appear to contradict each other.

**Assumptions Agent:** Input is all signal types. The agent infers assumptions implicit in the requirements and decisions — things the project is assuming to be true that are not explicitly stated. This is the most inference-heavy agent and its output must be clearly marked as AI-inferred rather than sourced from communications.

**Success Metrics Agent:** Input is `label = 'requirement'` and `label = 'decision'` chunks. Attempts to derive measurable success criteria from the requirements. If requirements are not measurable, it writes suggested metrics with a flag that they need stakeholder validation. Must never invent specific numbers not present in the source data.

### Tests for Stage 6

For each agent, test with populated signals and verify output is written to `brd_sections` with the correct `section_name`. Test with zero signals and verify placeholder is written. For the Assumptions Agent specifically, verify the output is clearly labelled as AI-inferred and not sourced from communications. For the Success Metrics Agent, verify that if no numeric targets appear in the source data, no specific numbers appear in the output.

---

## Stage 7 — Orchestrator and Parallel Execution

### What to Build

**`run_brd_generation(session_id)`** — the main entry point that coordinates everything.

The execution order is strictly: create snapshot first, then run Stages 2 through 6 agents, then run the Executive Summary agent last. Stages 2 through 6 can run in parallel since they write to separate rows and do not read each other's output. The Executive Summary agent must wait for all others to complete.

**Parallel execution:** Use Python `concurrent.futures.ThreadPoolExecutor` with a max of 4 workers. Each agent is submitted as a separate task. The orchestrator waits for all tasks to complete before calling the Executive Summary agent.

**Error isolation:** If one agent fails, the others must continue. A failed agent writes an error placeholder to its `brd_sections` row rather than crashing the pipeline. The orchestrator logs which agents failed and continues to the Executive Summary.

**Version management:** If `run_brd_generation` is called again for the same session, it increments `version_number` on all new rows rather than overwriting existing ones. Old versions remain in the database and are queryable.

### Tests for Stage 7

Run the full orchestrator against a test session with populated AKS data and verify that all 7 section rows are created in `brd_sections`. Verify the Executive Summary row has a later `generated_at` timestamp than all other sections confirming it ran last. Simulate one agent throwing an exception and verify the other agents still complete and the error placeholder appears in the failed section's row. Run the orchestrator twice for the same session and verify the second run creates `version_number = 2` rows without deleting `version_number = 1` rows.

---

## Stage 8 — Validation Layer

### What to Build

**`validator.py`** — runs after generation completes, reads the generated sections, and flags issues.

**Rule-based checks:** Check for requirement-decision contradictions — if a requirement says one thing and a decision says the opposite, flag it. Check for empty sections — if any section contains only placeholder text, flag it as a data gap. Check for timeline-requirement mismatches — if a requirement references a feature not mentioned in the timeline, flag it.

**AI semantic validation:** Send pairs of requirement and decision statements to the LLM and ask it to identify tensions or contradictions. Only flag issues where the LLM returns confidence above 0.85. Never auto-fix anything — only flag and provide reasoning.

**Output:** Write validation flags to a `brd_validation_flags` table with `section_name`, `flag_type` (contradiction/gap/mismatch), `description`, `severity` (high/medium/low), and `auto_resolvable` always set to false.

### Tests for Stage 8

Insert a requirement saying "system must be mobile-first" and a decision saying "desktop-only implementation approved" into AKS for the same session. Run validation and verify a contradiction flag is generated. Run validation on a session where all sections have placeholder content and verify gap flags are generated for each empty section. Verify no flag has `auto_resolvable = true` — this is a hard constraint from the project BRD.

---

## Stage 9 — Export

### What to Build

**`exporter.py`** — reads all `brd_sections` rows for a session at the latest version and assembles them into a final document.

**Section ordering:** Executive Summary, Business Objectives, Stakeholder Analysis, Functional Requirements, Non-Functional Requirements, Assumptions, Success Metrics, Timeline.

**DOCX export:** Use the `python-docx` library. Apply consistent heading styles. Include a cover page with session ID, generation timestamp, and data source summary. Include a footer on every page stating "Generated by PS21 BRD Agent — derived from source communications — not for distribution without human review."

**Validation flags appendix:** If any validation flags exist for the session, append them as a final section titled "Open Issues Requiring Human Resolution."

**Version metadata:** Include a metadata block on the cover page showing which version of each section is included and how many source signals contributed to it.

### Tests for Stage 9

Run the full pipeline end to end for a test session and call the exporter. Verify a `.docx` file is created. Verify the file contains all 7 section headings. Verify the footer text appears on pages. Verify that if validation flags exist they appear in the appendix. Verify the cover page contains the session ID and generation timestamp.

---
