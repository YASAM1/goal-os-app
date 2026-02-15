from datetime import datetime

from pydantic import BaseModel


class Resource(BaseModel):
    id: str
    goal_id: str
    user_id: str
    type: str
    title: str
    url: str | None = None
    source: str | None = None
    summary: str | None = None
    why_relevant: str | None = None
    is_paid: bool
    is_ai_generated: bool
    ai_output_id: str | None = None
    created_at: datetime
