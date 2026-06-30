import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { BusinessSetupInput } from "@/types/database";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business: data });
}

// Runs in background after the HTTP response is sent.
// Parses the Master Workflow response and saves department tasks to DB.
async function saveTasksFromWorkflow(
  businessId: string,
  result: { success: boolean; data?: unknown }
) {
  try {
    if (!result.success || !result.data) return;

    // n8n returns an array by default — unwrap it
    const rawData = result.data;
    const first = Array.isArray(rawData) ? rawData[0] : rawData;
    const raw = (first ?? {}) as Record<string, unknown>;

    // Some workflows wrap data in a .data key, others don't
    const payload = (raw.data ?? raw) as Record<string, unknown>;

    console.log("[n8n] Master Workflow raw response:", JSON.stringify(rawData).slice(0, 500));
    console.log("[n8n] Parsed payload keys:", Object.keys(payload));

    const ceo = payload.ceo as Record<string, unknown> | undefined;
    const scores = payload.scores as Record<string, number> | undefined;
    const departmentTasks = ceo?.departmentTasks as Record<string, string[]> | undefined;

    console.log("[n8n] ceo keys:", ceo ? Object.keys(ceo) : "undefined");
    console.log("[n8n] departmentTasks:", JSON.stringify(departmentTasks).slice(0, 300));

    const db = await createServiceClient();

    // Update health/growth scores
    if (scores) {
      await db.from("businesses").update({
        health_score: scores.businessHealthScore ?? 0,
        growth_score: scores.growthScore ?? 0,
      }).eq("id", businessId);
    }

    if (!departmentTasks) {
      console.warn("[n8n] departmentTasks not found in response — tasks not saved. Check logs above for actual structure.");
      return;
    }

    // Delete existing pending-approval tasks so re-analysis gives fresh tasks
    await db.from("tasks")
      .delete()
      .eq("business_id", businessId)
      .eq("requires_approval", true)
      .is("approved", null);

    const departments = ["marketing", "sales", "developer", "support", "finance", "operations"] as const;
    const rows = [];

    for (const dept of departments) {
      const tasks = departmentTasks[dept];
      if (!Array.isArray(tasks)) continue;
      for (const title of tasks) {
        if (!title) continue;
        rows.push({
          business_id: businessId,
          title: String(title),
          description: String(title),
          department: dept,
          status: "pending",
          priority: "medium",
          requires_approval: true,
          approved: null,
          output: {},
        });
      }
    }

    if (rows.length > 0) {
      await db.from("tasks").insert(rows);
      await db.from("activity_feed").insert({
        business_id: businessId,
        action: `CEO Agent assigned ${rows.length} tasks across departments — awaiting your approval`,
        details: { event: "ceo_tasks_assigned", count: rows.length },
      });
      console.log(`[n8n] Saved ${rows.length} tasks for business ${businessId}`);
    }
  } catch (err) {
    console.error("[n8n] Failed to save tasks from workflow response:", err);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BusinessSetupInput;

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("businesses")
      .update({
        ...body,
        setup_completed: true,
        health_score: 65,
        growth_score: 55,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      const { triggerMasterWorkflow } = await import("@/lib/n8n");
      triggerMasterWorkflow(data).then((result) => saveTasksFromWorkflow(data.id, result)).catch((err) => {
        console.error("[n8n] Background trigger failed:", err);
      });
    } catch (err) {
      console.error("[n8n] Failed to import n8n lib:", err);
    }

    return NextResponse.json({ business: data });
  }

  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      ...body,
      setup_completed: true,
      health_score: 65,
      growth_score: 55,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_feed").insert({
    business_id: data.id,
    action: "Business onboarded — AI Business OS is analyzing your business",
    details: { event: "business_created" },
  });

  try {
    const { triggerMasterWorkflow } = await import("@/lib/n8n");
    triggerMasterWorkflow(data).then((result) => saveTasksFromWorkflow(data.id, result)).catch((err) => {
      console.error("[n8n] Background master workflow trigger failed:", err);
    });
  } catch (err) {
    console.error("[n8n] Failed to import n8n lib:", err);
  }

  return NextResponse.json({ business: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const { triggerMasterWorkflow } = await import("@/lib/n8n");
    triggerMasterWorkflow(data).then((result) => saveTasksFromWorkflow(data.id, result)).catch((err) => {
      console.error("[n8n] Background master workflow trigger failed on update:", err);
    });
  } catch (err) {
    console.error("[n8n] Failed to import n8n lib:", err);
  }

  return NextResponse.json({ business: data });
}
