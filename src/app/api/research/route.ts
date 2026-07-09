import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function runAI(prompt: string): Promise<string> {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
  }

  throw new Error("OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await request.json();
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Fetch actual knowledge base content
  const { data: kbFiles } = await supabase
    .from("knowledge_base")
    .select("file_name, content")
    .eq("business_id", businessId)
    .limit(3);

  const kbContext = kbFiles && kbFiles.length > 0
    ? `\n\nKnowledge Base Documents (use this to make research more specific):\n${
        kbFiles.map((f: { file_name: string; content: string | null }) =>
          `[${f.file_name}]: ${f.content ? f.content.slice(0, 1500) : "(content not extracted)"}`
        ).join("\n\n")
      }`
    : "";

  const prompt = `You are a business research analyst. Research the current market for this business:

Business: ${business.name}
Industry: ${business.industry}
Products/Services: ${Array.isArray(business.products) ? business.products.join(", ") : ""} / ${Array.isArray(business.services) ? business.services.join(", ") : ""}
Target: ${business.target_audience || business.goals || "Not specified"}${kbContext}

Generate a JSON object with key "results" containing an array of exactly 6 research insights. Each item must have:
- title: short headline (max 10 words)
- content: detailed, specific finding (60-80 words) — be concrete, not generic
- category: one of "trend", "opportunity", "competitor", "risk", "news"
- source: realistic source e.g. "Statista Market Report 2025", "Industry Analysis Q2 2025"

Return ONLY valid JSON like: {"results": [...]}`;

  let results: Array<{ title: string; content: string; category: string; source: string }> = [];

  try {
    const text = await runAI(prompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    results = parsed.results || (Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    console.error("[Research] AI call failed:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "AI generation failed. Check your API key in .env",
    }, { status: 500 });
  }

  if (!results.length) {
    return NextResponse.json({ error: "No research results generated" }, { status: 500 });
  }

  const db = await createServiceClient();
  const rows = results.map((r) => ({
    business_id: businessId,
    title: r.title || "Research Finding",
    content: r.content || "",
    category: r.category || "news",
    source: r.source || "AI Research",
  }));

  await db.from("research_results").insert(rows);

  await supabase.from("activity_feed").insert({
    business_id: businessId,
    action: `Research Agent completed: ${rows.length} market insights generated`,
    details: { event: "research_completed", count: rows.length },
  });

  return NextResponse.json({ success: true, count: rows.length });
}
