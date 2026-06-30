#!/usr/bin/env bash
# Deploys by having the LXC `git pull` the GitHub repo directly, rather than
# syncing from whatever machine runs this script — avoids depending on rsync
# being installed on the client (it isn't, on a plain Windows/git-bash setup)
# and avoids ever copying a Windows-built node_modules/.next onto Linux.
# node_modules/.next are (re)built fresh on the LXC every deploy.
#
# Prereqs (one-time): scripts/setup-sudoers.sh has been run on the LXC, and
# /opt/echolocal-ai-control/.env exists there (copy from .env.example).
#
# Usage: scripts/deploy.sh [user@host] [git-repo-url]
set -euo pipefail

REMOTE="${1:-root@192.168.0.3}"
REPO_URL="${2:-https://github.com/brada1983/EchoLocal-Pro---AI-Control-center-for-API.git}"
REMOTE_DIR="/opt/echolocal-ai-control"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/echolocal_ai_control_deploy}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "[deploy] pulling $REPO_URL into $REMOTE:$REMOTE_DIR and rebuilding"
ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
if [ -d .git ]; then
  git fetch origin main
  git reset --hard origin/main
else
  git init -q
  git remote add origin "$REPO_URL"
  git fetch origin main
  git checkout -f main
fi
npm ci --omit=dev
npm run build
chown -R echolocal-ai:echolocal-ai "$REMOTE_DIR"
cp systemd/echolocal-ai-control.service /etc/systemd/system/echolocal-ai-control.service
systemctl daemon-reload
systemctl enable --now echolocal-ai-control
systemctl restart echolocal-ai-control
sleep 2
systemctl status echolocal-ai-control --no-pager
EOF

echo "[deploy] done"
