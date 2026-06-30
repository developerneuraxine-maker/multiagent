import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyReport } from "@/lib/weekly-report";

// Manual trigger — lets the user generate a weekly report on demand instead of
// waiting for the Sunday cron, e.g. for testing or an off-cycle check-in.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await request.json();
  if (!businessId) {
    return NextResponse.json({ error: "businessId required" }, { status: 400 });
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  try {
    const { report, email_sent } = await generateWeeklyReport(business);
    return NextResponse.json({ success: true, report, email_sent });
  } catch (err) {
    console.error("[reports/weekly] Generation failed:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to generate weekly report",
    }, { status: 500 });
  }
}
