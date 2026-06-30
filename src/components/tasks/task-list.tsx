"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

const priorityVariant: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  urgent: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

const statusVariant: Record<string, "success" | "warning" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  in_progress: "warning",
  review: "secondary",
  completed: "success",
  cancelled: "destructive",
};

interface TaskItemProps {
  task: Task;
  showDepartment?: boolean;
  onApprove?: (taskId: string) => Promise<void>;
  onDecline?: (taskId: string) => Promise<void>;
  onComplete?: (taskId: string) => Promise<void>;
}

export function TaskItem({ task, showDepartment = true, onApprove, onDecline, onComplete }: TaskItemProps) {
  const [acting, setActing] = useState<"approve" | "decline" | "complete" | null>(null);
  const needsApproval = task.requires_approval && task.approved === null && task.status !== "cancelled";
  const canComplete = task.status === "in_progress" && task.approved === true;

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

  async function handleComplete() {
    if (!onComplete) return;
    setActing("complete");
    await onComplete(task.id);
    setActing(null);
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{task.title}</p>
          {needsApproval ? (
            <Badge variant="warning">Pending Approval</Badge>
          ) : (
            <Badge variant={statusVariant[task.status]}>{task.status.replace("_", " ")}</Badge>
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

      <div className="flex shrink-0 gap-2">
        {needsApproval && onApprove && onDecline && (
          <>
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
          </>
        )}
        {canComplete && onComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleComplete}
            disabled={acting !== null}
            className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
          >
            {acting === "complete" ? "Marking..." : "Mark Complete"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  title?: string;
  emptyMessage?: string;
  onApprove?: (taskId: string) => Promise<void>;
  onDecline?: (taskId: string) => Promise<void>;
  onComplete?: (taskId: string) => Promise<void>;
}

export function TaskList({ tasks, title, emptyMessage = "No tasks found", onApprove, onDecline, onComplete }: TaskListProps) {
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
                onComplete={onComplete}
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

export async function completeTask(taskId: string): Promise<boolean> {
  const res = await fetch(`/api/tasks/${taskId}/complete`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    toast.error(err.error || "Failed to mark task complete");
    return false;
  }
  toast.success("Task marked as completed!");
  return true;
}
