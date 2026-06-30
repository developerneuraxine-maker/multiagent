import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const status = searchParams.get("status");

  if (!businessId) {
    return NextResponse.json({ error: "businessId required" }, { status: 400 });
  }

  let query = supabase.from("tasks").select("*").eq("business_id", businessId);

  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, title, description, department, priority, autoRun } = await request.json();
  if (!businessId || !title || !department) {
    return NextResponse.json({ error: "businessId, title, and department required" }, { status: 400 });
  }

  // Verify ownership
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      business_id: businessId,
      title,
      description: description || title,
      department,
      status: autoRun ? "in_progress" : "pending",
      priority: priority || "medium",
      requires_approval: !autoRun,
      approved: autoRun ? true : null,
      output: {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_feed").insert({
    business_id: businessId,
    action: `Custom task created for ${department} agent: "${title}"`,
    details: { event: "custom_task_created", department, auto_run: autoRun },
  });

  // Auto-trigger n8n workflow if requested and it's a supported department
  if (autoRun && (department === "marketing" || department === "sales")) {
    try {
      const { triggerDepartmentWorkflow } = await import("@/lib/n8n");
      triggerDepartmentWorkflow(department, task, business).catch((err: unknown) =>
        console.error(`[custom task] Trigger failed:`, err)
      );
    } catch {}
  }

  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, status, approved } = await request.json();

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (approved !== undefined) {
    updates.approved = approved;
    if (approved) updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (approved !== undefined) {
    await supabase
      .from("approvals")
      .update({
        status: approved ? "approved" : "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("task_id", taskId);
  }

  return NextResponse.json({ task: data });
}
