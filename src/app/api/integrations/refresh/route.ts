import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encrypt, safeDecrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, provider } = await request.json();
  if (!businessId || !provider) {
    return NextResponse.json({ error: "businessId and provider required" }, { status: 400 });
  }

  const { data: intg } = await supabase
    .from("integrations")
    .select("*")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .single();

  if (!intg) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const db = await createServiceClient();

  // Google token refresh
  if (["gmail", "google_calendar", "google_sheets"].includes(provider)) {
    const refreshToken = safeDecrypt(intg.refresh_token);
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token available. Please reconnect." }, { status: 400 });
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();

    if (!data.access_token) {
      await db.from("integrations").update({ status: "error" }).eq("business_id", businessId).eq("provider", provider);
      return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 400 });
    }

    const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

    // Update all 3 Google integrations with fresh token
    for (const p of ["gmail", "google_calendar", "google_sheets"]) {
      await db.from("integrations")
        .update({
          access_token: encrypt(data.access_token),
          token_expires_at: newExpiry,
          last_sync_at: new Date().toISOString(),
          status: "connected",
        })
        .eq("business_id", businessId)
        .eq("provider", p);
    }

    return NextResponse.json({ success: true, expires_at: newExpiry });
  }

  return NextResponse.json({ error: "Token refresh not supported for this provider" }, { status: 400 });
}
