"""
ami_parser.py
Ingests the AMI Meeting Corpus (from HuggingFace or local JSON),
deduplicates, cleans meeting transcripts, and returns a list of 
raw chunk dicts ready for classification.

Download from: https://huggingface.co/datasets/knkarthick/AMI
Format: JSON with transcript turns (speaker + text + timestamp)
"""

from __future__ import annotations

import re
import json
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass

import pandas as pd

# ---------------------------------------------------------------------------
# Boilerplate patterns to strip from meeting transcripts
# ---------------------------------------------------------------------------

_MEETING_LOGISTICS = re.compile(
    r"(?:shall we|let's take a break|let's continue|"
    r"coffee|toilet|break|meeting ends|see you|"
    r"okay then|right then|um|uh|er|like)",
    re.IGNORECASE,
)

_CROSSTALK = re.compile(
    r"(?:\*crosstalk\*|cross talk|background noise|"
    r"\[laughter\]|\[pause\]|\[silence\]|\[break\])",
    re.IGNORECASE,
)

_TIMESTAMP_PATTERN = re.compile(
    r"^(\d{1,2}):(\d{2})(?::(\d{2}))?",
)

_EXCESS_WHITESPACE = re.compile(r"\n{3,}")


def strip_boilerplate(text: str) -> str:
    """Remove crosstalk markers, timestamps, and excessive whitespace."""
    if not isinstance(text, str):
        return ""
    
    text = _CROSSTALK.sub("", text)
    text = _EXCESS_WHITESPACE.sub("\n\n", text)
    return text.strip()


def parse_timestamp_range(start_str: str, end_str: str) -> str:
    """
    Convert timestamps like '00:05:30' to a readable range '00:05-00:10'.
    """
    if not start_str or not end_str:
        return "unknown"
    try:
        start_sec = sum(int(x) * 60 ** i for i, x in enumerate(reversed(start_str.split(":"))))
        end_sec = sum(int(x) * 60 ** i for i, x in enumerate(reversed(end_str.split(":"))))
        start_min = start_sec // 60
        end_min = end_sec // 60
        return f"{start_min:02d}:{start_sec % 60:02d}-{end_min:02d}:{end_sec % 60:02d}"
    except Exception:
        return f"{start_str}-{end_str}"


def load_ami_from_huggingface(n: Optional[int] = None) -> List[dict]:
    """
    Load AMI dataset from HuggingFace.
    Requires: `pip install datasets`
    """
    try:
        from datasets import load_dataset
    except ImportError:
        raise ImportError("Install 'datasets' package: pip install datasets")
    
    dataset = load_dataset("knkarthick/AMI", split="train")
    
    if n:
        dataset = dataset.select(range(min(n, len(dataset))))
    
    return dataset  # Returns HuggingFace Dataset object


