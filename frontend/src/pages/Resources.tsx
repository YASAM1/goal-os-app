import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveGoal, getResources, curateResources } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Search, Sparkles, User } from "lucide-react";
import type { Resource, RoleModel } from "@/types/goal";

const TYPE_COLORS: Record<string, string> = {
  video: "border-chart-4 text-chart-4",
  book: "border-chart-2 text-chart-2",
  article: "border-primary text-primary",
  course: "border-chart-3 text-chart-3",
  tool: "border-muted-foreground text-muted-foreground",
  person: "border-chart-1 text-chart-1",
};

export default function Resources() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [curating, setCurating] = useState(false);

  const { data: goal } = useQuery({ queryKey: ["activeGoal"], queryFn: getActiveGoal });
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources", goal?.id],
    queryFn: () => getResources(goal!.id),
    enabled: !!goal,
  });

  // Role models are resources of type "person" — filter from the resources list
  const roleModels = resources
    .filter((r) => r.type === "person")
    .map((r) => ({
      name: r.title,
      why: r.why_relevant || "",
      links: r.url ? [r.url] : [],
    }));

  const filtered = filter ? resources.filter((r) => r.type === filter) : resources;
  const types = [...new Set(resources.map((r) => r.type))];

  const handleCurate = async () => {
    if (!goal) return;
    setCurating(true);
    try {
      await curateResources(goal.id);
      queryClient.invalidateQueries({ queryKey: ["resources", goal.id] });
    } finally {
      setCurating(false);
    }
  };

  return (
    <div className="max-w-4xl animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Resources</h1>
          <p className="text-sm text-muted-foreground">Curated learning materials and role models</p>
        </div>
        <Button onClick={handleCurate} disabled={curating || !goal} size="sm">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {curating ? "Finding..." : "Find Resources"}
        </Button>
      </div>

      {/* Role Models */}
      <section>
        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Role Models
        </h2>
        {roleModels.length === 0 ? (
          <EmptyState icon={<User className="h-5 w-5" />} title="No role models yet" description="AI will curate role models when you click Find Resources." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleModels.map((rm) => (
              <div key={rm.name} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-sm">{rm.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rm.why}</p>
                    <div className="flex gap-2 mt-2">
                      {rm.links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Link
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resources */}
      <section>
        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Resources
        </h2>

        {/* Type filter chips */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              !filter ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t === filter ? null : t)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors capitalize ${
                t === filter ? `bg-primary/10 ${TYPE_COLORS[t] ?? "border-border text-foreground"}` : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No resources" description="Click Find Resources to get AI-curated content." />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {r.title} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <Badge variant="outline" className={`text-xs capitalize ${TYPE_COLORS[r.type] ?? ""}`}>
                          {r.type}
                        </Badge>
                        {r.paid !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {r.paid ? "Paid" : "Free"}
                          </Badge>
                        )}
                      </div>
                      {r.author && <p className="text-xs text-muted-foreground">by {r.author} · {r.source}</p>}
                      {r.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
                      {r.tags && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {r.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.why_relevant && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                          >
                            Why relevant {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {isExpanded && (
                            <p className="text-xs text-muted-foreground mt-1 pl-2 border-l border-primary/30">
                              {r.why_relevant}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
