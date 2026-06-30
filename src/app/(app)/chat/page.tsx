"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocketChannel } from "@rootlib/ws-client";
import { ChatSidebar, type Conversation } from "@/components/ChatSidebar";
import { ChatMessage, type ChatMessageData, type ChatAttachment } from "@/components/ChatMessage";
import { ChatInput, type OllamaModelOption } from "@/components/ChatInput";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [models, setModels] = useState<OllamaModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [streamingText, setStreamingText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/chat/conversations");
    setConversations(await res.json());
  }, []);

  useEffect(() => {
    refreshConversations();
    fetch("/api/ollama/tags")
      .then((r) => r.json())
      .then((data) => {
        const list: OllamaModelOption[] = data.models ?? [];
        setModels(list);
        if (list.length > 0) setSelectedModel((m) => m || list[0].name);
      })
      .catch(() => {});
  }, [refreshConversations]);

  const loadMessages = useCallback(async (id: number) => {
    const res = await fetch(`/api/chat/conversations/${id}/messages`);
    const data = await res.json();
    setMessages(
      data.map((row: { role: string; content: string; attachments: ChatAttachment[] }) => ({
        role: row.role,
        content: row.content,
        attachments: row.attachments,
      }))
    );
  }, []);

  async function selectConversation(id: number) {
    setActiveId(id);
    setStreamingText("");
    await loadMessages(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) setSelectedModel(conv.model);
  }

  async function newConversation() {
    if (!selectedModel) return;
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel }),
    });
    const conv = await res.json();
    await refreshConversations();
    setActiveId(conv.id);
    setMessages([]);
    setStreamingText("");
  }

  async function deleteConversation(id: number) {
    await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    await refreshConversations();
  }

  const channels = activeId ? [`chat:${activeId}`] : [];
  useWebSocketChannel(
    channels,
    useCallback(
      (msg) => {
        if (msg.type === "chat-delta") {
          const data = msg.data as { message?: { content?: string } };
          if (data.message?.content) setStreamingText((t) => t + data.message?.content);
        }
        if (msg.type === "chat-done") {
          setSending(false);
          setStreamingText("");
          if (activeId) loadMessages(activeId);
        }
      },
      [activeId, loadMessages]
    )
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  async function handleSend(content: string, attachments: ChatAttachment[]) {
    let conversationId = activeId;
    if (!conversationId) {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel }),
      });
      const conv = await res.json();
      conversationId = conv.id;
      setActiveId(conv.id);
      await refreshConversations();
    }

    setMessages((m) => [...m, { role: "user", content, attachments }]);
    setSending(true);
    setStreamingText("");

    await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, model: selectedModel, content, attachments }),
    });
    refreshConversations();
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !streamingText && (
            <p className="text-sm text-text-secondary text-center mt-10">
              Start a conversation with a local model.
            </p>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} role={m.role} content={m.content} attachments={m.attachments} />
          ))}
          {streamingText && <ChatMessage role="assistant" content={streamingText} />}
          {sending && !streamingText && (
            <div className="flex items-center gap-2 text-xs text-text-secondary px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
        <ChatInput
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onSend={handleSend}
          disabled={sending}
        />
      </div>
    </div>
  );
}
