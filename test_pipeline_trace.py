"""
Complete Pipeline Trace - Track meeting transcripts through the entire system
Shows: Load → Ingest → Noise Filter → LLM Classification → BRD Generation
"""

import json
import requests
import time
import sys
from pathlib import Path

# Colors for output
GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

API_URL = "http://localhost:8000"

def print_step(step_num, title):
    print(f"\n{BLUE}{'='*70}")
    print(f"STEP {step_num}: {title}")
    print(f"{'='*70}{RESET}\n")

def print_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_info(msg):
    print(f"{YELLOW}ℹ️  {msg}{RESET}")

def print_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

# ============================================================================
# STEP 1: LOAD TRANSCRIPTS FROM CSV/JSON
# ============================================================================

def load_transcripts(file_path):
    """Load meeting transcripts from JSON or CSV"""
    print_step(1, "LOAD MEETING TRANSCRIPTS")
    
    file_path = Path(file_path)
    if not file_path.exists():
        print_error(f"File not found: {file_path}")
        return None
    
    print_info(f"Loading from: {file_path}")
    print_info(f"File size: {file_path.stat().st_size / 1024:.2f} KB")
    
    if file_path.suffix == '.json':
        with open(file_path) as f:
            data = json.load(f)
            if isinstance(data, list):
                meetings = data
            else:
                meetings = [data]
    else:
        print_error("Only JSON format supported. Convert CSV first with: python load_csv_dataset.py")
        return None
    
    print_success(f"Loaded {len(meetings)} meetings")
    
    total_turns = sum(len(m.get('transcript', [])) for m in meetings)
    print_success(f"Total transcript turns: {total_turns}")
    
    # Show sample
    if meetings:
        sample = meetings[0]
        print_info(f"Sample meeting ID: {sample.get('meeting_id', 'N/A')}")
        print_info(f"Sample summary: {sample.get('summary', 'N/A')[:80]}...")
        print_info(f"Sample turns: {len(sample.get('transcript', []))}")
    
    return meetings

# ============================================================================
# STEP 2: CREATE SESSION & INGEST DATA
# ============================================================================

def create_session():
    """Create a new session for this processing"""
    print_step(2, "CREATE SESSION")
    
    try:
        resp = requests.post(f"{API_URL}/sessions/", json={})
        if resp.status_code == 200:
            session = resp.json()
            session_id = session.get('session_id')
            print_success(f"Session created: {session_id}")
            return session_id
        else:
            print_error(f"Failed to create session: {resp.text}")
            return None
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to API. Start it with: python start_api.py")
        return None

def ingest_transcripts(session_id, meetings):
    """Ingest meeting data into the system"""
    print_step(3, "INGEST MEETING DATA")
    
    # Convert meetings to chunks format
    chunks = []
    for meeting in meetings:
        meeting_id = meeting.get('meeting_id', 'unknown')
        for i, turn in enumerate(meeting.get('transcript', [])):
            chunk = {
                'cleaned_text': turn.get('text', ''),
                'speaker': turn.get('speaker', f'Speaker {i}'),
                'source_ref': f"{meeting_id}:turn_{i}",
                'meeting_id': meeting_id,
                'summary': meeting.get('summary', '')
            }
            chunks.append(chunk)
    
    print_info(f"Converting {len(meetings)} meetings to {len(chunks)} chunks")
    
    # Send to API
    try:
        resp = requests.post(
            f"{API_URL}/sessions/{session_id}/ingest/data",
            json={'chunks': chunks}
        )
        
        if resp.status_code in [200, 202]:
            print_success(f"Ingested {len(chunks)} chunks")
            data = resp.json() if resp.text else {}
            queued = data.get('queued_count', len(chunks))
            print_info(f"Queued for classification: {queued}")
            return True
        else:
            print_error(f"Ingestion failed: {resp.status_code} - {resp.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Ingestion error: {e}")
        return False

# ============================================================================
# STEP 4: WAIT FOR NOISE FILTERING (CLASSIFICATION)
# ============================================================================

def wait_for_classification(session_id, wait_seconds=10):
    """Wait for chunks to be classified and filtered"""
    print_step(4, "NOISE FILTERING & CLASSIFICATION (Background)")
    
    print_info(f"Classification running in background (heuristics + optional LLM)")
    print_info(f"Waiting {wait_seconds} seconds for processing...")
    
    for i in range(wait_seconds):
        time.sleep(1)
        print(f"  ⏳ {i+1}/{wait_seconds}s", end='\r')
    
    print()
    
    # Retrieve classified chunks
    try:
        resp = requests.get(f"{API_URL}/sessions/{session_id}/chunks/?status=signal")
        if resp.status_code == 200:
            signals = resp.json()
            signal_count = len(signals) if isinstance(signals, list) else 0
            print_success(f"Found {signal_count} signal chunks (non-noise)")
            
            # Show sample
            if signal_count > 0 and isinstance(signals, list):
                sample = signals[0]
                label = sample.get('label', 'unknown')
                confidence = sample.get('confidence', 0)
                text = sample.get('text', 'N/A')[:100]
                print_info(f"Sample signal - Label: {label} | Confidence: {confidence:.2f} | Text: {text}...")
            
            return signal_count
        else:
            print_error(f"Failed to retrieve signals: {resp.status_code}")
            return 0
    except Exception as e:
        print_error(f"Error retrieving signals: {e}")
        return 0

