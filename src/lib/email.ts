import type { Transporter } from "nodemailer";
import type { WeeklyReportContent } from "@/types/database";

export async function createGmailTransport(gmailUser: string, appPassword: string): Promise<Transporter> {
  const nodemailer = await import("nodemailer");
  return nodemailer.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: appPassword },
  });
}

export function buildICS(title: string, dateStr: string, timeStr: string, organizer: string): string {
  const startIST = new Date(`${dateStr}T${timeStr}:00+05:30`);
  const endIST = new Date(startIST.getTime() + 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@aibos`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Business OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startIST)}`,
    `DTEND:${fmt(endIST)}`,
    `SUMMARY:${title}`,
    `ORGANIZER;CN=AI Business OS:mailto:${organizer}`,
    `ATTENDEE;CN=Owner;RSVP=TRUE:mailto:${organizer}`,
    "DESCRIPTION:Scheduled via AI Business OS",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Meeting Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendMeetingInvite({
  gmailUser,
  appPassword,
  to,
  title,
  formattedDate,
  formattedTime,
  dateStr,
  timeStr,
}: {
  gmailUser: string;
  appPassword: string;
  to: string;
  title: string;
  formattedDate: string;
  formattedTime: string;
  dateStr: string;
  timeStr: string;
}) {
  const transport = await createGmailTransport(gmailUser, appPassword);
  const ics = buildICS(title, dateStr, timeStr, gmailUser);

  await transport.sendMail({
    from: `"AI Business OS" <${gmailUser}>`,
    to,
    subject: `📅 Meeting Scheduled: ${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">📅 Meeting Scheduled</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px 0; color: #555; width: 80px;">Title</td><td style="font-weight: 600;">${title}</td></tr>
          <tr><td style="padding: 8px 0; color: #555;">Date</td><td>${formattedDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #555;">Time</td><td>${formattedTime} IST</td></tr>
        </table>
        <p style="color: #777; margin-top: 24px; font-size: 13px;">
          Accept the calendar invite attached to this email to add it to Google Calendar.
        </p>
        <p style="color: #aaa; font-size: 12px;">Sent by AI Business OS</p>
      </div>
    `,
    attachments: [
      {
        filename: "meeting-invite.ics",
        content: ics,
        contentType: "text/calendar; charset=UTF-8; method=REQUEST",
      },
    ],
  });
}

function scoreDelta(change: number): string {
  if (change > 0) return `<span style="color:#16a34a;">▲ +${change.toFixed(1)}</span>`;
  if (change < 0) return `<span style="color:#dc2626;">▼ ${change.toFixed(1)}</span>`;
  return `<span style="color:#777;">— 0.0</span>`;
}

export async function sendWeeklyReportEmail({
  gmailUser,
  appPassword,
  to,
  businessName,
  report,
}: {
  gmailUser: string;
  appPassword: string;
  to: string;
  businessName: string;
  report: WeeklyReportContent;
}) {
  const transport = await createGmailTransport(gmailUser, appPassword);

  const periodLabel = `${new Date(report.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })} – ${new Date(report.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`;

  const deptRows = Object.entries(report.tasks_by_department)
    .map(([dept, count]) => `<tr><td style="padding:4px 0; text-transform:capitalize; color:#444;">${dept}</td><td style="padding:4px 0; text-align:right; font-weight:600;">${count}</td></tr>`)
    .join("");

  const suggestionItems = report.top_suggestions.length
    ? report.top_suggestions.map((s) => `<li style="margin-bottom:6px;">${s}</li>`).join("")
    : `<li style="color:#999;">No new suggestions generated this week</li>`;

  await transport.sendMail({
    from: `"AI Business OS" <${gmailUser}>`,
    to,
    subject: `📊 Weekly Report — ${businessName} (${periodLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; margin-bottom: 4px;">📊 Weekly Business Report</h2>
        <p style="color: #777; margin-top: 0;">${businessName} · ${periodLabel}</p>

        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 12px; background: #f5f5f5; border-radius: 8px 0 0 8px; width: 50%;">
              <p style="margin:0; color:#777; font-size:12px;">HEALTH SCORE</p>
              <p style="margin:4px 0 0; font-size:22px; font-weight:700;">${Math.round(report.health_score)}% ${scoreDelta(report.health_score_change)}</p>
            </td>
            <td style="padding: 12px; background: #f5f5f5; border-radius: 0 8px 8px 0; width: 50%;">
              <p style="margin:0; color:#777; font-size:12px;">GROWTH SCORE</p>
              <p style="margin:4px 0 0; font-size:22px; font-weight:700;">${Math.round(report.growth_score)}% ${scoreDelta(report.growth_score_change)}</p>
            </td>
          </tr>
        </table>

        <h3 style="margin-bottom:4px;">Tasks Completed This Week — ${report.tasks_completed}</h3>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
          ${deptRows || `<tr><td style="color:#999;">No tasks completed this week</td></tr>`}
        </table>

        <p style="color:#555; font-size:14px;">${report.tasks_pending_approval} task(s) awaiting your approval.</p>

        <h3 style="margin-bottom:4px;">Top AI Suggestions</h3>
        <ul style="padding-left: 18px; color:#333; font-size:14px;">${suggestionItems}</ul>

        <h3 style="margin-bottom:4px;">Other Activity</h3>
        <ul style="padding-left: 18px; color:#333; font-size:14px;">
          <li>${report.knowledge_base_files_added} knowledge base file(s) added</li>
          <li>${report.meetings_scheduled} meeting(s) scheduled</li>
          <li>${report.connected_integrations.length} integration(s) connected: ${report.connected_integrations.join(", ") || "none"}</li>
        </ul>

        <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Sent automatically by AI Business OS</p>
      </div>
    `,
  });
}
