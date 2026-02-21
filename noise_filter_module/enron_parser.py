"""
enron_parser.py
Ingests the Enron Email Dataset CSV, deduplicates, strips boilerplate,
and returns a list of raw chunk dicts ready for classification.
"""

from __future__ import annotations

import re
import email
from pathlib import Path
from typing import Optional

import pandas as pd

# ---------------------------------------------------------------------------
# Boilerplate patterns to strip from email bodies
# ---------------------------------------------------------------------------

_FORWARDED_HEADER = re.compile(
    r"^\s*-{3,}\s*(?:Original Message|Forwarded by|Forwarded Message).*",
    re.IGNORECASE | re.DOTALL | re.MULTILINE,
)

_DISCLAIMER = re.compile(
    r"(?:This (?:message|e-?mail) is intended only for|"
    r"CONFIDENTIAL|"
    r"This communication contains|"
    r"The information contained in this|"
    r"If you have received this (?:message|e-?mail) in error).*",
    re.IGNORECASE | re.DOTALL,
)

_SIGNATURE_DIVIDER = re.compile(r"\n--\s*\n.*", re.DOTALL)

_REPLY_QUOTE = re.compile(r"^>.*$", re.MULTILINE)

_TIMESTAMP_DIVIDER = re.compile(
    r"^\d{1,2}:\d{2}\s*(?:AM|PM)\s*-+.*", 
    re.MULTILINE | re.IGNORECASE
)

_EXCESS_WHITESPACE = re.compile(r"\n{3,}")


def strip_boilerplate(text: str) -> str:
    """Remove forwarded headers, legal disclaimers, signatures, and quoted lines."""
    if not isinstance(text, str):
        return ""
    text = _FORWARDED_HEADER.sub("", text)
    text = _TIMESTAMP_DIVIDER.sub("", text)
    text = _DISCLAIMER.sub("", text)
    text = _SIGNATURE_DIVIDER.sub("", text)
    text = _REPLY_QUOTE.sub("", text)
    text = _EXCESS_WHITESPACE.sub("\n\n", text)
    return text.strip()


def flatten_thread(text: str) -> list[str]:
    """
    Split an email body that contains a quoted reply chain into individual
    turn chunks. Each chunk is a non-empty, non-quoted segment.
    Returns a list of cleaned text segments (at least one).
    """
    # Split on forwarded message dividers
    parts = re.split(
        r"-{3,}\s*(?:Original Message|Forwarded by|Forwarded Message)[^\n]*\n",
        text,
        flags=re.IGNORECASE,
    )
    chunks = []
    for part in parts:
        cleaned = strip_boilerplate(part)
        if cleaned and len(cleaned.split()) >= 3:
            chunks.append(cleaned)
    return chunks if chunks else [text.strip()]


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """Drop rows with duplicate Message-ID, keeping the first occurrence."""
    if "Message-ID" in df.columns:
        df = df.drop_duplicates(subset=["Message-ID"], keep="first")
    return df.reset_index(drop=True)


def load_emails(csv_path: str | Path, n: Optional[int] = None) -> pd.DataFrame:
    """
    Load the Enron emails CSV.
    Args:
        csv_path: Path to emails.csv
        n: If set, only load the first n rows (for testing / demo)
    """
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")

    # For large files, use chunking if n is large, but here pd.read_csv handles nrows efficiently
    df = pd.read_csv(path, nrows=n)

    # Normalise column names (strip whitespace)
    df.columns = [c.strip() for c in df.columns]

    # If raw 'message' column exists (standard Enron format), parse it
    if "message" in df.columns and "body" not in df.columns:
        
        def parse_raw(raw_msg):
            try:
                msg = email.message_from_string(raw_msg)
                
                # Extract body
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            payload = part.get_payload(decode=True)
                            if payload:
                                body += payload.decode("utf-8", errors="replace")
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        body = payload.decode("utf-8", errors="replace")
                
                return {
                    "Message-ID": msg.get("Message-ID", ""),
                    "From": msg.get("From", ""),
                    "X-From": msg.get("X-From", ""),
                    "Subject": msg.get("Subject", ""),
                    "body": body
                }
            except Exception:
                return {}

        # Parse messages — build DataFrame from list of dicts (faster than .apply(pd.Series))
        parsed = pd.DataFrame(df["message"].apply(parse_raw).tolist())
        
        # Combine
        df = pd.concat([df, parsed], axis=1)

    # Ensure required columns exist with fallbacks
    for col in ["Message-ID", "From", "X-From", "Subject", "body"]:
        if col not in df.columns:
            df[col] = "" 
    
    return df


def parse_to_chunks(csv_path: str | Path, n: Optional[int] = None) -> list[dict]:
    """
    Full pipeline: load → deduplicate → strip boilerplate → flatten threads.
    Returns a list of raw chunk dicts with keys:
        source_ref, speaker, raw_text, cleaned_text, subject
    """
    df = load_emails(csv_path, n=n)
    df = deduplicate(df)
    # Rename columns with hyphens for itertuples() compatibility
    df = df.rename(columns={"X-From": "X_From", "Message-ID": "Message_ID"})

    chunks = []

    # itertuples() is 5-10× faster than iterrows() (avoids pd.Series per row)
    for row in df.itertuples(index=True):
        i = row.Index
        raw_body = str(getattr(row, "body", "") or "")
        subject = str(getattr(row, "Subject", "") or "")
        speaker = str(getattr(row, "X_From", "") or getattr(row, "From", "") or "")
        source_ref = str(getattr(row, "Message_ID", "") or "")

        # Use Message-ID as source_ref or fallback
        if not source_ref:
            source_ref = f"row_{i}"

        # Combine subject + body so subject line is also classified
        full_text = f"Subject: {subject}\n\n{raw_body}" if subject else raw_body

        # Flatten thread into sub-chunks
        sub_chunks = flatten_thread(full_text)

        for sub in sub_chunks:
            cleaned = strip_boilerplate(sub)
            if not cleaned or not cleaned.strip():
                continue

            chunks.append(
                {
                    "source_ref": source_ref,
                    "speaker": speaker.strip(),
                    "raw_text": sub,
                    "cleaned_text": cleaned,
                    "subject": subject,
                }
            )

    return chunks


if __name__ == "__main__":
    import sys

    csv = sys.argv[1] if len(sys.argv) > 1 else None
    if not csv:
        print("Usage: python enron_parser.py <path_to_emails.csv> [n_rows]")
        sys.exit(1)
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    result = parse_to_chunks(csv, n=n)
    print(f"Parsed {len(result)} chunks from {n} emails")
    for c in result[:3]:
        print("---")
        print(f"Speaker: {c['speaker']}")
        print(f"Text: {c['cleaned_text'][:200]}")
