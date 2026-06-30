# EchoLocal AI Control

Monitoring & control center for the two AI services behind EchoLocal Pro's Remote API:
a Whisper transcription server (`whisper-api`, FastAPI, GPU via whisper.cpp/Vulkan
with automatic CPU/faster-whisper fallback) and Ollama (GPU via ROCm), both running
on a Proxmox LXC.

Standalone Node.js + Next.js app with a custom `server.js` (Next request handler +
a `ws` WebSocket server on the same HTTP server) so live stats/logs push to the
browser without a second process or port. Deployed as a systemd service on the LXC.

## Local development

```bash
npm install
cp .env.example .env.local   # set SESSION_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD
npm run build                # runs `next build --webpack` — see note below
node server.js               # NODE_ENV unset/dev: Next dev compiler + HMR
```

To develop the UI without LXC access, set `MOCK_COLLECTORS=1` in `.env.local` —
every collector (system stats, GPU, service status, logs, request metrics) then
emits synthetic data instead of shelling out to `rocm-smi`/`systemctl`/`journalctl`
or polling the real Whisper/Ollama servers.

### Why `--webpack` instead of Turbopack

`next build`'s default Turbopack bundler currently chokes on `require("node:sqlite")`
inside the CommonJS `db/client.js` module (`Unsupported external type Url for
commonjs reference`). `npm run build` passes `--webpack` to sidestep this; if a
future Next/Turbopack release fixes it, this can be dropped.

### Why migrations are embedded JS, not `.sql` files

Next's bundler rewrites `__dirname` per API route when it traces/bundles a route's
dependencies (each `route.ts` gets its own webpack bundle). A `fs.readdirSync` call
relative to `__dirname` resolves against the *bundle's* location, not the real
`db/` source folder, so `.sql` files referenced that way silently 404. Migrations
live as template-literal strings in `db/migrations.js` instead — see that file
for the same reasoning inline.

### Why `DB_PATH` defaults off `process.cwd()`, not `__dirname`

Same root cause: each bundled API route would otherwise compute a different
"correct" default path. `process.cwd()` is stable across `server.js` and every
bundled route since they all run in the same Node process.

## Architecture

See the project's build plan for the full design (repo layout, WebSocket protocol,
sudoers-based systemctl control, the `whisper-api` `/metrics` instrumentation patch,
and the phased deploy order). In short:

- `server.js` — entrypoint; boots Next, the WS hub, and background collectors.
- `server/` — collectors (stats/GPU/services/logs/alerts), systemctl control
  (allowlisted, sudo-gated), Ollama/Whisper proxy clients, Telegram alerts.
- `db/` — `node:sqlite`-backed storage (no native build step) for stats history,
  request logs, alert config/events, and app config.
- `lib/auth/` — bcrypt password hashing + stateless signed-cookie sessions.
- `src/app/` — the Next.js UI (App Router), gated by `src/middleware.ts`.

## Known limitations

- Ollama usage stats only capture traffic that flows through this dashboard's
  own proxy (`server/ollama-proxy.js`) — Ollama itself exposes no request-log
  endpoint, so direct EchoLocal Pro → Ollama traffic isn't visible here.
- Whisper GPU acceleration runs via whisper.cpp + Vulkan (ctranslate2/ROCm has no
  upstream backend for this iGPU, so that path was abandoned). `/health` reports
  `device: "vulkan"` when active; falls back to CPU/faster-whisper automatically
  if Vulkan init fails, and the Whisper page reflects whichever is actually active.
