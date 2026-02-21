"""
classifier.py
Two-phase parallel pipeline:
  Phase 1 — parallel heuristic/domain-gate (8 threads, CPU-bound regex)
  Phase 2 — batch LLM calls (batch=10, 2 concurrent, rate-safe)
"""

from __future__ import annotations

import json
import os
import re
import time
import logging
import threading
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from groq import Groq, APIConnectionError, RateLimitError, APIStatusError

logging.basicConfig(
    filename="pipeline_debug.log",
    level=logging.DEBUG,
    format="%(asctime)s | %(message)s"
)

def log_chunk_decision(chunk, path, label, confidence, reasoning):
    logging.debug(
        f"\n{'='*60}"
        f"\nPATH: {path}"
        f"\nSPEAKER: {chunk.get('speaker', 'Unknown')}"
        f"\nSOURCE: {chunk.get('source_ref', '')}"
        f"\nTEXT: {chunk.get('cleaned_text', '')[:150]}"
        f"\nLABEL: {label}"
        f"\nCONFIDENCE: {confidence}"
        f"\nREASONING: {reasoning}"
        f"\n{'='*60}"
    )

from prompts import build_classification_prompt, build_batch_classification_prompt, VALID_LABELS
from schema import ClassifiedChunk, SignalLabel

# ---------------------------------------------------------------------------
# Heuristic rules (fast path — no API call needed)
# ---------------------------------------------------------------------------

_SYSTEM_MAIL_PATTERNS = re.compile(
    r"(?:delivery status notification|"
    r"out of office|"
    r"auto.?reply|"
    r"undeliverable|"
    r"mailer-daemon|"
    r"postmaster)",
    re.IGNORECASE,
)

# Strict project deadline patterns
_PROJECT_TIMELINE = re.compile(
    r"(?:\bdeadline\b|"
    r"\bmilestone\b|"
    r"\bphase [1-9]\b|"
    r"\bgo-live\b|"
    r"\blaunch date\b|"
    r"\bcode freeze\b|"
    r"\bdeliverable\b)",
    re.IGNORECASE,
)

# Pure meeting/scheduling noise (Strict - always noise)
_STRICT_MEETING = re.compile(
    r"(?:dial-in\b|"
    r"webex\b|"
    r"zoom\b|"
    r"lunch\b|"
    r"room \d+|"
    r"conference room|"
    r"calendar invite)",
    re.IGNORECASE,
)

# Context-dependent meeting words (Noise ONLY if short/no content)
_WEAK_MEETING = re.compile(
    r"(?:meeting\b|"
    r"schedule\b|"
    r"calendar\b|"
    r"invite\b|"
    r"\b(?:monday|tuesday|wednesday|thursday|friday)\b(?!\s+(?:deadline|launch))|" 
    r"\bat \d{1,2}(?::\d{2})?\s*(?:am|pm)?\b)", # at 2pm
    re.IGNORECASE,
)

_SOCIAL_NOISE = re.compile(
    r"^(?:thanks?(?:\s+\w+)?|"
    r"sounds good|"
    r"ok|okay|"
    r"sure|"
    r"got it|"
    r"noted|"
    r"will do|"
    r"👍|"
    r"see you|"
    r"talk soon|"
    r"have a (?:good|great|nice) (?:day|weekend))\.?$",
    re.IGNORECASE,
)

_MIN_WORD_COUNT = 4  # Very short chunks are usually noise unless they contain keywords


def apply_heuristics(chunk: dict) -> Optional[str]:
    """
    Fast-path rule-based classification.
    Returns:
      - "noise": if confident it's junk
      - "timeline_reference": if confident it's a PROJECT deadline
      - None: inconclusive, send to LLM
    """
    text = chunk.get("cleaned_text", "")
    speaker = chunk.get("speaker", "")
    word_count = len(text.split())

    # System-generated mail
    if _SYSTEM_MAIL_PATTERNS.search(text) or _SYSTEM_MAIL_PATTERNS.search(speaker):
        return "noise"

    # Pure social noise (short & generic)
    if word_count < 10 and _SOCIAL_NOISE.match(text.strip()):
        return "noise"
        
    # Strict Meeting patterns -> Always Noise (e.g. "dial-in details")
    if _STRICT_MEETING.search(text):
         if not _PROJECT_TIMELINE.search(text):
            return "noise"

    # Weak Meeting patterns -> Noise ONLY if short (< 50 words)
    # This prevents killing "Let's discuss the requirements in the meeting on Monday..."
    if _WEAK_MEETING.search(text):
        if word_count < 50:
            # Double check it's NOT a project deadline
            if not _PROJECT_TIMELINE.search(text):
                return "noise"

    # Ultra-short junk
    if word_count < _MIN_WORD_COUNT:
        return "noise"

    # Project deadlines -> Timeline
    if _PROJECT_TIMELINE.search(text):
        return "timeline_reference"

    return None  # inconclusive — send to LLM


