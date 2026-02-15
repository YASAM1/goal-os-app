import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getActiveGoal, getToday, getActions, submitCheckin, upsertMetricLog } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export default function CheckIn() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const { data: goal } = useQuery({ queryKey: ["activeGoal"], queryFn: getActiveGoal });
  const { data: actions = [] } = useQuery({
    queryKey: ["actions", goal?.id],
    queryFn: () => getActions(goal!.id),
    enabled: !!goal,
  });
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["todayActions", goal?.id, today],
    queryFn: () => getToday(goal!.id, today),
    enabled: !!goal,
  });

  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [metricValue, setMetricValue] = useState("");
  const [metricNotes, setMetricNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!goal) return;
      const payload = {
        instances: instances.map((inst) => ({
          action_id: inst.action_id,
          completed: completed[inst.action_id] ?? inst.completed,
          notes: notes[inst.action_id],
        })),
        ...(metricValue ? { metric: { value: parseFloat(metricValue), notes: metricNotes || undefined } } : {}),
      };
      await submitCheckin(goal.id, payload);
      if (metricValue) {
        await upsertMetricLog(goal.id, { date: today, value: parseFloat(metricValue), notes: metricNotes || undefined });
      }
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="glass-card p-8 text-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Check-in Complete</h2>
          <p className="text-sm text-muted-foreground mb-6">Great work today. Keep the momentum going.</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const getActionTitle = (actionId: string) => {
    return actions.find((a) => a.id === actionId)?.title ?? actionId;
  };

  const toggleComplete = (actionId: string, current: boolean) => {
    setCompleted((c) => ({ ...c, [actionId]: !current }));
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Daily Check-in</p>
        <h1 className="font-display text-2xl font-bold text-foreground">{todayFormatted}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Actions */}
          <div className="glass-card p-4 space-y-1">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Actions</h3>
            {instances.map((inst) => {
              const isCompleted = completed[inst.action_id] ?? inst.completed;
              const isExpanded = expandedNote === inst.action_id;
              return (
                <div key={inst.id}>
                  <div className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-secondary/50 transition-colors">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleComplete(inst.action_id, isCompleted)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className={`text-sm flex-1 ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {getActionTitle(inst.action_id)}
                    </span>
                    <button
                      onClick={() => setExpandedNote(isExpanded ? null : inst.action_id)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="pl-9 pr-2 pb-2">
                      <Textarea
                        placeholder="Add a note..."
                        value={notes[inst.action_id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [inst.action_id]: e.target.value }))}
                        className="bg-secondary border-border text-sm min-h-[60px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Metric */}
          {goal && (
            <div className="glass-card p-4">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                {goal.metric_name} ({goal.metric_unit})
              </h3>
              <Input
                type="number"
                placeholder={`Today's ${goal.metric_name}`}
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                className="bg-secondary border-border metric-value mb-2"
              />
              <Textarea
                placeholder="Notes (optional)"
                value={metricNotes}
                onChange={(e) => setMetricNotes(e.target.value)}
                className="bg-secondary border-border text-sm min-h-[50px]"
              />
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Check-in"}
          </Button>
        </div>
      )}
    </div>
  );
}
