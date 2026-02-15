from datetime import date, datetime

from pydantic import BaseModel


class ActionInstanceCreate(BaseModel):
    date: date


class ActionInstanceStatusUpdate(BaseModel):
    status: str  # "pending", "done", "skipped"


class ActionInstance(BaseModel):
    id: str
    action_id: str
    user_id: str
    date: date
    status: str
    created_at: datetime
