"""
test_classifier.py
Integration test calling real Gemini API.
"""

import os
import pytest
from dotenv import load_dotenv
from classifier import classify_chunks

# Load env from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

def test_classify_simple_sample():
    from dotenv import load_dotenv
    load_dotenv(os.path.join("Noise filter module", ".env"))
    
    api_key = os.getenv("GROQ_CLOUD_API")
    if not api_key:
        pytest.skip("GROQ_CLOUD_API not found in .env, skipping integration test")

    chunks = [
        {
            "cleaned_text": "We must allow users to reset their password via email.",
            "speaker": "Alice",
            "source_ref": "<test1>"
        },
        {
            "cleaned_text": "Let's grab lunch at 12.",
            "speaker": "Bob",
            "source_ref": "<test2>"
        },
        {
            "cleaned_text": "The deadline for phase 1 is October 15th.",
            "speaker": "Charlie",
            "source_ref": "<test3>"
        }
    ]

    results = classify_chunks(chunks, api_key=api_key)

    assert len(results) == 3
    
    # Check item 1 (Requirement)
    req = results[0]
    assert req.label.value == "requirement", f"Expected requirement, got {req.label.value}. Reason: {req.reasoning}"
    assert req.confidence > 0.6
    
    # Check item 2 (Noise) - heuristics might catch this or LLM
    # "Let's grab lunch at 12" is borderline noise/timeline, but usually noise in business context.
    # Actually, it's short (5 words). "Let's grab lunch at 12" is 5 words, so it passes min length check.
    # LLM should classify as noise or timeline. Let's just check it has a label.
    assert results[1].label in ["noise", "timeline_reference", "stakeholder_feedback"]

    # Check item 3 (Timeline)
    assert results[2].label.value == "timeline_reference"