SIGNAL_NOUNS = {
    "system", "feature", "requirement", "dashboard",
    "report", "integration", "api", "database", "screen",
    "interface", "application", "platform", "module",
    "workflow", "process", "user", "access", "permission",
    "security", "compliance", "performance", "audit",
    "position", "model", "tool", "data", "pipeline",
    "implementation", "design", "architecture", "service"
}

def has_signal_nouns(text: str) -> bool:
    words = set(text.lower().split())
    return bool(words & SIGNAL_NOUNS)


# ---------------------------------------------------------------------------
# Phase 1 — Parallel heuristic classification
# ---------------------------------------------------------------------------

def _classify_single_heuristic(item: tuple[int, dict]) -> tuple[int, dict, Optional[str], str]:
    """
    Evaluate one chunk through heuristics + domain gate.
    Returns: (original_index, chunk, label_or_None, path)
    """
    idx, chunk = item
    label = apply_heuristics(chunk)
    if label is not None:
        return (idx, chunk, label, "HEURISTIC")
    elif not has_signal_nouns(chunk.get("cleaned_text", "")):
        return (idx, chunk, "noise", "DOMAIN_GATE")
    else:
        return (idx, chunk, None, "LLM_PENDING")


def run_parallel_heuristics(chunks: list[dict]) -> tuple[dict[int, dict], list[tuple[int, dict]]]:
    """
    Run heuristics on all chunks (direct loop — pure CPU/regex, GIL-bound).
    Returns:
      - fast_results: {index → result_dict} for heuristic-decided chunks
      - llm_pending:  [(index, chunk), ...] for chunks needing LLM
    """
    fast_results: dict[int, dict] = {}
    llm_pending: list[tuple[int, dict]] = []

    for i, chunk in enumerate(chunks):
        idx, chunk, label, path = _classify_single_heuristic((i, chunk))
        if label is None:
            llm_pending.append((idx, chunk))
        else:
            log_chunk_decision(chunk, path, label, 1.0,
                               "Classified by heuristic rule." if path == "HEURISTIC"
                               else "No project-relevant domain terms detected.")
            fast_results[idx] = {
                "label": label,
                "confidence": 1.0,
                "reasoning": ("Classified by heuristic rule." if path == "HEURISTIC"
                              else "No project-relevant domain terms detected."),
                "flagged_for_review": False,
            }

    return fast_results, llm_pending


# ---------------------------------------------------------------------------
# Phase 2 — Batch LLM classification
# ---------------------------------------------------------------------------

MODEL_NAME = "meta-llama/llama-4-maverick-17b-128e-instruct"
MAX_RETRIES = 5
BATCH_SIZE = 10
MAX_CONCURRENT_BATCHES = 2


def classify_batch_with_llm(
    index_batch: list[tuple[int, dict]],
    client: Groq
) -> dict[int, dict]:
    """
    Classify a batch of (index, chunk) pairs in a single Groq call.
    Returns {index → raw_result_dict}.
    Falls back to noise on any failure.
    """
    indices = [i for i, _ in index_batch]
    batch_chunks = [c for _, c in index_batch]
    fallback = {i: {"label": "noise", "confidence": 0.0, "reasoning": "Batch LLM failed."} for i in indices}

    prompt = build_batch_classification_prompt(batch_chunks)

    for attempt in range(MAX_RETRIES):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that outputs strictly in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                model=MODEL_NAME,
                temperature=0.0,
                response_format={"type": "json_object"},
            )

            raw = chat_completion.choices[0].message.content
            if not raw:
                raise ValueError("Empty response from LLM")

            parsed = json.loads(raw)
            results_raw = parsed.get("results", [])

            if not isinstance(results_raw, list) or len(results_raw) != len(batch_chunks):
                raise ValueError(f"Expected {len(batch_chunks)} results, got {len(results_raw)}")

            out = {}
            for idx, r in zip(indices, results_raw):
                label = r.get("label", "noise").lower().strip()
                if label not in VALID_LABELS:
                    label = "noise"
                out[idx] = {
                    "label": label,
                    "confidence": max(0.0, min(1.0, float(r.get("confidence", 0.0)))),
                    "reasoning": str(r.get("reasoning", "")),
                }
            return out

        except RateLimitError as e:
            wait = min(2 ** attempt + 2, 60)
            logging.warning(f"Rate limit. Waiting {wait}s (attempt {attempt+1}/{MAX_RETRIES})")
            time.sleep(wait)
            continue

        except (APIConnectionError, APIStatusError) as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
                continue
            logging.error(f"Batch API error: {e}")
            return fallback

        except (json.JSONDecodeError, ValueError) as e:
            logging.warning(f"Batch parse error (attempt {attempt+1}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
                continue
            return fallback

        except Exception as e:
            logging.error(f"Unexpected batch error: {e}")
            return fallback

    return fallback


def run_parallel_batches(
    llm_pending: list[tuple[int, dict]],
    client: Groq,
    progress_callback
) -> dict[int, dict]:
    """
    Process LLM-pending chunks in batches of BATCH_SIZE,
    running MAX_CONCURRENT_BATCHES batches at a time.
    Sleeps 1s between groups (not between individual batches) to stay rate-safe.
    """
    # Split into batches
    batches = [
        llm_pending[i:i + BATCH_SIZE]
        for i in range(0, len(llm_pending), BATCH_SIZE)
    ]

    llm_results: dict[int, dict] = {}

    # Process in groups of MAX_CONCURRENT_BATCHES
    for group_start in range(0, len(batches), MAX_CONCURRENT_BATCHES):
        group = batches[group_start: group_start + MAX_CONCURRENT_BATCHES]

        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_BATCHES) as executor:
            future_to_batch = {
                executor.submit(classify_batch_with_llm, batch, client): batch
                for batch in group
            }
            for future, batch in future_to_batch.items():
                batch_result = future.result()
                # O(1) lookup dict instead of O(n) linear scan per result
                idx_to_chunk = {i: c for i, c in batch}
                # Apply confidence thresholding
                for idx, result in batch_result.items():
                    result = apply_confidence_threshold(result)
                    chunk = idx_to_chunk[idx]
                    log_chunk_decision(chunk, "LLM_BATCH", result["label"],
                                       result["confidence"], result["reasoning"])
                    llm_results[idx] = result
                progress_callback(len(batch))

        # Sleep between groups (not within) — avoids rate limits while maximising throughput
        if group_start + MAX_CONCURRENT_BATCHES < len(batches):
            time.sleep(1.0)

    return llm_results


