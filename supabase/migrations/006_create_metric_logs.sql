create table if not exists public.metric_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  value numeric not null,
  note text,
  created_at timestamptz not null default now()
);

-- One log entry per goal per day
create unique index if not exists idx_metric_logs_unique_day
  on public.metric_logs (goal_id, date);

create index if not exists idx_metric_logs_goal_date
  on public.metric_logs (goal_id, date);
