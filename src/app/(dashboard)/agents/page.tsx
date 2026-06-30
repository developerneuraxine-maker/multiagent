"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, TrendingUp } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";

type WorkflowStatus = "Waiting Approval" | "Running" | "Completed" | "Idle";

function getWorkflowStatus(tasks: Task[]): WorkflowStatus {
  if (tasks.some((t) => t.requires_approval && t.approved === null && t.status !== "cancelled"))
    return "Waiting Approval";
  if (tasks.some((t) => t.status === "in_progress")) return "Running";
  if (tasks.some((t) => t.status === "completed")) return "Completed";
  return "Idle";
}

const statusVariant: Record<WorkflowStatus, "warning" | "success" | "secondary" | "outline"> = {
  "Waiting Approval": "warning",
  Running: "success",
  Completed: "secondary",
  Idle: "outline",
};

interface DeptAgentCardProps {
  name: string;
  icon: React.ElementType;
  tasks: Task[];
}

function DeptAgentCard({ name, icon: Icon, tasks }: DeptAgentCardProps) {
  const status = getWorkflowStatus(tasks);
  const recentTasks = tasks.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5" />
            {name}
          </CardTitle>
          <Badge variant={statusVariant[status]}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                  <Badge
                    variant={
                      t.requires_approval && t.approved === null && t.status !== "cancelled"
                        ? "warning"
                        : t.status === "completed"
                        ? "success"
                        : t.status === "in_progress"
                        ? "secondary"
                        : t.status === "cancelled"
                        ? "destructive"
                        : "outline"
                    }
                    className="shrink-0 text-xs"
                  >
                    {t.requires_approval && t.approved === null && t.status !== "cancelled"
                      ? "Pending Approval"
                      : t.status.replace("_", " ")}
                  </Badge>
                </div>
                {t.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelativeTime(t.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded border p-2">
            <p className="font-semibold text-warning">
              {tasks.filter((t) => t.requires_approval && t.approved === null && t.status !== "cancelled").length}
            </p>
            <p className="text-muted-foreground">Awaiting</p>
          </div>
          <div className="rounded border p-2">
            <p className="font-semibold text-blue-500">
              {tasks.filter((t) => t.status === "in_progress").length}
            </p>
            <p className="text-muted-foreground">Running</p>
          </div>
          <div className="rounded border p-2">
            <p className="font-semibold text-green-600">
              {tasks.filter((t) => t.status === "completed").length}
            </p>
            <p className="text-muted-foreground">Done</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentsPage() {
  const { business } = useBusiness();
  const [marketingTasks, setMarketingTasks] = useState<Task[]>([]);
  const [salesTasks, setSalesTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("business_id", business.id)
      .in("department", ["marketing", "sales"])
      .order("created_at", { ascending: false });

    const all = (data as Task[]) || [];
    setMarketingTasks(all.filter((t) => t.department === "marketing"));
    setSalesTasks(all.filter((t) => t.department === "sales"));
    setLoading(false);
  }, [business?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  if (loading) {
    return <p className="text-muted-foreground py-24 text-center">Loading agents...</p>;
  }

  return (
    <>
      <PageHeader
        title="Agent Dashboard"
        description="Monitor your AI workflows — approve tasks to start execution"
        actions={
          <button onClick={fetchTasks} className="text-sm text-primary hover:underline">
            Refresh
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DeptAgentCard
          name="Marketing Agent"
          icon={Megaphone}
          tasks={marketingTasks}
        />
        <DeptAgentCard
          name="Sales Agent"
          icon={TrendingUp}
          tasks={salesTasks}
        />
      </div>

      <div className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Tasks appear here once the CEO Agent assigns them after your Business Setup.
        Go to <strong>Tasks</strong> to approve or decline pending assignments.
      </div>
    </>
  );
}
