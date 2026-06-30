import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runMarketingAgent(
  business: Business,
  taskDescription?: string
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the Marketing Agent. Generate comprehensive marketing content including social posts, email campaigns, blog articles, content calendar, hashtags, and image prompts.`,
    userPrompt: `${buildBusinessContext(business)}

Task: ${taskDescription || "Create a full marketing content strategy"}

Return JSON with output containing:
instagramPosts, instagramReels, instagramStories, facebookPosts, linkedinPosts,
emailCampaigns, blogArticles, imagePrompts, hashtags, contentCalendar (array of {date, platform, content, type})
and a summary.`,
    temperature: 0.8,
  });
}
