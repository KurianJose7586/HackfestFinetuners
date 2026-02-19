"""
test_enron_parser.py
"""

import pandas as pd
from enron_parser import strip_boilerplate, flatten_thread, deduplicate

def test_strip_boilerplate_removes_forwarded_header():
    text = """
    Hey,
    
    This is relevant.

    -----Original Message-----
    From: Bob
    Sent: Tuesday
    Subject: Old stuff

    Old body content.
    """
    cleaned = strip_boilerplate(text)
    assert "This is relevant." in cleaned
    assert "-----Original Message-----" not in cleaned
    assert "Old body content" not in cleaned

def test_strip_boilerplate_removes_disclaimer():
    text = """
    Please review this.

    CONFIDENTIAL: This email and any files transmitted with it are confidential...
    """
    cleaned = strip_boilerplate(text)
    assert "Please review this." in cleaned
    assert "confidential" not in cleaned.lower()

def test_flatten_thread_splits_replies():
    text = """
    That sounds good.
    
    On Mon, Jan 1, 2001 at 10:00 AM, Bob wrote:
    > Can we do this?
    >
    > > Maybe?
    """
    # The regex approach in flatten_thread is simple (based on -----Original Message-----)
    # If the thread uses ">" quoting, flatten_thread might return it as one chunk but strip_boilerplate removes quotes.
    # Let's test the explicit split logic:
    
    text_with_header = """
    New reply here.

    -----Original Message-----
    From: Bob
    
    Old message here.
    """
    chunks = flatten_thread(text_with_header)
    assert len(chunks) == 2
    assert "New reply here" in chunks[0]
    assert "Old message here" in chunks[1]

def test_deduplicate_removes_duplicates():
    df = pd.DataFrame({
        "Message-ID": ["<123>", "<456>", "<123>"],
        "body": ["A", "B", "A"]
    })
    deduped = deduplicate(df)
    assert len(deduped) == 2
    assert list(deduped["Message-ID"]) == ["<123>", "<456>"]
