import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { getConfig, setConfig, getRecentEvents } from "@db/queries/alerts";

export async function GET() {
  const db = await getDb();
  const config = getConfig(db);
  const events = getRecentEvents(db, 50);
  return NextResponse.json({ config, events });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const db = await getDb();
  setConfig(db, body);
  return NextResponse.json({ ok: true });
}
