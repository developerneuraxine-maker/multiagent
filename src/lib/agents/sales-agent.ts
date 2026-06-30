import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runSalesAgent(
  business: Business,
  taskDescription?: string
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the Sales Agent. Generate lead scoring, outreach campaigns, DM campaigns, email sequences, offers, meeting booking strategies, and conversion recommendations.`,
    userPrompt: `${buildBusinessContext(business)}

Task: ${taskDescription || "Create a comprehensive sales strategy"}

Return JSON with output containing:
leadScoring, outreachCampaigns, dmCampaigns, emailCampaigns, followUpSequences,
offers, meetingBookingStrategy, conversionRecommendations
and a summary.`,
    temperature: 0.7,
  });
}
