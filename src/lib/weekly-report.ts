import { createServiceClient } from "@/lib/supabase/server";
import { sendWeeklyReportEmail } from "@/lib/email";
import type { Business, WeeklyReportContent } from "@/types/database";

// Builds and stores a weekly report for one business, covering the trailing 7 days.
// Emails it to the connected Gmail address if available. Safe to call on demand
// (manual "Generate Now") or from the weekly cron job.
export async function generateWeeklyReport(business: Business): Promise<{
  report: WeeklyReportContent;
  email_sent: boolean;
}> {
  const db = await createServiceClient();

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodStartISO = periodStart.toISOString();
  const periodEndISO = periodEnd.toISOString();

  const [
    { data: prevReport },
    { data: completedTasks },
    { data: pendingApprovalTasks },
    { data: suggestions },
    { data: kbFiles },
    { data: meetingActivity },
    { data: integrations },
  ] = await Promise.all([
    db.from("reports").select("content").eq("business_id", business.id).eq("type", "weekly")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("tasks").select("department").eq("business_id", business.id).eq("status", "completed")
      .gte("completed_at", periodStartISO).lte("completed_at", periodEndISO),
    db.from("tasks").select("id").eq("business_id", business.id).eq("requires_approval", true).is("approved", null),
    db.from("suggestions").select("content").eq("business_id", business.id)
      .gte("created_at", periodStartISO).order("created_at", { ascending: false }).limit(3),
    db.from("knowledge_base").select("id").eq("business_id", business.id)
      .gte("created_at", periodStartISO),
    db.from("activity_feed").select("id").eq("business_id", business.id)
      .eq("details->>event", "meeting_scheduled").gte("created_at", periodStartISO),
    db.from("integrations").select("provider").eq("business_id", business.id).eq("status", "connected"),
  ]);

  const tasksByDept: Record<string, number> = {};
  for (const t of completedTasks ?? []) {
    const dept = t.department ?? "general";
    tasksByDept[dept] = (tasksByDept[dept] ?? 0) + 1;
  }

  const prevContent = prevReport?.content as WeeklyReportContent | undefined;
  const healthChange = prevContent ? business.health_score - prevContent.health_score : 0;
  const growthChange = prevContent ? business.growth_score - prevContent.growth_score : 0;

  const content: WeeklyReportContent = {
    period_start: periodStartISO,
    period_end: periodEndISO,
    health_score: business.health_score,
    health_score_change: healthChange,
    growth_score: business.growth_score,
    growth_score_change: growthChange,
    tasks_completed: completedTasks?.length ?? 0,
    tasks_by_department: tasksByDept,
    tasks_pending_approval: pendingApprovalTasks?.length ?? 0,
    top_suggestions: (suggestions ?? []).map((s) => s.content as string),
    knowledge_base_files_added: kbFiles?.length ?? 0,
    meetings_scheduled: meetingActivity?.length ?? 0,
    connected_integrations: (integrations ?? []).map((i) => i.provider as string),
    email_sent: false,
  };

  // Try to email the report if Gmail is connected
  let emailSent = false;
  const gmailIntegration = (integrations ?? []).length
    ? await db.from("integrations").select("metadata").eq("business_id", business.id)
        .eq("provider", "gmail").eq("status", "connected").maybeSingle()
    : { data: null };

  const meta = gmailIntegration.data?.metadata as Record<string, string> | undefined;
  if (meta?.gmail_user && meta?.gmail_app_password) {
    try {
      await sendWeeklyReportEmail({
        gmailUser: meta.gmail_user,
        appPassword: meta.gmail_app_password,
        to: meta.gmail_user,
        businessName: business.name,
        report: content,
      });
      emailSent = true;
    } catch (err) {
      console.error(`[weekly-report] Email send failed for business ${business.id}:`, err);
    }
  }
  content.email_sent = emailSent;

  await db.from("reports").insert({
    business_id: business.id,
    type: "weekly",
    title: `Weekly Report — ${new Date(periodStartISO).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to ${new Date(periodEndISO).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
    content,
    summary: `${content.tasks_completed} tasks completed · Health ${Math.round(content.health_score)}% · Growth ${Math.round(content.growth_score)}%${emailSent ? " · Emailed" : ""}`,
  });

  await db.from("activity_feed").insert({
    business_id: business.id,
    action: emailSent ? "Weekly report generated and emailed" : "Weekly report generated",
    details: { event: "weekly_report_generated", email_sent: emailSent },
  });

  return { report: content, email_sent: emailSent };
}
