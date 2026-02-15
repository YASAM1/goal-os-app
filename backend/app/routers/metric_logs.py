from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.metric_log import MetricLog, MetricLogCreate, MetricLogUpdate

router = APIRouter(tags=["metric_logs"])


@router.get("/goals/{goal_id}/metric-logs", response_model=list[MetricLog])
async def list_metric_logs(
    goal_id: str,
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    user_id: str = Depends(get_current_user),
):
    query = (
        supabase.table("metric_logs")
        .select("*")
        .eq("goal_id", goal_id)
        .eq("user_id", user_id)
    )
    if from_date:
        query = query.gte("date", from_date.isoformat())
    if to_date:
        query = query.lte("date", to_date.isoformat())
    result = query.order("date").execute()
    return result.data


@router.post(
    "/goals/{goal_id}/metric-logs",
    response_model=MetricLog,
    status_code=status.HTTP_201_CREATED,
)
async def create_metric_log(
    goal_id: str, body: MetricLogCreate, user_id: str = Depends(get_current_user)
):
    data = body.model_dump(mode="json")
    data["goal_id"] = goal_id
    data["user_id"] = user_id
    try:
        result = supabase.table("metric_logs").insert(data).execute()
    except Exception as e:
        error_msg = str(e)
        if "idx_metric_logs_unique_day" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A metric log already exists for this date. Use PATCH to update it.",
            )
        raise
    return result.data[0]


@router.patch("/metric-logs/{log_id}", response_model=MetricLog)
async def update_metric_log(
    log_id: str, body: MetricLogUpdate, user_id: str = Depends(get_current_user)
):
    data = body.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    result = (
        supabase.table("metric_logs")
        .update(data)
        .eq("id", log_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Metric log not found"
        )
    return result.data[0]


@router.delete("/metric-logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric_log(log_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("metric_logs")
        .delete()
        .eq("id", log_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Metric log not found"
        )
