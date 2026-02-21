"""
schema.py
Pydantic v2 models for the Noise Filter Module output.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SignalLabel(str, Enum):
    REQUIREMENT = "requirement"
    DECISION = "decision"
    STAKEHOLDER_FEEDBACK = "stakeholder_feedback"
    TIMELINE_REFERENCE = "timeline_reference"
    NOISE = "noise"


class ClassifiedChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = "default_session"
    source_type: str = "email"
    source_ref: str  # Message-ID
    speaker: Optional[str] = None  # X-From
    raw_text: str
    cleaned_text: str
    label: SignalLabel
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    suppressed: bool = False       # True when label == noise
    manually_restored: bool = False
    flagged_for_review: bool = False
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def model_post_init(self, __context) -> None:
        # Auto-suppress noise items
        if self.label == SignalLabel.NOISE and not self.manually_restored:
            object.__setattr__(self, "suppressed", True)
