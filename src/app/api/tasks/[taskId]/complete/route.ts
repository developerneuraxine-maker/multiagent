import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

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

  if (task.status !== "in_progress") {
    return NextResponse.json({ error: "Task is not in progress" }, { status: 400 });
  }

  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("activity_feed").insert({
    business_id: task.business_id,
    action: `Task completed: ${task.title}`,
    details: { taskId, department: task.department },
  });

  return NextResponse.json({ task: updatedTask });
}
