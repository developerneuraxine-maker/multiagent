import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runOperationsAgent(
  business: Business,
  taskDescription?: string
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the Operations Agent. Generate KPI tracking plans, execution plans, department monitoring frameworks, and operational reports.`,
    userPrompt: `${buildBusinessContext(business)}

Task: ${taskDescription || "Create operational excellence plan"}

Return JSON with output containing:
kpiTracking, executionPlans, departmentMonitoring, operationalReport, milestones
and a summary.`,
    temperature: 0.5,
  });
}
