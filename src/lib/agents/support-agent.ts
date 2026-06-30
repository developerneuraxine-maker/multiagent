import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runSupportAgent(
  business: Business,
  taskDescription?: string
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the Support Agent. Generate FAQs, support workflows, customer journey maps, and support scripts.`,
    userPrompt: `${buildBusinessContext(business)}

Task: ${taskDescription || "Create comprehensive customer support resources"}

Return JSON with output containing:
faq, supportWorkflows, customerJourney, supportScripts
and a summary.`,
    temperature: 0.6,
  });
}
