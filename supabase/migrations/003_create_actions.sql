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
