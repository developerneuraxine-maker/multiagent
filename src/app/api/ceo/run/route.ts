import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, prompt } = await request.json();
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  try {
    const { triggerMasterWorkflow } = await import("@/lib/n8n");
    const payload = prompt
      ? { ...business, goals: `${business.goals}\n\nSPECIFIC FOCUS: ${prompt}` }
      : business;

    triggerMasterWorkflow(payload).catch((err: unknown) => {
      console.error("[CEO Run] Background trigger failed:", err);
    });

    await supabase.from("activity_feed").insert({
      business_id: businessId,
      action: prompt
        ? `CEO Agent triggered with custom prompt: "${prompt.slice(0, 80)}..."`
        : "CEO Agent triggered manually — analyzing your business",
      details: { event: "ceo_manual_run", has_custom_prompt: !!prompt },
    });
  } catch (err) {
    console.error("[CEO Run] Failed:", err);
    return NextResponse.json({ error: "Failed to trigger CEO Agent" }, { status: 500 });
  }

  return NextResponse.json({ message: "CEO Agent triggered. New tasks will appear in ~60 seconds." });
}
