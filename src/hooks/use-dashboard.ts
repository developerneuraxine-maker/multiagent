"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Task,
  Report,
  ActivityFeedItem,
  Approval,
  RevenueOpportunity,
  Agent,
  AgentType,
} from "@/types/database";

export interface ExtendedDashboardStats {
  health_score: number;
  growth_score: number;
  task_completion_pct: number;
  revenue_opportunities: RevenueOpportunity[];
  pending_approvals: number;
  approved_tasks: number;
  running_tasks: number;
  completed_tasks: number;
  marketing_tasks: number;
  sales_tasks: number;
  hr_tasks: number;
  finance_tasks: number;
  operations_tasks: number;
  developer_tasks: number;
  ceo_tasks: number;
  active_agents: number;
  total_agents: number;
}

async function loadTasks(businessId: string, status?: string): Promise<Task[]> {
  const supabase = createClient();
  let query = supabase.from("tasks").select("*").eq("business_id", businessId);
  if (status) query = query.eq("status", status);
  const { data } = await query.order("created_at", { ascending: false });
  return (data as Task[]) || [];
}

export function useTasks(businessId?: string, status?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    let active = true;

    (async () => {
      const data = await loadTasks(businessId, status);
      if (!active) return;
      setTasks(data);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [businessId, status]);

  const refetch = useCallback(async () => {
    if (!businessId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const data = await loadTasks(businessId, status);
    setTasks(data);
    setLoading(false);
  }, [businessId, status]);

  return { tasks, loading: businessId ? loading : false, refetch };
}

async function loadDashboard(businessId: string) {
  const supabase = createClient();

  const [
    businessRes,
    tasksRes,
    agentsRes,
    activityRes,
    reportsRes,
    opportunitiesRes,
  ] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).single(),
    supabase.from("tasks").select("*").eq("business_id", businessId),
    supabase.from("agents").select("*").eq("business_id", businessId),
    supabase
      .from("activity_feed")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("reports")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("revenue_opportunities")
      .select("*")
      .eq("business_id", businessId)
      .order("potential_value", { ascending: false })
      .limit(5),
  ]);

  const business = businessRes.data;
  const tasks = (tasksRes.data || []) as Task[];
  const agentsData = (agentsRes.data || []) as Agent[];

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;

  const pendingApprovalTasks = tasks.filter(
    (t) => t.requires_approval && t.approved === null && t.status !== "cancelled"
  );
  const approvedTasks = tasks.filter((t) => t.approved === true);
  const runningTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const marketingTasks = tasks.filter((t) => t.department === "marketing");
  const salesTasks = tasks.filter((t) => t.department === "sales");
  const hrTasks = tasks.filter((t) => t.department === "hr");
  const financeTasks = tasks.filter((t) => t.department === "finance");
  const operationsTasks = tasks.filter((t) => t.department === "operations");
  const developerTasks = tasks.filter((t) => t.department === "developer");
  const ceoTasks = tasks.filter((t) => t.department === "ceo");

  return {
    stats: {
      health_score: business?.health_score || 0,
      growth_score: business?.growth_score || 0,
      task_completion_pct: total > 0 ? (completed / total) * 100 : 0,
      revenue_opportunities: (opportunitiesRes.data as RevenueOpportunity[]) || [],
      pending_approvals: pendingApprovalTasks.length,
      approved_tasks: approvedTasks.length,
      running_tasks: runningTasks.length,
      completed_tasks: completedTasks.length,
      marketing_tasks: marketingTasks.length,
      sales_tasks: salesTasks.length,
      hr_tasks: hrTasks.length,
      finance_tasks: financeTasks.length,
      operations_tasks: operationsTasks.length,
      developer_tasks: developerTasks.length,
      ceo_tasks: ceoTasks.length,
      active_agents: agentsData.filter((a) => a.status === "working").length,
      total_agents: agentsData.length,
    } satisfies ExtendedDashboardStats,
    activity: (activityRes.data as ActivityFeedItem[]) || [],
    reports: (reportsRes.data as Report[]) || [],
    agents: agentsData,
    pendingTasks: pendingApprovalTasks.slice(0, 5),
  };
}

export function useDashboard(businessId?: string) {
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityFeedItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    let active = true;

    (async () => {
      const data = await loadDashboard(businessId);
      if (!active) return;
      setStats(data.stats);
      setActivity(data.activity);
      setReports(data.reports);
      setAgents(data.agents);
      setPendingTasks(data.pendingTasks);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [businessId]);

  const refetch = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const data = await loadDashboard(businessId);
    setStats(data.stats);
    setActivity(data.activity);
    setReports(data.reports);
    setAgents(data.agents);
    setPendingTasks(data.pendingTasks);
    setLoading(false);
  }, [businessId]);

  return {
    stats,
    activity,
    reports,
    agents,
    pendingTasks,
    loading: businessId ? loading : false,
    refetch,
  };
}
