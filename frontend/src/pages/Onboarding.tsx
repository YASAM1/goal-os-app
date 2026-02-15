import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGoal, generatePlan } from "@/lib/api";
import type { GoalCreatePayload, Action, Milestone } from "@/types/goal";
import { ArrowLeft, ArrowRight, Check, Sparkles, Target } from "lucide-react";
import { StarField, NebulaGlows } from "@/components/StarField";

const STEPS = ["Goal", "Metric", "Baseline", "Target", "Confirm"];

function ConstellationIcon() {
  return (
    <svg viewBox="0 0 120 80" className="w-32 h-20 mx-auto mb-4 opacity-80" fill="none">
      <circle cx="60" cy="10" r="2" fill="hsl(270, 70%, 60%)" />
      <circle cx="40" cy="35" r="1.5" fill="hsl(270, 70%, 75%)" />
      <circle cx="80" cy="35" r="1.5" fill="hsl(270, 70%, 75%)" />
      <circle cx="60" cy="55" r="2.5" fill="hsl(270, 70%, 60%)" />
      <circle cx="20" cy="35" r="1" fill="hsl(240, 60%, 70%)" />
      <circle cx="100" cy="35" r="1" fill="hsl(240, 60%, 70%)" />
      <circle cx="60" cy="75" r="1" fill="hsl(300, 50%, 65%)" />
      <line x1="60" y1="10" x2="40" y2="35" stroke="hsl(270, 70%, 60%)" strokeWidth="0.5" opacity="0.5" />
      <line x1="60" y1="10" x2="80" y2="35" stroke="hsl(270, 70%, 60%)" strokeWidth="0.5" opacity="0.5" />
      <line x1="40" y1="35" x2="60" y2="55" stroke="hsl(270, 70%, 60%)" strokeWidth="0.5" opacity="0.5" />
      <line x1="80" y1="35" x2="60" y2="55" stroke="hsl(270, 70%, 60%)" strokeWidth="0.5" opacity="0.5" />
      <line x1="20" y1="35" x2="40" y2="35" stroke="hsl(240, 60%, 70%)" strokeWidth="0.3" opacity="0.3" strokeDasharray="2 2" />
      <line x1="80" y1="35" x2="100" y2="35" stroke="hsl(240, 60%, 70%)" strokeWidth="0.3" opacity="0.3" strokeDasharray="2 2" />
      <circle cx="60" cy="55" r="8" fill="hsl(270, 70%, 60%)" opacity="0.08" />
      <circle cx="60" cy="10" r="6" fill="hsl(270, 70%, 60%)" opacity="0.06" />
    </svg>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState<{ actions: Action[]; milestones: Milestone[] } | null>(null);

  const [form, setForm] = useState<GoalCreatePayload>({
    title: "",
    domain: "",
    metric_name: "",
    metric_unit: "",
    direction: "increase",
    baseline_value: 0,
    baseline_date: new Date().toISOString().split("T")[0],
    target_value: 0,
    target_date: null,
  });

  const update = (field: keyof GoalCreatePayload, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    if (step === 0) return form.title.length > 0 && form.domain.length > 0;
    if (step === 1) return form.metric_name.length > 0 && form.metric_unit.length > 0;
    if (step === 2) return form.baseline_value > 0;
    if (step === 3) return form.target_value > 0;
    return true;
  };

  const handleCreate = async () => {
    setLoading(true);
    await createGoal(form);
    setLoading(false);
    setShowPlan(true);
  };

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    const result = await generatePlan("goal-1");
    setPlan(result);
    setPlanLoading(false);
  };

  const handleAcceptPlan = () => {
    navigate("/dashboard");
  };

  if (showPlan) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <StarField />
        <NebulaGlows />
        <div className="relative z-10 w-full max-w-lg p-4 animate-fade-in">
          {!plan ? (
            <div className="text-center space-y-8">
              <ConstellationIcon />
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">Generate Your Plan?</h2>
                <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto leading-relaxed">AI will chart your course — creating daily actions and milestones tailored to your goal.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="border-border/50">Skip</Button>
                <Button onClick={handleGeneratePlan} disabled={planLoading} className="px-6">
                  {planLoading ? (<><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />Charting...</>) : (<><Sparkles className="h-4 w-4 mr-2" />Generate Plan</>)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="backdrop-blur-md bg-card/60 border border-border/30 rounded-xl p-6 space-y-6">
              <h2 className="font-display text-xl font-bold text-foreground">Your AI Plan</h2>
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-[0.15em]">Daily Actions</h3>
                <div className="space-y-2">
                  {plan.actions.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border/20 px-3 py-2.5">
                      <span className="metric-value text-xs text-muted-foreground w-5">{i + 1}</span>
                      <span className="text-sm text-foreground flex-1">{a.title}</span>
                      {a.estimated_minutes && <span className="text-xs text-muted-foreground metric-value">{a.estimated_minutes}m</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-[0.15em]">Milestones</h3>
                <div className="space-y-2">
                  {plan.milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border/20 px-3 py-2.5">
                      <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm text-foreground flex-1">{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleGeneratePlan} disabled={planLoading} className="border-border/50">Regenerate</Button>
                <Button className="flex-1" onClick={handleAcceptPlan}><Check className="h-4 w-4 mr-2" /> Accept Plan</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <StarField />
      <NebulaGlows />
      <div className="relative z-10 w-full max-w-md p-4 animate-fade-in">
        {step === 0 && (
          <div className="text-center mb-10">
            <ConstellationIcon />
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight mb-2">Goal OS</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">— Chart Your Course —</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`transition-all duration-500 rounded-full ${i === step ? "h-2 w-6 bg-primary shadow-[0_0_10px_hsl(270_70%_60%/0.4)]" : i < step ? "h-2 w-2 bg-primary/60" : "h-2 w-2 bg-border/60"}`} />
            </div>
          ))}
        </div>

        <div className="backdrop-blur-md bg-card/60 border border-border/30 rounded-xl p-6 shadow-[0_0_40px_hsl(270_70%_60%/0.03)]">
          <h2 className="font-display text-xl font-bold text-foreground mb-1 tracking-tight">
            {step === 0 && "What's your goal?"}
            {step === 1 && "How will you measure it?"}
            {step === 2 && "Where are you starting?"}
            {step === 3 && "Where do you want to be?"}
            {step === 4 && "Review your goal"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {step === 0 && "Define the single goal you'll pursue."}
            {step === 1 && "Pick the metric that proves progress."}
            {step === 2 && "Log your starting measurement."}
            {step === 3 && "Set the number you're aiming for."}
            {step === 4 && "Confirm everything looks right before launch."}
          </p>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Goal Title</Label>
                <Input placeholder="e.g., Run a sub-4 hour marathon" value={form.title} onChange={(e) => update("title", e.target.value)} className="bg-secondary/50 border-border/40 focus:border-primary/50 placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Domain</Label>
                <Input placeholder="e.g., Fitness, Career, Finance" value={form.domain} onChange={(e) => update("domain", e.target.value)} className="bg-secondary/50 border-border/40 focus:border-primary/50 placeholder:text-muted-foreground/50" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Metric Name</Label>
                <Input placeholder="e.g., 5K Time, Revenue, Weight" value={form.metric_name} onChange={(e) => update("metric_name", e.target.value)} className="bg-secondary/50 border-border/40 focus:border-primary/50 placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unit</Label>
                <Input placeholder="e.g., minutes, $, kg" value={form.metric_unit} onChange={(e) => update("metric_unit", e.target.value)} className="bg-secondary/50 border-border/40 focus:border-primary/50 placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Direction</Label>
                <Select value={form.direction} onValueChange={(v) => update("direction", v)}>
                  <SelectTrigger className="bg-secondary/50 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase ↑</SelectItem>
                    <SelectItem value="decrease">Decrease ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Baseline Value</Label>
                <Input type="number" placeholder="e.g., 32" value={form.baseline_value || ""} onChange={(e) => update("baseline_value", parseFloat(e.target.value) || 0)} className="bg-secondary/50 border-border/40 focus:border-primary/50 metric-value text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Baseline Date</Label>
                <Input type="date" value={form.baseline_date} onChange={(e) => update("baseline_date", e.target.value)} className="bg-secondary/50 border-border/40 focus:border-primary/50" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Value</Label>
                <Input type="number" placeholder="e.g., 24" value={form.target_value || ""} onChange={(e) => update("target_value", parseFloat(e.target.value) || 0)} className="bg-secondary/50 border-border/40 focus:border-primary/50 metric-value text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Date (optional)</Label>
                <Input type="date" value={form.target_date ?? ""} onChange={(e) => update("target_date", e.target.value || null)} className="bg-secondary/50 border-border/40 focus:border-primary/50" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-1">
              {[
                ["Title", form.title],
                ["Domain", form.domain],
                ["Metric", `${form.metric_name} (${form.metric_unit})`],
                ["Direction", form.direction === "increase" ? "↑ Increase" : "↓ Decrease"],
                ["Baseline", `${form.baseline_value} ${form.metric_unit}`],
                ["Target", `${form.target_value} ${form.metric_unit}`],
                ...(form.target_date ? [["Target Date", form.target_date]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-border/20 last:border-0">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} size="sm" className="px-5">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={loading} size="sm" className="px-5">
                {loading ? "Launching..." : "Launch Goal"} {!loading && <Sparkles className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mt-6">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>
    </div>
  );
}
