from pydantic import BaseModel
from typing import List, Optional

class SelectedItemsRequest(BaseModel):
    message_ids: List[str]
    session_id: Optional[str] = None

class SlackSelectedItemsRequest(BaseModel):
    channel_id: str
    message_ids: List[str]
    session_id: Optional[str] = None
