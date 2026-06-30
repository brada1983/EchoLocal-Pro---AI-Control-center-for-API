import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { deleteConversation, renameConversation } from "@db/queries/chats";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.title !== "string") {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const db = await getDb();
  renameConversation(db, Number(id), body.title);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  deleteConversation(db, Number(id));
  return NextResponse.json({ ok: true });
}
