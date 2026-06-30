import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runFinanceAgent(
  business: Business,
  taskDescription?: string
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the Finance Agent. Generate profit analysis, ROI analysis, budget recommendations, and financial forecasts.`,
    userPrompt: `${buildBusinessContext(business)}

Task: ${taskDescription || "Create financial analysis and recommendations"}

Return JSON with output containing:
profitAnalysis, roiAnalysis, budgetRecommendations, forecasts, financialMetrics
and a summary.`,
    temperature: 0.4,
  });
}
