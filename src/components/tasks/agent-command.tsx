"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENTS = [
  { value: "marketing", label: "Marketing", emoji: "📢", color: "bg-pink-50 border-pink-300 text-pink-700 dark:bg-pink-950/30 dark:border-pink-700 dark:text-pink-300" },
  { value: "sales", label: "Sales", emoji: "💼", color: "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-300" },
  { value: "developer", label: "Developer", emoji: "💻", color: "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950/30 dark:border-purple-700 dark:text-purple-300" },
  { value: "support", label: "Support", emoji: "🎧", color: "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-300" },
  { value: "finance", label: "Finance", emoji: "💰", color: "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/30 dark:border-green-700 dark:text-green-300" },
  { value: "operations", label: "Operations", emoji: "⚙️", color: "bg-slate-50 border-slate-300 text-slate-700 dark:bg-slate-950/30 dark:border-slate-700 dark:text-slate-300" },
];

interface AgentCommandProps {
  businessId: string;
  onCreated: () => void;
}

export function AgentCommand({ businessId, onCreated }: AgentCommandProps) {
  const [agent, setAgent] = useState("marketing");
  const [message, setMessage] = useState("");
  const [autoRun, setAutoRun] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const selected = AGENTS.find((a) => a.value === agent)!;

  async function handleSend() {
    if (!message.trim()) { toast.error("Type a task first"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          title: message.trim(),
          description: message.trim(),
          department: agent,
          priority: "medium",
          autoRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        autoRun
          ? `Sent to ${selected.label} Agent — running now!`
          : `Task sent to ${selected.label} Agent for approval`
      );
      setMessage("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm mb-6">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 rounded-xl transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Send className="h-4 w-4" />
          Send a task to any agent — type your instruction here
        </span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Agent selector */}
          <div className="flex flex-wrap gap-2">
            {AGENTS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAgent(a.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  agent === a.value ? a.color + " border-2 scale-105" : "border-border hover:bg-accent text-muted-foreground"
                )}
              >
                <span>{a.emoji}</span>
                {a.label}
              </button>
            ))}
          </div>

          {/* Message input */}
          <div className="relative">
            <Textarea
              rows={2}
              placeholder={`Tell ${selected.label} Agent what to do… (Ctrl+Enter to send)`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-16 resize-none text-sm"
              autoFocus
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60">
              {message.length}/500
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                onClick={() => setAutoRun(!autoRun)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  autoRun ? "bg-amber-500" : "bg-muted"
                )}
              >
                <span className={cn(
                  "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow",
                  autoRun ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className={cn("h-3 w-3", autoRun ? "text-amber-500" : "")} />
                {autoRun ? "Auto-run (skips approval)" : "Needs approval first"}
              </span>
            </label>

            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : `Send to ${selected.label}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
