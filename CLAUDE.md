# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Goal OS** — a desktop-first personal goal tracking app. Single user sets ONE active goal at a time, tracks metric progress, and uses AI to generate daily actions, milestones, and curated resources. See `plans/BUILD_PLAN.md` for the full phased build plan.

## Repo Layout

```
goal-os/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # FastAPI (Python)
├── supabase/          # Migrations, seed data, local config
├── plans/             # Build plan and design docs
└── CLAUDE.md          # This file
```

## Commands

### Frontend (`frontend/`)

```bash
bun run dev            # Start Vite dev server (default :5173)
bun run build          # Production build (includes tsc)
bun run preview        # Preview production build locally
bunx tsc --noEmit      # Type check only
bun run lint           # ESLint check
```

### Backend (`backend/`)

```bash
# Activate venv first
source .venv/bin/activate

uvicorn app.main:app --reload --port 8000   # Start dev server
pytest                                       # Run all tests
pytest -x                                    # Stop on first failure
pytest --cov=app                             # Run with coverage
ruff check app/                              # Lint Python
ruff format app/                             # Format Python
```

### Supabase

```bash
supabase start                # Start local Supabase (Postgres + Auth + Studio)
supabase stop                 # Stop local Supabase
supabase db reset             # Drop and re-apply all migrations from scratch
supabase db push              # Apply pending migrations (local)
supabase migration new <name> # Create a new migration file
```

## Self-Correction Workflow

### Frontend: after writing or modifying code, always run:
```bash
cd frontend && bunx tsc --noEmit && bun run lint
```

### Backend: after writing or modifying code, always run:
```bash
cd backend && ruff check app/ && python -m pytest -x
```

### Reading error output:
- **TypeScript**: errors include `src/components/goal/GoalForm.tsx:15:3` — navigate directly.
- **Python**: pytest shows file, line, and assertion diff. Ruff shows file:line:col with rule ID.
- Fix and re-run until all checks pass.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+ with Vite, TypeScript (strict), Tailwind CSS |
| UI Components | shadcn/ui (copied into `frontend/src/components/ui/`) |
| Charts | Recharts (line chart for metric progress) |
| Routing | react-router-dom v6 |
| Auth Client | @supabase/supabase-js |
| Backend | FastAPI, Python 3.11+ |
| Validation | Pydantic v2 (request/response schemas) |
| AI | Anthropic Claude API (tool_use for structured JSON output) |
| Search | Brave Search API (web) + YouTube Data API v3 |
| Database | Supabase Postgres with RLS |
| Auth | Supabase Auth (email/password for MVP) |

## Architecture

### Frontend Structure

```
frontend/src/
├── components/
│   ├── auth/          # LoginPage, SignupPage, AuthGuard
│   ├── dashboard/     # DashboardPage, GoalSummaryCard
│   ├── goal/          # GoalForm, GoalDetail, MetricLogForm
│   ├── actions/       # ActionList, ActionInstanceToggle
│   ├── milestones/    # MilestoneList, MilestoneToggle
│   ├── charts/        # MetricLineChart
│   ├── resources/     # ResourceList, ResourceCard
│   └── ui/            # Shared primitives (shadcn/ui)
├── hooks/             # useGoal, useMetricLogs, useActions, useAuth
├── lib/
│   ├── supabase.ts    # Supabase client init
│   └── api.ts         # Typed fetch wrapper for backend API
├── types/             # Shared TypeScript types
├── App.tsx
└── main.tsx
```

### Backend Structure

```
backend/app/
├── main.py            # FastAPI app, CORS, lifespan
├── config.py          # Settings via pydantic-settings
├── auth.py            # Supabase JWT verification dependency
├── db.py              # Database connection
├── routers/           # Route handlers (goals, actions, milestones, metric_logs, ai_generate, resources)
├── services/          # Business logic (ai_service, search_service, resource_service)
├── prompts/           # Versioned prompt templates
│   ├── v1/            # generate_actions.txt, generate_milestones.txt, curate_resources.txt
│   └── registry.py    # Maps (prompt_name, version) → template file
├── schemas/           # Pydantic request/response models
└── models/            # DB row type aliases
```

### Key Patterns

**Backend auth dependency** — every route uses `user_id = Depends(get_current_user)`:
```python
@router.get("/goals/active")
async def get_active_goal(user_id: str = Depends(get_current_user)):
    ...
```

**Frontend auth guard** — wrap protected routes with `<AuthGuard>`:
```tsx
<Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
```

**API client** — all frontend→backend calls go through `lib/api.ts`, which attaches the Supabase access token:
```typescript
const response = await api.post(`/goals/${goalId}/ai/generate-actions`, { context });
```

## Database

### Key Tables
`goals`, `actions`, `action_instances`, `milestones`, `metric_logs`, `resources`, `ai_outputs`

All tables have a `user_id` column. RLS is enabled on every table with policies restricting reads/writes to `auth.uid() = user_id`.

### Critical Constraints
- **One active goal per user**: unique partial index on `goals(user_id) WHERE is_active = true`. Attempting to create a second active goal returns a Postgres constraint error — handle this in the API.
- **One metric log per day per goal**: unique on `metric_logs(goal_id, date)`.
- **One action instance per action per day**: unique on `action_instances(action_id, date)`.
- **Max 5 actions per goal**: enforced at the API level in `routers/actions.py`.

