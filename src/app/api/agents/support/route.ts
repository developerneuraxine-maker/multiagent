import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const url = new URL(request.url);
  const res = await fetch(`${url.origin}/api/agents/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
    body: JSON.stringify({ ...body, agentType: "support" }),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
