"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/hooks/use-business";
import type { Report, WeeklyReportContent } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export default function ReportsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const businessId = business?.id;
  const [reports, setReports] = useState<Report[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);

  async function fetchReports() {
    if (!businessId) return;
    setFetchLoading(true);
    const res = await fetch(`/api/reports?businessId=${businessId}`);
    const data = await res.json();
    setReports(data.reports || []);
    if (data.reports?.length) {
      setSelected((prev) => (prev ? data.reports.find((r: Report) => r.id === prev.id) || data.reports[0] : data.reports[0]));
    }
    setFetchLoading(false);
  }

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function handleGenerateWeekly() {
    if (!businessId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      toast.success(data.email_sent ? "Weekly report generated and emailed" : "Weekly report generated");
      await fetchReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate weekly report");
    } finally {
      setGenerating(false);
    }
  }

  const marketing = reports.filter(
    (r) => r.type === "department" && (r.content?.department === "marketing" || r.title?.toLowerCase().includes("marketing"))
  );
  const sales = reports.filter(
    (r) => r.type === "department" && (r.content?.department === "sales" || r.title?.toLowerCase().includes("sales"))
  );
  const weekly = reports.filter((r) => r.type === "weekly");
  const executive = reports.filter((r) => r.type === "executive");
  const loading = bizLoading || (!!businessId && fetchLoading);

  if (loading) {
    return <p className="text-muted-foreground py-24 text-center">Loading reports...</p>;
  }

  return (
    <>
      <PageHeader
        title="Reports Dashboard"
        description="Reports from your AI agents — marketing, sales, executive, and weekly summaries"
        actions={
          <Button variant="outline" onClick={handleGenerateWeekly} disabled={generating || !businessId}>
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate Weekly Report"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Tabs defaultValue="all">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">All ({reports.length})</TabsTrigger>
              <TabsTrigger value="weekly" className="flex-1">Weekly ({weekly.length})</TabsTrigger>
              <TabsTrigger value="marketing" className="flex-1">Marketing ({marketing.length})</TabsTrigger>
              <TabsTrigger value="sales" className="flex-1">Sales ({sales.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-4">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Reports will appear here once workflows complete
                </p>
              ) : (
                reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    selected={selected?.id === report.id}
                    onClick={() => setSelected(report)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-2 mt-4">
              {weekly.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No weekly reports yet — click &quot;Generate Weekly Report&quot; above
                </p>
              ) : (
                weekly.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    selected={selected?.id === report.id}
                    onClick={() => setSelected(report)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="marketing" className="space-y-2 mt-4">
              {marketing.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No marketing reports yet
                </p>
              ) : (
                marketing.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    selected={selected?.id === report.id}
                    onClick={() => setSelected(report)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="sales" className="space-y-2 mt-4">
              {sales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sales reports yet
                </p>
              ) : (
                sales.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    selected={selected?.id === report.id}
                    onClick={() => setSelected(report)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selected.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatRelativeTime(selected.created_at)}
                    </p>
                  </div>
                  <Badge>{selected.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {selected.type === "weekly" ? (
                  <WeeklyReportView content={selected.content as unknown as WeeklyReportContent} />
                ) : (
                  <>
                    {selected.summary && (
                      <div className="mb-6 rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium mb-1">Summary</p>
                        <p className="text-sm">{selected.summary}</p>
                      </div>
                    )}
                    <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap">
                      {JSON.stringify(selected.content, null, 2)}
                    </pre>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a report to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ScoreDelta({ change }: { change: number }) {
  if (change > 0) return <span className="text-green-600">▲ +{change.toFixed(1)}</span>;
  if (change < 0) return <span className="text-red-600">▼ {change.toFixed(1)}</span>;
  return <span className="text-muted-foreground">— 0.0</span>;
}

function WeeklyReportView({ content }: { content: WeeklyReportContent }) {
  const deptEntries = Object.entries(content.tasks_by_department || {});

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">HEALTH SCORE</p>
          <p className="text-2xl font-bold mt-1">
            {Math.round(content.health_score)}% <ScoreDelta change={content.health_score_change} />
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">GROWTH SCORE</p>
          <p className="text-2xl font-bold mt-1">
            {Math.round(content.growth_score)}% <ScoreDelta change={content.growth_score_change} />
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Tasks Completed — {content.tasks_completed}</p>
        {deptEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks completed this period</p>
        ) : (
          <div className="space-y-1.5">
            {deptEntries.map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{dept}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">{content.tasks_pending_approval} task(s) awaiting approval</p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Top AI Suggestions</p>
        {content.top_suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new suggestions this period</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {content.top_suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Other Activity</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>{content.knowledge_base_files_added} knowledge base file(s) added</li>
          <li>{content.meetings_scheduled} meeting(s) scheduled</li>
          <li>{content.connected_integrations.length} integration(s) connected: {content.connected_integrations.join(", ") || "none"}</li>
        </ul>
      </div>

      <Badge variant={content.email_sent ? "success" : "outline"}>
        {content.email_sent ? "Emailed to your Gmail" : "Not emailed (connect Gmail to receive these by email)"}
      </Badge>
    </div>
  );
}

function ReportCard({
  report,
  selected,
  onClick,
}: {
  report: Report;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
    >
      <p className="text-sm font-medium line-clamp-1">{report.title}</p>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.summary}</p>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{report.type}</Badge>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(report.created_at)}</span>
      </div>
    </button>
  );
}
