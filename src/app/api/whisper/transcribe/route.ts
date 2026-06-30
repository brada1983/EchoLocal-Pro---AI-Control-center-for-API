import { NextRequest, NextResponse } from "next/server";
import * as whisper from "@server/whisper-proxy";
import { getDb } from "@db/client";
import { insertRequestLog } from "@db/queries/requests";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const model = (form.get("model") as string) || "whisper-1";
  const language = (form.get("language") as string) || undefined;

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const data =
      process.env.MOCK_COLLECTORS === "1"
        ? { text: "(mock) transcription result", segments: [], language: "en" }
        : await whisper.transcribe(file, { model, language });

    await logResult(model, 200, Date.now() - startedAt);
    return NextResponse.json(data);
  } catch (err) {
    await logResult(model, 502, Date.now() - startedAt, (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

async function logResult(model: string, statusCode: number, latencyMs: number, error?: string) {
  const db = await getDb();
  insertRequestLog(db, {
    ts: Math.floor(Date.now() / 1000),
    service: "whisper",
    route: "/v1/audio/transcriptions",
    statusCode,
    latencyMs,
    model,
    error,
  });
}
