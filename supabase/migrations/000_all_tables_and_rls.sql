-- ============================================
-- Goal OS — Full Schema Setup
-- Run this entire file in the Supabase SQL Editor
-- ============================================

-- 1. Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  metric_name text not null,
  metric_unit text not null,
  direction text not null check (direction in ('increase', 'decrease')),
  baseline_value numeric not null,
  baseline_date date not null,
  target_value numeric not null,
  target_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_goals_one_active_per_user
  on public.goals (user_id) where (is_active = true);
create index if not exists idx_goals_user_id on public.goals (user_id);

-- 2. AI Outputs (must exist before actions/milestones/resources reference it)
create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  prompt_name text not null,
  prompt_version text not null,
  model text not null,
  input_payload jsonb not null,
  output_payload jsonb not null,
  parsed_output jsonb not null,
  generation_type text not null check (generation_type in ('actions', 'milestones', 'resources')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_outputs_goal_id on public.ai_outputs (goal_id);
create index if not exists idx_ai_outputs_user_id on public.ai_outputs (user_id);

-- 3. Actions
create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 1,
  is_ai_generated boolean not null default false,
  ai_output_id uuid references public.ai_outputs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_actions_goal_id on public.actions (goal_id);

-- 4. Action Instances
create table if not exists public.action_instances (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_action_instances_unique_day
  on public.action_instances (action_id, date);
create index if not exists idx_action_instances_user_date
  on public.action_instances (user_id, date);

-- 5. Milestones
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  status text not null default 'pending' check (status in ('pending', 'done')),
  sort_order int not null default 1,
  is_ai_generated boolean not null default false,
  ai_output_id uuid references public.ai_outputs(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_milestones_goal_id on public.milestones (goal_id);

-- 6. Metric Logs
create table if not exists public.metric_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  value numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_metric_logs_unique_day
  on public.metric_logs (goal_id, date);
create index if not exists idx_metric_logs_goal_date
  on public.metric_logs (goal_id, date);

-- 7. Resources
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('article', 'book', 'course', 'video', 'tool', 'person')),
  title text not null,
  url text,
  source text,
  summary text,
  why_relevant text,
  is_paid boolean not null default false,
  is_ai_generated boolean not null default false,
  ai_output_id uuid references public.ai_outputs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_goal_id on public.resources (goal_id);

-- ============================================
-- 8. Row Level Security
-- ============================================

alter table public.goals enable row level security;
alter table public.ai_outputs enable row level security;
alter table public.actions enable row level security;
alter table public.action_instances enable row level security;
alter table public.milestones enable row level security;
alter table public.metric_logs enable row level security;
alter table public.resources enable row level security;

-- Goals
create policy "Users read own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users delete own goals" on public.goals for delete using (auth.uid() = user_id);

-- AI Outputs
create policy "Users read own ai_outputs" on public.ai_outputs for select using (auth.uid() = user_id);
create policy "Users insert own ai_outputs" on public.ai_outputs for insert with check (auth.uid() = user_id);

-- Actions
create policy "Users read own actions" on public.actions for select using (auth.uid() = user_id);
create policy "Users insert own actions" on public.actions for insert with check (auth.uid() = user_id);
create policy "Users update own actions" on public.actions for update using (auth.uid() = user_id);
create policy "Users delete own actions" on public.actions for delete using (auth.uid() = user_id);

-- Action Instances
create policy "Users read own action_instances" on public.action_instances for select using (auth.uid() = user_id);
create policy "Users insert own action_instances" on public.action_instances for insert with check (auth.uid() = user_id);
create policy "Users update own action_instances" on public.action_instances for update using (auth.uid() = user_id);
create policy "Users delete own action_instances" on public.action_instances for delete using (auth.uid() = user_id);

-- Milestones
create policy "Users read own milestones" on public.milestones for select using (auth.uid() = user_id);
create policy "Users insert own milestones" on public.milestones for insert with check (auth.uid() = user_id);
create policy "Users update own milestones" on public.milestones for update using (auth.uid() = user_id);
create policy "Users delete own milestones" on public.milestones for delete using (auth.uid() = user_id);

-- Metric Logs
create policy "Users read own metric_logs" on public.metric_logs for select using (auth.uid() = user_id);
create policy "Users insert own metric_logs" on public.metric_logs for insert with check (auth.uid() = user_id);
create policy "Users update own metric_logs" on public.metric_logs for update using (auth.uid() = user_id);
create policy "Users delete own metric_logs" on public.metric_logs for delete using (auth.uid() = user_id);

-- Resources
create policy "Users read own resources" on public.resources for select using (auth.uid() = user_id);
create policy "Users insert own resources" on public.resources for insert with check (auth.uid() = user_id);
create policy "Users update own resources" on public.resources for update using (auth.uid() = user_id);
create policy "Users delete own resources" on public.resources for delete using (auth.uid() = user_id);
