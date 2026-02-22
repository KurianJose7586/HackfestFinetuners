"""
CSV Dataset Loader - Converts HuggingFace AMI CSV format to ingestion chunks
Supports format: id, dialogue (speaker turns), summary
"""

import csv
import json
import re
from pathlib import Path
from typing import List, Dict, Any
import argparse


def parse_dialogue_to_chunks(dialogue_text: str, meeting_id: str) -> List[Dict[str, Any]]:
    """
    Parse dialogue string with speaker turns into individual chunks.
    Format: "Speaker A: text Speaker B: text..."
    """
    chunks = []
    
    # Split by speaker pattern "Speaker X:" where X is a letter or identifier
    pattern = r'Speaker\s+([A-Za-z0-9]+):\s*'
    parts = re.split(pattern, dialogue_text)
    
    # parts[0] is empty, then alternates: speaker, text, speaker, text...
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            speaker = parts[i].strip()
            text = parts[i + 1].strip()
            
            if text:  # Skip empty turns
                chunk = {
                    "meeting_id": meeting_id,
                    "speaker": speaker,
                    "text": text,
                    "timestamp": None,  # CSVs don't have timestamp granularity
                    "turn_index": (i - 1) // 2
                }
                chunks.append(chunk)
    
    return chunks


def load_csv_to_chunks(csv_path: str) -> Dict[str, Any]:
    """
    Load CSV file and convert to meeting format with chunks.
    Returns summary + array of chunks for ingestion.
    """
    meetings = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            meeting_id = row.get('id', '').strip()
            dialogue = row.get('dialogue', '').strip()
            summary = row.get('summary', '').strip()
            
            if not meeting_id or not dialogue:
                continue
            
            chunks = parse_dialogue_to_chunks(dialogue, meeting_id)
            
            if chunks:
                meetings[meeting_id] = {
                    "meeting_id": meeting_id,
                    "summary": summary or f"Meeting {meeting_id}",
                    "chunks": chunks,
                    "chunk_count": len(chunks)
                }
    
    return meetings


def csv_to_json(csv_path: str, output_path: str = None) -> str:
    """
    Convert CSV to JSON format compatible with test_complete_workflow.py
    """
    meetings = load_csv_to_chunks(csv_path)
    
    # Convert to array format for ingestion
    json_data = [
        {
            "meeting_id": meeting["meeting_id"],
            "summary": meeting["summary"],
            "transcript": [
                {
                    "speaker": chunk["speaker"],
                    "text": chunk["text"],
                    "start_time": None,
                    "end_time": None
                }
                for chunk in meeting["chunks"]
            ]
        }
        for meeting in meetings.values()
    ]
    
    if output_path is None:
        csv_name = Path(csv_path).stem
        # Output noise-filtered data to Noise filter module
        noise_filter_dir = Path(__file__).parent.parent / "Noise filter module"
        output_path = str(noise_filter_dir / f"{csv_name}_converted.json")
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2)
    
    print(f"\n✅ CSV Conversion Complete")
    print(f"   Input CSV: {csv_path}")
    print(f"   Output JSON: {output_path}")
    print(f"   Meetings: {len(json_data)}")
    print(f"   Total chunks: {sum(len(m['transcript']) for m in json_data)}")
    print(f"\n📝 Usage:")
    print(f"   python test_complete_workflow.py --file {output_path}")
    
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert HuggingFace AMI CSV to JSON for ingestion")
    parser.add_argument("csv_path", help="Path to CSV file (id, dialogue, summary columns)")
    parser.add_argument("--output", help="Output JSON path (optional)")
    
    args = parser.parse_args()
    
    csv_to_json(args.csv_path, args.output)
