import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { getMessages } from "@db/queries/chats";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  return NextResponse.json(getMessages(db, Number(id)));
}
