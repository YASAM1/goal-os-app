import logging

import anthropic

from app.config import settings
from app.db import supabase
from app.prompts.registry import get_prompt_template
from app.services.search_service import (
    SearchResult,
    brave_search,
    build_search_queries,
    youtube_search,
)

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.claude_api_key)

MODEL = "claude-sonnet-4-5-20250929"

RESOURCES_TOOL = {
    "name": "output_resources",
    "description": "Return curated resources for the user's goal.",
    "input_schema": {
        "type": "object",
        "required": ["resources"],
        "properties": {
            "resources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["title", "url", "type", "source", "summary", "why_relevant", "is_paid"],
                    "properties": {
                        "title": {"type": "string"},
                        "url": {"type": "string"},
                        "type": {
                            "type": "string",
                            "enum": ["article", "book", "course", "video", "tool", "person"],
                        },
                        "source": {"type": "string", "description": "e.g. 'youtube', 'web'"},
                        "summary": {"type": "string", "description": "1-2 sentence summary"},
                        "why_relevant": {"type": "string", "description": "Why this helps the user's specific goal"},
                        "is_paid": {"type": "boolean"},
                    },
                },
            }
        },
    },
}


def _format_search_results(results: list[SearchResult]) -> str:
    """Format search results for the Claude prompt."""
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. [{r.source.upper()}] {r.title}\n   URL: {r.url}\n   Snippet: {r.snippet}")
    return "\n\n".join(lines)


async def curate_resources(user_id: str, goal_id: str, extra_context: str = "") -> tuple[list[dict], str]:
    """Search web + YouTube, then use Claude to curate and categorize resources."""
    # Fetch goal
    goal_result = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    goal = goal_result.data

    # Build search queries and run searches
    queries = build_search_queries(goal)
    all_results: list[SearchResult] = []

    for query in queries:
        try:
            web_results = await brave_search(query, num_results=5)
            all_results.extend(web_results)
        except Exception as e:
            logger.error("Brave search failed for '%s': %s", query, e)

        try:
            yt_results = await youtube_search(query, num_results=3)
            all_results.extend(yt_results)
        except Exception as e:
            logger.error("YouTube search failed for '%s': %s", query, e)

    if not all_results:
        logger.warning("No search results found for goal %s", goal_id)
        return [], ""

    # Build prompt
    search_results_text = _format_search_results(all_results)

    prompt_version = "v1"
    template = get_prompt_template("curate_resources", prompt_version)
    user_message = template.format(
        title=goal["title"],
        description=goal.get("description") or "N/A",
        metric_name=goal["metric_name"],
        metric_unit=goal["metric_unit"],
        direction=goal["direction"],
        target_value=goal["target_value"],
        context=extra_context,
        search_results=search_results_text,
    )

    # Call Claude
    input_payload = {
        "model": MODEL,
        "system": "You are a goal-planning assistant. Use the output_resources tool to return curated resources.",
        "user_message": user_message,
        "tools": [RESOURCES_TOOL],
        "search_results_count": len(all_results),
        "queries": queries,
    }

    logger.info("Calling Claude for resource curation (goal=%s, %d results)", goal_id, len(all_results))
    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system="You are a goal-planning assistant. Use the output_resources tool to return curated resources. Include role models as type 'person'.",
        messages=[{"role": "user", "content": user_message}],
        tools=[RESOURCES_TOOL],
        tool_choice={"type": "tool", "name": "output_resources"},
    )

    # Parse response
    parsed = None
    for block in response.content:
        if block.type == "tool_use":
            parsed = block.input
            break

    if not parsed:
        raise ValueError("No tool_use block in Claude response")

    output_payload = {
        "id": response.id,
        "model": response.model,
        "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens},
    }

    # Store AI output
    ai_record = {
        "user_id": user_id,
        "goal_id": goal_id,
        "prompt_name": "curate_resources",
        "prompt_version": prompt_version,
        "model": MODEL,
        "input_payload": input_payload,
        "output_payload": output_payload,
        "parsed_output": parsed,
        "generation_type": "resources",
    }
    ai_result = supabase.table("ai_outputs").insert(ai_record).execute()
    ai_output_id = ai_result.data[0]["id"]

    return parsed["resources"], ai_output_id
