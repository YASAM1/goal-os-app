import logging

import anthropic

from app.config import settings
from app.db import supabase
from app.prompts.registry import get_prompt_template

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.claude_api_key)

MODEL = "claude-sonnet-4-5-20250929"

# ── Tool schemas for structured output ──────────────────

ACTIONS_TOOL = {
    "name": "output_actions",
    "description": "Return generated daily actions for the user's goal.",
    "input_schema": {
        "type": "object",
        "required": ["actions"],
        "properties": {
            "actions": {
                "type": "array",
                "minItems": 1,
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "required": ["title", "description"],
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Short, actionable habit title (e.g., 'Run 5K at easy pace')",
                        },
                        "description": {
                            "type": "string",
                            "description": "Brief explanation of what to do and why it helps",
                        },
                    },
                },
            }
        },
    },
}

MILESTONES_TOOL = {
    "name": "output_milestones",
    "description": "Return generated milestone checkpoints for the user's goal.",
    "input_schema": {
        "type": "object",
        "required": ["milestones"],
        "properties": {
            "milestones": {
                "type": "array",
                "minItems": 3,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "required": ["title", "description"],
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Milestone title (e.g., 'Complete first 10K run')",
                        },
                        "description": {
                            "type": "string",
                            "description": "What achieving this milestone looks like",
                        },
                    },
                },
            }
        },
    },
}


def _build_goal_context(goal: dict, current_value: float | None = None) -> dict:
    """Build template variables from a goal record."""
    return {
        "title": goal["title"],
        "description": goal.get("description") or "N/A",
        "metric_name": goal["metric_name"],
        "metric_unit": goal["metric_unit"],
        "direction": goal["direction"],
        "baseline_value": goal["baseline_value"],
        "baseline_date": goal["baseline_date"],
        "target_value": goal["target_value"],
        "target_date": goal.get("target_date") or "No deadline set",
        "current_value": current_value if current_value is not None else goal["baseline_value"],
        "context": "",
    }


def _get_latest_metric(goal_id: str) -> float | None:
    """Get the most recent metric log value for a goal."""
    result = (
        supabase.table("metric_logs")
        .select("value")
        .eq("goal_id", goal_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return float(result.data[0]["value"])
    return None


def _store_ai_output(
    user_id: str,
    goal_id: str,
    prompt_name: str,
    prompt_version: str,
    generation_type: str,
    input_payload: dict,
    output_payload: dict,
    parsed_output: dict,
) -> str:
    """Store an AI output record and return its ID."""
    record = {
        "user_id": user_id,
        "goal_id": goal_id,
        "prompt_name": prompt_name,
        "prompt_version": prompt_version,
        "model": MODEL,
        "input_payload": input_payload,
        "output_payload": output_payload,
        "parsed_output": parsed_output,
        "generation_type": generation_type,
    }
    result = supabase.table("ai_outputs").insert(record).execute()
    return result.data[0]["id"]


def _extract_tool_result(response) -> dict:
    """Extract the tool use input from a Claude response."""
    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise ValueError("No tool_use block found in Claude response")


def generate_actions(user_id: str, goal_id: str, extra_context: str = "") -> tuple[list[dict], str]:
    """Generate daily actions for a goal using Claude. Returns (actions_list, ai_output_id)."""
    # Fetch goal
    goal_result = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    goal = goal_result.data

    # Build prompt
    current_value = _get_latest_metric(goal_id)
    ctx = _build_goal_context(goal, current_value)
    ctx["context"] = extra_context

    prompt_version = "v1"
    template = get_prompt_template("generate_actions", prompt_version)
    user_message = template.format(**ctx)

    # Call Claude
    input_payload = {
        "model": MODEL,
        "system": "You are a goal-planning assistant. Use the output_actions tool to return your response.",
        "user_message": user_message,
        "tools": [ACTIONS_TOOL],
    }

    logger.info("Calling Claude for action generation (goal=%s)", goal_id)
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system="You are a goal-planning assistant. Use the output_actions tool to return your response.",
        messages=[{"role": "user", "content": user_message}],
        tools=[ACTIONS_TOOL],
        tool_choice={"type": "tool", "name": "output_actions"},
    )

    # Parse response
    parsed = _extract_tool_result(response)
    output_payload = {
        "id": response.id,
        "model": response.model,
        "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens},
        "content": [{"type": b.type, "text": getattr(b, "text", None), "input": getattr(b, "input", None)} for b in response.content],
    }

    # Store AI output
    ai_output_id = _store_ai_output(
        user_id=user_id,
        goal_id=goal_id,
        prompt_name="generate_actions",
        prompt_version=prompt_version,
        generation_type="actions",
        input_payload=input_payload,
        output_payload=output_payload,
        parsed_output=parsed,
    )

    return parsed["actions"], ai_output_id


def generate_milestones(user_id: str, goal_id: str, extra_context: str = "") -> tuple[list[dict], str]:
    """Generate milestones for a goal using Claude. Returns (milestones_list, ai_output_id)."""
    # Fetch goal
    goal_result = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    goal = goal_result.data

    # Build prompt
    current_value = _get_latest_metric(goal_id)
    ctx = _build_goal_context(goal, current_value)
    ctx["context"] = extra_context

    prompt_version = "v1"
    template = get_prompt_template("generate_milestones", prompt_version)
    user_message = template.format(**ctx)

    # Call Claude
    input_payload = {
        "model": MODEL,
        "system": "You are a goal-planning assistant. Use the output_milestones tool to return your response.",
        "user_message": user_message,
        "tools": [MILESTONES_TOOL],
    }

    logger.info("Calling Claude for milestone generation (goal=%s)", goal_id)
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system="You are a goal-planning assistant. Use the output_milestones tool to return your response.",
        messages=[{"role": "user", "content": user_message}],
        tools=[MILESTONES_TOOL],
        tool_choice={"type": "tool", "name": "output_milestones"},
    )

    # Parse response
    parsed = _extract_tool_result(response)
    output_payload = {
        "id": response.id,
        "model": response.model,
        "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens},
        "content": [{"type": b.type, "text": getattr(b, "text", None), "input": getattr(b, "input", None)} for b in response.content],
    }

    # Store AI output
    ai_output_id = _store_ai_output(
        user_id=user_id,
        goal_id=goal_id,
        prompt_name="generate_milestones",
        prompt_version=prompt_version,
        generation_type="milestones",
        input_payload=input_payload,
        output_payload=output_payload,
        parsed_output=parsed,
    )

    return parsed["milestones"], ai_output_id
