import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import supabase
from app.schemas.ai import AIGenerateRequest
from app.services.ai_service import generate_actions, generate_milestones
from app.services.resource_service import curate_resources

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai_generation"])


@router.post("/goals/{goal_id}/ai/generate-actions")
async def ai_generate_actions(
    goal_id: str,
    body: AIGenerateRequest = AIGenerateRequest(),
    user_id: str = Depends(get_current_user),
):
    """Generate AI daily actions for a goal. Replaces existing AI-generated actions."""
    # Verify goal belongs to user
    goal_result = (
        supabase.table("goals")
        .select("id")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not goal_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    try:
        actions_data, ai_output_id = generate_actions(
            user_id=user_id,
            goal_id=goal_id,
            extra_context=body.context or "",
        )
    except Exception as e:
        logger.error("AI action generation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {e}",
        )

    # Delete existing AI-generated actions for this goal
    supabase.table("actions").delete().eq("goal_id", goal_id).eq("user_id", user_id).eq("is_ai_generated", True).execute()

    # Insert new actions
    new_actions = []
    for i, action in enumerate(actions_data):
        record = {
            "goal_id": goal_id,
            "user_id": user_id,
            "title": action["title"],
            "description": action.get("description"),
            "sort_order": i + 1,
            "is_ai_generated": True,
            "ai_output_id": ai_output_id,
        }
        new_actions.append(record)

    result = supabase.table("actions").insert(new_actions).execute()

    return {
        "actions": result.data,
        "ai_output_id": ai_output_id,
    }


@router.post("/goals/{goal_id}/ai/generate-milestones")
async def ai_generate_milestones(
    goal_id: str,
    body: AIGenerateRequest = AIGenerateRequest(),
    user_id: str = Depends(get_current_user),
):
    """Generate AI milestones for a goal. Replaces existing AI-generated milestones."""
    # Verify goal belongs to user
    goal_result = (
        supabase.table("goals")
        .select("id")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not goal_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    try:
        milestones_data, ai_output_id = generate_milestones(
            user_id=user_id,
            goal_id=goal_id,
            extra_context=body.context or "",
        )
    except Exception as e:
        logger.error("AI milestone generation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {e}",
        )

    # Delete existing AI-generated milestones for this goal
    supabase.table("milestones").delete().eq("goal_id", goal_id).eq("user_id", user_id).eq("is_ai_generated", True).execute()

    # Insert new milestones
    new_milestones = []
    for i, milestone in enumerate(milestones_data):
        record = {
            "goal_id": goal_id,
            "user_id": user_id,
            "title": milestone["title"],
            "description": milestone.get("description"),
            "sort_order": i + 1,
            "is_ai_generated": True,
            "ai_output_id": ai_output_id,
        }
        new_milestones.append(record)

    result = supabase.table("milestones").insert(new_milestones).execute()

    return {
        "milestones": result.data,
        "ai_output_id": ai_output_id,
    }


@router.post("/goals/{goal_id}/ai/generate-plan")
async def ai_generate_plan(
    goal_id: str,
    body: AIGenerateRequest = AIGenerateRequest(),
    user_id: str = Depends(get_current_user),
):
    """Generate both actions and milestones in one call."""
    # Verify goal belongs to user
    goal_result = (
        supabase.table("goals")
        .select("id")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not goal_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    context = body.context or ""

    # Generate actions
    try:
        actions_data, actions_ai_id = generate_actions(user_id, goal_id, context)
    except Exception as e:
        logger.error("AI action generation failed: %s", e)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI generation failed: {e}")

    # Generate milestones
    try:
        milestones_data, milestones_ai_id = generate_milestones(user_id, goal_id, context)
    except Exception as e:
        logger.error("AI milestone generation failed: %s", e)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI generation failed: {e}")

    # Replace AI-generated records
    supabase.table("actions").delete().eq("goal_id", goal_id).eq("user_id", user_id).eq("is_ai_generated", True).execute()
    supabase.table("milestones").delete().eq("goal_id", goal_id).eq("user_id", user_id).eq("is_ai_generated", True).execute()

    # Insert new actions
    new_actions = [
        {
            "goal_id": goal_id,
            "user_id": user_id,
            "title": a["title"],
            "description": a.get("description"),
            "sort_order": i + 1,
            "is_ai_generated": True,
            "ai_output_id": actions_ai_id,
        }
        for i, a in enumerate(actions_data)
    ]
    actions_result = supabase.table("actions").insert(new_actions).execute()

    # Insert new milestones
    new_milestones = [
        {
            "goal_id": goal_id,
            "user_id": user_id,
            "title": m["title"],
            "description": m.get("description"),
            "sort_order": i + 1,
            "is_ai_generated": True,
            "ai_output_id": milestones_ai_id,
        }
        for i, m in enumerate(milestones_data)
    ]
    milestones_result = supabase.table("milestones").insert(new_milestones).execute()

    return {
        "actions": actions_result.data,
        "milestones": milestones_result.data,
        "actions_ai_output_id": actions_ai_id,
        "milestones_ai_output_id": milestones_ai_id,
    }


@router.post("/goals/{goal_id}/ai/curate-resources")
async def ai_curate_resources(
    goal_id: str,
    body: AIGenerateRequest = AIGenerateRequest(),
    user_id: str = Depends(get_current_user),
):
    """Search web + YouTube, then use Claude to curate resources for a goal."""
    # Verify goal belongs to user
    goal_result = (
        supabase.table("goals")
        .select("id")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not goal_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    try:
        resources_data, ai_output_id = await curate_resources(
            user_id=user_id,
            goal_id=goal_id,
            extra_context=body.context or "",
        )
    except Exception as e:
        logger.error("AI resource curation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resource curation failed: {e}",
        )

    if not resources_data:
        return {"resources": [], "ai_output_id": None}

    # Delete existing AI-generated resources for this goal
    supabase.table("resources").delete().eq("goal_id", goal_id).eq("user_id", user_id).eq("is_ai_generated", True).execute()

    # Insert new resources
    new_resources = [
        {
            "goal_id": goal_id,
            "user_id": user_id,
            "type": r["type"],
            "title": r["title"],
            "url": r.get("url"),
            "source": r.get("source", "web"),
            "summary": r.get("summary"),
            "why_relevant": r.get("why_relevant"),
            "is_paid": r.get("is_paid", False),
            "is_ai_generated": True,
            "ai_output_id": ai_output_id,
        }
        for r in resources_data
    ]
    result = supabase.table("resources").insert(new_resources).execute()

    return {
        "resources": result.data,
        "ai_output_id": ai_output_id,
    }
