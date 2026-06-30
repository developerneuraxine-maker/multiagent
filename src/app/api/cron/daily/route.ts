import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Called by Vercel Cron once a day (~9am IST). Triggers CEO Master Workflow
// for every onboarded business. Vercel's Hobby plan only allows once-per-day
// cron jobs, so this fires for all businesses at the same fixed time rather
// than honoring each business's individual daily_run_time preference.
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

  const { triggerMasterWorkflow } = await import("@/lib/n8n");
  let triggered = 0;

  for (const business of businesses) {
    triggerMasterWorkflow(business).catch((err: unknown) =>
      console.error(`[cron] Failed for business ${business.id}:`, err)
    );

    await db.from("activity_feed").insert({
      business_id: business.id,
      action: "Daily CEO Agent analysis triggered automatically",
      details: { event: "daily_cron_run" },
    });

    triggered++;
  }

  return NextResponse.json({ triggered, checked: businesses.length });
}