### Migrations
- All migrations live in `supabase/migrations/` as sequential SQL files (`001_create_goals.sql`, etc.).
- Never edit a migration that has been applied — create a new one instead.
- Use `supabase db reset` to reapply all migrations from scratch during development.

## AI System

### How AI generation works
1. User clicks "Generate with AI" in the frontend.
2. Frontend calls `POST /goals/{goal_id}/ai/generate-actions` (or milestones/resources).
3. Backend constructs a prompt from the versioned template + goal context.
4. Backend calls Claude API using **tool_use** with a strict JSON schema.
5. Response is validated with Pydantic, stored as an `ai_outputs` row.
6. Child records (actions/milestones/resources) are created linked to the `ai_output_id`.
7. Results returned to frontend.

### Prompt versioning
- Templates: `backend/app/prompts/{version}/{prompt_name}.txt`
- Registry: `backend/app/prompts/registry.py` maps `(name, version)` → file path.
- Every `ai_outputs` row records `prompt_name` and `prompt_version`.
- To update a prompt: create a new version folder (e.g., `v2/`), update the default in `registry.py`.

### Regeneration
- Regeneration creates a **new** `ai_outputs` row (never overwrites).
- Old AI-generated child records are replaced; manually created records are preserved.
- Check `is_ai_generated` flag to distinguish AI vs manual records.

### Claude API patterns
- Always use `tool_use` (not raw text parsing) for structured output.
- Define JSON schemas as tool input_schema — validate response with Pydantic.
- Set 30s timeout on Claude calls.
- Add retry with exponential backoff for rate limits.
- Store full `input_payload` and `output_payload` in `ai_outputs` for debugging.

## API Design

Base: `{API_URL}/api/v1`
Auth: `Authorization: Bearer <supabase_access_token>` on every request.

### Endpoint groups
- `/goals/*` — CRUD + archive
- `/goals/{id}/actions` — action CRUD
- `/goals/{id}/action-instances` — daily checklist
- `/goals/{id}/milestones` — milestone CRUD
- `/goals/{id}/metric-logs` — time series data
- `/goals/{id}/ai/generate-actions` — AI generation
- `/goals/{id}/ai/generate-milestones` — AI generation
- `/goals/{id}/ai/curate-resources` — AI + web/YouTube search
- `/goals/{id}/resources` — resource list + delete

### Error response shape
All errors return:
```json
{ "error": "SHORT_CODE", "detail": "Human-readable message" }
```

## Environment Variables

### Frontend (`frontend/.env.local`)
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>
VITE_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<local-service-role-key>
SUPABASE_JWT_SECRET=<local-jwt-secret>
CLAUDE_API_KEY=sk-ant-...
SEARCH_API_KEY=<tavily-key>
YOUTUBE_API_KEY=<gcp-api-key>
CORS_ORIGINS=http://localhost:5173
```

Never commit `.env` files. Use `.env.example` with placeholder values.

## Code Style

### Python (Backend)
- Use type hints everywhere.
- Pydantic models for all request/response shapes.
- `async def` for all route handlers and service functions.
- Use `ruff` for linting and formatting.
- No `print()` — use `logging` module with structured messages.
- Prefer explicit imports over wildcard imports.

### TypeScript (Frontend)
- Strict mode enabled in `tsconfig.json`.
- Use named exports (default exports only for pages if needed by router).
- Use `type` imports for type-only references: `import type { Goal } from "../types"`.
- Use `const` over `let` when possible.
- No `any` — use proper types or `unknown` with type narrowing.
- No `console.log` in committed code.

## Testing

### Backend tests (pytest)
- Place tests in `backend/tests/` mirroring the `app/` structure.
- Use `httpx.AsyncClient` for integration tests against FastAPI.
- Mock Claude API calls — never make real AI calls in tests.
- Mock Supabase auth — inject test user IDs via dependency override.

### Frontend tests (optional for MVP)
- Use Vitest + React Testing Library if adding tests.
- Focus on form validation and critical user flows.

## Common Pitfalls

- **Supabase local JWT secret** differs from production — `backend/app/auth.py` must read it from env, not hardcode.
- **CORS**: backend must allow the frontend origin. In production, restrict to the actual domain.
- **RLS bypass**: the backend uses `SUPABASE_SERVICE_KEY` which bypasses RLS. Only use this for trusted server-side operations (like AI output storage). Frontend uses the anon key with RLS enforced.
- **One active goal constraint**: the unique partial index will throw a Postgres error if violated. Catch `UniqueViolationError` in the goals router and return a 409.
- **Max 5 actions**: check the count before inserting. Return 422 if limit exceeded.
- **Recharts with zero data**: handle the empty metric_logs case with an empty state, not a broken chart.
- **AI timeout**: Claude calls can take 10-30s. Show loading state in frontend; set appropriate timeout in backend.

## Build Plan Reference

The full phased build plan is at `plans/BUILD_PLAN.md`. It contains:
- Phase 0: Specs & Setup
- Phase 1: Auth + Database
- Phase 2: Core CRUD + Tracking
- Phase 3: Charts + Dashboard
- Phase 4: AI Plan Generation (Habits + Milestones)
- Phase 5: Resource + Role Model Curation (Web + YouTube)
- Phase 6: Polish, Testing, Deployment

Each phase has objectives, tasks, acceptance criteria, and risk notes. Follow the phases in order.
