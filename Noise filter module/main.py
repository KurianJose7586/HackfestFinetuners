"""
main.py
Entry point for the Noise Filter Module.
Runs the full pipeline: parse Enron CSV → classify → print summary.
"""

from __future__ import annotations

import hashlib
import os
import sys
import time
import uuid
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the same directory as this script
_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

from classifier import classify_chunks
from enron_parser import parse_to_chunks

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CSV_PATH = _HERE / "emails.csv" / "emails.csv"
N_EMAILS = 500  # number of emails to process in demo mode

def print_confidence_distribution(classified):
    llm_items = [c for c in classified 
                 if c.reasoning != "Classified by heuristic rule." 
                 and c.reasoning != "No project-relevant domain terms detected."]
    
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
    heuristic = [c for c in classified 
                 if c.reasoning == "Classified by heuristic rule."]
    domain_gate = [c for c in classified 
                   if c.reasoning == "No project-relevant domain terms detected."]
    # Use id-based sets for O(1) membership instead of O(n) list scan
    _seen = {id(c) for c in heuristic} | {id(c) for c in domain_gate}
    llm_path = [c for c in classified if id(c) not in _seen]
    
    print("\n--- PIPELINE PATH BREAKDOWN ---")
    print(f"  Heuristic (fast path):     {len(heuristic):>4}")
    print(f"  Domain gate (pre-LLM):     {len(domain_gate):>4}")
    print(f"  LLM classified:            {len(llm_path):>4}")
    print(f"  └─ Auto-accepted:          {sum(1 for c in llm_path if not c.flagged_for_review and not c.suppressed):>4}")
    print(f"  └─ Flagged for review:     {sum(1 for c in llm_path if c.flagged_for_review):>4}")
    print(f"  └─ Forced to noise:        {sum(1 for c in llm_path if c.suppressed and c.confidence < 0.65):>4}")

def inspect_flagged_items(classified):
    flagged = [c for c in classified if c.flagged_for_review]
    if not flagged:
        print("\nNo flagged items.")
        return
    
    print(f"\n--- FLAGGED ITEMS INSPECTOR ({len(flagged)} items) ---")
    
    # Group by label
    by_label = {}
    for c in flagged:
        by_label.setdefault(c.label.value, []).append(c)
    
    for label, items in by_label.items():
        print(f"\n  [{label.upper()}] — {len(items)} flagged")
        for c in items[:3]:  # show first 3 per label
            print(f"    Conf: {c.confidence:.2f} | {c.cleaned_text[:100]}")
            print(f"    Reason: {c.reasoning}")


def main():
    _t0 = time.perf_counter()
    api_key = os.getenv("GROQ_CLOUD_API")
    if not api_key:
        print("ERROR: GROQ_CLOUD_API not set in .env")
        sys.exit(1)

    print(f"Loading and parsing {N_EMAILS} emails from Enron dataset...")
    chunks = parse_to_chunks(CSV_PATH, n=N_EMAILS)
    
    # -----------------------------------------------------------------------
    # Content-Level Deduplication
    # -----------------------------------------------------------------------
    seen_hashes = set()
    unique_chunks = []
    for c in chunks:
        # Hash the cleaned text to identify duplicate content regardless of email wrappings
        content_hash = hashlib.md5(c["cleaned_text"].encode("utf-8")).hexdigest()
        if content_hash not in seen_hashes:
            seen_hashes.add(content_hash)
            unique_chunks.append(c)
    
    print(f"  → {len(chunks)} raw chunks parsed")
    print(f"  → {len(unique_chunks)} unique chunks after content deduplication\n")
    chunks = unique_chunks
    # Initialize the database
    from storage import init_db, store_chunks
    init_db()
    print("AKS Database initialized.")

    print("Classifying chunks...")
    _t_cls = time.perf_counter()
    classified = classify_chunks(chunks, api_key=api_key)
    print(f"  → Done. {len(classified)} chunks classified in {time.perf_counter() - _t_cls:.1f}s\n")
    
    # --- Integration Point for BRD Pipeline ---

    
    print("\n--- Saving Chunks for BRD Pipeline ---")
    session_id = str(uuid.uuid4())
    
    # Update the stored chunks with the generated session ID so they belong to this run
    for c in classified:
        c.session_id = session_id
        
    print("Writing chunks to AKS Database...")
    store_chunks(classified)
    print(f"  → Done. Stored {len(classified)} chunks to DB for session {session_id}\n")
    print(f"To run the BRD generation, switch to the 'brd_module' folder and run:\n  python main.py {session_id}\n")
    # --- End Integration Point ---

    print_pipeline_breakdown(classified)
    print_confidence_distribution(classified)
    inspect_flagged_items(classified)

    # Summary table
    label_counts = Counter(c.label.value for c in classified)
    suppressed_count = sum(1 for c in classified if c.suppressed)
    flagged_count = sum(1 for c in classified if c.flagged_for_review)

    print("=" * 50)
    print("CLASSIFICATION SUMMARY")
    print("=" * 50)
    for label in ["requirement", "decision", "stakeholder_feedback", "timeline_reference", "noise"]:
        count = label_counts.get(label, 0)
        bar = "█" * count
        print(f"  {label:<25} {count:>4}  {bar}")
    print("-" * 50)
    print(f"  Total chunks:              {len(classified):>4}")
    print(f"  Suppressed (noise):        {suppressed_count:>4}")
    print(f"  Flagged for review:        {flagged_count:>4}")
    print("=" * 50)

    # Show a few signal examples
    # Show a few signal examples
    signals = [c for c in classified if not c.suppressed]
    if signals:
        print("\nSample signals extracted:")
        for c in signals[:5]:
            print(f"\n  [{c.label.value.upper()}] (conf: {c.confidence:.2f})")
            print(f"  Speaker: {c.speaker}")
            print(f"  Text: {c.cleaned_text[:200]}")
            print(f"  Reason: {c.reasoning}")
            
    # Explicitly print all stakeholder feedback for verification
    feedback_items = [c for c in classified if c.label.value == "stakeholder_feedback"]
    if feedback_items:
        print(f"\n\n*** STAKEHOLDER FEEDBACK AUDIT ({len(feedback_items)} items) ***")
        for i, c in enumerate(feedback_items, 1):
            print(f"\n--- Item {i} ---")
            print(f"Speaker: {c.speaker}")
            print(f"Conf: {c.confidence:.2f}")
            print(f"Reason: {c.reasoning}")
            print(f"Text:\n{c.cleaned_text}\n")

    # TEMPORARY DEBUG — remove before demo
    print("\n\n=== DEBUG: SAMPLE OF FLAGGED ITEMS ===")
    flagged = [c for c in classified if c.flagged_for_review]
    for c in flagged[:10]:
        print(f"\nLabel: {c.label.value} | Conf: {c.confidence:.2f}")
        print(f"Text: {c.cleaned_text[:200]}")
        print(f"Reasoning: {c.reasoning}")
        print(f"Speaker: {c.speaker}")

    print(f"\n{'='*50}")
    print(f"Total pipeline time: {time.perf_counter() - _t0:.1f}s")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
