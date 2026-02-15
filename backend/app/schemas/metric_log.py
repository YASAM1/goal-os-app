from datetime import date, datetime

from pydantic import BaseModel


class MetricLogCreate(BaseModel):
    date: date
    value: float
    note: str | None = None


class MetricLogUpdate(BaseModel):
    value: float | None = None
    note: str | None = None


class MetricLog(BaseModel):
    id: str
    goal_id: str
    user_id: str
    date: date
    value: float
    note: str | None = None
    created_at: datetime
