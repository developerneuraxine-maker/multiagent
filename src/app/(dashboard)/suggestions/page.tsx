"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { Lightbulb, Sparkles, RefreshCw } from "lucide-react";
import type { Suggestion } from "@/types/database";

export default function SuggestionsPage() {
  const { business } = useBusiness();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    loadSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function loadSuggestions() {
    if (!business?.id) return;
    setLoading(true);
    const { data } = await createClient()
      .from("suggestions")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setSuggestions((data as Suggestion[]) || []);
    setLoading(false);
  }

  async function generateNew() {
    if (!business?.id) return;
    setGenerating(true);
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
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="CEO Suggestions"
        description="Daily AI-powered business insights and action items"
        actions={
          <Button onClick={generateNew} disabled={generating || !business} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "Get New Suggestion"}
          </Button>
        }
      />

      {loading ? (
        <p className="text-muted-foreground py-24 text-center">Loading suggestions...</p>
      ) : suggestions.length === 0 ? (
        <div className="py-24 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No suggestions yet</p>
          <Button onClick={generateNew} disabled={generating} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate First Suggestion
          </Button>
        </div>
      ) : (
        <div className="max-w-3xl space-y-4">
          {suggestions.map((s, i) => (
            <Card key={s.id} className={i === 0 ? "border-amber-400/50" : ""}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i === 0 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
                    <Lightbulb className={`h-4 w-4 ${i === 0 ? "text-amber-600" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {i === 0 && <Badge variant="warning">Latest</Badge>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {formatRelativeTime(s.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{s.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
