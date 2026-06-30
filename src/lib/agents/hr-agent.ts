import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business, Task } from "@/types/database";

export async function runHRAgent(
  business: Business,
  ceoTasks: Task[]
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the HR Agent. Categorize CEO tasks, assign to appropriate departments, track progress, and report completion status.`,
    userPrompt: `${buildBusinessContext(business)}

CEO Tasks to process:
${JSON.stringify(ceoTasks.map((t) => ({ title: t.title, description: t.description, department: t.department })))}

Return JSON with output containing categorizedTasks, assignments, trackingPlan, completionReport and summary.`,
    temperature: 0.5,
  });
}
