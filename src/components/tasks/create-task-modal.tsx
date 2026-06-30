"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DEPARTMENTS = [
  { value: "marketing", label: "Marketing Agent", color: "text-pink-600 border-pink-200 bg-pink-50 dark:bg-pink-950/20" },
  { value: "sales", label: "Sales Agent", color: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20" },
  { value: "developer", label: "Developer Agent", color: "text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-950/20" },
  { value: "support", label: "Support Agent", color: "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20" },
  { value: "finance", label: "Finance Agent", color: "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20" },
  { value: "operations", label: "Operations Agent", color: "text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-950/20" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

interface CreateTaskModalProps {
  businessId: string;
  onCreated: () => void;
}

export function CreateTaskButton({ businessId, onCreated }: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("marketing");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [autoRun, setAutoRun] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) { toast.error("Task title is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, title: title.trim(), description: description.trim(), department, priority, autoRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      toast.success(autoRun
        ? `Task sent to ${department} agent — running now!`
        : `Task created and sent for approval!`
      );
      setOpen(false);
      setTitle("");
      setDescription("");
      setDepartment("marketing");
      setPriority("medium");
      setAutoRun(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Assign Custom Task
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Assign Custom Task
                </CardTitle>
                <CardDescription>
                  Type any task and assign it to a specific AI agent
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  placeholder="e.g. Write 5 Instagram posts for this week"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="taskDesc">Description (optional)</Label>
                <Textarea
                  id="taskDesc"
                  rows={2}
                  placeholder="Add more details about what the agent should do..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Department Selection */}
              <div className="space-y-2">
                <Label>Assign to Agent *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENTS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDepartment(d.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all",
                        department === d.value
                          ? d.color + " border-2"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-all",
                        priority === p
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Run Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Auto-Run Now
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Skip approval and trigger the agent immediately
                    {(department === "marketing" || department === "sales")
                      ? " (triggers n8n workflow)"
                      : " (saves as in-progress)"}
                  </p>
                </div>
                <button
                  onClick={() => setAutoRun(!autoRun)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    autoRun ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    autoRun ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleCreate}
                  disabled={saving || !title.trim()}
                  className="flex-1 gap-2"
                >
                  {saving ? "Creating..." : autoRun ? "Run Task Now" : "Create & Send for Approval"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
