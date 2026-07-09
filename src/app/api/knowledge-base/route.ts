import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function extractPdfContent(buffer: Buffer, fileName: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";

  try {
    const base64 = buffer.toString("base64");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL text content from this PDF document called "${fileName}". Return the complete text preserving headings, lists, tables, and all key data. Be thorough — include everything.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 4000,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("[KB] OpenAI PDF extraction failed:", err);
    return "";
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const businessId = formData.get("businessId") as string | null;

  if (!file || !businessId) {
    return NextResponse.json({ error: "file and businessId required" }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { count } = await supabase
    .from("knowledge_base")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Maximum 10 files allowed" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = `${businessId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const db = await createServiceClient();

  const { error: uploadError } = await db.storage
    .from("business-documents")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from("business-documents").getPublicUrl(path);

  // Extract text content from PDF using OpenAI
  let extractedContent: string | null = null;
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    console.log(`[KB] Extracting content from ${file.name}...`);
    extractedContent = await extractPdfContent(buffer, file.name);
    if (extractedContent) {
      console.log(`[KB] Extracted ${extractedContent.length} chars from ${file.name}`);
    }
  }

  const { data: record, error: dbError } = await db
    .from("knowledge_base")
    .insert({
      business_id: businessId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      content: extractedContent,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({
    file: record,
    content_extracted: !!extractedContent,
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: record } = await supabase
    .from("knowledge_base")
    .select("*, businesses!inner(owner_id)")
    .eq("id", id)
    .single();

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const biz = record.businesses as { owner_id: string };
  if (biz.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await createServiceClient();
  const urlPath = new URL(record.file_url).pathname;
  const storagePath = urlPath.split("/business-documents/")[1];
  if (storagePath) await db.storage.from("business-documents").remove([storagePath]);

  await db.from("knowledge_base").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
