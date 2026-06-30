import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runDeveloperAgent(
  business: Business,
  taskDescription?: string
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the Developer Agent. Analyze the business website and generate SEO, UX, performance, and conversion improvement recommendations.`,
    userPrompt: `${buildBusinessContext(business)}

Task: ${taskDescription || "Analyze website and provide technical improvements"}

Return JSON with output containing:
seoRecommendations, uxImprovements, performanceImprovements, conversionImprovements, technicalAudit
and a summary.`,
    temperature: 0.5,
  });
}
