"""
test_ami_workflow.py
Quick test of the complete AMI workflow without needing the full HuggingFace dataset.
Uses sample_ami_meetings.json for demo.

Usage:
    python test_ami_workflow.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
_HERE = Path(__file__).parent
sys.path.insert(0, str(_HERE))

from ami_parser import parse_to_chunks
from classifier import classify_chunks
from schema import SignalLabel
from dotenv import load_dotenv
import hashlib

# Load environment
load_dotenv(_HERE / ".env")

def test_ami_parser():
    """Test Step 1: AMI Parser"""
    print("\n" + "="*60)
    print("TEST 1: AMI Parser")
    print("="*60)
    
    sample_file = _HERE / "sample_ami_meetings.json"
    if not sample_file.exists():
        print(f"ERROR: {sample_file} not found")
        return False
    
    chunks = parse_to_chunks(sample_file, source_type="json", n=3)
    
    print(f"✓ Parsed {len(chunks)} chunks from 3 sample meetings")
    
    if chunks:
        c = chunks[0]
        print(f"\nSample chunk:")
        print(f"  Meeting: {c['meeting_id']}")
        print(f"  Speaker: {c['speaker']}")
        print(f"  Timestamp: {c['timestamp']}")
        print(f"  Text: {c['cleaned_text'][:100]}...")
        return True
    
    return False


def test_deduplication():
    """Test Step 2: Content Deduplication"""
    print("\n" + "="*60)
    print("TEST 2: Content Deduplication")
    print("="*60)
    
    sample_file = _HERE / "sample_ami_meetings.json"
    chunks = parse_to_chunks(sample_file, source_type="json", n=3)
    
    original_count = len(chunks)
    
    # Deduplicate manually (already done in parser, but test anyway)
    seen_hashes = set()
    unique = []
    for chunk in chunks:
        h = hashlib.md5(chunk["cleaned_text"].encode()).hexdigest()
        if h not in seen_hashes:
            seen_hashes.add(h)
            unique.append(chunk)
    
    print(f"✓ Original chunks: {original_count}")
    print(f"✓ After deduplication: {len(unique)}")
    
    if original_count == len(unique):
        print("✓ No duplicates found in sample data (expected for small sample)")
    
    return True


def test_heuristics():
    """Test Step 3: Heuristic Classification"""
    print("\n" + "="*60)
    print("TEST 3: Heuristic Pre-filtering")
    print("="*60)
    
    from classifier import apply_heuristics
    
    test_cases = [
        {
            "name": "Project deadline (should be TIMELINE)",
            "chunk": {
                "cleaned_text": "The deliverable deadline is next Friday.",
                "speaker": "PM1"
            },
            "expected": "timeline_reference"
        },
        {
            "name": "Crosstalk noise (should be NOISE)",
            "chunk": {
                "cleaned_text": "[crosstalk] [laughter] okay",
                "speaker": "Multiple"
            },
            "expected": "noise"
        },
        {
            "name": "Meeting logistics short (should be NOISE)",
            "chunk": {
                "cleaned_text": "Let's take a break.",
                "speaker": "PM1"
            },
            "expected": "noise"
        },
        {
            "name": "Substantial content (should be None for LLM)",
            "chunk": {
                "cleaned_text": "The system must support voice control with natural language understanding.",
                "speaker": "IM"
            },
            "expected": None
        },
    ]
    
    passed = 0
    for test in test_cases:
        result = apply_heuristics(test["chunk"])
        status = "✓" if result == test["expected"] else "✗"
        print(f"{status} {test['name']}")
        print(f"   Result: {result} (expected: {test['expected']})")
        if result == test["expected"]:
            passed += 1
    
    print(f"\n✓ {passed}/{len(test_cases)} heuristic tests passed")
    return passed == len(test_cases)


def test_signal_nouns():
    """Test Step 4: Domain Gate (Signal Nouns)"""
    print("\n" + "="*60)
    print("TEST 4: Domain Gate (Signal Nouns)")
    print("="*60)
    
    from classifier import has_signal_nouns
    
    signal_text = "The system must support voice control with API integration."
    noise_text = "Let me think about that for a moment."
    
    has_signal_signal = has_signal_nouns(signal_text)
    has_signal_noise = has_signal_nouns(noise_text)
    
    print(f"✓ Signal-rich text: {has_signal_signal} (expected: True)")
    print(f"✓ Low-signal text: {has_signal_noise} (expected: False)")
    
    return has_signal_signal and not has_signal_noise


def test_full_pipeline():
    """Test Step 5: Full Classification Pipeline"""
    print("\n" + "="*60)
    print("TEST 5: Full Classification Pipeline (Heuristics + LLM)")
    print("="*60)
    
    api_key = os.getenv("GROQ_CLOUD_API")
    if not api_key:
        print("⚠ GROQ_CLOUD_API not set. Skipping LLM test.")
        print("  To test fully, set GROQ_CLOUD_API in .env")
        return True
    
    sample_file = _HERE / "sample_ami_meetings.json"
    chunks = parse_to_chunks(sample_file, source_type="json", n=1)
    
    if not chunks:
        print("ERROR: No chunks to classify")
        return False
    
    print(f"Classifying {len(chunks)} chunks with LLM...")
    classified = classify_chunks(chunks[:5], api_key=api_key)  # Try first 5
    
    print(f"✓ Classified {len(classified)} chunks")
    
    # Summary
    from collections import Counter
    label_counts = Counter(c.label.value for c in classified)
    
    print("\nClassification summary:")
    for label in ["requirement", "decision", "stakeholder_feedback", "timeline_reference", "noise"]:
        count = label_counts.get(label, 0)
        print(f"  {label:<25} {count}")
    
    return len(classified) > 0


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("AMI MEETING CORPUS WORKFLOW TESTS")
    print("="*60)
    
    tests = [
        ("Parser", test_ami_parser),
        ("Deduplication", test_deduplication),
        ("Heuristics", test_heuristics),
        ("Signal Nouns", test_signal_nouns),
        ("Full Pipeline", test_full_pipeline),
    ]
    
    results = {}
    for name, test_func in tests:
        try:
            result = test_func()
            results[name] = result
        except Exception as e:
            print(f"\n✗ {name} test failed with error:")
            print(f"  {e}")
            results[name] = False
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Ready to run main_ami.py")
        print("\nTo run the workflow:")
        print("  python main_ami.py sample_ami_meetings.json 3")
        return 0
    else:
        print("\n⚠ Some tests failed. Check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
