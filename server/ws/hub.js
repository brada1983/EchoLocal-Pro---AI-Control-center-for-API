// Channel-based broadcast hub. Collectors call hub.broadcast(channel, message)
// without knowing which/how many sockets are subscribed; sockets subscribe to
// channels via {type:'subscribe', channel} client messages (see auth.js for
// the upgrade-time auth gate, and server.js for the message routing).

class WebSocketHub {
  constructor() {
    /** @type {Map<string, Set<import('ws').WebSocket>>} */
    this.channels = new Map();
  }

  subscribe(channel, ws) {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel).add(ws);
  }

  unsubscribe(channel, ws) {
    const set = this.channels.get(channel);
    if (set) {
      set.delete(ws);
      if (set.size === 0) this.channels.delete(channel);
    }
  }

  /** Removes a socket from every channel it was subscribed to (on close). */
  removeSocket(ws) {
    for (const [channel, set] of this.channels) {
      set.delete(ws);
      if (set.size === 0) this.channels.delete(channel);
    }
  }

  broadcast(channel, message) {
    const set = this.channels.get(channel);
    if (!set || set.size === 0) return;
    const payload = JSON.stringify(message);
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }

  subscriberCount(channel) {
    return this.channels.get(channel)?.size ?? 0;
  }
}

module.exports = { WebSocketHub };
