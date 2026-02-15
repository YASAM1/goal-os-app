import type { Goal, Action, ActionInstance, Milestone, MetricLog, Resource, RoleModel } from "@/types/goal";

const today = new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export const mockGoal: Goal = {
  id: "goal-1",
  title: "Run a Sub-4 Hour Marathon",
  domain: "Fitness",
  metric_name: "5K Time",
  metric_unit: "minutes",
  direction: "decrease",
  baseline_value: 32,
  baseline_date: daysAgo(30),
  target_value: 24,
  target_date: daysAgo(-60),
  status: "active",
};

export const mockActions: Action[] = [
  { id: "act-1", goal_id: "goal-1", title: "Morning run — 5K at easy pace", cadence: "daily", estimated_minutes: 30, priority: 1, ai_generated: true },
  { id: "act-2", goal_id: "goal-1", title: "Interval training (4×800m)", cadence: "daily", estimated_minutes: 25, priority: 2, ai_generated: true },
  { id: "act-3", goal_id: "goal-1", title: "Core & mobility work", cadence: "daily", estimated_minutes: 15, priority: 3, ai_generated: true },
  { id: "act-4", goal_id: "goal-1", title: "Log nutrition & hydration", cadence: "daily", estimated_minutes: 5, priority: 4, ai_generated: true },
  { id: "act-5", goal_id: "goal-1", title: "Review weekly mileage plan", cadence: "daily", estimated_minutes: 5, priority: 5, ai_generated: true },
];

export const mockTodayInstances: ActionInstance[] = mockActions.map((a, i) => ({
  id: `inst-${i}`,
  action_id: a.id,
  goal_id: "goal-1",
  date: today,
  completed: i < 2,
  notes: null,
}));

export const mockMilestones: Milestone[] = [
  { id: "ms-1", goal_id: "goal-1", title: "Complete first 10K race", description: "Sign up and finish a 10K event", due_date: daysAgo(-15), status: "done", ai_generated: true },
  { id: "ms-2", goal_id: "goal-1", title: "5K under 28 minutes", due_date: daysAgo(-30), status: "pending", ai_generated: true },
  { id: "ms-3", goal_id: "goal-1", title: "Complete half marathon", due_date: daysAgo(-50), status: "pending", ai_generated: true },
];

export const mockMetricLogs: MetricLog[] = [
  { id: "ml-1", goal_id: "goal-1", date: daysAgo(30), value: 32, notes: "Baseline" },
  { id: "ml-2", goal_id: "goal-1", date: daysAgo(25), value: 31.5 },
  { id: "ml-3", goal_id: "goal-1", date: daysAgo(20), value: 30.8 },
  { id: "ml-4", goal_id: "goal-1", date: daysAgo(15), value: 30.2, notes: "Felt good" },
  { id: "ml-5", goal_id: "goal-1", date: daysAgo(10), value: 29.5 },
  { id: "ml-6", goal_id: "goal-1", date: daysAgo(7), value: 29.0 },
  { id: "ml-7", goal_id: "goal-1", date: daysAgo(3), value: 28.3, notes: "New PB!" },
  { id: "ml-8", goal_id: "goal-1", date: daysAgo(1), value: 27.8 },
];

export const mockResources: Resource[] = [
  { id: "res-1", goal_id: "goal-1", type: "video", title: "How to Train for Your First Marathon", url: "https://youtube.com/watch?v=example1", source: "YouTube", author: "Running Channel", summary: "Comprehensive guide to marathon training for beginners.", why_relevant: "Covers periodization and pacing strategies relevant to your goal.", paid: false, tags: ["marathon", "training", "beginner"] },
  { id: "res-2", goal_id: "goal-1", type: "book", title: "Daniels' Running Formula", url: "https://amazon.com/example", source: "Web", author: "Jack Daniels", summary: "The definitive guide to running training based on VDOT methodology.", why_relevant: "Scientific approach to improving 5K times through structured training.", paid: true, tags: ["training", "science", "VDOT"] },
  { id: "res-3", goal_id: "goal-1", type: "article", title: "5K Speed Work: The Complete Guide", url: "https://runnersworld.com/example", source: "Web", author: "Runner's World", summary: "Detailed breakdown of interval workouts for 5K improvement.", why_relevant: "Directly applicable speed work for your target time.", paid: false, tags: ["speed", "intervals", "5K"] },
  { id: "res-4", goal_id: "goal-1", type: "tool", title: "Strava — Running Tracker", url: "https://strava.com", source: "Web", summary: "GPS tracking app for runs with social features and analytics.", why_relevant: "Track your runs and monitor pace trends over time.", paid: false, tags: ["tracking", "GPS", "analytics"] },
];

export const mockRoleModels: RoleModel[] = [
  { name: "Eliud Kipchoge", why: "First human to run a marathon under 2 hours. Embodies discipline, consistency, and mental fortitude in distance running.", links: ["https://en.wikipedia.org/wiki/Eliud_Kipchoge"] },
  { name: "David Goggins", why: "Ultra-endurance athlete who transformed from overweight to elite through radical discipline and mental toughness.", links: ["https://davidgoggins.com"] },
];
