"""
classifier.py
Heuristic pre-filter + Groq LLM classification + confidence thresholding.
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Optional

from groq import Groq, APIConnectionError, RateLimitError, APIStatusError

from prompts import build_classification_prompt, VALID_LABELS
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

_CALENDAR_PATTERNS = re.compile(
    r"(?:you have been invited|"
    r"meeting request|"
    r"calendar invitation|"
    r"please join|"
    r"\bdeadline\b|\bby (?:monday|tuesday|wednesday|thursday|friday|q[1-4])\b)",
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

_MIN_WORD_COUNT = 5  # chunks shorter than this are noise


def apply_heuristics(chunk: dict) -> Optional[str]:
    """
    Fast-path rule-based classification.
    Returns a label string if confident, or None to pass through to LLM.
    """
    text = chunk.get("cleaned_text", "")
    speaker = chunk.get("speaker", "")
    word_count = len(text.split())

    # Too short
    if word_count < _MIN_WORD_COUNT:
        return "noise"

    # System-generated mail
    if _SYSTEM_MAIL_PATTERNS.search(text) or _SYSTEM_MAIL_PATTERNS.search(speaker):
        return "noise"

    # Pure social noise
    if _SOCIAL_NOISE.match(text.strip()):
        return "noise"

    # Calendar / meeting invite → timeline reference
    if _CALENDAR_PATTERNS.search(text):
        return "timeline_reference"

    return None  # inconclusive — send to LLM


# ---------------------------------------------------------------------------
# LLM classification with Groq SDK
# ---------------------------------------------------------------------------

def classify_with_llm(chunk: dict, client: Groq) -> dict:
    """
    Call Groq (Llama model) to classify a chunk.
    Returns a dict with label, confidence, reasoning.
    Falls back to noise on any failure.
    """
    prompt = build_classification_prompt(
        chunk_text=chunk["cleaned_text"],
        speaker=chunk.get("speaker", "Unknown"),
        source_ref=chunk.get("source_ref", ""),
    )

    # Use JSON mode if possible. 
    # For Llama models on Groq, response_format={"type": "json_object"} is often supported.
    # We must ensure the system prompt or user prompt explicitly asks for JSON (which it does).
    
    # Model specified by user
    MODEL_NAME = "meta-llama/llama-4-maverick-17b-128e-instruct" # Or fallback to generic llama3 if needed

    for attempt in range(2):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that outputs strictly in JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=MODEL_NAME, # Use the user-specified model
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            
            raw = chat_completion.choices[0].message.content
            if not raw:
                raise ValueError("Empty response from LLM")
            
            result = json.loads(raw)

            label = result.get("label", "noise").lower().strip()
            if label not in VALID_LABELS:
                label = "noise"

            confidence = float(result.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))
            reasoning = str(result.get("reasoning", ""))

            return {"label": label, "confidence": confidence, "reasoning": reasoning}

        except (json.JSONDecodeError, ValueError, AttributeError) as e:
            if attempt == 0:
                time.sleep(1)
                continue
            return {
                "label": "noise",
                "confidence": 0.0,
                "reasoning": f"LLM parse error: {e}",
            }
        except (APIConnectionError, RateLimitError, APIStatusError) as e:
            if attempt == 0:
                time.sleep(2)
                continue
            return {
                "label": "noise",
                "confidence": 0.0,
                "reasoning": f"LLM API error: {e}",
            }
        except Exception as e:
            return {
                "label": "noise",
                "confidence": 0.0,
                "reasoning": f"LLM unexpected error: {e}",
            }

    return {"label": "noise", "confidence": 0.0, "reasoning": "Max retries exceeded"}


# ---------------------------------------------------------------------------
# Confidence thresholding
# ---------------------------------------------------------------------------

def apply_confidence_threshold(result: dict) -> dict:
    """
    Adjust suppression and review flags based on confidence score.
    ≥ 0.85  → accept automatically
    0.60–0.84 → accept but flag for review
    < 0.60  → force to noise, always flag for review
    """
    confidence = result["confidence"]
    result["flagged_for_review"] = False

    if confidence >= 0.85:
        pass  # auto-accept
    elif confidence >= 0.60:
        result["flagged_for_review"] = True
    else:
        result["label"] = "noise"
        result["flagged_for_review"] = True

    return result


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def classify_chunks(chunks: list[dict], api_key: str) -> list[ClassifiedChunk]:
    """
    Classify a list of raw chunk dicts.
    Returns a list of ClassifiedChunk objects.
    """
    client = Groq(api_key=api_key)

    results: list[ClassifiedChunk] = []

    for i, chunk in enumerate(chunks):
        # Step 1: heuristics
        heuristic_label = apply_heuristics(chunk)

        if heuristic_label is not None:
            result = {
                "label": heuristic_label,
                "confidence": 1.0,
                "reasoning": "Classified by heuristic rule.",
                "flagged_for_review": False,
            }
        else:
            # Step 2: LLM
            result = classify_with_llm(chunk, client)
            # Step 3: confidence threshold
            result = apply_confidence_threshold(result)

        classified = ClassifiedChunk(
            source_ref=chunk.get("source_ref", ""),
            speaker=chunk.get("speaker"),
            raw_text=chunk.get("raw_text", ""),
            cleaned_text=chunk.get("cleaned_text", ""),
            label=SignalLabel(result["label"]),
            confidence=result["confidence"],
            reasoning=result["reasoning"],
            flagged_for_review=result.get("flagged_for_review", False),
        )
        results.append(classified)

        # Polite rate limiting: Groq is very fast, but let's be safe
        if heuristic_label is None:
            time.sleep(0.2) 

        if (i + 1) % 10 == 0:
            print(f"  Classified {i + 1}/{len(chunks)} chunks...")

    return results
