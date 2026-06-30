import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Called by Vercel Cron daily. Triggers CEO Master Workflow for all businesses
// that have daily_run_time configured and it matches the current hour.
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
    return NextResponse.json({ triggered: 0 });
  }

  const now = new Date();
  const currentHour = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  }).slice(0, 5);

  const { triggerMasterWorkflow } = await import("@/lib/n8n");
  let triggered = 0;

  for (const business of businesses) {
    const runTime = (business as { daily_run_time?: string }).daily_run_time ?? "09:00";
    if (runTime !== currentHour) continue;

    triggerMasterWorkflow(business).catch((err: unknown) =>
      console.error(`[cron] Failed for business ${business.id}:`, err)
    );

    await db.from("activity_feed").insert({
      business_id: business.id,
      action: "Daily CEO Agent analysis triggered automatically",
      details: { event: "daily_cron_run", run_time: currentHour },
    });

    triggered++;
  }

  return NextResponse.json({ triggered, checked: businesses.length, time: currentHour });
}
