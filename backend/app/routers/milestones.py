from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.milestone import Milestone, MilestoneCreate, MilestoneUpdate

router = APIRouter(tags=["milestones"])


@router.get("/goals/{goal_id}/milestones", response_model=list[Milestone])
async def list_milestones(goal_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("milestones")
        .select("*")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
        .order("sort_order")
        .execute()
    )
    return result.data


@router.post(
    "/goals/{goal_id}/milestones",
    response_model=Milestone,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    goal_id: str, body: MilestoneCreate, user_id: str = Depends(get_current_user)
):
    data = body.model_dump(mode="json")
    data["goal_id"] = goal_id
    data["user_id"] = user_id
    result = supabase.table("milestones").insert(data).execute()
    return result.data[0]


@router.patch("/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(
    milestone_id: str,
    body: MilestoneUpdate,
    user_id: str = Depends(get_current_user),
):
    data = body.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )

    # If marking as done, set completed_at
    if data.get("status") == "done":
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif data.get("status") == "pending":
        data["completed_at"] = None

    result = (
        supabase.table("milestones")
        .update(data)
        .eq("id", milestone_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found"
        )
    return result.data[0]


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: str, user_id: str = Depends(get_current_user)
):
    result = (
        supabase.table("milestones")
        .delete()
        .eq("id", milestone_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found"
        )
