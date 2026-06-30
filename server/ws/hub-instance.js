// Singleton hub instance, required by both server.js and any API route that
// needs to broadcast (e.g. the Ollama pull-progress route). Stored on
// `globalThis` rather than relying on Node's module cache: Next's bundler
// gives each API route its own separate webpack bundle (and its own copy of
// every local module it requires), so a plain module-level `const hub = new
// WebSocketHub()` would create a DIFFERENT object per route than the one
// server.js's upgrade handler registers sockets into. `globalThis` is a true
// process-wide singleton regardless of which bundle is executing.
const { WebSocketHub } = require("./hub");

const KEY = "__echolocalAiControlHub";

if (!globalThis[KEY]) {
  globalThis[KEY] = new WebSocketHub();
}

module.exports = globalThis[KEY];
