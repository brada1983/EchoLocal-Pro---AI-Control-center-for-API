import { NextRequest, NextResponse } from "next/server";
import * as ollama from "@server/ollama-proxy";
import { getDb } from "@db/client";
import { insertRequestLog } from "@db/queries/requests";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.model || !Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "Missing model or messages" }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const data =
      process.env.MOCK_COLLECTORS === "1"
        ? { message: { role: "assistant", content: "(mock) chat response" }, model: body.model }
        : await ollama.chat(body);

    await logResult(body.model, "/api/chat", 200, Date.now() - startedAt);
    return NextResponse.json(data);
  } catch (err) {
    await logResult(body.model, "/api/chat", 502, Date.now() - startedAt, (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

async function logResult(model: string, route: string, statusCode: number, latencyMs: number, error?: string) {
  const db = await getDb();
  insertRequestLog(db, {
    ts: Math.floor(Date.now() / 1000),
    service: "ollama",
    route,
    statusCode,
    latencyMs,
    model,
    error,
  });
}
