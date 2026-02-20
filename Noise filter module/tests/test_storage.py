# tests/test_storage.py
import pytest
import os
import uuid
import psycopg2

# We test against the real DB for now
from storage import init_db, store_chunks, get_active_signals, get_noise_items, restore_noise_item, get_connection
from schema import ClassifiedChunk, SignalLabel

def setup_module(module):
    """Ensure the table exists before any tests run, and clean it."""
    # Temporarily rename connection items to make sure it doesn't collide
    init_db()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE classified_chunks;")
        conn.commit()
    finally:
        conn.close()

def test_insert_and_retrieve():
    chunk1 = ClassifiedChunk(
        chunk_id=str(uuid.uuid4()),
        source_ref="test-sig",
        raw_text="Test signal",
        cleaned_text="Test signal",
        label=SignalLabel.REQUIREMENT,
        confidence=0.9,
        reasoning="Test",
        suppressed=False
    )
    chunk2 = ClassifiedChunk(
        chunk_id=str(uuid.uuid4()),
        source_ref="test-noise",
        raw_text="Test noise",
        cleaned_text="Test noise",
        label=SignalLabel.NOISE,
        confidence=0.1,
        reasoning="Test noise",
        suppressed=True
    )
    
    store_chunks([chunk1, chunk2])
    
    signals = get_active_signals()
    assert any(c.chunk_id == chunk1.chunk_id for c in signals)
    assert not any(c.chunk_id == chunk2.chunk_id for c in signals)
    
    noise = get_noise_items()
    assert any(c.chunk_id == chunk2.chunk_id for c in noise)
    assert not any(c.chunk_id == chunk1.chunk_id for c in noise)
    
    # Test restore
    restore_noise_item(chunk2.chunk_id)
    
    signals_after = get_active_signals()
    assert any(c.chunk_id == chunk2.chunk_id for c in signals_after)
    noise_after = get_noise_items()
    assert not any(c.chunk_id == chunk2.chunk_id for c in noise_after)
