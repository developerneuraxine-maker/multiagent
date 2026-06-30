import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// Scopes for Facebook Pages, Instagram Business, and WhatsApp Business
const SCOPES = [
  "email",
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
].join(",");

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Meta OAuth not configured. Add META_APP_ID to .env" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const state = randomBytes(32).toString("hex");

  const db = await createServiceClient();
  await db.from("oauth_states").insert({
    state,
    user_id: user.id,
    business_id: businessId,
    provider: "meta",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appUrl}/api/oauth/meta/callback`,
    scope: SCOPES,
    response_type: "code",
    state,
  });

  return Response.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
