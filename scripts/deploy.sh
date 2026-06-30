#!/usr/bin/env bash
# Ships source (not node_modules/.next — those are built fresh on the LXC,
# avoiding any Windows-built-binary-on-Linux cross-platform risk) to the LXC,
# installs production deps, builds, and restarts the systemd service.
#
# Prereqs (one-time): scripts/setup-sudoers.sh has been run on the LXC, and
# /opt/echolocal-ai-control/.env exists there (copy from .env.example).
#
# Usage: scripts/deploy.sh [user@host]
set -euo pipefail

REMOTE="${1:-root@192.168.0.3}"
REMOTE_DIR="/opt/echolocal-ai-control"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/echolocal_ai_control_deploy}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "[deploy] syncing source to $REMOTE:$REMOTE_DIR"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude node_modules \
  --exclude .next \
  --exclude data \
  --exclude .git \
  --exclude .env.local \
  --exclude '*.sqlite3*' \
  ./ "$REMOTE:$REMOTE_DIR/"

echo "[deploy] installing deps, building, restarting service"
ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
npm ci --omit=dev
npm run build
chown -R echolocal-ai:echolocal-ai "$REMOTE_DIR"
systemctl daemon-reload
cp -n systemd/echolocal-ai-control.service /etc/systemd/system/echolocal-ai-control.service 2>/dev/null || true
diff -q systemd/echolocal-ai-control.service /etc/systemd/system/echolocal-ai-control.service >/dev/null 2>&1 || \
  cp systemd/echolocal-ai-control.service /etc/systemd/system/echolocal-ai-control.service
systemctl daemon-reload
systemctl enable --now echolocal-ai-control
systemctl restart echolocal-ai-control
systemctl status echolocal-ai-control --no-pager
EOF

echo "[deploy] done"
