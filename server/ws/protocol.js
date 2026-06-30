// Shared WebSocket message shapes between server collectors and browser clients.
// Plain JS (not TS) because server.js and everything under server/ runs directly
// via `node`, with no build step — only the Next.js app under src/ goes through
// the Next/TypeScript compiler. See server/README.md.

/**
 * @typedef {'stats'|'logs:whisper-api'|'logs:ollama'|'alerts'} Channel
 */

/** @returns {{type:'stats', data: object}} */
function statsMessage(data) {
  return { type: "stats", data };
}

/** @returns {{type:'log', channel: string, line: object}} */
function logMessage(channel, line) {
  return { type: "log", channel, line };
}

/** @returns {{type:'alert', data: object}} */
function alertMessage(data) {
  return { type: "alert", data };
}

/** @returns {{type:'pull-progress', data: object}} */
function pullProgressMessage(data) {
  return { type: "pull-progress", data };
}

/** @returns {{type:'chat-delta', data: object}} */
function chatDeltaMessage(data) {
  return { type: "chat-delta", data };
}

/** @returns {{type:'chat-done', data: object}} */
function chatDoneMessage(data) {
  return { type: "chat-done", data };
}

module.exports = {
  statsMessage,
  logMessage,
  alertMessage,
  pullProgressMessage,
  chatDeltaMessage,
  chatDoneMessage,
};
