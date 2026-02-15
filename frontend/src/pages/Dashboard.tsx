import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getActiveGoal, getActions, getMetricLogs, getToday, upsertMetricLog } from "@/lib/api";
import { MetricChart } from "@/components/MetricChart";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BarChart3, CheckSquare, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: goal, isLoading: goalLoading } = useQuery({
    queryKey: ["activeGoal"],
    queryFn: getActiveGoal,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["metricLogs", goal?.id],
    queryFn: () => getMetricLogs(goal!.id),
    enabled: !!goal,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["actions", goal?.id],
    queryFn: () => getActions(goal!.id),
    enabled: !!goal,
  });

  const { data: todayActions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ["todayActions", goal?.id, today],
    queryFn: () => getToday(goal!.id, today),
    enabled: !!goal,
  });

  const [metricValue, setMetricValue] = useState("");
  const metricMutation = useMutation({
    mutationFn: (value: number) => upsertMetricLog(goal!.id, { date: today, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metricLogs"] });
      setMetricValue("");
    },
  });

  if (goalLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!goal) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title="No active goal"
        description="Set your first goal to start tracking your progress."
        actionLabel="Create Goal"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  const completedCount = todayActions.filter((a) => a.completed).length;
  const latestMetric = logs.length > 0 ? logs[logs.length - 1] : null;
  const DirectionIcon = goal.direction === "increase" ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Goal Summary Card */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-lg font-bold text-foreground">{goal.title}</h2>
              {goal.description && <Badge variant="outline" className="border-primary/40 text-primary text-xs">{goal.description}</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <DirectionIcon className="h-3.5 w-3.5 text-primary" />
                {goal.metric_name}
              </span>
              <span className="metric-value">
                {goal.baseline_value} → {goal.target_value} {goal.metric_unit}
              </span>
              {goal.target_date && (
                <span>by {new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {latestMetric && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="metric-value text-2xl font-semibold text-primary">
                  {latestMetric.value}
                  <span className="text-sm text-muted-foreground ml-1">{goal.metric_unit}</span>
                </p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
              + New Goal
            </Button>
          </div>
        </div>
      </div>

      {/* Chart + Quick Metric */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Progress
          </h3>
          {logs.length > 0 ? (
            <MetricChart
              logs={logs}
              targetValue={goal.target_value}
              metricUnit={goal.metric_unit}
              baselineValue={goal.baseline_value}
              baselineDate={goal.baseline_date}
            />
          ) : (
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" />}
              title="No data yet"
              description="Log your first metric to see your progress."
              actionLabel="Log first metric"
              onAction={() => document.getElementById("metric-input")?.focus()}
            />
          )}
        </div>

        <div className="glass-card p-5 flex flex-col">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Quick Log</h3>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs text-muted-foreground mb-2">
              Today's {goal.metric_name} ({goal.metric_unit})
            </p>
            <div className="flex gap-2">
              <Input
                id="metric-input"
                type="number"
                placeholder="Value"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                className="bg-secondary border-border metric-value"
              />
              <Button
                size="sm"
                disabled={!metricValue || metricMutation.isPending}
                onClick={() => metricMutation.mutate(parseFloat(metricValue))}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Actions */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Today's Actions
            <span className="text-xs text-muted-foreground font-normal ml-1">
              {completedCount}/{todayActions.length}
            </span>
          </h3>
          <Button variant="ghost" size="sm" onClick={() => navigate("/check-in")} className="text-primary">
            Check-in <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {actionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : todayActions.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No plan yet"
            description="Generate an AI plan to get daily actions."
            actionLabel="Generate Plan"
            onAction={() => navigate("/goal")}
          />
        ) : (
          <div className="space-y-1">
            {todayActions.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-secondary/50 transition-colors"
              >
                <Checkbox checked={inst.completed} disabled className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <span className={`text-sm flex-1 ${inst.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {actions.find((a) => a.id === inst.action_id)?.title ?? "Action"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