# ---------------------------------------------------------------------------
# Confidence thresholding
# ---------------------------------------------------------------------------

def apply_confidence_threshold(result: dict) -> dict:
    """
    Adjust suppression and review flags based on confidence score.
    ≥ 0.90  → accept automatically
    0.70–0.89 → accept but flag for review
    < 0.70  → force to noise, always flag for review
    """
    confidence = result["confidence"]
    result["flagged_for_review"] = False

    if confidence >= 0.90:
        pass  # auto-accept
    elif confidence >= 0.70:
        result["flagged_for_review"] = True
    else:
        result["label"] = "noise"
        result["flagged_for_review"] = True

    return result


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def classify_chunks(chunks: list[dict], api_key: str, log_fn=None) -> list[ClassifiedChunk]:
    """
    Two-phase parallel classification pipeline.

    Phase 1 — Parallel heuristics (8 threads, CPU-bound):
      Regex + domain-gate run simultaneously on all chunks.
      Chunks decided here never touch the API.

    Phase 2 — Controlled batch LLM (batch=10, 2 concurrent):
      LLM-pending chunks are grouped into batches of 10.
      Two batches run concurrently, then a 1s sleep before the next pair.
      This maximises throughput without hitting Groq's RPM limit.
    """
    if not chunks:
        return []

    client = Groq(api_key=api_key)
    total = len(chunks)

    # Shared thread-safe progress counter
    _done = {"n": 0}
    _lock = threading.Lock()

    def progress_callback(n: int):
        with _lock:
            _done["n"] += n
            done = _done["n"]
            if done % 10 == 0 or done == total:
                print(f"  Classified {done}/{total} chunks...")

    # ── Phase 1: parallel heuristics ────────────────────────────────────────
    fast_results, llm_pending = run_parallel_heuristics(chunks)
    progress_callback(len(fast_results))

    fast_path_count = len(fast_results)
    llm_count = len(llm_pending)
    print(f"  → Heuristic/domain gate: {fast_path_count} chunks  |  LLM queue: {llm_count} chunks")

    # ── Phase 2: batch LLM calls ─────────────────────────────────────────────
    llm_results: dict[int, dict] = {}
    if llm_pending:
        llm_results = run_parallel_batches(llm_pending, client, progress_callback)

    # ── Assemble in original order ────────────────────────────────────────────
    all_results = {**fast_results, **llm_results}

    classified: list[ClassifiedChunk] = []
    for i, chunk in enumerate(chunks):
        result = all_results[i]
        classified.append(ClassifiedChunk(
            source_ref=chunk.get("source_ref", ""),
            speaker=chunk.get("speaker"),
            raw_text=chunk.get("raw_text", ""),
            cleaned_text=chunk.get("cleaned_text", ""),
            label=SignalLabel(result["label"]),
            confidence=result["confidence"],
            reasoning=result["reasoning"],
            flagged_for_review=result.get("flagged_for_review", False),
        ))

    return classified
