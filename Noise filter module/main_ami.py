"""
main_ami.py
Entry point for the AMI Meeting Corpus pipeline.
Loads AMI transcripts → classifies → stores in AKS for BRD generation.

Usage:
    python main_ami.py <path_to_meetings.json> [n_meetings]
    python main_ami.py --huggingface 10  # Load from HuggingFace
"""

from __future__ import annotations

import os
import sys
import hashlib
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the same directory as this script
_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

from ami_parser import parse_to_chunks
from classifier import classify_chunks
from schema import SignalLabel

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

N_MEETINGS = 5  # Default number of meetings to process (can be overridden by CLI arg)


def print_confidence_distribution(classified):
    """Show confidence score distribution of LLM-classified items."""
    llm_items = [
        c for c in classified 
        if c.reasoning != "Classified by heuristic rule." 
        and c.reasoning != "No project-relevant domain terms detected."
    ]
    
    if not llm_items:
        print("No LLM-classified items found.")
        return
        
    confidences = [c.confidence for c in llm_items]
    
    bands = {
        "0.90-1.00 (auto-accept)": 0,
        "0.75-0.89 (auto-accept)": 0,
        "0.65-0.74 (flagged)":     0,
        "0.00-0.64 (forced noise)": 0,
    }
    
    for conf in confidences:
        if conf >= 0.90:
            bands["0.90-1.00 (auto-accept)"] += 1
        elif conf >= 0.75:
            bands["0.75-0.89 (auto-accept)"] += 1
        elif conf >= 0.65:
            bands["0.65-0.74 (flagged)"] += 1
        else:
            bands["0.00-0.64 (forced noise)"] += 1
    
    print("\n--- LLM CONFIDENCE DISTRIBUTION ---")
    for band, count in bands.items():
        bar = "█" * count
        print(f"  {band:<35} {count:>4}  {bar}")
    print(f"  Total LLM calls: {len(llm_items)}")
    print(f"  Mean confidence: {sum(confidences)/len(confidences):.3f}")


def print_pipeline_breakdown(classified):
    """Show how many chunks went through each path (heuristic/gate/LLM)."""
    heuristic = [
        c for c in classified 
        if c.reasoning == "Classified by heuristic rule."
    ]
    domain_gate = [
        c for c in classified 
        if c.reasoning == "No project-relevant domain terms detected."
    ]
    llm_path = [
        c for c in classified 
        if c not in heuristic and c not in domain_gate
    ]
    
    print("\n--- PIPELINE PATH BREAKDOWN ---")
    print(f"  Heuristic (fast path):     {len(heuristic):>4}")
    print(f"  Domain gate (pre-LLM):     {len(domain_gate):>4}")
    print(f"  LLM classified:            {len(llm_path):>4}")
    print(f"  └─ Auto-accepted:          {sum(1 for c in llm_path if not c.flagged_for_review and not c.suppressed):>4}")
    print(f"  └─ Flagged for review:     {sum(1 for c in llm_path if c.flagged_for_review):>4}")
    print(f"  └─ Forced to noise:        {sum(1 for c in llm_path if c.suppressed and c.confidence < 0.65):>4}")


def inspect_flagged_items(classified):
    """Show sample of items flagged for human review."""
    flagged = [c for c in classified if c.flagged_for_review]
    if not flagged:
        print("\nNo flagged items.")
        return
    
    print(f"\n--- FLAGGED ITEMS INSPECTOR ({len(flagged)} items) ---")
    
    # Group by label
    by_label = {}
    for c in flagged:
        by_label.setdefault(c.label.value, []).append(c)
    
    for label, items in sorted(by_label.items()):
        print(f"\n  [{label.upper()}] — {len(items)} flagged")
        for c in items[:3]:  # show first 3 per label
            print(f"    Conf: {c.confidence:.2f} | Meeting: {c.source_ref.split('_')[0]}")
            print(f"    Speaker: {c.speaker}")
            print(f"    Text: {c.cleaned_text[:100]}")
            print(f"    Reason: {c.reasoning}")


