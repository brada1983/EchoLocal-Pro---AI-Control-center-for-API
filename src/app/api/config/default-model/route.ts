import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { getByPrefix, set } from "@db/queries/config";

const PREFIX = "default_model.";

export async function GET() {
  const db = await getDb();
  const entries = getByPrefix(db, PREFIX);
  const result = Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k.slice(PREFIX.length), v])
  );
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const useCase = body?.useCase;
  const model = body?.model;
  if (typeof useCase !== "string" || typeof model !== "string") {
    return NextResponse.json({ error: "Missing useCase or model" }, { status: 400 });
  }
  const db = await getDb();
  set(db, `${PREFIX}${useCase}`, model);
  return NextResponse.json({ ok: true });
}
