import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "socialsprouts1@gmail.com";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { customer_email, company_name, description, products, services, colors, style, image_urls } =
    body as {
      customer_email: string;
      company_name: string;
      description: string;
      products?: string | null;
      services?: string | null;
      colors?: string | null;
      style?: string | null;
      image_urls?: string[];
    };

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient.from("website_requests").insert({
    customer_email,
    company_name,
    description,
    products: products || null,
    services: services || null,
    colors: colors || null,
    style: style || null,
    image_urls: image_urls ?? [],
    status: "new",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire n8n auto-builder webhook — non-fatal if it fails
  const builderWebhook = process.env.WEBSITE_BUILDER_WEBHOOK_URL;
  if (builderWebhook) try {
    await fetch(builderWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: company_name,
        industry: "",
        services: [services, description].filter(Boolean).join(". "),
        colors: [colors, style].filter(Boolean).join(", "),
        phone: "",
        client_email: customer_email,
      }),
    });
  } catch {
    // request already saved to DB — webhook failure is non-fatal
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("website_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data });
}
