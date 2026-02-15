from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    metric_name: str
    metric_unit: str
    direction: Literal["increase", "decrease"]
    baseline_value: float
    baseline_date: date
    target_value: float
    target_date: date | None = None

    @field_validator("title", "metric_name", "metric_unit")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Must not be empty")
        return v.strip()


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    metric_name: str | None = None
    metric_unit: str | None = None
    direction: Literal["increase", "decrease"] | None = None
    baseline_value: float | None = None
    baseline_date: date | None = None
    target_value: float | None = None
    target_date: date | None = None


class Goal(BaseModel):
    id: str
    user_id: str
    title: str
    description: str | None = None
    metric_name: str
    metric_unit: str
    direction: str
    baseline_value: float
    baseline_date: date
    target_value: float
    target_date: date | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
