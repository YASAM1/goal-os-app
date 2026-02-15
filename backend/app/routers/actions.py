from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.action import Action, ActionCreate, ActionUpdate

router = APIRouter(tags=["actions"])

MAX_ACTIONS_PER_GOAL = 5


@router.get("/goals/{goal_id}/actions", response_model=list[Action])
async def list_actions(goal_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("actions")
        .select("*")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
        .order("sort_order")
        .execute()
    )
    return result.data


@router.post(
    "/goals/{goal_id}/actions",
    response_model=Action,
    status_code=status.HTTP_201_CREATED,
)
async def create_action(
    goal_id: str, body: ActionCreate, user_id: str = Depends(get_current_user)
):
    # Enforce max 5 actions per goal
    count_result = (
        supabase.table("actions")
        .select("id", count="exact")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    if count_result.count is not None and count_result.count >= MAX_ACTIONS_PER_GOAL:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Maximum {MAX_ACTIONS_PER_GOAL} actions per goal.",
        )

    data = body.model_dump(mode="json")
    data["goal_id"] = goal_id
    data["user_id"] = user_id
    result = supabase.table("actions").insert(data).execute()
    return result.data[0]


@router.patch("/actions/{action_id}", response_model=Action)
async def update_action(
    action_id: str, body: ActionUpdate, user_id: str = Depends(get_current_user)
):
    data = body.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    result = (
        supabase.table("actions")
        .update(data)
        .eq("id", action_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
    return result.data[0]


@router.delete("/actions/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action(action_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("actions")
        .delete()
        .eq("id", action_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
