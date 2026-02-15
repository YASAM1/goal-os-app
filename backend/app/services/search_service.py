import logging
from dataclasses import dataclass

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    source: str  # "web" or "youtube"


async def brave_search(query: str, num_results: int = 10) -> list[SearchResult]:
    """Search the web using Brave Search API."""
    if not settings.brave_search_api_key:
        logger.warning("Brave Search API key not configured")
        return []

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": query, "count": num_results},
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": settings.brave_search_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("web", {}).get("results", [])[:num_results]:
        results.append(
            SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("description", ""),
                source="web",
            )
        )
    return results


async def youtube_search(query: str, num_results: int = 10) -> list[SearchResult]:
    """Search YouTube using the Data API v3."""
    if not settings.youtube_api_key:
        logger.warning("YouTube API key not configured")
        return []

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": num_results,
                "key": settings.youtube_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("items", []):
        video_id = item.get("id", {}).get("videoId", "")
        snippet = item.get("snippet", {})
        results.append(
            SearchResult(
                title=snippet.get("title", ""),
                url=f"https://www.youtube.com/watch?v={video_id}",
                snippet=snippet.get("description", ""),
                source="youtube",
            )
        )
    return results


def build_search_queries(goal: dict) -> list[str]:
    """Generate 2-3 diverse search queries from a goal."""
    title = goal["title"]
    metric = goal["metric_name"]
    description = goal.get("description") or ""

    queries = [
        f"best daily habits for {title}",
        f"{metric} improvement tips and resources",
    ]
    if description:
        queries.append(f"{description} role models and experts")
    else:
        queries.append(f"{title} role models and success stories")

    return queries
