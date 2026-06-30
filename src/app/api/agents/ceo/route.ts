import { NextResponse } from "next/server";
import type { AgentType } from "@/types/database";

async function runAgentHandler(request: Request, agentType: AgentType) {
  const body = await request.json();
  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;

  const res = await fetch(`${base}/api/agents/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") || "",
    },
    body: JSON.stringify({ ...body, agentType }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  return runAgentHandler(request, "ceo");
}
