"""
validator.py
Runs validation checks on the generated BRD sections, flagging gaps and contradictions.
"""
import os
import json
import uuid
from typing import List, Dict
from datetime import datetime, timezone

from dotenv import load_dotenv
from pathlib import Path
from groq import Groq

_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

from brd_module.storage import get_latest_brd_sections, get_connection
from brd_module.brd_pipeline import call_llm_with_retry

def store_validation_flag(session_id: str, section_name: str, flag_type: str, description: str, severity: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO brd_validation_flags (
                    flag_id, session_id, section_name, flag_type, 
                    description, severity, auto_resolvable, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (str(uuid.uuid4()), session_id, section_name, flag_type, description, severity, False, datetime.now(timezone.utc)))
        conn.commit()
    finally:
        conn.close()

def validate_brd(session_id: str, client: Groq = None):
    """
    Runs rule-based and AI-semantic validation on the current session's BRD.
    Records flags to brd_validation_flags.
    """
    if client is None:
        client = Groq(api_key=os.environ.get("GROQ_CLOUD_API", ""))
        
    sections = get_latest_brd_sections(session_id)
    if not sections:
        return
        
    # 1. Rule-based: Missing / Insufficient Data Gaps
    for section_name, content in sections.items():
        if "Insufficient data" in content:
            store_validation_flag(
                session_id=session_id,
                section_name=section_name,
                flag_type="gap",
                description=f"Section '{section_name}' is missing source data and requires stakeholder clarification.",
                severity="medium"
            )
            
    reqs = sections.get("functional_requirements", "")
    decisions = sections.get("decisions", "")
    
    # Skip AI semantic check if either section is missing/empty
    if "Insufficient data" in reqs or "Insufficient data" in decisions or not reqs or not decisions:
        return
        
    # 2. AI Semantic Validation: Requirement vs Decision Contradiction
    prompt_text = "You are a senior business analyst validating a BRD for contradictions.\n\n"
    prompt_text += f"-- Requirements --\n{reqs}\n\n-- Decisions --\n{decisions}\n\n"
    prompt_text += """
Instructions:
1. Identify if any requirement directly conflicts with any decision.
2. If there are NO contradictions, output:
{"has_contradiction": false, "description": ""}

3. If there ARE contradictions, output:
{"has_contradiction": true, "description": "<A clear explanation of exactly what conflicts>"}

Output MUST be valid JSON.
"""

    messages = [
        {"role": "system", "content": "You are a strict JSON validation engine."},
        {"role": "user", "content": prompt_text}
    ]
    
    try:
        raw_response = call_llm_with_retry(client, messages, json_mode=True)
        result = json.loads(raw_response)
        
        if result.get("has_contradiction"):
            store_validation_flag(
                session_id=session_id,
                section_name="cross_section",
                flag_type="contradiction",
                description=result.get("description", "A contradiction between requirements and decisions was detected."),
                severity="high"
            )
    except Exception as e:
        print(f"[{session_id}] Validation AI check failed: {e}")
