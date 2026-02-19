"""
prompts.py
LLM prompt templates for the Noise Filter Module.
"""

VALID_LABELS = [
    "requirement",
    "decision",
    "stakeholder_feedback",
    "timeline_reference",
    "noise",
]

LABEL_DESCRIPTIONS = """
- requirement: A functional or non-functional need expressed by a stakeholder (e.g. "The system must support X").
- decision: A confirmed choice or direction agreed upon by the team (e.g. "We decided to use Y").
- stakeholder_feedback: A concern, opinion, or preference from a stakeholder (e.g. "I'm worried about Z").
- timeline_reference: A date, deadline, milestone, or scheduling reference (e.g. "We need this by Q3").
- noise: Greetings, off-topic chatter, filler, auto-generated system messages, legal disclaimers, or irrelevant content.
"""


def build_classification_prompt(chunk_text: str, speaker: str, source_ref: str) -> str:
    """
    Build a structured prompt for Gemini to classify a single email chunk.
    Returns a prompt string that instructs the model to respond with JSON only.
    """
    return f"""You are a business analyst assistant. Your job is to classify a fragment of an email into exactly one category.

## Categories
{LABEL_DESCRIPTIONS}

## Email Fragment
- Source: {source_ref}
- Speaker: {speaker or "Unknown"}
- Text:
\"\"\"
{chunk_text[:2000]}
\"\"\"

## Instructions
Respond with ONLY a valid JSON object. No explanation, no markdown, no code fences. Use this exact structure:
{{
  "label": "<one of: requirement, decision, stakeholder_feedback, timeline_reference, noise>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<one sentence explaining your classification>"
}}

If the text is a greeting, sign-off, legal disclaimer, auto-reply, or has no business relevance, classify it as "noise".
"""