# ============================================================================
# STEP 5: CHECK NOISE ITEMS (FILTERED OUT)
# ============================================================================

def check_noise_items(session_id):
    """Check what was filtered as noise"""
    print_step(5, "NOISE ITEMS (FILTERED OUT)")
    
    try:
        resp = requests.get(f"{API_URL}/sessions/{session_id}/chunks/?status=noise")
        if resp.status_code == 200:
            noise_items = resp.json()
            noise_count = len(noise_items) if isinstance(noise_items, list) else 0
            print_success(f"Found {noise_count} noise items (filtered)")
            
            if noise_count > 0 and isinstance(noise_items, list):
                sample = noise_items[0]
                text = sample.get('text', 'N/A')[:100]
                print_info(f"Sample noise item: {text}...")
            
            return noise_count
        else:
            return 0
    except Exception as e:
        print_info(f"Could not retrieve noise items: {e}")
        return 0

# ============================================================================
# STEP 6: SEND TO LLM (BRD GENERATION)
# ============================================================================

def generate_brd(session_id):
    """Send to LLM for BRD generation"""
    print_step(6, "SEND TO LLM - BRD GENERATION")
    
    print_info("Triggering BRD generation with signal chunks...")
    
    try:
        resp = requests.post(f"{API_URL}/sessions/{session_id}/brd/generate")
        
        if resp.status_code in [200, 202]:
            data = resp.json()
            print_success("BRD generation initiated")
            
            # Check for sections
            sections = data.get('sections', [])
            print_info(f"BRD sections: {len(sections)}")
            if sections:
                for section in sections[:3]:
                    print_info(f"  - {section}")
            
            return True
        elif resp.status_code == 500:
            # LLM key missing - expected
            if 'GROQ' in resp.text or 'API' in resp.text:
                print_info("LLM step skipped (no GROQ_CLOUD_API key configured)")
                print_info("To enable: Add GROQ_CLOUD_API to Noise filter module/.env")
                return False
            else:
                print_error(f"Generation failed: {resp.text[:200]}")
                return False
        else:
            print_info(f"BRD generation status: {resp.status_code}")
            return False
    except Exception as e:
        print_error(f"BRD generation error: {e}")
        return False

# ============================================================================
# STEP 7: EXPORT RESULTS
# ============================================================================

def retrieve_brd(session_id):
    """Get the generated BRD"""
    print_step(7, "RETRIEVE BRD RESULTS")
    
    try:
        resp = requests.get(f"{API_URL}/sessions/{session_id}/brd/")
        
        if resp.status_code == 200:
            sections = resp.json()
            print_success(f"Retrieved {len(sections)} BRD sections")
            
            for section_name, content in sections.items():
                preview = content[:100].replace('\n', ' ') if content else "(empty)"
                print_info(f"  {section_name}: {preview}...")
            
            return sections
        else:
            print_info(f"No BRD sections found yet")
            return {}
    except Exception as e:
        print_error(f"Error retrieving BRD: {e}")
        return {}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print(f"\n{BLUE}{'='*70}")
    print("MEETING TRANSCRIPTS - COMPLETE PIPELINE TRACE")
    print(f"{'='*70}{RESET}\n")
    
    # Determine input file
    data_file = Path("Noise filter module/sample_ami_meetings.json")
    if len(sys.argv) > 1:
        data_file = Path(sys.argv[1])
    
    print_info(f"Data file: {data_file}")
    
    # === STEP 1: Load ===
    meetings = load_transcripts(data_file)
    if not meetings:
        print_error("Cannot proceed without data")
        return
    
    # ===  STEP 2: Create Session ===
    session_id = create_session()
    if not session_id:
        print_error("Cannot proceed without session")
        return
    
    # === STEP 3: Ingest ===
    if not ingest_transcripts(session_id, meetings):
        print_error("Ingestion failed")
        return
    
    # === STEP 4: Noise Filter & Classify ===
    signal_count = wait_for_classification(session_id)
    
    # === STEP 5: Check Noise ===
    noise_count = check_noise_items(session_id)
    
    # === STEP 6: LLM ===
    brd_generated = generate_brd(session_id)
    
    # === STEP 7: Retrieve Results ===
    brd_sections = retrieve_brd(session_id)
    
    # ===  SUMMARY ===
    print_step("SUMMARY", "PIPELINE COMPLETE")
    print_success(f"Total meetings processed: {len(meetings)}")
    print_success(f"Signal chunks (kept): {signal_count}")
    print_success(f"Noise chunks (filtered): {noise_count}")
    print_success(f"Signal + Noise total: {signal_count + noise_count}")
    
    if brd_generated:
        print_success(f"BRD sections generated: {len(brd_sections)}")
    else:
        print_info(f"BRD generation skipped (no LLM key)")
    
    print(f"\n{BLUE}✨ Pipeline trace complete!{RESET}\n")

if __name__ == "__main__":
    main()
