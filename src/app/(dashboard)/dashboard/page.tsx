"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  Megaphone,
  TrendingUp,
  Bot,
  Activity,
  DollarSign,
  Lightbulb,
  Brain,
  Crown,
  Users,
  Settings2,
  Code2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TaskList, approveTask, declineTask } from "@/components/tasks/task-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBusiness } from "@/hooks/use-business";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatRelativeTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Suggestion } from "@/types/database";

export default function DashboardPage() {
  const router = useRouter();
  const { business, loading: bizLoading } = useBusiness();
  const { stats, activity, reports, agents, pendingTasks, loading, refetch } = useDashboard(business?.id);
  const [latestSuggestion, setLatestSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!bizLoading && business && !business.setup_completed) {
      router.push("/setup");
    }
  }, [business, bizLoading, router]);

  useEffect(() => {
    if (!business?.id) return;
    createClient()
      .from("suggestions")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setLatestSuggestion((data as Suggestion[])?.[0] ?? null));
  }, [business?.id]);

  async function handleApprove(taskId: string) {
    const ok = await approveTask(taskId);
    if (ok) refetch();
  }

  async function handleDecline(taskId: string) {
    const ok = await declineTask(taskId);
    if (ok) refetch();
  }

  if (bizLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${business ? ` — ${business.name}` : ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/ceo" className="gap-2 flex items-center">
                <Brain className="h-4 w-4" />
                Run CEO Agent
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* CEO Suggestion Banner */}
      {latestSuggestion && (
        <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">CEO Suggestion</span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(latestSuggestion.created_at)}</span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200 line-clamp-2">{latestSuggestion.content}</p>
          </div>
          <a href="/suggestions" className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0">
            See all →
          </a>
        </div>
      )}

      {/* Primary stat row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Approvals" value={stats?.pending_approvals ?? 0} icon={Clock} description="Tasks awaiting your review" />
        <StatCard title="Approved Tasks" value={stats?.approved_tasks ?? 0} icon={CheckCircle2} description="Tasks you have approved" />
        <StatCard title="Running Tasks" value={stats?.running_tasks ?? 0} icon={PlayCircle} description="Workflows currently executing" />
        <StatCard title="Completed Tasks" value={stats?.completed_tasks ?? 0} icon={CheckCircle2} description="Successfully finished tasks" />
      </div>

      {/* Secondary stat row */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Marketing Tasks" value={stats?.marketing_tasks ?? 0} icon={Megaphone} description="Marketing agent tasks" />
        <StatCard title="Sales Tasks" value={stats?.sales_tasks ?? 0} icon={TrendingUp} description="Sales agent tasks" />
        <StatCard title="Growth Score" value={`${stats?.growth_score?.toFixed(0) ?? 0}%`} icon={TrendingUp} description="Business growth potential" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {(stats?.pending_approvals ?? 0) > 0 && (
            <Card className="border-amber-400 dark:border-amber-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                  Requires Your Approval ({stats?.pending_approvals})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TaskList tasks={pendingTasks} emptyMessage="No pending approvals" onApprove={handleApprove} onDecline={handleDecline} />
              </CardContent>
            </Card>
          )}

          <ActivityFeed items={activity} agents={agents} />
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/ceo", label: "Run CEO Agent", icon: Brain },
                { href: "/suggestions", label: "View Suggestions", icon: Lightbulb },
                { href: "/analytics", label: "View Analytics", icon: TrendingUp },
                { href: "/research", label: "Run Research", icon: Activity },
                { href: "/knowledge-base", label: "Knowledge Base", icon: Bot },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </a>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5" />
                Agent Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Task completion</span>
                <span className="font-medium">{stats?.task_completion_pct?.toFixed(0) ?? 0}%</span>
              </div>
              <Progress value={stats?.task_completion_pct ?? 0} />
              <div className="mt-4 space-y-2">
                {[
                  { name: "CEO Agent",        dept: "ceo",        icon: Crown,      count: stats?.ceo_tasks ?? 0 },
                  { name: "Marketing Agent",  dept: "marketing",  icon: Megaphone,  count: stats?.marketing_tasks ?? 0 },
                  { name: "Sales Agent",      dept: "sales",      icon: TrendingUp, count: stats?.sales_tasks ?? 0 },
                  { name: "HR Agent",         dept: "hr",         icon: Users,      count: stats?.hr_tasks ?? 0 },
                  { name: "Finance Agent",    dept: "finance",    icon: DollarSign, count: stats?.finance_tasks ?? 0 },
                  { name: "Operations Agent", dept: "operations", icon: Settings2,  count: stats?.operations_tasks ?? 0 },
                  { name: "Developer Agent",  dept: "developer",  icon: Code2,      count: stats?.developer_tasks ?? 0 },
                ].map((agent) => (
                  <div key={agent.dept} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <agent.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{agent.name}</span>
                    </div>
                    <Badge variant={agent.count > 0 ? "secondary" : "outline"}>
                      {agent.count} {agent.count === 1 ? "task" : "tasks"}
                    </Badge>
                  </div>
                ))}
              </div>
              <a href="/agents" className="mt-4 block text-center text-xs text-primary hover:underline">
                View all agents →
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Recent Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No reports yet</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{report.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{report.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(report.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
