# Goal OS — Build Plan

> **Version:** 1.0
> **Date:** 2026-02-15
> **Stack:** React (Lovable) + Tailwind | FastAPI | Supabase (Postgres + Auth + RLS) | Claude API | Brave Search + YouTube Data API v3

---

## Table of Contents

1. [Repo & Folder Structure](#repo--folder-structure)
2. [Database Schema](#database-schema)
3. [RLS Strategy](#rls-strategy)
4. [API Contract](#api-contract)
5. [AI System Design](#ai-system-design)
6. [Phase 0 — Specs & Setup](#phase-0--specs--setup)
7. [Phase 1 — Auth + Database](#phase-1--auth--database)
8. [Phase 2 — Core CRUD + Tracking](#phase-2--core-crud--tracking)
9. [Phase 3 — Charts + Dashboard](#phase-3--charts--dashboard)
10. [Phase 4 — AI Plan Generation](#phase-4--ai-plan-generation-habits--milestones)
11. [Phase 5 — Resource + Role Model Curation](#phase-5--resource--role-model-curation-web--youtube)
12. [Phase 6 — Polish, Testing, Deployment](#phase-6--polish-testing-deployment)
13. [Local Dev & Deployment Flow](#local-dev--deployment-flow)

---

## Repo & Folder Structure

```
goal-os/
├── frontend/                    # React app (Lovable-generated, ejected or extended)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/            # Login, Signup, AuthGuard
│   │   │   ├── dashboard/       # DashboardPage, GoalSummaryCard
│   │   │   ├── goal/            # GoalForm, GoalDetail, MetricLogForm
│   │   │   ├── actions/         # ActionList, ActionInstanceToggle
│   │   │   ├── milestones/      # MilestoneList, MilestoneToggle
│   │   │   ├── charts/          # MetricLineChart
│   │   │   ├── resources/       # ResourceList, ResourceCard
│   │   │   └── ui/              # Shared primitives (Button, Card, Modal, Spinner)
│   │   ├── hooks/               # useGoal, useMetricLogs, useActions, useAuth
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Supabase client init
│   │   │   └── api.ts           # Typed fetch wrapper for backend
│   │   ├── types/               # Shared TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── package.json
│   └── .env.local               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
│
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── config.py            # Settings via pydantic-settings
│   │   ├── auth.py              # Supabase JWT verification dependency
│   │   ├── db.py                # Async Supabase/Postgres connection (asyncpg or supabase-py)
│   │   ├── routers/
│   │   │   ├── goals.py
│   │   │   ├── actions.py
│   │   │   ├── milestones.py
│   │   │   ├── metric_logs.py
│   │   │   ├── ai_generate.py   # AI generation endpoints
│   │   │   └── resources.py
│   │   ├── services/
│   │   │   ├── ai_service.py    # Claude API calls, prompt construction, JSON parsing
│   │   │   ├── search_service.py# Web search + YouTube API integration
│   │   │   └── resource_service.py
│   │   ├── prompts/
│   │   │   ├── v1/
│   │   │   │   ├── generate_actions.txt
│   │   │   │   ├── generate_milestones.txt
│   │   │   │   └── curate_resources.txt
│   │   │   └── registry.py      # Maps prompt_name + version → template file
│   │   ├── schemas/             # Pydantic request/response models
│   │   │   ├── goal.py
│   │   │   ├── action.py
│   │   │   ├── milestone.py
│   │   │   ├── metric_log.py
│   │   │   ├── resource.py
│   │   │   └── ai.py            # AI generation request/response schemas
│   │   └── models/              # DB row models (if using ORM) or type aliases
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                     # SUPABASE_URL, SUPABASE_SERVICE_KEY, CLAUDE_API_KEY, etc.
│
├── supabase/
│   ├── migrations/              # Sequential SQL migration files
│   │   ├── 001_create_goals.sql
│   │   ├── 002_create_actions.sql
│   │   ├── 003_create_milestones.sql
│   │   ├── 004_create_metric_logs.sql
│   │   ├── 005_create_resources.sql
│   │   └── 006_create_ai_outputs.sql
│   ├── seed.sql                 # Optional dev seed data
│   └── config.toml              # Supabase local dev config
│
├── .gitignore
└── README.md
```

---

## Database Schema

### `goals`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| user_id | uuid FK → auth.users | NOT NULL |
| title | text | NOT NULL |
| description | text | |
| metric_name | text | e.g. "Body weight" |
| metric_unit | text | e.g. "lbs" |
| direction | text | `increase` or `decrease` |
| baseline_value | numeric | NOT NULL |
| baseline_date | date | NOT NULL |
| target_value | numeric | NOT NULL |
| target_date | date | nullable (open-ended OK) |
| is_active | boolean | default true |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Constraint:** Unique partial index on `(user_id) WHERE is_active = true` — enforces ONE active goal.

### `actions`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goal_id | uuid FK → goals | NOT NULL |
| user_id | uuid FK → auth.users | NOT NULL |
| title | text | NOT NULL |
| description | text | |
| sort_order | int | 1–5 |
| is_ai_generated | boolean | |
| ai_output_id | uuid FK → ai_outputs | nullable |
| created_at | timestamptz | |

### `action_instances`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| action_id | uuid FK → actions | NOT NULL |
| user_id | uuid FK → auth.users | NOT NULL |
| date | date | NOT NULL |
| status | text | `pending`, `done`, `skipped` |
| created_at | timestamptz | |

**Constraint:** Unique on `(action_id, date)`.

### `milestones`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goal_id | uuid FK → goals | NOT NULL |
| user_id | uuid FK → auth.users | NOT NULL |
| title | text | NOT NULL |
| description | text | |
| target_date | date | nullable |
| status | text | `pending`, `done` |
| sort_order | int | |
| is_ai_generated | boolean | |
| ai_output_id | uuid FK → ai_outputs | nullable |
| completed_at | timestamptz | nullable |
| created_at | timestamptz | |

### `metric_logs`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goal_id | uuid FK → goals | NOT NULL |
| user_id | uuid FK → auth.users | NOT NULL |
| date | date | NOT NULL |
| value | numeric | NOT NULL |
| note | text | optional user note |
| created_at | timestamptz | |

**Constraint:** Unique on `(goal_id, date)`.

### `resources`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goal_id | uuid FK → goals | NOT NULL |
| user_id | uuid FK → auth.users | NOT NULL |
| type | text | `article`, `book`, `course`, `video`, `tool`, `person` |
| title | text | NOT NULL |
| url | text | nullable |
| source | text | e.g. "youtube", "web" |
| summary | text | AI-generated summary |
| why_relevant | text | AI-generated relevance explanation |
| is_paid | boolean | default false |
| is_ai_generated | boolean | |
| ai_output_id | uuid FK → ai_outputs | nullable |
| created_at | timestamptz | |

### `ai_outputs`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | NOT NULL |
| goal_id | uuid FK → goals | NOT NULL |
| prompt_name | text | e.g. `generate_actions` |
| prompt_version | text | e.g. `v1` |
| model | text | e.g. `claude-sonnet-4-5-20250929` |
| input_payload | jsonb | full prompt input context |
| output_payload | jsonb | raw model response |
| parsed_output | jsonb | validated/structured data |
| generation_type | text | `actions`, `milestones`, `resources` |
| created_at | timestamptz | |

---

## RLS Strategy

All tables have RLS enabled. Every table includes a `user_id` column.

**Policy pattern (applied to every table):**

```sql
-- SELECT: users see only their own rows
CREATE POLICY "Users read own data" ON <table>
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: users insert only for themselves
CREATE POLICY "Users insert own data" ON <table>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: users update only their own rows
CREATE POLICY "Users update own data" ON <table>
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: users delete only their own rows
CREATE POLICY "Users delete own data" ON <table>
  FOR DELETE USING (auth.uid() = user_id);
```

The backend uses the **Supabase service role key** for AI-output inserts (bypasses RLS) since the backend is trusted. All frontend-initiated queries go through the anon key with RLS enforced.

---

## API Contract

Base URL: `{API_URL}/api/v1`
Auth: All endpoints require `Authorization: Bearer <supabase_access_token>`.
The backend validates the JWT via Supabase's JWKS.

### Goals

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/goals/active` | — | `Goal` or `null` |
| POST | `/goals` | `GoalCreate` | `Goal` |
| PATCH | `/goals/{id}` | `GoalUpdate` | `Goal` |
| POST | `/goals/{id}/archive` | — | `Goal` (is_active=false) |

```
GoalCreate {
  title: str
  description?: str
  metric_name: str
  metric_unit: str
  direction: "increase" | "decrease"
  baseline_value: float
  baseline_date: str (ISO date)
  target_value: float
  target_date?: str (ISO date)
}
```

### Actions

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/goals/{goal_id}/actions` | — | `Action[]` |
| POST | `/goals/{goal_id}/actions` | `ActionCreate` | `Action` |
| PATCH | `/actions/{id}` | `ActionUpdate` | `Action` |
| DELETE | `/actions/{id}` | — | 204 |

### Action Instances

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/goals/{goal_id}/action-instances` | `?date=YYYY-MM-DD` | `ActionInstance[]` |
| PUT | `/action-instances/{id}/status` | `{ status }` | `ActionInstance` |
| POST | `/goals/{goal_id}/action-instances/generate-day` | `{ date }` | `ActionInstance[]` |

`generate-day` creates pending instances for all active actions for the given date (idempotent).

### Milestones

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/goals/{goal_id}/milestones` | — | `Milestone[]` |
| POST | `/goals/{goal_id}/milestones` | `MilestoneCreate` | `Milestone` |
| PATCH | `/milestones/{id}` | `MilestoneUpdate` | `Milestone` |
| DELETE | `/milestones/{id}` | — | 204 |

### Metric Logs

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/goals/{goal_id}/metric-logs` | `?from=&to=` | `MetricLog[]` |
| POST | `/goals/{goal_id}/metric-logs` | `{ date, value, note? }` | `MetricLog` |
| PATCH | `/metric-logs/{id}` | `{ value?, note? }` | `MetricLog` |
| DELETE | `/metric-logs/{id}` | — | 204 |

### AI Generation

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/goals/{goal_id}/ai/generate-actions` | `{ context?: str }` | `{ actions: Action[], ai_output_id: uuid }` |
| POST | `/goals/{goal_id}/ai/generate-milestones` | `{ context?: str }` | `{ milestones: Milestone[], ai_output_id: uuid }` |
| POST | `/goals/{goal_id}/ai/curate-resources` | `{ context?: str }` | `{ resources: Resource[], ai_output_id: uuid }` |

Each endpoint: calls Claude → stores `ai_outputs` row → creates/replaces child records → returns results.

### Resources

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/goals/{goal_id}/resources` | `?type=` | `Resource[]` |
| DELETE | `/resources/{id}` | — | 204 |

---

## AI System Design

### Prompt Versioning

- Prompt templates live in `backend/app/prompts/{version}/{prompt_name}.txt`.
- `registry.py` maps `(prompt_name, version)` → file path and is the single source of truth.
- Every `ai_outputs` row stores the `prompt_name` and `prompt_version` used.
- To release a new prompt: add a `v2/` folder, update `registry.py`'s default version, and all new calls use `v2` while old outputs retain their `v1` reference.

### Strict JSON Schemas

Claude API calls use **tool_use** with a defined JSON schema to enforce structured output. Example for action generation:

```json
{
  "name": "output_actions",
  "description": "Return generated daily actions",
  "input_schema": {
    "type": "object",
    "required": ["actions"],
    "properties": {
      "actions": {
        "type": "array",
        "maxItems": 5,
        "items": {
          "type": "object",
          "required": ["title", "description"],
          "properties": {
            "title": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      }
    }
  }
}
```

Backend validates the Claude response against the same schema with Pydantic before persisting.

### Storing `ai_outputs` Records

Every Claude API call writes one `ai_outputs` row:

- `input_payload`: the full messages array and tool definitions sent to Claude.
- `output_payload`: the raw API response body.
- `parsed_output`: the extracted, validated JSON from the tool_use block.
- `prompt_name` + `prompt_version`: for traceability.

### Regeneration Flow

**Versioned recommendation approach:**

1. User clicks "Regenerate actions" (or milestones/resources).
2. Backend creates a **new** `ai_outputs` row (never overwrites).
3. Existing child records (actions/milestones/resources) linked to the **old** `ai_output_id` are soft-deleted or replaced.
4. New child records are created linked to the **new** `ai_output_id`.
5. The user always sees the latest generation. Previous generations are queryable via `ai_outputs` history if needed later.

---

## Phase 0 — Specs & Setup

**Objective:** Repository scaffolding, tooling, environment configuration, and Supabase project creation.

### Deliverables

- [ ] Initialized Git repo with the folder structure above
- [ ] Frontend bootstrapped (Vite + React + TypeScript + Tailwind)
- [ ] Backend bootstrapped (FastAPI + uvicorn + pydantic-settings)
- [ ] Supabase project created (cloud or local via `supabase init`)
- [ ] `.env` files with placeholder values committed to `.env.example`
- [ ] CI lint check (optional but recommended: `ruff` for Python, `eslint` for TS)

### Tasks

1. Create repo, add `.gitignore` for Python + Node + .env.
2. `npm create vite@latest frontend -- --template react-ts` → install Tailwind, configure `tailwind.config.ts`.
3. Install frontend deps: `@supabase/supabase-js`, `recharts`, `react-router-dom`.
4. Create `backend/` with `requirements.txt`: `fastapi`, `uvicorn`, `httpx`, `anthropic`, `pydantic[dotenv]`, `asyncpg`, `supabase` (optional), `python-jose[cryptography]`.
5. Add `backend/app/main.py` with hello-world route and CORS middleware.
6. Run `supabase init` inside `supabase/` directory. Configure `config.toml` for local dev.
7. Create `.env.example` files for both frontend and backend.
8. Verify: `npm run dev` serves React app, `uvicorn app.main:app --reload` serves FastAPI docs at `/docs`.

### Acceptance Criteria

- `GET /` on FastAPI returns `{"status": "ok"}`.
- React app renders a placeholder page with Tailwind styles applied.
- `supabase start` launches local Supabase (Postgres + Auth + Studio).

### Notes / Risks

- Pin Supabase CLI version to avoid breaking changes.
- Lovable-generated code may need manual restructuring to match this folder layout — plan for that.

---

## Phase 1 — Auth + Database

**Objective:** Supabase Auth integration (email/password for MVP), database migrations for all tables, and RLS policies.

### Deliverables

- [ ] All 7 tables created via migration files
- [ ] RLS policies active on every table
- [ ] Unique partial index on `goals` enforcing one active goal per user
- [ ] Frontend: sign-up, login, logout flows
- [ ] Backend: JWT verification middleware (`auth.py`)
- [ ] Protected API route smoke test

### Tasks

1. Write migration `001_create_goals.sql` with the schema above, including the unique partial index.
2. Write migrations `002` through `006` for remaining tables.
3. Apply migrations: `supabase db push` (local) or `supabase migration up`.
4. Write RLS policies per the strategy section — one migration file `007_rls_policies.sql`.
5. Implement `backend/app/auth.py`:
   - Decode Supabase JWT using JWKS endpoint or shared JWT secret.
   - FastAPI dependency `get_current_user(token) → user_id`.
6. Frontend: create `lib/supabase.ts` with `createClient(url, anonKey)`.
7. Build `components/auth/LoginPage.tsx` and `SignupPage.tsx` using `supabase.auth.signInWithPassword` / `signUp`.
8. Build `AuthGuard` component that redirects unauthenticated users.
9. Wire up `react-router-dom` with routes: `/login`, `/signup`, `/dashboard` (protected).
10. Test: sign up a user, verify row in `auth.users`, hit a protected backend endpoint.

### Acceptance Criteria

- New user can sign up, log in, and see a protected dashboard page.
- Unauthenticated requests to backend return 401.
- Direct Supabase queries from frontend respect RLS (user A cannot read user B's data).
- Attempting to create a second active goal returns a Postgres unique constraint error.

### Notes / Risks

- Supabase local dev uses a different JWT secret than production — `auth.py` must be configurable.
- Email confirmation is off by default in local Supabase — keep it off for MVP dev speed.

---

## Phase 2 — Core CRUD + Tracking

**Objective:** Full CRUD for goals, actions, milestones, metric logs. Manual (non-AI) creation and editing. Daily action instance generation.

### Deliverables

- [ ] Backend CRUD routers for all entities
- [ ] Frontend forms: GoalForm, ActionForm, MilestoneForm, MetricLogForm
- [ ] Daily action instance generation endpoint
- [ ] Today view: checklist of today's action instances with toggle

### Tasks

1. Implement `routers/goals.py`: GET active, POST create (enforce one-active via DB constraint), PATCH update, POST archive.
2. Implement `routers/actions.py`: GET list, POST create (validate max 5 per goal), PATCH, DELETE.
3. Implement `routers/milestones.py`: GET list, POST, PATCH (toggle status), DELETE.
4. Implement `routers/metric_logs.py`: GET with date range filter, POST (upsert by date), PATCH, DELETE.
5. Implement `routers/actions.py` → `generate-day` endpoint: for a given date, create `action_instances` rows for all actions of the goal (skip if already exist).
6. Frontend `GoalForm`: create/edit goal with all fields. On submit, call POST/PATCH.
7. Frontend `GoalDetail` page: shows goal info, tabs or sections for Actions, Milestones, Metric Log, Resources.
8. Frontend `ActionList` + `ActionInstanceToggle`: fetch today's instances, toggle done/skipped.
9. Frontend `MilestoneList`: display milestones with status toggle.
10. Frontend `MetricLogForm`: date picker + numeric input + optional note. Inline in goal detail.
11. Wire dashboard to show active goal summary or "Create your first goal" CTA.

### Acceptance Criteria

- User can create a goal and see it on the dashboard.
- User can add/edit/delete actions (max 5 enforced).
- User can add/edit/delete milestones and toggle status.
- User can log metric values per day (one entry per day per goal).
- User can view and toggle today's action instances.
- Archiving a goal clears the dashboard; user can create a new one.

### Notes / Risks

- Max-5 action enforcement: enforce at both API and DB level (CHECK constraint or application logic).
- Upsert logic on `metric_logs` by `(goal_id, date)` prevents accidental duplicates.

---

## Phase 3 — Charts + Dashboard

**Objective:** Line chart of metric progress, dashboard summary with key stats.

### Deliverables

- [ ] Line chart (Recharts) showing metric_logs over time with baseline and target lines
- [ ] Dashboard summary: current value, % progress, streak, days active
- [ ] Responsive layout (desktop-first but not broken on tablet)

### Tasks

1. Install and configure `recharts` (already in deps).
2. Build `MetricLineChart` component:
   - X-axis: date. Y-axis: metric value.
   - Data source: `metric_logs` array sorted by date.
   - Horizontal reference lines for `baseline_value` and `target_value`.
   - Tooltip with date + value + note.
3. Build dashboard summary card:
   - Latest metric value.
   - % progress: `(current - baseline) / (target - baseline) * 100` (respect direction).
   - Current streak: consecutive days with at least one action marked done.
   - Days since goal created.
4. Place chart and summary on `GoalDetail` page (or dashboard if only one goal).
5. Add date range filter for chart (last 7 / 30 / 90 days / all).
6. Style with Tailwind: card layouts, consistent spacing, desktop-first breakpoints.

### Acceptance Criteria

- Line chart renders with real metric log data.
- Baseline and target are visible as reference lines.
- Summary stats calculate correctly for both `increase` and `decrease` direction goals.
- Chart updates immediately when a new metric log is added.

### Notes / Risks

- Recharts can be sluggish with >1000 data points — unlikely for MVP but add pagination if needed.
- Handle edge case of zero metric logs (show empty state, not a broken chart).

---

## Phase 4 — AI Plan Generation (Habits + Milestones)

**Objective:** Claude API integration to generate daily actions and milestones based on the user's goal. Store all AI inputs/outputs.

### Deliverables

- [ ] `ai_service.py` with Claude API client and prompt construction
- [ ] Prompt templates for `generate_actions` (v1) and `generate_milestones` (v1)
- [ ] `POST /ai/generate-actions` and `POST /ai/generate-milestones` endpoints
- [ ] `ai_outputs` table populated on every generation
- [ ] Frontend "Generate with AI" buttons with loading states
- [ ] Regeneration flow (creates new version, replaces active records)

### Tasks

1. Create `prompts/v1/generate_actions.txt`:
   - System prompt: "You are a goal-planning assistant. Given the user's goal, generate up to 5 specific, measurable daily habits."
   - User prompt template: includes goal title, description, metric, baseline, target, current progress (latest metric log), existing milestones.
2. Create `prompts/v1/generate_milestones.txt`:
   - System prompt: "Generate 3–6 monthly-level milestone checkpoints for the user's goal."
   - User prompt template: same context as above.
3. Implement `services/ai_service.py`:
   - `generate_actions(goal, context) → (actions_list, ai_output_id)`
   - `generate_milestones(goal, context) → (milestones_list, ai_output_id)`
   - Both use `anthropic.Client` with `tool_use` for structured output.
   - Both write to `ai_outputs` before returning.
4. Implement `routers/ai_generate.py`:
   - `POST /goals/{goal_id}/ai/generate-actions`: calls service, deletes old AI-generated actions, inserts new ones.
   - `POST /goals/{goal_id}/ai/generate-milestones`: same pattern.
5. Implement `prompts/registry.py`: maps `(name, version)` → file path, returns template string.
6. Frontend: add "Generate Actions with AI" button on GoalDetail actions tab.
   - Loading spinner during request.
   - On success, refresh action list.
   - Confirmation dialog: "This will replace your current AI-generated actions. Continue?"
7. Same for milestones.
8. Add AI generation history view (optional stretch): list past `ai_outputs` for the goal.

### Acceptance Criteria

- Clicking "Generate" calls Claude and returns exactly 1–5 actions (or 3–6 milestones).
- `ai_outputs` row is created with full input/output payloads.
- Old AI-generated actions are replaced; manually created actions are preserved.
- Invalid/malformed Claude responses are caught and surfaced as user-friendly errors.
- Works with latest Claude model (claude-sonnet-4-5-20250929 or claude-haiku-4-5-20251001).

### Notes / Risks

- **Rate limits:** Claude API has rate limits — add retry with exponential backoff in `ai_service.py`.
- **Cost:** Log token usage from the API response in `ai_outputs.output_payload` for cost tracking.
- **Prompt iteration:** Expect to iterate on prompts. Version system makes this safe.
- **Timeout:** Set a 30s timeout on Claude calls; surface timeout errors to the user.

---

## Phase 5 — Resource + Role Model Curation (Web + YouTube)

**Objective:** AI-driven resource discovery. Search the web and YouTube, then use Claude to summarize and rank results by relevance to the user's goal.

### Deliverables

- [ ] Web search integration (Brave Search API)
- [ ] YouTube Data API v3 integration
- [ ] `POST /ai/curate-resources` endpoint
- [ ] Prompt template `curate_resources` (v1)
- [ ] Frontend resource list with type filters
- [ ] AI output stored for every curation call

### Tasks

1. Choose and integrate web search provider:
   - Using **Brave Search API** (returns web results with snippets).
   - Implement `services/search_service.py`:
     - `web_search(query, num_results=10) → list[SearchResult]`
     - `youtube_search(query, num_results=10) → list[YouTubeResult]`
2. YouTube Data API v3 setup:
   - Create GCP project, enable YouTube Data API v3, get API key.
   - Search endpoint: `GET https://www.googleapis.com/youtube/v3/search?part=snippet&q=...&type=video&maxResults=10`
3. Create `prompts/v1/curate_resources.txt`:
   - Input: goal context + raw search results (title, url, snippet for each).
   - Output schema: array of resources with `title`, `url`, `type`, `summary`, `why_relevant`, `is_paid`.
   - Instruct Claude to filter irrelevant results, categorize type, and detect paid content.
4. Implement `services/resource_service.py`:
   - `curate_resources(goal) → (resources_list, ai_output_id)`
   - Steps: build search queries from goal → call web_search + youtube_search → feed results to Claude → parse → store.
5. Implement `routers/resources.py` and extend `routers/ai_generate.py`:
   - `POST /goals/{goal_id}/ai/curate-resources`
   - `GET /goals/{goal_id}/resources?type=video`
   - `DELETE /resources/{id}`
6. Frontend `ResourceList`: cards grouped by type (articles, videos, books, tools, persons).
   - Each card: title, source, summary, why relevant, paid badge, external link.
   - "Curate Resources with AI" button with loading state.
7. Include a "person" type for role models — Claude should identify relevant public figures from search results.

### Acceptance Criteria

- Clicking "Curate Resources" triggers web + YouTube search, Claude processing, and returns categorized resources.
- Resources are stored in DB with `ai_output_id` link.
- At least 3 resource types represented in a typical generation.
- YouTube videos link directly to the video URL.
- `is_paid` flag is set for courses/books that appear to be paid.
- `ai_outputs` row captures the full search results fed to Claude (in `input_payload`).

### Notes / Risks

- **YouTube API quota:** 10,000 units/day free tier. Each search costs 100 units = max 100 searches/day. Cache results.
- **Web search cost:** Brave Search API free tier is 2000 queries/month. Sufficient for single-user MVP.
- **Search query construction:** Generate 2–3 search queries from the goal (e.g., "best daily habits for weight loss", "weight loss role models") rather than one generic query.
- **Stale results:** Resources are a snapshot. Regeneration replaces them.

---

## Phase 6 — Polish, Testing, Deployment

**Objective:** Error handling, loading states, edge cases, basic tests, and production deployment.

### Deliverables

- [ ] Global error boundary in React
- [ ] Toast notifications for success/error states
- [ ] Loading skeletons on all data-fetching views
- [ ] Empty states for all lists
- [ ] Backend: input validation, error responses with consistent shape
- [ ] Backend: integration tests for critical paths
- [ ] Frontend: deployment to Vercel/Netlify
- [ ] Backend: deployment to Railway/Fly.io/Render
- [ ] Supabase: production project with migrations applied

### Tasks

1. Add error boundary component wrapping the app.
2. Add toast library (e.g., `sonner` or `react-hot-toast`) for feedback.
3. Audit every page for:
   - Loading state (skeleton or spinner).
   - Empty state (no goals, no actions, no logs, etc.).
   - Error state (network failure, 4xx/5xx).
4. Backend: standardize error responses as `{ "error": str, "detail": str | null }`.
5. Backend: add request validation (Pydantic already handles most; add custom validators for business rules like max 5 actions).
6. Write backend integration tests (pytest + httpx AsyncClient):
   - Auth flow (valid/invalid JWT).
   - Goal CRUD + one-active constraint.
   - AI generation (mock Claude API).
   - Metric log upsert.
7. Write frontend component tests for critical flows (optional for MVP but recommended):
   - Goal creation form validation.
   - Action instance toggle.
8. Set up production Supabase project:
   - Apply all migrations.
   - Configure Auth settings (site URL, redirect URLs).
   - Copy anon key and URL to frontend env.
   - Copy service role key to backend env.
9. Deploy frontend:
   - Vercel: connect repo, set `frontend/` as root, add env vars.
   - Build command: `npm run build`. Output: `dist/`.
10. Deploy backend:
    - Railway or Fly.io: Dockerfile-based deploy.
    - Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CLAUDE_API_KEY`, `BRAVE_SEARCH_API_KEY`, `YOUTUBE_API_KEY`.
    - Health check on `GET /`.
11. Smoke test production: sign up → create goal → log metric → generate AI actions → view chart.

### Acceptance Criteria

- No unhandled promise rejections or white-screen crashes in frontend.
- All backend endpoints return proper HTTP status codes and error shapes.
- Backend tests pass in CI.
- Production deploy is live and functional end-to-end.
- Environment variables are not leaked in client bundles.

### Notes / Risks

- **Supabase free tier limits:** 500MB DB, 2 projects. Fine for MVP.
- **Backend cold starts:** Railway/Render free tiers sleep after inactivity. Upgrade or use Fly.io for always-on.
- **CORS:** production CORS must be restricted to the actual frontend domain.
- **Secrets:** double-check that `SUPABASE_SERVICE_KEY` and `CLAUDE_API_KEY` are never exposed to the frontend.

---

## Local Dev & Deployment Flow

### Environment Variables

**Frontend (`.env.local`)**

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>
VITE_API_URL=http://localhost:8000
```

**Backend (`.env`)**

```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<local-service-role-key>
SUPABASE_JWT_SECRET=<local-jwt-secret>
CLAUDE_API_KEY=sk-ant-...
BRAVE_SEARCH_API_KEY=<brave-search-key>
YOUTUBE_API_KEY=<gcp-api-key>
CORS_ORIGINS=http://localhost:5173
```

### Local Dev Startup

```bash
# Terminal 1: Supabase
cd supabase && supabase start

# Terminal 2: Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

### Migration Strategy

- All schema changes go in `supabase/migrations/` as sequential SQL files.
- Local: `supabase db reset` applies all migrations from scratch.
- Production: `supabase db push` or `supabase migration up` applies pending migrations.
- Never edit a migration that has been applied to production — create a new migration instead.

### Hosting Options

| Component | Recommended | Alternative |
|---|---|---|
| Frontend | Vercel | Netlify, Cloudflare Pages |
| Backend | Railway | Fly.io, Render |
| Database + Auth | Supabase Cloud | — |

### Production Checklist

- [ ] Supabase project created on cloud (not local)
- [ ] All migrations applied to production DB
- [ ] RLS policies verified on production
- [ ] Frontend deployed with production env vars
- [ ] Backend deployed with production env vars
- [ ] CORS restricted to frontend domain only
- [ ] Health check endpoint responding
- [ ] End-to-end smoke test passing
- [ ] No secrets in client-side code
