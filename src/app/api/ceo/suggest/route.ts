import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function runAI(systemPrompt: string, userMessage: string): Promise<string> {
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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
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

  // Fetch actual knowledge base content (not just file names)
  const { data: kbFiles } = await supabase
    .from("knowledge_base")
    .select("file_name, content")
    .eq("business_id", businessId)
    .limit(5);

  const kbContext = kbFiles && kbFiles.length > 0
    ? `\n\nKnowledge Base (read this carefully — use it to give highly specific advice):\n${
        kbFiles
          .filter((f: { file_name: string; content: string | null }) => f.content)
          .map((f: { file_name: string; content: string | null }) =>
            `[${f.file_name}]:\n${(f.content as string).slice(0, 2000)}`
          ).join("\n\n") || kbFiles.map((f: { file_name: string; content: string | null }) => f.file_name).join(", ")
      }`
    : "";

  const systemPrompt = `You are the CEO Agent for ${business.name}, an expert AI business advisor.
Business: ${business.name} | Industry: ${business.industry}
Goals: ${business.goals || "Not specified"}
Problems: ${business.problems || "Not specified"}
Budget: $${business.budget}/month${kbContext}

Generate ONE specific, actionable, high-impact business suggestion for today.
Be CONCRETE and SPECIFIC to this exact business — not generic advice.
Start with a bold action verb. Explain WHY and HOW in 80-120 words.
Reference specific details from the knowledge base if available.`;

  let content = "";
  try {
    content = await runAI(systemPrompt, "Give me today's most impactful business suggestion based on my current situation.");
  } catch (err) {
    console.error("[Suggest] AI call failed:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "AI generation failed. Check your API key in .env",
    }, { status: 500 });
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "Failed to generate suggestion" }, { status: 500 });
  }

  const db = await createServiceClient();
  const { data: suggestion } = await db
    .from("suggestions")
    .insert({ business_id: businessId, content: content.trim(), type: "daily" })
    .select()
    .single();

  return NextResponse.json({ suggestion });
}
