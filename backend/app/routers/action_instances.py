from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.action_instance import ActionInstance, ActionInstanceStatusUpdate

router = APIRouter(tags=["action_instances"])


@router.get(
    "/goals/{goal_id}/action-instances", response_model=list[ActionInstance]
)
async def list_action_instances(
    goal_id: str,
    date: date = Query(...),
    user_id: str = Depends(get_current_user),
):
    # Get action IDs for this goal
    actions_result = (
        supabase.table("actions")
        .select("id")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    action_ids = [a["id"] for a in actions_result.data]
    if not action_ids:
        return []

    result = (
        supabase.table("action_instances")
        .select("*")
        .in_("action_id", action_ids)
        .eq("date", date.isoformat())
        .eq("user_id", user_id)
        .execute()
    )
    return result.data


@router.post(
    "/goals/{goal_id}/action-instances/generate-day",
    response_model=list[ActionInstance],
)
async def generate_day(
    goal_id: str,
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """Create pending action instances for all actions of a goal for a given date. Idempotent."""
    target_date = body.get("date")
    if not target_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="date is required"
        )

    # Get all actions for this goal
    actions_result = (
        supabase.table("actions")
        .select("id")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not actions_result.data:
        return []

    # Check which instances already exist for this date
    action_ids = [a["id"] for a in actions_result.data]
    existing_result = (
        supabase.table("action_instances")
        .select("action_id")
        .in_("action_id", action_ids)
        .eq("date", target_date)
        .execute()
    )
    existing_action_ids = {e["action_id"] for e in existing_result.data}

    # Create missing instances
    new_instances = [
        {
            "action_id": aid,
            "user_id": user_id,
            "date": target_date,
            "status": "pending",
        }
        for aid in action_ids
        if aid not in existing_action_ids
    ]

    if new_instances:
        supabase.table("action_instances").insert(new_instances).execute()

    # Return all instances for this date
    all_result = (
        supabase.table("action_instances")
        .select("*")
        .in_("action_id", action_ids)
        .eq("date", target_date)
        .eq("user_id", user_id)
        .execute()
    )
    return all_result.data


@router.put(
    "/action-instances/{instance_id}/status", response_model=ActionInstance
)
async def update_instance_status(
    instance_id: str,
    body: ActionInstanceStatusUpdate,
    user_id: str = Depends(get_current_user),
):
    if body.status not in ("pending", "done", "skipped"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Status must be pending, done, or skipped",
        )
    result = (
        supabase.table("action_instances")
        .update({"status": body.status})
        .eq("id", instance_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action instance not found",
        )
    return result.data[0]
