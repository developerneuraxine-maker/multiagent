"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { Brain, Play, Lightbulb, Calendar, Clock, Sparkles } from "lucide-react";
import type { Suggestion } from "@/types/database";

export default function CEOAgentPage() {
  const { business } = useBusiness();
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    createClient()
      .from("suggestions")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setSuggestions((data as Suggestion[]) || []));
  }, [business?.id]);

  async function handleRun() {
    if (!business) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/ceo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data.message || "CEO Agent triggered successfully. Tasks will appear shortly.");
      toast.success("CEO Agent is analyzing your business!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run CEO Agent");
    } finally {
      setRunning(false);
    }
  }

  async function handleSuggest() {
    if (!business) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/ceo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.suggestion) {
        setSuggestions((prev) => [data.suggestion, ...prev]);
        toast.success("New suggestion generated!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate suggestion");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleScheduleMeeting() {
    if (!meetingTitle || !meetingDate || !meetingTime) {
      toast.error("Please fill in meeting title, date, and time");
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business?.id,
          title: meetingTitle,
          date: meetingDate,
          time: meetingTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Meeting scheduled!");
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingTime("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule meeting");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <>
      <PageHeader
        title="CEO Agent"
        description="Your AI Chief Executive Officer — analyze, strategize, and run on demand"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Run CEO Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Run CEO Analysis
              </CardTitle>
              <CardDescription>
                Trigger a full business analysis now. Leave the prompt blank to run standard analysis,
                or type a specific question/focus area.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Custom Prompt (optional)</Label>
                <Textarea
                  id="prompt"
                  rows={3}
                  placeholder="e.g. Focus on improving our sales conversion rate this month..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleRun} disabled={running || !business} className="gap-2">
                  <Play className="h-4 w-4" />
                  {running ? "Running Analysis..." : "Run Now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setPrompt(""); handleRun(); }}
                  disabled={running || !business}
                >
                  Quick Run (Standard)
                </Button>
              </div>
              {result && (
                <div className="rounded-lg border border-green-400/30 bg-green-50 dark:bg-green-950/20 p-4">
                  <p className="text-sm text-green-700 dark:text-green-400">{result}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Suggestion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                CEO Suggestions
              </CardTitle>
              <CardDescription>
                Get a fresh AI-powered business suggestion anytime
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={handleSuggest}
                disabled={suggesting || !business}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {suggesting ? "Generating..." : "Get New Suggestion"}
              </Button>

              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div
                      key={s.id}
                      className={`rounded-lg border p-4 ${i === 0 ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/20" : ""}`}
                    >
                      {i === 0 && (
                        <Badge variant="warning" className="mb-2 text-xs">Latest</Badge>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{s.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatRelativeTime(s.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No suggestions yet. Click "Get New Suggestion" to start.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Schedule Meeting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Schedule Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="meetingTitle">Meeting Title</Label>
                <Input
                  id="meetingTitle"
                  placeholder="Strategy review"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meetingDate">Date</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meetingTime">Time</Label>
                <Input
                  id="meetingTime"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
              <Button
                onClick={handleScheduleMeeting}
                disabled={scheduling}
                className="w-full gap-2"
                size="sm"
              >
                <Clock className="h-4 w-4" />
                {scheduling ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </CardContent>
          </Card>

          {/* Business Quick Stats */}
          {business && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{business.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry</span>
                  <span>{business.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Health Score</span>
                  <Badge variant="success">{business.health_score}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Growth Score</span>
                  <Badge variant="secondary">{business.growth_score}%</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
