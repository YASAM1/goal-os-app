-- Enable RLS on all tables
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
