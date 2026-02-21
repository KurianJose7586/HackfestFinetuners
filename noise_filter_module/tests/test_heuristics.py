"""
test_heuristics.py
"""

from classifier import apply_heuristics

def test_short_text_is_noise():
    chunk = {"cleaned_text": "Hi Bob", "speaker": "Alice"}
    assert apply_heuristics(chunk) == "noise"

def test_social_noise():
    chunk = {"cleaned_text": "Sounds good thanks", "speaker": "Alice"}
    assert apply_heuristics(chunk) == "noise"
    
    chunk = {"cleaned_text": "👍", "speaker": "Alice"}
    assert apply_heuristics(chunk) == "noise"

def test_system_mail_is_noise():
    chunk = {"cleaned_text": "Out of Office: I am away until Monday.", "speaker": "Alice"}
    assert apply_heuristics(chunk) == "noise"

def test_calendar_invite_is_timeline():
    chunk = {"cleaned_text": "You have been invited to a meeting for the phase 1 go-live", "speaker": "Calendar"}
    assert apply_heuristics(chunk) == "timeline_reference"

def test_normal_text_returns_none():
    chunk = {"cleaned_text": "We need to finalize the API spec soon.", "speaker": "Alice"}
    # This is long enough and not pure noise, so it should pass through to LLM (return None)
    assert apply_heuristics(chunk) is None
