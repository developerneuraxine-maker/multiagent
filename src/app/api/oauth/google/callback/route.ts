import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const failUrl = (msg: string) =>
    `${appUrl}/oauth/success?error=${encodeURIComponent(msg)}&provider=google`;

  if (error) return Response.redirect(failUrl(error));
  if (!code || !state) return Response.redirect(failUrl("missing_params"));

  const db = await createServiceClient();

  // Verify CSRF state
  const { data: stateRow } = await db
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("provider", "google")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!stateRow) return Response.redirect(failUrl("invalid_or_expired_state"));

  // Delete used state immediately
  await db.from("oauth_states").delete().eq("state", state);

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return Response.redirect(failUrl(tokens.error_description || "token_exchange_failed"));
  }

  // Fetch Google user info
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoRes.json();

  if (!userInfo.id) return Response.redirect(failUrl("failed_to_get_user_info"));

  // Encrypt tokens
  const encAccessToken = encrypt(tokens.access_token);
  const encRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const now = new Date().toISOString();
  const commonData = {
    business_id: stateRow.business_id,
    status: "connected" as const,
    access_token: encAccessToken,
    refresh_token: encRefreshToken,
    token_expires_at: expiresAt,
    provider_user_id: userInfo.id,
    provider_email: userInfo.email,
    provider_name: userInfo.name,
    provider_avatar: userInfo.picture,
    scopes: tokens.scope || "",
    connected_at: now,
    last_sync_at: now,
    metadata: {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      verified_email: userInfo.verified_email,
    },
  };

  // Connect Gmail, Google Calendar, and Google Sheets in one OAuth flow
  for (const provider of ["gmail", "google_calendar", "google_sheets"]) {
    await db.from("integrations").upsert(
      { ...commonData, provider },
      { onConflict: "business_id,provider" }
    );
  }

  await db.from("activity_feed").insert({
    business_id: stateRow.business_id,
    action: `Google account connected: ${userInfo.email} (Gmail, Calendar, Sheets)`,
    details: { event: "integration_connected", provider: "google", email: userInfo.email },
  });

  const successUrl = `${appUrl}/oauth/success?success=true&provider=google&name=${encodeURIComponent(userInfo.name)}&email=${encodeURIComponent(userInfo.email)}&avatar=${encodeURIComponent(userInfo.picture || "")}`;
  return Response.redirect(successUrl);
}
