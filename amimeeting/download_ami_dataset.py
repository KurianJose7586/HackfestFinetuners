"""
Download and cache the full AMI Meeting Corpus from HuggingFace.

The AMI corpus contains 138 meetings with full transcripts.
This script downloads it and converts to our JSON format for testing.

Usage:
    python download_ami_dataset.py [--output OUTPUT_FILE] [--limit LIMIT]

Examples:
    python download_ami_dataset.py  # Downloads all ~138 meetings
    python download_ami_dataset.py --limit 10  # Just first 10 meetings
    python download_ami_dataset.py --output custom_ami.json
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

def download_ami_corpus(limit: int = None) -> List[Dict[str, Any]]:
    """
    Download the AMI Meeting Corpus from HuggingFace datasets.
    
    Args:
        limit: Maximum number of meetings to download (None for all)
        
    Returns:
        List of meeting dictionaries with transcript data
    """
    try:
        from datasets import load_dataset
        print("📥 Downloading AMI Meeting Corpus from HuggingFace...")
        print("   This may take a moment on first run...")
        
        # Load the AMI corpus from HuggingFace
        # Use 'ihm' config for Individual Headset Microphone (better quality)
        dataset = load_dataset("edinburghcstr/ami", "ihm")
        
        train_split = dataset['train']
        
        print(f"✅ Dataset loaded: {len(train_split)} total meetings available")
        
        meetings = []
        count = 0
        
        for idx, example in enumerate(train_split):
            if limit and idx >= limit:
                break
                
            meeting_id = example.get('meeting_id', f'AMI_{idx:06d}')
            
            # Extract transcript
            transcript_list = example.get('transcript', [])
            if not transcript_list:
                # Try alternative field names
                transcript_list = example.get('utterances', [])
            
            if not transcript_list:
                continue
            
            # Convert transcript format
            formatted_transcript = []
            for turn in transcript_list:
                # Handle different possible formats
                if isinstance(turn, dict):
                    speaker = turn.get('speaker', turn.get('participant', 'Unknown'))
                    text = turn.get('text', turn.get('sentence', turn.get('utterance', '')))
                    
                    # Handle various timestamp formats
                    start_time = turn.get('start_time', turn.get('start', '0:00:00'))
                    end_time = turn.get('end_time', turn.get('end', '0:00:01'))
                elif isinstance(turn, (list, tuple)) and len(turn) >= 3:
                    # Tuple format: (speaker, text, start_time, end_time)
                    speaker = turn[0] if len(turn) > 0 else 'Unknown'
                    text = turn[1] if len(turn) > 1 else ''
                    start_time = turn[2] if len(turn) > 2 else '0:00:00'
                    end_time = turn[3] if len(turn) > 3 else '0:00:01'
                else:
                    # Unsupported format
                    continue
                
                if not text or not isinstance(text, str):
                    continue
                
                # Parse timestamps safely
                def parse_timestamp(ts):
                    if isinstance(ts, (int, float)):
                        mins = int(ts // 60)
                        secs = int(ts % 60)
                        return f"{mins:02d}:{secs:02d}"
                    elif isinstance(ts, str):
                        # Keep as-is if already formatted
                        return ts.split('.')[0] if '.' in ts else ts
                    return '0:00'
                
                start_str = parse_timestamp(start_time)
                end_str = parse_timestamp(end_time)
                
                formatted_transcript.append({
                    "speaker": str(speaker),
                    "text": text.strip(),
                    "start_time": start_str,
                    "end_time": end_str
                })
            
            if formatted_transcript:
                meeting = {
                    "meeting_id": meeting_id,
                    "summary": example.get('abstractive_summary', f"Meeting {meeting_id}"),
                    "transcript": formatted_transcript
                }
                meetings.append(meeting)
                count += 1
                
                if (count + 1) % 10 == 0:
                    print(f"   ✓ Processed {count} meetings...")
        
        print(f"✅ Successfully processed {count} meetings")
        return meetings
        
    except ImportError:
        print("❌ Error: 'datasets' library not installed")
        print("   Install it with: pip install datasets")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        sys.exit(1)


def save_ami_data(meetings: List[Dict[str, Any]], output_path: str = None):
    """Save meetings to JSON file."""
    if output_path is None:
        # Save to Noise filter module for processed datasets
        output_path = Path(__file__).parent.parent / "Noise filter module" / "ami_meetings_full.json"
    else:
        output_path = Path(output_path)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(meetings, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved {len(meetings)} meetings to: {output_path}")
    print(f"   File size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")
    
    return output_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Download AMI Meeting Corpus from HuggingFace",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download_ami_dataset.py              # Download all meetings
  python download_ami_dataset.py --limit 10  # Download first 10
  python download_ami_dataset.py --output custom.json
        """
    )
    parser.add_argument('--limit', type=int, default=None,
                        help='Maximum number of meetings to download')
    parser.add_argument('--output', type=str, default=None,
                        help='Output file path (default: Noise filter module/ami_meetings_full.json)')
    
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("📊 AMI MEETING CORPUS DOWNLOADER")
    print("="*70 + "\n")
    
    # Download
    meetings = download_ami_corpus(limit=args.limit)
    
    if not meetings:
        print("❌ No meetings downloaded")
        sys.exit(1)
    
    # Save
    output_file = save_ami_data(meetings, args.output)
    
    print("\n" + "="*70)
    print("✅ DOWNLOAD COMPLETE")
    print("="*70)
    print(f"\n📈 Dataset Summary:")
    print(f"   Meetings: {len(meetings)}")
    
    # Calculate total chunks
    total_turns = sum(len(m.get('transcript', [])) for m in meetings)
    print(f"   Total transcript turns: {total_turns}")
    print(f"   Avg turns per meeting: {total_turns / len(meetings):.1f}")
    
    print(f"\n📁 Location: {output_file}")
    print("\n💡 Next steps:")
    print(f"   1. Update test_complete_workflow.py to use: '{output_file.name}'")
    print(f"   2. Run: python test_complete_workflow.py")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()
