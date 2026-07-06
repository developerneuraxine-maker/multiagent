"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Clock, Ban } from "lucide-react";
import type { Task } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

const priorityVariant: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  urgent: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

function StatusIndicator({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Running</span>
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-medium text-green-600 dark:text-green-400">Complete</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <XCircle className="h-3.5 w-3.5 text-red-600" />
        <span className="text-xs font-medium text-red-600 dark:text-red-400">Failed</span>
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Ban className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Cancelled</span>
      </span>
    );
  }
  if (status === "review") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">In Review</span>
      </span>
    );
  }
  // pending
  return (
    <span className="inline-flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">Pending</span>
    </span>
  );
}

interface TaskItemProps {
  task: Task;
  showDepartment?: boolean;
  onApprove?: (taskId: string) => Promise<void>;
  onDecline?: (taskId: string) => Promise<void>;
}

export function TaskItem({ task, showDepartment = true, onApprove, onDecline }: TaskItemProps) {
  const [acting, setActing] = useState<"approve" | "decline" | null>(null);
  const needsApproval = task.requires_approval && task.approved === null && task.status !== "cancelled";

  async function handleApprove() {
    if (!onApprove) return;
    setActing("approve");
    await onApprove(task.id);
    setActing(null);
  }

  async function handleDecline() {
    if (!onDecline) return;
    setActing("decline");
    await onDecline(task.id);
    setActing(null);
  }

  const isFailed = task.status === "failed";
  const isCompleted = task.status === "completed";

  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors ${
      isFailed ? "border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/10" :
      isCompleted ? "border-green-200 bg-green-50/40 dark:border-green-900 dark:bg-green-950/10" :
      ""
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{task.title}</p>
          {needsApproval ? (
            <Badge variant="warning">Pending Approval</Badge>
          ) : (
            <StatusIndicator status={task.status} />
          )}
          <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
          {showDepartment && task.department && (
            <Badge variant="outline">{task.department}</Badge>
          )}
        </div>
        {task.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Created {formatRelativeTime(task.created_at)}</span>
          {task.estimated_hours != null && (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ~{task.estimated_hours < 1
                ? `${Math.round(task.estimated_hours * 60)} min`
                : task.estimated_hours < 24
                  ? `${task.estimated_hours} hr${task.estimated_hours > 1 ? "s" : ""}`
                  : `~${Math.round(task.estimated_hours / 24)} day${Math.round(task.estimated_hours / 24) > 1 ? "s" : ""}`}
            </span>
          )}
        </div>
      </div>

      {needsApproval && onApprove && onDecline && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={handleApprove} disabled={acting !== null}>
            {acting === "approve" ? "Approving..." : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDecline}
            disabled={acting !== null}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {acting === "decline" ? "Declining..." : "Decline"}
          </Button>
        </div>
      )}
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  title?: string;
  emptyMessage?: string;
  onApprove?: (taskId: string) => Promise<void>;
  onDecline?: (taskId: string) => Promise<void>;
}

export function TaskList({ tasks, title, emptyMessage = "No tasks found", onApprove, onDecline }: TaskListProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : "p-6"}>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onApprove={onApprove}
                onDecline={onDecline}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export async function approveTask(taskId: string): Promise<boolean> {
  const res = await fetch(`/api/tasks/${taskId}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    toast.error(err.error || "Failed to approve task");
    return false;
  }
  toast.success("Task approved — workflow triggered!");
  return true;
}

export async function declineTask(taskId: string, reason?: string): Promise<boolean> {
  const res = await fetch(`/api/tasks/${taskId}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "decline", reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    toast.error(err.error || "Failed to decline task");
    return false;
  }
  toast.success("Task declined.");
  return true;
}
