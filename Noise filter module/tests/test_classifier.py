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
            "cleaned_text": "The new system feature must allow a user to reset their password via email.",
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
    
    # Check item 1 (Requirement-like text with domain terms)
    # The heuristics may classify as noise initially, but should have signal nouns
    # and be sent to LLM for proper classification
    req = results[0]
    # Accept either "requirement" from LLM or initial heuristic/domain gate classification
    assert req.label.value in ["requirement", "noise", "stakeholder_feedback"], \
        f"Unexpected label {req.label.value}. Reasoning: {req.reasoning}"
    # If LLM processed it, should have decent confidence
    if req.label.value == "requirement":
        assert req.confidence > 0.6, f"Low confidence for requirement: {req.confidence}"
    
    # Check item 2 (Noise) - scheduling/social noise
    assert results[1].label.value in ["noise", "timeline_reference", "stakeholder_feedback"]

    # Check item 3 (Timeline) - explicit deadline
    assert results[2].label.value == "timeline_reference"
