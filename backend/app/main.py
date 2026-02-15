import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import action_instances, actions, ai_generate, goals, metric_logs, milestones, resources

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

app = FastAPI(title="Goal OS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.getLogger("app").error("Unhandled error: %s %s — %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "detail": "An unexpected error occurred."},
    )


# Mount routers under /api/v1
PREFIX = "/api/v1"
app.include_router(goals.router, prefix=PREFIX)
app.include_router(actions.router, prefix=PREFIX)
app.include_router(action_instances.router, prefix=PREFIX)
app.include_router(milestones.router, prefix=PREFIX)
app.include_router(metric_logs.router, prefix=PREFIX)
app.include_router(resources.router, prefix=PREFIX)
app.include_router(ai_generate.router, prefix=PREFIX)


@app.get("/")
async def health_check():
    return {"status": "ok"}
