from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.goal import Goal, GoalCreate, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/active", response_model=Goal | None)
async def get_active_goal(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("goals")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    return result.data


@router.post("", response_model=Goal, status_code=status.HTTP_201_CREATED)
async def create_goal(body: GoalCreate, user_id: str = Depends(get_current_user)):
    data = body.model_dump(mode="json")
    data["user_id"] = user_id
    try:
        result = supabase.table("goals").insert(data).execute()
    except Exception as e:
        error_msg = str(e)
        if "idx_goals_one_active_per_user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an active goal. Archive it before creating a new one.",
            )
        raise
    return result.data[0]


@router.patch("/{goal_id}", response_model=Goal)
async def update_goal(
    goal_id: str, body: GoalUpdate, user_id: str = Depends(get_current_user)
):
    data = body.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("goals")
        .update(data)
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return result.data[0]


@router.post("/{goal_id}/archive", response_model=Goal)
async def archive_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("goals")
        .update(
            {
                "is_active": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active goal not found",
        )
    return result.data[0]
