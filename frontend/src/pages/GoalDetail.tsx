import { useQuery } from "@tanstack/react-query";
import { getActiveGoal, getActions, getMilestones, getMetricLogs, generatePlan } from "@/lib/api";
import { MetricChart } from "@/components/MetricChart";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Target, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { useState } from "react";

export default function GoalDetail() {
  const [regenerating, setRegenerating] = useState(false);

  const { data: goal, isLoading: goalLoading } = useQuery({ queryKey: ["activeGoal"], queryFn: getActiveGoal });
  const { data: actions = [] } = useQuery({
    queryKey: ["actions", goal?.id],
    queryFn: () => getActions(goal!.id),
    enabled: !!goal,
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", goal?.id],
    queryFn: () => getMilestones(goal!.id),
    enabled: !!goal,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["metricLogs", goal?.id],
    queryFn: () => getMetricLogs(goal!.id),
    enabled: !!goal,
  });

  if (goalLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }

  if (!goal) {
    return <EmptyState icon={<Target className="h-6 w-6" />} title="No active goal" description="Create a goal first." />;
  }

  const DirectionIcon = goal.direction === "increase" ? TrendingUp : TrendingDown;

  const handleRegenerate = async () => {
    setRegenerating(true);
    await generatePlan(goal.id);
    setRegenerating(false);
  };

  return (
    <div className="max-w-4xl animate-fade-in space-y-6">
      {/* Goal Summary */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground mb-1">{goal.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {goal.description && <Badge variant="outline" className="border-primary/40 text-primary text-xs">{goal.description}</Badge>}
              <span className="flex items-center gap-1">
                <DirectionIcon className="h-3.5 w-3.5 text-primary" />
                {goal.metric_name} ({goal.metric_unit})
              </span>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-0">{goal.is_active ? "active" : "archived"}</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Baseline", value: `${goal.baseline_value} ${goal.metric_unit}` },
            { label: "Target", value: `${goal.target_value} ${goal.metric_unit}` },
            { label: "Started", value: new Date(goal.baseline_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
            { label: "Deadline", value: goal.target_date ? new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—" },
          ].map((item) => (
            <div key={item.label} className="bg-secondary/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="metric-value text-sm font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plan">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="plan" className="data-[state=active]:bg-background">Plan</TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-background">Progress</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">History</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-6 mt-4">
          {/* Actions */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-semibold text-foreground">Daily Actions</h3>
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {regenerating ? "Regenerating..." : "Regenerate Plan"}
              </Button>
            </div>
            <div className="space-y-1">
              {actions.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                  <span className="metric-value text-xs text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm text-foreground flex-1">{a.title}</span>
                  {a.estimated_minutes && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {a.estimated_minutes}m
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">P{a.priority}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="glass-card p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Milestones</h3>
            <div className="space-y-1">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                  <Checkbox
                    checked={m.status === "done"}
                    disabled
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1">
                    <span className={`text-sm ${m.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {m.title}
                    </span>
                    {m.due_date && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(m.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  <Badge variant={m.status === "done" ? "default" : "outline"} className="text-xs">
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6 mt-4">
          <div className="glass-card p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Metric Progress</h3>
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
                icon={<Target className="h-5 w-5" />}
                title="No metric logs"
                description="Log your first metric from the dashboard."
              />
            )}
          </div>

          {logs.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Log History</h3>
              <div className="space-y-1">
                {[...logs].reverse().map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm">
                    <span className="text-muted-foreground w-24">
                      {new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="metric-value text-foreground font-medium">
                      {l.value} {goal.metric_unit}
                    </span>
                    {l.notes && <span className="text-muted-foreground text-xs">— {l.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="glass-card p-8">
            <EmptyState
              icon={<Clock className="h-5 w-5" />}
              title="AI History"
              description="Past AI-generated plans and outputs will appear here in a future update."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
