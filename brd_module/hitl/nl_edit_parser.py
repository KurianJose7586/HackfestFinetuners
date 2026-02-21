import os
import json
from groq import Groq
from brd_module.brd_pipeline import call_llm_with_retry, run_single_agent
from brd_module.storage import get_connection, get_latest_brd_sections
from datetime import datetime, timezone

VALID_EDIT_TYPES = ("add_item", "rewrite", "regenerate", "no_change", "clarify")

def parse_ad_hoc_prompt(
    prompt_text: str,
    client: Groq
) -> dict:
    prompt = f"""
    You are an AI agent designed to update a Business Requirements Document (BRD).
    The user is giving you a direct natural language command.
    
    Determine:
    1. Which BRD section is affected:
       - stakeholder_analysis
       - functional_requirements
       - timeline
       - decisions
       - assumptions
       - success_metrics
       - executive_summary
    
    2. What type of edit is implied:
       - "regenerate": USE THIS for transformative commands like "shorten", "summarize", "expand", "rewrite in X style", or "make it more formal". Put the specific instruction in 'additional_context'.
       - "add_item": USE THIS if the user is giving a specific new requirement, stakeholder, or metric to add.
       - "rewrite": USE THIS ONLY if the user has provided the EXACT new text they want to use for the entire section.
       - "no_change": If the prompt is just a question or greeting.

    User prompt: "{prompt_text}"
    
    Return valid JSON only:
    {{
      "edit_type": "<one of the above>",
      "section_name": "<section_id>",
      "content": "<exact text to add if add_item, or null>",
      "additional_context": "<the transformative instruction (e.g. 'shorten this') if regenerate, or null>",
      "reasoning": "<one sentence explaining your choice>",
      "confidence": <0.0-1.0>
    }}
    """
    try:
        messages = [
            {"role": "system", "content": "You are a senior business analyst agent."},
            {"role": "user", "content": prompt}
        ]
        response = call_llm_with_retry(client, messages, json_mode=True)
        if isinstance(response, str):
            parsed = json.loads(response)
        else:
            parsed = response
    except Exception:
        parsed = {"edit_type": "no_change", "section_name": "functional_requirements", "confidence": 0}

    edit_type = parsed.get("edit_type")
    if edit_type not in VALID_EDIT_TYPES:
        parsed["edit_type"] = "no_change"
        
    return parsed

def store_edit_intent(
    session_id: str,
    question_id: str,
    answer_text: str,
    parsed_intent: dict
) -> str:
    conn, db_type = get_connection()
    edit_id = str(os.urandom(8).hex()) # simple edit id
    try:
        # Intent storage skipped to keep schema clean for teammate review
        pass
    finally:
        conn.close()
    return edit_id

def apply_edit(
    session_id: str,
    edit_id: str,
    parsed_intent: dict,
    groq_client: Groq
) -> str:
    from brd_module.hitl.versioned_ledger import is_section_locked, get_section_content, get_current_snapshot_id
    
    section_name = parsed_intent.get("section_name")
    edit_type = parsed_intent.get("edit_type")
    
    if edit_type == "regenerate":
        snapshot_id = get_current_snapshot_id(session_id)
        additional_context = parsed_intent.get("additional_context", "")
        new_content = run_single_agent(
            session_id, snapshot_id, section_name, 
            groq_client, additional_context=additional_context
        )
        return new_content
        
    if edit_type == "add_item":
        # logic for adding items
        current = get_section_content(session_id, section_name)
        new_content = current + "\n- " + parsed_intent.get("content", "")
        from brd_module.hitl.versioned_ledger import create_new_version
        create_new_version(session_id, edit_id, section_name, new_content, "ai")
        return new_content
        
    return ""
