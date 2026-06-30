import { NextRequest, NextResponse } from "next/server";
import * as ollama from "@server/ollama-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const model = body?.model;
  if (typeof model !== "string" || !model.trim()) {
    return NextResponse.json({ error: "Missing model name" }, { status: 400 });
  }
  if (process.env.MOCK_COLLECTORS === "1") return NextResponse.json({ ok: true, mock: true });

  try {
    await ollama.deleteModel(model);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
