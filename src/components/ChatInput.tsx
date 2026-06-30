"use client";

import { useRef, useState } from "react";
import { Send, Paperclip, Image as ImageIcon, Music, X, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { ChatAttachment } from "@/components/ChatMessage";

export type OllamaModelOption = { name: string; capabilities?: string[] };

export function ChatInput({
  models,
  selectedModel,
  onModelChange,
  onSend,
  disabled,
}: {
  models: OllamaModelOption[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSend: (content: string, attachments: ChatAttachment[]) => void;
  disabled?: boolean;
}) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const visionCapable = models
    .find((m) => m.name === selectedModel)
    ?.capabilities?.includes("vision");

  async function uploadAttachment(file: File, type: "audio" | "image" | "document") {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      const res = await fetch("/api/chat/attach", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) setPending((p) => [...p, data]);
    } finally {
      setUploading(false);
    }
  }

  function removePending(index: number) {
    setPending((p) => p.filter((_, i) => i !== index));
  }

  function handleSend() {
    if (!content.trim() && pending.length === 0) return;
    onSend(content.trim(), pending);
    setContent("");
    setPending([]);
  }

  return (
    <div className="border-t border-border p-3 space-y-2">
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pending.map((a, i) => (
            <span key={i} className="badge bg-background-tertiary text-text-secondary gap-1">
              {a.name ?? a.type}
              <button onClick={() => removePending(i)} aria-label="Remove attachment">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <select
          className="input w-40 shrink-0"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>

        <button
          className="btn-icon"
          title="Attach audio"
          onClick={() => audioInputRef.current?.click()}
          disabled={uploading}
        >
          <Music className="w-4 h-4" />
        </button>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAttachment(file, "audio");
            e.target.value = "";
          }}
        />

        <button
          className="btn-icon"
          title="Attach document"
          onClick={() => documentInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={documentInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAttachment(file, "document");
            e.target.value = "";
          }}
        />

        <button
          className={clsx("btn-icon", !visionCapable && "opacity-40 cursor-not-allowed")}
          title={visionCapable ? "Attach image" : "Selected model has no vision support"}
          onClick={() => visionCapable && imageInputRef.current?.click()}
          disabled={uploading || !visionCapable}
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAttachment(file, "image");
            e.target.value = "";
          }}
        />

        <textarea
          className="input flex-1 resize-none"
          rows={1}
          placeholder="Send a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={disabled || uploading || (!content.trim() && pending.length === 0)}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
