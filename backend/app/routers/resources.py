from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.resource import Resource

router = APIRouter(tags=["resources"])


@router.get("/goals/{goal_id}/resources", response_model=list[Resource])
async def list_resources(
    goal_id: str,
    type: str | None = Query(None),
    user_id: str = Depends(get_current_user),
):
    query = (
        supabase.table("resources")
        .select("*")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
    )
    if type:
        query = query.eq("type", type)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str, user_id: str = Depends(get_current_user)
):
    result = (
        supabase.table("resources")
        .delete()
        .eq("id", resource_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found"
        )
