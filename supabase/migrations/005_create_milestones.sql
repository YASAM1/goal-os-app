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
