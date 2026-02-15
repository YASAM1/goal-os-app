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
