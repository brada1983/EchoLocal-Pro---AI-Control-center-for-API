import { NextRequest, NextResponse } from "next/server";
import * as ollama from "@server/ollama-proxy";
import hub from "@server/ws/hub-instance";
import { chatDeltaMessage, chatDoneMessage } from "@server/ws/protocol";
import { getDb } from "@db/client";
import { getMessages, insertMessage, touchConversation } from "@db/queries/chats";
import { insertRequestLog } from "@db/queries/requests";

type Attachment = {
  type: "image" | "audio" | "document";
  name?: string;
  dataUrl?: string;
  text?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const conversationId = Number(body?.conversationId);
  if (!conversationId || typeof body?.model !== "string" || typeof body?.content !== "string") {
    return NextResponse.json({ error: "Missing conversationId, model, or content" }, { status: 400 });
  }
  const model: string = body.model;
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments : [];

  const db = await getDb();
  insertMessage(db, conversationId, "user", body.content, attachments);
  touchConversation(db, conversationId);

  type ChatMessageRow = { role: string; content: string; attachments: Attachment[] };
  const history: ChatMessageRow[] = getMessages(db, conversationId);
  const messages = history.map((row) => toOllamaMessage(row));
  const channel = `chat:${conversationId}`;

  if (process.env.MOCK_COLLECTORS === "1") {
    mockChatStream(channel, conversationId, model, db);
    return NextResponse.json({ ok: true, mock: true });
  }

  const startedAt = Date.now();
  let accumulated = "";
  ollama
    .chatStream({ model, messages }, (chunk: { message?: { content?: string }; done?: boolean }) => {
      if (chunk.message?.content) accumulated += chunk.message.content;
      hub.broadcast(channel, chatDeltaMessage(chunk));
      if (chunk.done) {
        insertMessage(db, conversationId, "assistant", accumulated, undefined);
        touchConversation(db, conversationId);
        insertRequestLog(db, {
          ts: Math.floor(Date.now() / 1000),
          service: "ollama",
          route: "/api/chat/send",
          statusCode: 200,
          latencyMs: Date.now() - startedAt,
          model,
        });
        hub.broadcast(channel, chatDoneMessage({ conversationId }));
      }
    })
    .catch((err: Error) => {
      insertRequestLog(db, {
        ts: Math.floor(Date.now() / 1000),
        service: "ollama",
        route: "/api/chat/send",
        statusCode: 502,
        latencyMs: Date.now() - startedAt,
        model,
        error: err.message,
      });
      hub.broadcast(channel, chatDoneMessage({ conversationId, error: err.message }));
    });

  return NextResponse.json({ ok: true });
}

function toOllamaMessage(row: { role: string; content: string; attachments: Attachment[] }) {
  const images = row.attachments
    .filter((a) => a.type === "image" && a.dataUrl)
    .map((a) => (a.dataUrl as string).replace(/^data:image\/\w+;base64,/, ""));

  const textAttachments = row.attachments.filter((a) => a.type !== "image" && a.text);
  const content =
    row.content +
    textAttachments.map((a) => `\n\n[Attached: ${a.name ?? "file"}]\n${a.text}`).join("");

  return images.length > 0
    ? { role: row.role, content, images }
    : { role: row.role, content };
}

function mockChatStream(channel: string, conversationId: number, model: string, db: Awaited<ReturnType<typeof getDb>>) {
  const reply = "(mock) This is a simulated streaming response for local development.";
  const words = reply.split(" ");
  let accumulated = "";
  words.forEach((word, i) => {
    setTimeout(() => {
      const piece = (i === 0 ? "" : " ") + word;
      accumulated += piece;
      const done = i === words.length - 1;
      hub.broadcast(channel, chatDeltaMessage({ message: { role: "assistant", content: piece }, done }));
      if (done) {
        insertMessage(db, conversationId, "assistant", accumulated, undefined);
        touchConversation(db, conversationId);
        hub.broadcast(channel, chatDoneMessage({ conversationId }));
      }
    }, i * 80);
  });
}
