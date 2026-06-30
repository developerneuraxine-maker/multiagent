import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createGmailTransport } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, gmailUser, appPassword } = await request.json();
  if (!businessId || !gmailUser || !appPassword) {
    return NextResponse.json({ error: "businessId, gmailUser, and appPassword are required" }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Test the credentials by sending a real test email
  try {
    const transport = await createGmailTransport(gmailUser, appPassword);
    await transport.verify();

    await transport.sendMail({
      from: `"AI Business OS" <${gmailUser}>`,
      to: gmailUser,
      subject: `✅ Gmail Connected to AI Business OS`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color: #16a34a;">Gmail Successfully Connected!</h2>
          <p>Your Gmail account (<strong>${gmailUser}</strong>) is now connected to <strong>${business.name}</strong> on AI Business OS.</p>
          <p>You'll receive:</p>
          <ul>
            <li>Calendar invites when you schedule meetings</li>
            <li>Notifications when CEO Agent runs</li>
            <li>Task summaries</li>
          </ul>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">AI Business OS</p>
        </div>
      `,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gmail connection failed: ${msg}. Make sure you used an App Password (not your main Gmail password).` },
      { status: 400 }
    );
  }

  // Save credentials to integrations table
  const db = await createServiceClient();
  const { data: integration } = await db
    .from("integrations")
    .upsert({
      business_id: businessId,
      provider: "gmail",
      status: "connected",
      connected_at: new Date().toISOString(),
      metadata: { gmail_user: gmailUser, gmail_app_password: appPassword },
    }, { onConflict: "business_id,provider" })
    .select()
    .single();

  await supabase.from("activity_feed").insert({
    business_id: businessId,
    action: `Gmail connected: ${gmailUser}`,
    details: { event: "integration_connected", provider: "gmail", gmail_user: gmailUser },
  });

  return NextResponse.json({ success: true, integration });
}
