import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMeetingInvite } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, title, date, time } = await request.json();
  if (!title || !date || !time) {
    return NextResponse.json({ error: "title, date, and time are required" }, { status: 400 });
  }

  const meetingDateTime = new Date(`${date}T${time}:00+05:30`);
  const formattedDate = meetingDateTime.toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata",
  });
  const formattedTime = meetingDateTime.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });

  let emailSent = false;
  let emailError: string | null = null;

  // Try to send a real calendar invite if Gmail is connected
  if (businessId) {
    try {
      const { data: gmailIntegration } = await supabase
        .from("integrations")
        .select("metadata, status")
        .eq("business_id", businessId)
        .eq("provider", "gmail")
        .eq("status", "connected")
        .single();

      if (gmailIntegration?.metadata) {
        const meta = gmailIntegration.metadata as Record<string, string>;
        const gmailUser = meta.gmail_user;
        const appPassword = meta.gmail_app_password;

        if (gmailUser && appPassword) {
          await sendMeetingInvite({
            gmailUser,
            appPassword,
            to: gmailUser,
            title,
            formattedDate,
            formattedTime,
            dateStr: date,
            timeStr: time,
          });
          emailSent = true;
        }
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Email send failed";
      console.error("[Meeting] Email send failed:", emailError);
    }

    await supabase.from("activity_feed").insert({
      business_id: businessId,
      action: emailSent
        ? `Meeting scheduled & calendar invite sent: "${title}" on ${formattedDate} at ${formattedTime} IST`
        : `Meeting scheduled: "${title}" on ${formattedDate} at ${formattedTime} IST`,
      details: {
        event: "meeting_scheduled",
        title,
        date,
        time,
        email_sent: emailSent,
        scheduled_by: user.email,
      },
    });
  }

  return NextResponse.json({
    success: true,
    meeting: { title, date: formattedDate, time: formattedTime },
    message: emailSent
      ? `Meeting "${title}" scheduled! Calendar invite sent to your Gmail.`
      : `Meeting "${title}" scheduled for ${formattedDate} at ${formattedTime} IST. Connect Gmail to receive calendar invites.`,
    email_sent: emailSent,
    email_error: emailError,
  });
}