def main():
    """
    Main AMI workflow:
    1. Parse AMI transcripts from JSON/HuggingFace
    2. Deduplicate
    3. Initialize AKS database
    4. Classify chunks (heuristics + LLM)
    5. Store to database
    6. Generate session ID for BRD pipeline
    """
    
    api_key = os.getenv("GROQ_CLOUD_API")
    if not api_key:
        print("ERROR: GROQ_CLOUD_API not set in .env")
        sys.exit(1)
    
    # Parse CLI args
    data_source = sys.argv[1] if len(sys.argv) > 1 else None
    source_type = "json"  # default
    n_meetings = N_MEETINGS
    
    # Check if using HuggingFace
    if data_source == "--huggingface" or data_source == "-hf":
        source_type = "huggingface"
        n_meetings = int(sys.argv[2]) if len(sys.argv) > 2 else N_MEETINGS
        data_source = None  # Will be loaded from HuggingFace
    elif data_source:
        n_meetings = int(sys.argv[2]) if len(sys.argv) > 2 else N_MEETINGS
    else:
        print("Usage:")
        print("  python main_ami.py <path_to_meetings.json> [n_meetings]")
        print("  python main_ami.py --huggingface [n_meetings]")
        print(f"\nExample: python main_ami.py meetings.json {N_MEETINGS}")
        sys.exit(1)
    
    # -----------------------------------------------------------------------
    # Step 1: Load and parse transcripts
    # -----------------------------------------------------------------------
    
    print(f"\nLoading and parsing {n_meetings} AMI meetings...")
    print(f"Source: {data_source if data_source else 'HuggingFace'} ({source_type})")
    
    try:
        chunks = parse_to_chunks(data_source, source_type=source_type, n=n_meetings)
    except Exception as e:
        print(f"ERROR: Failed to parse AMI data: {e}")
        sys.exit(1)
    
    if not chunks:
        print("ERROR: No chunks parsed. Check your data source.")
        sys.exit(1)
    
    # -----------------------------------------------------------------------
    # Step 2: Content-level deduplication
    # -----------------------------------------------------------------------
    
    seen_hashes = set()
    unique_chunks = []
    for c in chunks:
        content_hash = hashlib.md5(c["cleaned_text"].encode("utf-8")).hexdigest()
        if content_hash not in seen_hashes:
            seen_hashes.add(content_hash)
            unique_chunks.append(c)
    
    print(f"  → {len(chunks)} raw chunks parsed")
    print(f"  → {len(unique_chunks)} unique chunks after content deduplication\n")
    chunks = unique_chunks
    
    # -----------------------------------------------------------------------
    # Step 3: Initialize AKS database
    # -----------------------------------------------------------------------
    
    from storage import init_db, store_chunks
    
    init_db()
    print("AKS Database initialized.")
    
    # -----------------------------------------------------------------------
    # Step 4: Classify chunks (heuristics + LLM)
    # -----------------------------------------------------------------------
    
    print("Classifying chunks with heuristics + LLM...")
    classified = classify_chunks(chunks, api_key=api_key)
    print(f"  → Done. {len(classified)} chunks classified.\n")
    
    # -----------------------------------------------------------------------
    # Step 5: Store to database for BRD pipeline
    # -----------------------------------------------------------------------
    
    import uuid
    session_id = str(uuid.uuid4())
    
    print("Writing classified chunks to AKS Database...")
    for c in classified:
        c.session_id = session_id
    
    store_chunks(classified)
    print(f"  → Done. Stored {len(classified)} chunks to DB for session {session_id}\n")
    
    # -----------------------------------------------------------------------
    # Step 6: Generate reports and summaries
    # -----------------------------------------------------------------------
    
    print_pipeline_breakdown(classified)
    print_confidence_distribution(classified)
    inspect_flagged_items(classified)
    
    # Summary statistics
    label_counts = Counter(c.label.value for c in classified)
    suppressed_count = sum(1 for c in classified if c.suppressed)
    flagged_count = sum(1 for c in classified if c.flagged_for_review)
    
    print("\n" + "=" * 60)
    print("CLASSIFICATION SUMMARY (AMI MEETING CORPUS)")
    print("=" * 60)
    for label in ["requirement", "decision", "stakeholder_feedback", "timeline_reference", "noise"]:
        count = label_counts.get(label, 0)
        bar = "█" * count
        print(f"  {label:<25} {count:>4}  {bar}")
    print("-" * 60)
    print(f"  Total chunks:              {len(classified):>4}")
    print(f"  Suppressed (noise):        {suppressed_count:>4}")
    print(f"  Flagged for review:        {flagged_count:>4}")
    print(f"  Session ID:                {session_id}")
    print("=" * 60)
    
    # Show sample signals
    signals = [c for c in classified if not c.suppressed]
    if signals:
        print("\nSample signals extracted from meetings:")
        for c in signals[:5]:
            print(f"\n  [{c.label.value.upper()}] (conf: {c.confidence:.2f})")
            print(f"  Source: {c.source_ref}")
            print(f"  Speaker: {c.speaker}")
            print(f"  Text: {c.cleaned_text[:150]}")
            print(f"  Reason: {c.reasoning}")
    
    # Show stakeholder feedback audit
    feedback_items = [c for c in classified if c.label.value == "stakeholder_feedback"]
    if feedback_items:
        print(f"\n\n*** STAKEHOLDER FEEDBACK AUDIT ({len(feedback_items)} items) ***")
        for i, c in enumerate(feedback_items[:10], 1):
            print(f"\n--- Item {i} ---")
            print(f"Meeting: {c.source_ref.split('_')[0]}")
            print(f"Speaker: {c.speaker}")
            print(f"Conf: {c.confidence:.2f}")
            print(f"Text: {c.cleaned_text[:150]}")
            print(f"Reason: {c.reasoning}")
    
    # Next steps
    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print(f"To run BRD generation, switch to brd_module folder and run:")
    print(f"  python main.py {session_id}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
