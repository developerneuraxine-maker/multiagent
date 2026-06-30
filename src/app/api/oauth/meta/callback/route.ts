import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; name?: string; username?: string; profile_picture_url?: string };
}

interface WhatsAppAccount {
  id: string;
  name: string;
}

interface WhatsAppPhone {
  id: string;
  display_phone_number: string;
  verified_name: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const failUrl = (msg: string) =>
    `${appUrl}/oauth/success?error=${encodeURIComponent(msg)}&provider=meta`;

  if (error) return Response.redirect(failUrl(error));
  if (!code || !state) return Response.redirect(failUrl("missing_params"));

  const db = await createServiceClient();

  const { data: stateRow } = await db
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("provider", "meta")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!stateRow) return Response.redirect(failUrl("invalid_or_expired_state"));
  await db.from("oauth_states").delete().eq("state", state);

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;

  // Exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(`${appUrl}/api/oauth/meta/callback`)}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return Response.redirect(failUrl(tokenData.error?.message || "token_exchange_failed"));
  }

  const userToken = tokenData.access_token;

  // Exchange for long-lived token (60 days)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
  );
  const longLivedData = await longLivedRes.json();
  const accessToken = longLivedData.access_token || userToken;
  const expiresIn = longLivedData.expires_in || tokenData.expires_in || 3600;

  // Get user profile
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
  );
  const me = await meRes.json();

  // Get Facebook Pages with Instagram accounts
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}&access_token=${accessToken}`
  );
  const pagesData = await pagesRes.json();
  const pages: FacebookPage[] = pagesData.data || [];

  // Find Instagram Business Account
  let instagramAccount: { id: string; name?: string; username?: string; picture?: string } | null = null;
  let facebookPageId: string | null = null;
  let facebookPageAccessToken: string | null = null;

  for (const page of pages) {
    if (!facebookPageId) {
      facebookPageId = page.id;
      facebookPageAccessToken = page.access_token;
    }
    if (page.instagram_business_account) {
      instagramAccount = {
        id: page.instagram_business_account.id,
        name: page.instagram_business_account.name,
        username: page.instagram_business_account.username,
        picture: page.instagram_business_account.profile_picture_url,
      };
      break;
    }
  }

  // Get WhatsApp Business accounts
  let whatsappAccounts: WhatsAppAccount[] = [];
  let whatsappPhones: WhatsAppPhone[] = [];
  try {
    const waRes = await fetch(
      `https://graph.facebook.com/v19.0/me/businesses?fields=id,name&access_token=${accessToken}`
    );
    const waData = await waRes.json();
    const businesses = waData.data || [];

    for (const biz of businesses.slice(0, 1)) {
      const waAccountsRes = await fetch(
        `https://graph.facebook.com/v19.0/${biz.id}/whatsapp_business_accounts?fields=id,name&access_token=${accessToken}`
      );
      const waAccountsData = await waAccountsRes.json();
      whatsappAccounts = waAccountsData.data || [];

      if (whatsappAccounts.length > 0) {
        const phonesRes = await fetch(
          `https://graph.facebook.com/v19.0/${whatsappAccounts[0].id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
        );
        const phonesData = await phonesRes.json();
        whatsappPhones = phonesData.data || [];
      }
    }
  } catch {
    // WhatsApp accounts may not be available — non-fatal
  }

  const encAccessToken = encrypt(accessToken);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const now = new Date().toISOString();
  const userName = me.name || "Meta User";
  const userEmail = me.email || "";
  const userPicture = me.picture?.data?.url || "";

  // Save Facebook integration
  await db.from("integrations").upsert({
    business_id: stateRow.business_id,
    provider: "facebook",
    status: "connected",
    access_token: encAccessToken,
    token_expires_at: expiresAt,
    provider_user_id: me.id,
    provider_email: userEmail,
    provider_name: userName,
    provider_avatar: userPicture,
    connected_at: now,
    last_sync_at: now,
    scopes: "pages_show_list,pages_manage_posts,instagram_basic,whatsapp_business_management",
    metadata: {
      facebook_user_id: me.id,
      name: userName,
      email: userEmail,
      picture: userPicture,
      page_id: facebookPageId,
      page_access_token: facebookPageAccessToken ? encrypt(facebookPageAccessToken) : null,
      pages: pages.map(p => ({ id: p.id, name: p.name })),
    },
  }, { onConflict: "business_id,provider" });

  // Save Instagram integration (if found)
  if (instagramAccount) {
    await db.from("integrations").upsert({
      business_id: stateRow.business_id,
      provider: "instagram",
      status: "connected",
      access_token: encAccessToken,
      token_expires_at: expiresAt,
      provider_user_id: instagramAccount.id,
      provider_email: userEmail,
      provider_name: instagramAccount.username || instagramAccount.name || userName,
      provider_avatar: instagramAccount.picture || userPicture,
      connected_at: now,
      last_sync_at: now,
      scopes: "instagram_basic,instagram_content_publish",
      metadata: {
        instagram_business_id: instagramAccount.id,
        username: instagramAccount.username,
        name: instagramAccount.name,
        picture: instagramAccount.picture,
        facebook_page_id: facebookPageId,
      },
    }, { onConflict: "business_id,provider" });
  }

  // Save WhatsApp integration (if found)
  if (whatsappAccounts.length > 0) {
    const waba = whatsappAccounts[0];
    const phone = whatsappPhones[0];
    await db.from("integrations").upsert({
      business_id: stateRow.business_id,
      provider: "whatsapp",
      status: "connected",
      access_token: encAccessToken,
      token_expires_at: expiresAt,
      provider_user_id: waba.id,
      provider_email: userEmail,
      provider_name: phone?.verified_name || waba.name || "WhatsApp Business",
      provider_avatar: userPicture,
      connected_at: now,
      last_sync_at: now,
      scopes: "whatsapp_business_management,whatsapp_business_messaging",
      metadata: {
        whatsapp_business_account_id: waba.id,
        phone_number_id: phone?.id,
        phone_number: phone?.display_phone_number,
        display_name: phone?.verified_name || waba.name,
        facebook_user_id: me.id,
      },
    }, { onConflict: "business_id,provider" });
  }

  await db.from("activity_feed").insert({
    business_id: stateRow.business_id,
    action: `Meta account connected: ${userName}${instagramAccount ? " (Facebook + Instagram)" : " (Facebook)"}${whatsappAccounts.length > 0 ? " + WhatsApp" : ""}`,
    details: {
      event: "integration_connected",
      provider: "meta",
      facebook_pages: pages.length,
      instagram_found: !!instagramAccount,
      whatsapp_found: whatsappAccounts.length > 0,
    },
  });

  const displayName = instagramAccount?.username
    ? `@${instagramAccount.username} / ${userName}`
    : userName;

  const successUrl = `${appUrl}/oauth/success?success=true&provider=meta&name=${encodeURIComponent(displayName)}&email=${encodeURIComponent(userEmail)}&avatar=${encodeURIComponent(userPicture)}`;
  return Response.redirect(successUrl);
}
