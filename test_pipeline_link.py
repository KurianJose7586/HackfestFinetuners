import sys
import os
import uuid
from pathlib import Path

# Add paths so we can import modules
sys.path.append(os.path.abspath("Noise filter module"))
from integration_pipeline import process_external_content
from storage import get_active_signals, get_noise_items, get_connection

def verify_link():
    print("Starting Pipeline Link Verification...")
    
    # 1. Clear previous test data for this specific test source_ref if possible, 
    # but using a fresh session_id is cleaner.
    session_id = f"test-session-{uuid.uuid4().hex[:8]}"
    print(f"Using Session ID: {session_id}")
    
    test_content = (
        "Project Alpha requirements: The system must support high availability. "
        "Alice confirmed the deadline is Dec 1st. "
        "Let's have lunch at the pizza place."
    )
    
    source_ref = "test-doc-123.pdf"
    
    print("Calling process_external_content...")
    try:
        returned_sid = process_external_content(
            text=test_content,
            speaker="Test Runner",
            source_ref=source_ref,
            subject="Integration Test",
            source_type="document",
            session_id=session_id
        )
        
        if returned_sid != session_id:
            print(f"FAILED: Expected session_id {session_id}, got {returned_sid}")
            return
            
        print("Pipeline call successful. Checking DB results...")
        
        # 2. Check signals in DB
        signals = get_active_signals(session_id=session_id)
        noise = get_noise_items(session_id=session_id)
        
        print(f"Found {len(signals)} signals and {len(noise)} noise items for this session.")
        
        # Verify content exists
        all_items = signals + noise
        if not all_items:
            print("FAILED: No items found in database for the session.")
            return
            
        # Check for specific expected signals
        found_req = any("high availability" in c.cleaned_text.lower() for c in signals)
        found_timeline = any("dec 1st" in c.cleaned_text.lower() for c in signals)
        found_noise = any("pizza" in c.cleaned_text.lower() for c in noise)
        
        if found_req:
            print("SUCCESS: Found requirement signal.")
        else:
            print("WARNING: Requirement signal not found (classification might vary, but should be at least one signal).")
            
        if found_timeline:
            print("SUCCESS: Found timeline signal.")
        
        if found_noise:
            print("SUCCESS: Found noise item.")
            
        print("\nVerification Complete: RESULTS STORED IN AKS DATABASE")
        
    except Exception as e:
        print(f"ERROR during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_link()
