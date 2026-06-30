"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { TrendingUp, Search, RefreshCw, Zap } from "lucide-react";
import type { ResearchResult } from "@/types/database";

const categoryColors: Record<string, string> = {
  trend: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  competitor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  opportunity: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  risk: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  news: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

export default function ResearchPage() {
  const { business } = useBusiness();
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    loadResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function loadResults() {
    if (!business?.id) return;
    setLoading(true);
    const { data } = await createClient()
      .from("research_results")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setResults((data as ResearchResult[]) || []);
    setLoading(false);
  }

  async function runResearch() {
    if (!business?.id) return;
    setResearching(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Research complete! New trends and insights added.");
      await loadResults();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  }

  const grouped = results.reduce<Record<string, ResearchResult[]>>((acc, r) => {
    const cat = r.category || "news";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Research Agent"
        description={`Market trends, opportunities, and insights for ${business?.industry || "your industry"}`}
        actions={
          <Button onClick={runResearch} disabled={researching || !business} className="gap-2">
            <Search className="h-4 w-4" />
            {researching ? "Researching..." : "Run Research"}
          </Button>
        }
      />

      {loading ? (
        <p className="text-muted-foreground py-24 text-center">Loading research...</p>
      ) : results.length === 0 ? (
        <div className="py-24 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No research data yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Run Research to get AI-powered market trends and insights for {business?.industry}
          </p>
          <Button onClick={runResearch} disabled={researching} className="gap-2">
            <Zap className="h-4 w-4" />
            Run First Research
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {category.charAt(0).toUpperCase() + category.slice(1)}s
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium leading-snug">{r.title}</CardTitle>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[r.category || "news"] || "bg-muted text-muted-foreground"}`}>
                          {r.category || "news"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>
                      <div className="mt-3 flex items-center justify-between">
                        {r.source && (
                          <span className="text-xs text-muted-foreground">Source: {r.source}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <RefreshCw className="h-3 w-3" />
                          {formatRelativeTime(r.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
