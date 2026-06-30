import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { AgentType } from "@/types/database";

interface CEOTask {
  department: AgentType;
  task_name: string;
  task_description: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { businessId, workflow, payload } = body as {
    businessId: string;
    workflow: string;
    payload: Record<string, unknown>;
  };

  if (!businessId || !workflow) {
    return NextResponse.json({ error: "businessId and workflow required" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // CEO task assignment: store tasks as pending approval
  if (workflow === "ceo_task_assignment" && Array.isArray(payload.tasks)) {
    const tasks = payload.tasks as CEOTask[];
    const insertedTasks: string[] = [];

    for (const t of tasks) {
      const { data: insertedTask, error } = await supabase
        .from("tasks")
        .insert({
          business_id: businessId,
          title: t.task_name,
          description: t.task_description,
          department: t.department,
          status: "pending",
          priority: t.priority || "medium",
          requires_approval: true,
          approved: null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[webhook] Failed to insert task:", error.message);
        continue;
      }

      if (insertedTask) {
        insertedTasks.push(insertedTask.id);

        await supabase.from("approvals").insert({
          business_id: businessId,
          task_id: insertedTask.id,
          title: `Approve: ${t.task_name}`,
          description: t.task_description,
          status: "pending",
        });
      }
    }

    await supabase.from("activity_feed").insert({
      business_id: businessId,
      action: `CEO Agent assigned ${insertedTasks.length} task(s) — awaiting your approval`,
      details: { workflow, task_count: insertedTasks.length, task_ids: insertedTasks },
    });

    return NextResponse.json({
      success: true,
      received: { businessId, workflow, tasks_created: insertedTasks.length },
    });
  }

  // Generic workflow completion: log to activity feed + optionally store a report
  await supabase.from("activity_feed").insert({
    business_id: businessId,
    action: `n8n workflow completed: ${workflow}`,
    details: payload,
  });

  // If the payload contains a report, store it
  if (payload.report && typeof payload.report === "object") {
    const report = payload.report as Record<string, unknown>;
    const department = (payload.department as string) || "department";
    await supabase.from("reports").insert({
      business_id: businessId,
      type: department === "marketing" || department === "sales" ? "department" : "department",
      title: (report.title as string) || `${department} Report`,
      content: report,
      summary: (report.summary as string) || null,
    });
  }

  // Update task status to completed if taskId provided
  if (payload.taskId && typeof payload.taskId === "string") {
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", payload.taskId);
  }

  return NextResponse.json({ success: true, received: { businessId, workflow } });
}
