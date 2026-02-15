from datetime import datetime

from pydantic import BaseModel


class ActionCreate(BaseModel):
    title: str
    description: str | None = None
    sort_order: int = 1


class ActionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    sort_order: int | None = None


class Action(BaseModel):
    id: str
    goal_id: str
    user_id: str
    title: str
    description: str | None = None
    sort_order: int
    is_ai_generated: bool
    ai_output_id: str | None = None
    created_at: datetime
