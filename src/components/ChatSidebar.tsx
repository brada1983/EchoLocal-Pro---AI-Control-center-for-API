"use client";

import clsx from "clsx";
import { Plus, Trash2, MessageSquare } from "lucide-react";

export type Conversation = {
  id: number;
  title: string | null;
  model: string;
  updated_at: number;
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="w-64 shrink-0 border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <button className="btn-secondary w-full" onClick={onNew}>
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-text-secondary px-2 py-3">No conversations yet.</p>
        )}
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              className={clsx(
                "group flex items-center gap-2 px-2.5 py-2 rounded text-sm cursor-pointer transition-colors",
                active
                  ? "bg-background-tertiary text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-tertiary"
              )}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{c.title || c.model}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent-red transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                aria-label="Delete conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
