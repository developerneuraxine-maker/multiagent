import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/agents";
import type { AgentType, Business } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId, agentType, taskId } = (await request.json()) as {
    businessId: string;
    agentType: AgentType;
    taskId?: string;
  };

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("business_id", businessId)
    .eq("type", agentType)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let taskDescription: string | undefined;
  if (taskId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    taskDescription = task?.description || task?.title;
  }

  await supabase
    .from("agents")
    .update({ status: "working", last_activity_at: new Date().toISOString() })
    .eq("id", agent.id);

  await supabase.from("activity_feed").insert({
    business_id: businessId,
    agent_id: agent.id,
    action: `${agent.name} started working`,
    details: { agentType, taskId },
  });

  try {
    let ceoTasks;
    if (agentType === "hr") {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("business_id", businessId)
        .eq("department", "hr")
        .in("status", ["pending", "in_progress"]);
      ceoTasks = tasks || [];
    }

    const result = await runAgent(agentType, business as Business, {
      taskDescription,
      ceoTasks,
    });

    if (result.isN8N) {
      return NextResponse.json({ success: true, result });
    }

    const { data: task } = await supabase
      .from("tasks")
      .insert({
        business_id: businessId,
        agent_id: agent.id,
        title: `${agent.name} Output`,
        description: result.summary,
        department: agentType,
        status: agentType === "ceo" ? "review" : "completed",
        priority: "medium",
        output: result.output,
        requires_approval: agentType !== "ceo",
        completed_at: agentType !== "ceo" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (agentType === "ceo" && result.tasks?.length) {
      const taskInserts = result.tasks.map((t) => ({
        business_id: businessId,
        parent_task_id: task?.id,
        title: t.title,
        description: t.description,
        department: t.department as AgentType,
        status: "pending" as const,
        priority: t.priority as "low" | "medium" | "high" | "urgent",
      }));

      await supabase.from("tasks").insert(taskInserts);

      if (result.output.opportunities) {
        const opps = (result.output.opportunities as string[]).map((title) => ({
          business_id: businessId,
          title,
          description: `Identified by CEO Agent`,
          potential_value: Math.floor(Math.random() * 50000) + 5000,
          source_agent: "ceo" as AgentType,
        }));
        if (opps.length) await supabase.from("revenue_opportunities").insert(opps);
      }
    }

    await supabase.from("reports").insert({
      business_id: businessId,
      agent_id: agent.id,
      type: agentType === "ceo" ? "executive" : "department",
      title: `${agent.name} Report`,
      content: result.output,
      summary: result.summary,
    });

    if (task && agentType !== "ceo") {
      await supabase
        .from("approvals")
        .insert({
          business_id: businessId,
          task_id: task.id,
          agent_id: agent.id,
          title: `Review: ${task.title}`,
          description: result.summary,
          status: "pending",
        });
    }

    await supabase
      .from("agents")
      .update({
        status: "idle",
        performance_score: Math.min(100, agent.performance_score + 2),
        current_task_id: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    await supabase.from("activity_feed").insert({
      business_id: businessId,
      agent_id: agent.id,
      action: `${agent.name} completed task`,
      details: { summary: result.summary },
    });

    await supabase
      .from("businesses")
      .update({
        health_score: Math.min(100, (business.health_score || 0) + 3),
        growth_score: Math.min(100, (business.growth_score || 0) + 2),
      })
      .eq("id", businessId);

    return NextResponse.json({ success: true, result, task });
  } catch (err) {
    await supabase
      .from("agents")
      .update({ status: "idle" })
      .eq("id", agent.id);

    const message = err instanceof Error ? err.message : "Agent execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
