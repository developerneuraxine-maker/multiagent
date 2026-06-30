import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, keyId, keySecret } = await request.json();
  if (!businessId || !keyId || !keySecret) {
    return NextResponse.json({ error: "businessId, keyId, and keySecret are required" }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Validate credentials by calling Razorpay API
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const testRes = await fetch("https://api.razorpay.com/v1/payments?count=1", {
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!testRes.ok) {
    const errData = await testRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.error?.description || "Invalid Razorpay credentials. Check your Key ID and Key Secret." },
      { status: 400 }
    );
  }

  // Determine mode from Key ID prefix (rzp_test_ = test, rzp_live_ = live)
  const mode = keyId.startsWith("rzp_live_") ? "live" : "test";

  // Get account info
  let accountName = "Razorpay Account";
  try {
    const accountRes = await fetch("https://api.razorpay.com/v1/accounts/me", {
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (accountRes.ok) {
      const acc = await accountRes.json();
      accountName = acc.profile?.name || acc.name || accountName;
    }
  } catch {
    // Non-fatal — some accounts don't have this endpoint
  }

  const db = await createServiceClient();
  const now = new Date().toISOString();

  const { data: integration } = await db.from("integrations").upsert({
    business_id: businessId,
    provider: "razorpay",
    status: "connected",
    access_token: encrypt(keyId),
    refresh_token: encrypt(keySecret),
    provider_user_id: keyId,
    provider_email: "",
    provider_name: accountName,
    provider_avatar: null,
    connected_at: now,
    last_sync_at: now,
    metadata: {
      key_id: keyId,
      mode,
      account_name: accountName,
      webhook_configured: false,
    },
  }, { onConflict: "business_id,provider" }).select().single();

  await supabase.from("activity_feed").insert({
    business_id: businessId,
    action: `Razorpay connected: ${accountName} (${mode} mode)`,
    details: { event: "integration_connected", provider: "razorpay", mode },
  });

  return NextResponse.json({ success: true, integration, mode, accountName });
}
