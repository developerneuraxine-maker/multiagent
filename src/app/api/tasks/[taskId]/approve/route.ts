import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerDepartmentWorkflow } from "@/lib/n8n";
import type { Task } from "@/types/database";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const { decision, reason } = (await request.json()) as {
    decision: "approve" | "decline";
    reason?: string;
  };

  if (decision !== "approve" && decision !== "decline") {
    return NextResponse.json({ error: "decision must be 'approve' or 'decline'" }, { status: 400 });
  }

  // Verify task belongs to user's business
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("*, businesses!inner(owner_id)")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const biz = task.businesses as { owner_id: string };
  if (biz.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (decision === "approve") {
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({ approved: true, status: "in_progress" })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase
      .from("approvals")
      .update({ status: "approved", resolved_at: new Date().toISOString() })
      .eq("task_id", taskId);

    await supabase.from("activity_feed").insert({
      business_id: task.business_id,
      action: `Task approved: ${task.title}`,
      details: { taskId, department: task.department },
    });

    // Trigger the department n8n workflow
    if (task.department === "marketing" || task.department === "sales") {
      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", task.business_id)
        .single();

      if (business) {
        triggerDepartmentWorkflow(task.department, updatedTask as Task, business).catch((err) => {
          console.error(`[n8n] Failed to trigger ${task.department} workflow:`, err);
        });

        await supabase.from("activity_feed").insert({
          business_id: task.business_id,
          action: `${task.department.charAt(0).toUpperCase() + task.department.slice(1)} Agent workflow triggered`,
          details: { taskId, department: task.department },
        });
      }
    }

    return NextResponse.json({ task: updatedTask, triggered: task.department });
  }

  // Decline
  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({ approved: false, status: "cancelled" })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase
    .from("approvals")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("task_id", taskId);

  await supabase.from("activity_feed").insert({
    business_id: task.business_id,
    action: `Task declined: ${task.title}`,
    details: { taskId, department: task.department, reason: reason || null },
  });

  return NextResponse.json({ task: updatedTask });
}