def load_ami_from_json(json_path: str | Path, n: Optional[int] = None) -> List[dict]:
    """
    Load AMI dataset from a local JSON file (expected format: list of meeting objects).
    """
    path = Path(json_path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")
    
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        # If single meeting object, wrap in list
        data = [data]
    
    if n:
        data = data[:n]
    
    return data


def deduplicate_chunks(chunks: List[dict]) -> List[dict]:
    """
    Drop chunks with duplicate content (same cleaned_text).
    """
    seen_hashes = set()
    unique = []
    
    import hashlib
    
    for chunk in chunks:
        content_hash = hashlib.md5(chunk["cleaned_text"].encode("utf-8")).hexdigest()
        if content_hash not in seen_hashes:
            seen_hashes.add(content_hash)
            unique.append(chunk)
    
    return unique


def parse_ami_transcript(meeting_obj: dict) -> List[dict]:
    """
    Parse a single meeting transcript into chunks.
    
    Expected meeting_obj structure:
    {
        "meeting_id": "AMI_ES2002a",
        "summary": "...",
        "transcript": [
            {"speaker": "PM1", "text": "...", "start_time": "00:05:30", "end_time": "00:05:45"},
            ...
        ]
    }
    
    Returns:
        List of chunk dicts with keys:
            source_ref, speaker, timestamp, cleaned_text, raw_text, meeting_id
    """
    chunks = []
    meeting_id = meeting_obj.get("meeting_id", "unknown")
    transcript = meeting_obj.get("transcript", [])
    
    if not isinstance(transcript, list):
        return []
    
    for i, turn in enumerate(transcript):
        speaker = turn.get("speaker", "unknown").strip()
        raw_text = str(turn.get("text", "") or "").strip()
        start_time = str(turn.get("start_time", "00:00:00") or "00:00:00").strip()
        end_time = str(turn.get("end_time", "00:00:30") or "00:00:30").strip()
        
        if not raw_text:
            continue
        
        # Clean boilerplate
        cleaned = strip_boilerplate(raw_text)
        if not cleaned or len(cleaned.split()) < 3:
            continue
        
        # Build source reference (meeting_id + turn index)
        source_ref = f"{meeting_id}_turn_{i:04d}"
        
        # Combine timestamps for readability
        timestamp = parse_timestamp_range(start_time, end_time)
        
        chunks.append({
            "source_ref": source_ref,
            "speaker": speaker,
            "timestamp": timestamp,
            "raw_text": raw_text,
            "cleaned_text": cleaned,
            "meeting_id": meeting_id,
        })
    
    return chunks


def parse_to_chunks(
    data_source: str | Path | List[dict],
    source_type: str = "json",
    n: Optional[int] = None
) -> List[dict]:
    """
    Full AMI pipeline: load → parse → deduplicate.
    
    Args:
        data_source: Path to JSON file, path to CSV, or list of meeting dicts
        source_type: "json", "csv", or "huggingface"
        n: If set, only load first n meetings
    
    Returns:
        List of raw chunk dicts ready for classification
    """
    meetings = []
    
    if isinstance(data_source, str):
        data_source = Path(data_source)
    
    if isinstance(data_source, Path):
        if source_type == "json" or str(data_source).endswith(".json"):
            meetings = load_ami_from_json(data_source, n=n)
        elif source_type == "csv" or str(data_source).endswith(".csv"):
            # If CSV format: load with pandas and convert to dict format
            df = pd.read_csv(data_source, nrows=n)
            meetings = df.to_dict("records")
        else:
            raise ValueError(f"Unknown source_type: {source_type}")
    elif source_type == "huggingface":
        meetings = load_ami_from_huggingface(n=n)
    elif isinstance(data_source, list):
        meetings = data_source[:n] if n else data_source
    else:
        raise ValueError("data_source must be a path, list, or 'huggingface' source_type")
    
    # Parse all meetings
    all_chunks = []
    for meeting in meetings:
        if isinstance(meeting, dict):
            meeting_chunks = parse_ami_transcript(meeting)
        else:
            # Assume it's a HuggingFace dataset row (convert to dict)
            meeting_chunks = parse_ami_transcript(dict(meeting))
        all_chunks.extend(meeting_chunks)
    
    # Deduplicate by content
    unique_chunks = deduplicate_chunks(all_chunks)
    
    return unique_chunks


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ami_parser.py <path_to_data> [source_type] [n_meetings]")
        print("       python ami_parser.py data.json json 5")
        print("       python ami_parser.py --huggingface huggingface 10")
        sys.exit(1)
    
    data_source = sys.argv[1]
    source_type = sys.argv[2] if len(sys.argv) > 2 else "json"
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    
    if data_source == "--huggingface":
        source_type = "huggingface"
        data_source = None
    
    result = parse_to_chunks(data_source, source_type=source_type, n=n)
    print(f"\nParsed {len(result)} chunks from {n} meetings")
    
    if result:
        print("\n--- Sample Chunk ---")
        c = result[0]
        print(f"Meeting: {c['meeting_id']}")
        print(f"Speaker: {c['speaker']}")
        print(f"Timestamp: {c['timestamp']}")
        print(f"Text: {c['cleaned_text'][:200]}")
