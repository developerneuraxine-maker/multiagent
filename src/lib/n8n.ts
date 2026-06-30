import type { Business, Task, AgentType } from "@/types/database";

export interface N8NConfig {
  baseUrl: string;
  secret: string;
  brainWebhookUrl: string;
}

export function getN8NConfig(): N8NConfig {
  const baseUrl = (process.env.N8N_BASE_URL || "https://developerneura.app.n8n.cloud").trim();
  const secret = (process.env.N8N_SECRET || process.env.N8N_WEBHOOK_SECRET || "").trim();
  const brainWebhookUrl = (process.env.BRAIN_WEBHOOK_URL || "/webhook/business-analysis").trim();

  return { baseUrl, secret, brainWebhookUrl };
}

async function postToWebhook(
  url: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const secret = (process.env.N8N_SECRET || process.env.N8N_WEBHOOK_SECRET || "").trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const maxRetries = 0;
  let retryCount = 0;
  let delay = 1000;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      console.log(`[n8n] POST ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        let data: unknown = null;
        try {
          const ct = response.headers.get("content-type");
          data = ct?.includes("application/json") ? await response.json() : { text: await response.text() };
        } catch {}
        console.log(`[n8n] Success: ${url}`);
        return { success: true, data };
      }

      const isTransient = response.status >= 500 || response.status === 429;
      if (!isTransient || retryCount >= maxRetries) {
        const errText = await response.text().catch(() => "unknown");
        throw new Error(`n8n responded ${response.status}: ${errText}`);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[n8n] Error (attempt ${retryCount + 1}): ${msg}`);
      if (retryCount >= maxRetries) return { success: false, error: msg };
    }

    await new Promise((r) => setTimeout(r, delay));
    retryCount++;
    delay *= 2;
  }
}

/**
 * Sends business data to the AI Business OS Master Workflow (CEO Agent).
 * The master workflow analyzes the business and POSTs tasks back to /api/webhooks/n8n.
 */
export async function triggerMasterWorkflow(
  business: Business
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.MASTER_WORKFLOW_WEBHOOK?.trim();
  if (!webhookUrl) {
    console.warn("[n8n] MASTER_WORKFLOW_WEBHOOK not configured — skipping trigger");
    return { success: false, error: "MASTER_WORKFLOW_WEBHOOK not configured" };
  }

  // Field names must match exactly what the n8n Master Workflow expects
  const products = Array.isArray(business.products) ? business.products.join(", ") : (business.products || "");
  const services = Array.isArray(business.services) ? business.services.join(", ") : (business.services || "");

  return postToWebhook(webhookUrl, {
    // Identity
    businessId: business.id,
    business_name: business.name,
    contact_email: "",           // filled by n8n from auth context

    // Business details
    industry: business.industry,
    website: business.website || "",
    instagram: business.instagram || "",
    facebook: business.facebook || "",
    linkedin: business.linkedin || "",
    budget: business.budget || 0,

    // Field names the n8n workflow uses in its Code/AI nodes
    product_details: products,
    target_audience: services,
    challenges: business.problems || "",
    message: business.goals || "",

    // Also send originals as fallback
    products,
    services,
    problems: business.problems || "",
    goals: business.goals || "",
  });
}

/**
 * Triggers a department workflow (marketing or sales) after user approval.
 */
export async function triggerDepartmentWorkflow(
  department: "marketing" | "sales",
  task: Task,
  business: Business
): Promise<{ success: boolean; error?: string }> {
  const envKey = department === "marketing" ? "MARKETING_WORKFLOW_WEBHOOK" : "SALES_WORKFLOW_WEBHOOK";
  const webhookUrl = process.env[envKey]?.trim();

  if (!webhookUrl) {
    console.warn(`[n8n] ${envKey} not configured — skipping trigger`);
    return { success: false, error: `${envKey} not configured` };
  }

  return postToWebhook(webhookUrl, {
    taskId: task.id,
    businessId: business.id,
    department,
    taskName: task.title,
    taskDescription: task.description,
    priority: task.priority,
    business,
    action: "execute_task",
  });
}

/**
 * Legacy brain webhook — kept for backward compatibility.
 */
export async function triggerBrainWebhook(
  business: Business,
  payload: {
    action: string;
    agentType: string;
    taskDescription?: string;
  }
): Promise<{ success: boolean; isN8N: true; data?: unknown; error?: string }> {
  const { baseUrl, secret, brainWebhookUrl } = getN8NConfig();

  const url = brainWebhookUrl.startsWith("http")
    ? brainWebhookUrl
    : `${baseUrl.replace(/\/$/, "")}${brainWebhookUrl}`;

  const requestBody = { businessId: business.id, business, ...payload };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const maxRetries = 3;
  let retryCount = 0;
  let delay = 1000;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        let responseData = null;
        try {
          const ct = response.headers.get("content-type");
          responseData = ct?.includes("application/json")
            ? await response.json()
            : { text: await response.text() };
        } catch {}
        return { success: true, isN8N: true, data: responseData };
      }

      const isTransient = response.status >= 500 || response.status === 429;
      if (!isTransient || retryCount >= maxRetries) {
        const errText = await response.text().catch(() => "Unknown error");
        throw new Error(`n8n webhook responded with status ${response.status}: ${errText}`);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const errorMessage = isTimeout ? "Request timed out after 15 seconds" : (err instanceof Error ? err.message : String(err));
      if (retryCount >= maxRetries) return { success: false, isN8N: true, error: errorMessage };
    }

    await new Promise((r) => setTimeout(r, delay));
    retryCount++;
    delay *= 2;
  }
}
