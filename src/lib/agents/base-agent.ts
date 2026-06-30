import type { Business } from "@/types/database";

export function buildBusinessContext(business: Business): string {
  return `
Business Name: ${business.name}
Industry: ${business.industry}
Website: ${business.website || "N/A"}
Instagram: ${business.instagram || "N/A"}
Facebook: ${business.facebook || "N/A"}
LinkedIn: ${business.linkedin || "N/A"}
Products: ${business.products.join(", ") || "None specified"}
Services: ${business.services.join(", ") || "None specified"}
Problems: ${business.problems || "None specified"}
Goals: ${business.goals || "None specified"}
Budget: $${business.budget}
Health Score: ${business.health_score}/100
Growth Score: ${business.growth_score}/100
`.trim();
}

export interface AgentRunResult {
  output: Record<string, unknown>;
  summary: string;
  tasks?: Array<{
    title: string;
    description: string;
    department: string;
    priority: string;
  }>;
}
