import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { createConversation, listConversations } from "@db/queries/chats";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(listConversations(db));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (typeof body?.model !== "string" || !body.model.trim()) {
    return NextResponse.json({ error: "Missing model" }, { status: 400 });
  }

  const db = await getDb();
  const conversation = createConversation(db, body.model, body.title ?? null);
  return NextResponse.json(conversation, { status: 201 });
}
