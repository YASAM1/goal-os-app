from datetime import date, datetime

from pydantic import BaseModel


class MilestoneCreate(BaseModel):
    title: str
    description: str | None = None
    target_date: date | None = None
    sort_order: int = 1


class MilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    target_date: date | None = None
    status: str | None = None  # "pending" or "done"
    sort_order: int | None = None


class Milestone(BaseModel):
    id: str
    goal_id: str
    user_id: str
    title: str
    description: str | None = None
    target_date: date | None = None
    status: str
    sort_order: int
    is_ai_generated: bool
    ai_output_id: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
