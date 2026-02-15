import type {
  Goal,
  Action,
  ActionInstance,
  Milestone,
  MetricLog,
  Resource,
  RoleModel,
  GoalCreatePayload,
  CheckinPayload,
} from "@/types/goal";
import { supabase } from "@/integrations/supabase/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const BASE = `${API_URL}/api/v1`;

async function getToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Goals ──────────────────────────────────────────

export async function getActiveGoal(): Promise<Goal | null> {
  return api<Goal | null>("/goals/active");
}

export async function createGoal(payload: GoalCreatePayload): Promise<Goal> {
  // Map frontend "domain" to description if present
  const { domain, ...rest } = payload;
  const body = {
    ...rest,
    description: domain || rest.description || null,
  };
  return api<Goal>("/goals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateGoal(
  id: string,
  payload: Partial<Goal>
): Promise<Goal> {
  return api<Goal>(`/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function archiveGoal(id: string): Promise<void> {
  await api(`/goals/${id}/archive`, { method: "POST" });
}

// ── Actions ────────────────────────────────────────

export async function getActions(goalId: string): Promise<Action[]> {
  return api<Action[]>(`/goals/${goalId}/actions`);
}

export async function updateAction(
  id: string,
  payload: Partial<Action>
): Promise<Action> {
  return api<Action>(`/actions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function reseedActions(
  goalId: string
): Promise<{ actions: Action[]; milestones: Milestone[] }> {
  return api<{ actions: Action[]; milestones: Milestone[] }>(
    `/goals/${goalId}/ai/generate-plan`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

// ── Daily ──────────────────────────────────────────

export async function getToday(
  goalId: string,
  date: string
): Promise<ActionInstance[]> {
  // Generate instances for the day first (idempotent), then fetch
  await api(`/goals/${goalId}/action-instances/generate-day`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
  const instances = await api<ActionInstance[]>(
    `/goals/${goalId}/action-instances?date=${date}`
  );
  // Map status to "completed" boolean for frontend compatibility
  return instances.map((inst) => ({
    ...inst,
    completed: inst.status === "done",
  }));
}

export async function submitCheckin(
  goalId: string,
  payload: CheckinPayload
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Get today's action instances so we can map action_id → instance_id
  const instances = await api<ActionInstance[]>(
    `/goals/${goalId}/action-instances?date=${today}`
  );
  const instanceByActionId = new Map(
    instances.map((inst) => [inst.action_id, inst])
  );

  // Update each action instance status
  for (const item of payload.instances) {
    const instance = instanceByActionId.get(item.action_id);
    if (instance) {
      const newStatus = item.completed ? "done" : "pending";
      if (instance.status !== newStatus) {
        await updateActionInstanceStatus(instance.id, newStatus);
      }
    }
  }

  // Log metric if provided
  if (payload.metric) {
    try {
      await upsertMetricLog(goalId, {
        date: today,
        value: payload.metric.value,
        notes: payload.metric.notes,
      });
    } catch {
      // Metric log might already exist for today — that's fine
    }
  }
}

export async function updateActionInstanceStatus(
  instanceId: string,
  status: "pending" | "done" | "skipped"
): Promise<ActionInstance> {
  return api<ActionInstance>(`/action-instances/${instanceId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// ── Metrics ────────────────────────────────────────

export async function getMetricLogs(goalId: string): Promise<MetricLog[]> {
  return api<MetricLog[]>(`/goals/${goalId}/metric-logs`);
}

export async function upsertMetricLog(
  goalId: string,
  payload: { date: string; value: number; notes?: string }
): Promise<MetricLog> {
  return api<MetricLog>(`/goals/${goalId}/metric-logs`, {
    method: "POST",
    body: JSON.stringify({
      date: payload.date,
      value: payload.value,
      note: payload.notes || null,
    }),
  });
}

// ── Milestones ─────────────────────────────────────

export async function getMilestones(goalId: string): Promise<Milestone[]> {
  const milestones = await api<Milestone[]>(`/goals/${goalId}/milestones`);
  // Map target_date to due_date for frontend compatibility
  return milestones.map((m) => ({ ...m, due_date: m.target_date }));
}

export async function updateMilestone(
  id: string,
  payload: Partial<Milestone>
): Promise<Milestone> {
  return api<Milestone>(`/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ── Resources ──────────────────────────────────────

export async function getResources(goalId: string): Promise<Resource[]> {
  const resources = await api<Resource[]>(`/goals/${goalId}/resources`);
  // Map is_paid to paid for frontend compatibility
  return resources.map((r) => ({ ...r, paid: r.is_paid }));
}

export async function curateResources(
  goalId: string
): Promise<{ resources: Resource[]; role_models: RoleModel[] }> {
  const result = await api<{ resources: Resource[]; ai_output_id: string | null }>(
    `/goals/${goalId}/ai/curate-resources`,
    { method: "POST", body: JSON.stringify({}) }
  );
  const resources = (result.resources || []).map((r) => ({ ...r, paid: r.is_paid }));
  // Extract role models (type: "person") from resources
  const role_models: RoleModel[] = resources
    .filter((r) => r.type === "person")
    .map((r) => ({
      name: r.title,
      why: r.why_relevant || "",
      links: r.url ? [r.url] : [],
    }));
  return { resources, role_models };
}

// ── AI Plan ────────────────────────────────────────

export async function generatePlan(
  goalId: string
): Promise<{ actions: Action[]; milestones: Milestone[] }> {
  return api<{ actions: Action[]; milestones: Milestone[] }>(
    `/goals/${goalId}/ai/generate-plan`,
    { method: "POST", body: JSON.stringify({}) }
  );
}
