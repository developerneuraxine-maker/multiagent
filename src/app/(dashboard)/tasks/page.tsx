"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList, approveTask, declineTask } from "@/components/tasks/task-list";
import { CreateTaskButton } from "@/components/tasks/create-task-modal";
import { AgentCommand } from "@/components/tasks/agent-command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

function useTasks(businessId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { tasks, loading, refetch: fetch_ };
}

export default function TasksPage() {
  const { business } = useBusiness();
  const { tasks, loading, refetch } = useTasks(business?.id);

  const pendingApproval = tasks.filter(
    (t) => t.requires_approval && t.approved === null && t.status !== "cancelled"
  );
  const pending = tasks.filter((t) => t.status === "pending" && !(t.requires_approval && t.approved === null));
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const completed = tasks.filter((t) => t.status === "completed");
  const failed = tasks.filter((t) => t.status === "failed");
  const declined = tasks.filter((t) => t.approved === false);

  async function handleApprove(taskId: string) {
    const ok = await approveTask(taskId);
    if (ok) refetch();
  }

  async function handleDecline(taskId: string) {
    const ok = await declineTask(taskId);
    if (ok) refetch();
  }

  if (loading) {
    return <p className="text-muted-foreground py-24 text-center">Loading tasks...</p>;
  }

  return (
    <>
      <PageHeader
        title="Task Dashboard"
        description={`${tasks.length} total tasks`}
        actions={
          <div className="flex items-center gap-3">
            {business?.id && (
              <CreateTaskButton businessId={business.id} onCreated={refetch} />
            )}
            <button onClick={refetch} className="text-sm text-primary hover:underline">
              Refresh
            </button>
          </div>
        }
      />

      {business?.id && (
        <AgentCommand businessId={business.id} onCreated={refetch} />
      )}

      <Tabs defaultValue={pendingApproval.length > 0 ? "approval" : "all"}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="approval" className="relative">
            Pending Approval
            {pendingApproval.length > 0 && (
              <Badge variant="warning" className="ml-2 px-1.5 py-0 text-xs">
                {pendingApproval.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
          <TabsTrigger value="in_progress">Running ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Complete ({completed.length})</TabsTrigger>
          {failed.length > 0 && (
            <TabsTrigger value="failed">
              Failed
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                {failed.length}
              </Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="declined">Declined ({declined.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="mt-6">
          <div className="mb-4 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              The CEO Agent has assigned tasks that require your approval before any workflow starts.
              Review each task and click Approve or Decline.
            </p>
          </div>
          <TaskList
            tasks={pendingApproval}
            emptyMessage="No tasks awaiting approval. Submit the Business Setup form to let the CEO Agent analyze your business."
            onApprove={handleApprove}
            onDecline={handleDecline}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <TaskList
            tasks={tasks}
            emptyMessage="No tasks yet. Complete Business Setup to generate tasks."
            onApprove={handleApprove}
            onDecline={handleDecline}
          />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <TaskList
            tasks={inProgress}
            emptyMessage="No tasks currently running"
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <TaskList
            tasks={completed}
            emptyMessage="No completed tasks yet"
          />
        </TabsContent>

        <TabsContent value="failed" className="mt-6">
          <TaskList
            tasks={failed}
            emptyMessage="No failed tasks"
          />
        </TabsContent>

        <TabsContent value="declined" className="mt-6">
          <TaskList
            tasks={declined}
            emptyMessage="No declined tasks"
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
