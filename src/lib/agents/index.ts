import type { AgentType } from "@/types/database";
import type { Business, Task } from "@/types/database";
import { runCEOAgent, runCEOReview } from "./ceo-agent";
import { runHRAgent } from "./hr-agent";
import { runMarketingAgent } from "./marketing-agent";
import { runSalesAgent } from "./sales-agent";
import { runDeveloperAgent } from "./developer-agent";
import { runSupportAgent } from "./support-agent";
import { runFinanceAgent } from "./finance-agent";
import { runOperationsAgent } from "./operations-agent";
import type { AgentRunResult } from "./base-agent";

import { triggerBrainWebhook } from "../n8n";

export type { AgentRunResult };

const agentRunners: Record<
  Exclude<AgentType, "ceo">,
  (business: Business, taskDescription?: string) => Promise<AgentRunResult>
> = {
  hr: (business) => runHRAgent(business, []),
  marketing: runMarketingAgent,
  sales: runSalesAgent,
  developer: runDeveloperAgent,
  support: runSupportAgent,
  finance: runFinanceAgent,
  operations: runOperationsAgent,
};

export async function runAgent(
  agentType: AgentType,
  business: Business,
  options?: { taskDescription?: string; ceoTasks?: Task[] }
): Promise<AgentRunResult & { isN8N?: boolean }> {
  try {
    const n8nResult = await triggerBrainWebhook(business, {
      action: agentType === "ceo" ? "business_analysis" : "run_agent",
      agentType,
      taskDescription: options?.taskDescription,
    });

    if (n8nResult.success) {
      return {
        isN8N: true,
        output: (n8nResult.data as Record<string, unknown>) || {},
        summary: `Successfully triggered ${agentType} workflow via n8n Brain.`,
      };
    } else {
      console.warn(`[n8n-fallback] n8n execution returned failure: ${n8nResult.error}. Falling back to local agent execution.`);
    }
  } catch (error) {
    console.error(`[n8n-fallback] Failed to call n8n webhook for agent ${agentType}. Falling back to local agent execution:`, error);
  }

  // Fallback to local Gemini agents
  if (agentType === "ceo") {
    const res = await runCEOAgent(business);
    return { ...res, isN8N: false };
  }

  if (agentType === "hr" && options?.ceoTasks) {
    const res = await runHRAgent(business, options.ceoTasks);
    return { ...res, isN8N: false };
  }

  const runner = agentRunners[agentType];
  const res = await runner(business, options?.taskDescription);
  return { ...res, isN8N: false };
}

export { runCEOReview };
