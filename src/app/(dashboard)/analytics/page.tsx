"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BarChart3, TrendingUp, TrendingDown, Send, RefreshCw } from "lucide-react";
import type { Task, AgentType } from "@/types/database";

const DEPARTMENTS: AgentType[] = ["marketing", "sales", "developer", "support", "finance", "operations"];

const deptColors: Record<string, string> = {
  marketing: "text-pink-600",
  sales: "text-blue-600",
  developer: "text-purple-600",
  support: "text-orange-600",
  finance: "text-green-600",
  operations: "text-slate-600",
};

interface DeptStats {
  dept: AgentType;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  declined: number;
  rate: number;
}

export default function AnalyticsPage() {
  const { business } = useBusiness();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    const { data } = await createClient()
      .from("tasks")
      .select("*")
      .eq("business_id", business.id);
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [business?.id]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const deptStats: DeptStats[] = DEPARTMENTS.map((dept) => {
    const dt = tasks.filter((t) => t.department === dept);
    const completed = dt.filter((t) => t.status === "completed").length;
    const inProgress = dt.filter((t) => t.status === "in_progress").length;
    const pending = dt.filter((t) => t.status === "pending").length;
    const declined = dt.filter((t) => t.approved === false).length;
    return {
      dept,
      total: dt.length,
      completed,
      inProgress,
      pending,
      declined,
      rate: dt.length > 0 ? Math.round((completed / dt.length) * 100) : 0,
    };
  });

  const overall = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.requires_approval && t.approved === null).length,
  };

  async function sendToCEO(stats: DeptStats) {
    if (!business?.id) return;
    setSending(stats.dept);
    try {
      const summary = `${stats.dept.toUpperCase()} AGENT ANALYSIS:
- Total tasks: ${stats.total}
- Completed: ${stats.completed} (${stats.rate}% completion rate)
- In Progress: ${stats.inProgress}
- Pending: ${stats.pending}
- Declined: ${stats.declined}
${stats.rate < 50 ? "⚠️ Low completion rate — needs attention." : "✅ Performing well."}`;

      const res = await fetch("/api/ceo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          prompt: `Analyze this performance data and give me specific action items to improve:\n\n${summary}`,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${stats.dept} analysis sent to CEO Agent!`);
    } catch {
      toast.error("Failed to send to CEO Agent");
    } finally {
      setSending(null);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground py-24 text-center">Loading analytics...</p>;
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Agent performance overview and business health metrics"
        actions={
          <Button variant="outline" size="sm" onClick={loadTasks} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Total Tasks", value: overall.total, icon: BarChart3 },
          { label: "Completed", value: overall.completed, icon: TrendingUp, color: "text-green-600" },
          { label: "In Progress", value: overall.inProgress, icon: TrendingUp, color: "text-blue-600" },
          { label: "Pending Approval", value: overall.pending, icon: TrendingDown, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color || ""}`}>{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color || "text-muted-foreground"}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-Department Analytics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {deptStats.map((s) => (
          <Card key={s.dept}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-base capitalize ${deptColors[s.dept]}`}>
                  {s.dept} Agent
                </CardTitle>
                <Badge
                  variant={s.rate >= 70 ? "success" : s.rate >= 40 ? "warning" : "destructive"}
                >
                  {s.rate}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Completion Rate</span>
                  <span>{s.completed}/{s.total}</span>
                </div>
                <Progress value={s.rate} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-semibold text-green-600">{s.completed}</p>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-muted-foreground">In Progress</p>
                  <p className="font-semibold text-blue-600">{s.inProgress}</p>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-semibold text-amber-600">{s.pending}</p>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-muted-foreground">Declined</p>
                  <p className="font-semibold text-red-600">{s.declined}</p>
                </div>
              </div>

              {s.rate < 50 && s.total > 0 && (
                <div className="rounded border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 py-2">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Low completion rate — consider reviewing this agent's tasks
                  </p>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => sendToCEO(s)}
                disabled={sending === s.dept || s.total === 0}
              >
                <Send className="h-3.5 w-3.5" />
                {sending === s.dept ? "Sending..." : "Send to CEO Agent"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
