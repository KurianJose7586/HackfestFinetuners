"""
main.py
Entry point for the Noise Filter Module.
Runs the full pipeline: parse Enron CSV → classify → print summary.
"""

from __future__ import annotations

import os
import sys
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
N_EMAILS = 50  # number of emails to process in demo mode


def main():
    api_key = os.getenv("GROQ_CLOUD_API")
    if not api_key:
        print("ERROR: GROQ_CLOUD_API not set in .env")
        sys.exit(1)

    print(f"Loading and parsing {N_EMAILS} emails from Enron dataset...")
    chunks = parse_to_chunks(CSV_PATH, n=N_EMAILS)
    print(f"  → {len(chunks)} chunks after parsing and thread flattening\n")

    print("Classifying chunks...")
    classified = classify_chunks(chunks, api_key=api_key)
    print(f"  → Done. {len(classified)} chunks classified.\n")

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
    signals = [c for c in classified if not c.suppressed]
    if signals:
        print("\nSample signals extracted:")
        for c in signals[:5]:
            print(f"\n  [{c.label.value.upper()}] (conf: {c.confidence:.2f})")
            print(f"  Speaker: {c.speaker}")
            print(f"  Text: {c.cleaned_text[:200]}")
            print(f"  Reason: {c.reasoning}")


if __name__ == "__main__":
    main()
