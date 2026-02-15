from datetime import datetime

from pydantic import BaseModel


class AIGenerateRequest(BaseModel):
    context: str | None = None


class AIOutput(BaseModel):
    id: str
    user_id: str
    goal_id: str
    prompt_name: str
    prompt_version: str
    model: str
    input_payload: dict
    output_payload: dict
    parsed_output: dict
    generation_type: str
    created_at: datetime
