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

-- Enforce ONE active goal per user
create unique index if not exists idx_goals_one_active_per_user
  on public.goals (user_id) where (is_active = true);

-- Index for fast user lookups
create index if not exists idx_goals_user_id on public.goals (user_id);
