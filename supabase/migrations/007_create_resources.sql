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
