create table if not exists public.action_instances (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  created_at timestamptz not null default now()
);

-- One instance per action per day
create unique index if not exists idx_action_instances_unique_day
  on public.action_instances (action_id, date);

create index if not exists idx_action_instances_user_date
  on public.action_instances (user_id, date);
