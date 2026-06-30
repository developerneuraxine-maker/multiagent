import { generateJSON } from "@/lib/gemini/client";
import { buildBusinessContext, type AgentRunResult } from "./base-agent";
import type { Business } from "@/types/database";

export async function runCEOAgent(business: Business): Promise<AgentRunResult> {
  const context = buildBusinessContext(business);

  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the CEO Agent of an AI-powered business operating system.
Analyze the business comprehensively. Identify problems, opportunities, risks, and growth potential.
Create actionable department tasks for HR, Marketing, Sales, Developer, Support, Finance, and Operations agents.
Return valid JSON only.`,
    userPrompt: `Analyze this business and create a strategic plan:

${context}

Return JSON with this structure:
{
  "output": {
    "problems": ["..."],
    "opportunities": ["..."],
    "risks": ["..."],
    "growthPotential": "...",
    "analysis": "..."
  },
  "summary": "Executive summary in 2-3 sentences",
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "department": "marketing|sales|hr|developer|support|finance|operations",
      "priority": "low|medium|high|urgent"
    }
  ]
}`,
    temperature: 0.6,
  });
}

export async function runCEOReview(
  business: Business,
  departmentOutputs: Record<string, unknown>[]
): Promise<AgentRunResult> {
  return generateJSON<AgentRunResult>({
    systemPrompt: `You are the CEO Agent reviewing department outputs and generating a final executive report.`,
    userPrompt: `Business: ${business.name}
Department outputs: ${JSON.stringify(departmentOutputs)}

Return JSON with output containing executiveReport, keyMetrics, recommendations, nextSteps and a summary.`,
    temperature: 0.5,
  });
}
