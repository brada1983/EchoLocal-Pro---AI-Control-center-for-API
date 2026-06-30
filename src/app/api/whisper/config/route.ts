import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { getByPrefix, set } from "@db/queries/config";

const PREFIX = "whisper.";
const DEFAULTS: Record<string, string> = {
  model_size: "large-v3-turbo",
  default_language: "auto",
  beam_size: "5",
  vad_enabled: "1",
};

export async function GET() {
  const db = await getDb();
  const stored = getByPrefix(db, PREFIX);
  const result: Record<string, string> = { ...DEFAULTS };
  for (const [k, v] of Object.entries(stored)) {
    result[k.slice(PREFIX.length)] = v as string;
  }
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const db = await getDb();
  for (const key of Object.keys(DEFAULTS)) {
    if (body[key] !== undefined) set(db, `${PREFIX}${key}`, body[key]);
  }
  return NextResponse.json({
    ok: true,
    note: "Changes take effect after restarting whisper-api (Services page).",
  });
}
