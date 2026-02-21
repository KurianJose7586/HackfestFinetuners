from groq import Groq
import os
from brd_module.storage import get_connection, create_snapshot
from brd_module.hitl.nl_edit_parser import parse_ad_hoc_prompt, store_edit_intent, apply_edit

def get_groq_client():
    return Groq(api_key=os.environ.get("GROQ_CLOUD_API", ""))

def submit_ad_hoc_prompt(
    session_id: str,
    prompt_text: str
) -> dict:
    client = get_groq_client()
    try:
        # 1. Parse intent
        parsed = parse_ad_hoc_prompt(prompt_text, client)
        
        if parsed.get("edit_type") == "no_change":
             return {
                "success": False,
                "message": "AI could not determine an actionable change for this prompt.",
                "explanation": parsed.get("reasoning")
            }
            
        # 2. Store edit
        edit_id = store_edit_intent(session_id, None, prompt_text, parsed)
        
        # 3. Apply edit
        version_id = apply_edit(session_id, edit_id, parsed, client)
        
        return {
            "success": True,
            "edit_id": edit_id,
            "version_id": version_id,
            "section_name": parsed.get("section_name"),
            "edit_type": parsed.get("edit_type")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def get_hitl_status(session_id: str) -> dict:
    # Minimal status for now
    return {"status": "ready"}
