import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateWeeklyReport } from "@/lib/weekly-report";

// Called by Vercel Cron once a week. Generates and emails a weekly report
// for every fully-onboarded business.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await createServiceClient();
  const { data: businesses } = await db
    .from("businesses")
    .select("*")
    .eq("setup_completed", true);

  if (!businesses || businesses.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  let generated = 0;
  let emailed = 0;

  for (const business of businesses) {
    try {
      const { email_sent } = await generateWeeklyReport(business);
      generated++;
      if (email_sent) emailed++;
    } catch (err) {
      console.error(`[cron/weekly] Failed for business ${business.id}:`, err);
    }
  }

  return NextResponse.json({ generated, emailed, checked: businesses.length });
}
