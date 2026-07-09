import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  // Verify business belongs to user
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();
  if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Use service client to bypass RLS — ownership already verified above
  const db = await createServiceClient();
  const { data } = await db
    .from("integrations")
    .select("*")
    .eq("business_id", businessId);

  return NextResponse.json({ integrations: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, provider, action } = await request.json();
  if (!businessId || !provider) {
    return NextResponse.json({ error: "businessId and provider required" }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const db = await createServiceClient();

  if (action === "disconnect") {
    await db
      .from("integrations")
      .update({ status: "disconnected", connected_at: null })
      .eq("business_id", businessId)
      .eq("provider", provider);

    await supabase.from("activity_feed").insert({
      business_id: businessId,
      action: `${provider} integration disconnected`,
      details: { event: "integration_disconnected", provider },
    });

    return NextResponse.json({ success: true });
  }

  // Connect — upsert the integration record (actual OAuth handled separately)
  const { data: integration } = await db
    .from("integrations")
    .upsert({
      business_id: businessId,
      provider,
      status: "connected",
      connected_at: new Date().toISOString(),
      metadata: {},
    }, { onConflict: "business_id,provider" })
    .select()
    .single();

  await supabase.from("activity_feed").insert({
    business_id: businessId,
    action: `${provider} integration connected`,
    details: { event: "integration_connected", provider },
  });

  return NextResponse.json({ success: true, integration });
}
