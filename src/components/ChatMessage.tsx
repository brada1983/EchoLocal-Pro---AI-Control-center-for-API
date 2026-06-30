"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import { FileText, Music } from "lucide-react";
import { Badge } from "@/components/Badge";

export type ChatAttachment = {
  type: "image" | "audio" | "document";
  name?: string;
  dataUrl?: string;
  text?: string;
};

export type ChatMessageData = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

export function ChatMessage({ role, content, attachments = [] }: ChatMessageData) {
  const isUser = role === "user";
  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[75%] rounded-lg px-4 py-3 space-y-2",
          isUser ? "bg-accent-blue-muted/20 border border-accent-blue-muted/40" : "card"
        )}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <AttachmentChip key={i} attachment={a} />
            ))}
          </div>
        )}
        <div className="text-sm text-text-primary prose-chat">
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "..."}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.type === "image" && attachment.dataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.dataUrl}
        alt={attachment.name ?? "attached image"}
        className="w-16 h-16 object-cover rounded border border-border"
      />
    );
  }
  const Icon = attachment.type === "audio" ? Music : FileText;
  return (
    <Badge tone="neutral">
      <Icon className="w-3 h-3 mr-1" />
      {attachment.name ?? attachment.type}
    </Badge>
  );
}
