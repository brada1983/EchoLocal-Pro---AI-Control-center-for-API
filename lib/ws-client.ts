"use client";

import { useEffect, useRef, useState } from "react";

type ServerMessage =
  | { type: "stats"; data: unknown }
  | { type: "log"; channel: string; line: { ts: number; raw: string } }
  | { type: "alert"; data: { kind: string; message: string; ts: number } }
  | { type: "pull-progress"; data: unknown }
  | { type: "chat-delta"; data: unknown }
  | { type: "chat-done"; data: unknown }
  | { type: "pong" };

/**
 * Subscribes to one or more WS channels for the lifetime of the component,
 * with exponential-backoff reconnect. `onMessage` is called for every
 * message on any subscribed channel (filter by `type`/`channel` yourself).
 */
export function useWebSocketChannel(channels: string[], onMessage: (msg: ServerMessage) => void) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectDelay = 1000;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        setConnected(true);
        reconnectDelay = 1000;
        channels.forEach((channel) => ws?.send(JSON.stringify({ type: "subscribe", channel })));
      };

      ws.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch {
          // ignore malformed message
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (stopped) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };

      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
    // channels is expected to be a stable array (defined outside render, or memoized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.join(",")]);

  return { connected };
}
