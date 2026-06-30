#!/usr/bin/env bash
# Run ONCE on the LXC (as root) before the first deploy. Idempotent — safe to
# re-run. Creates the dedicated unprivileged user the dashboard runs as, a
# narrow sudoers rule scoped to exactly the systemctl calls it needs, group
# membership for read-only rocm-smi/journalctl access (no sudo needed for
# those), and a writable override file for Whisper model-size switching that
# avoids needing sudo for that path too.
#
# Usage: ssh root@192.168.0.3 'bash -s' < scripts/setup-sudoers.sh
set -euo pipefail

SVC_USER="echolocal-ai"
APP_DIR="/opt/echolocal-ai-control"
WHISPER_OVERRIDE_ENV="/opt/whisper-api/model-override.env"

if ! id "$SVC_USER" &>/dev/null; then
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SVC_USER"
  echo "[setup] created system user $SVC_USER"
else
  echo "[setup] user $SVC_USER already exists"
fi

# Read-only access to rocm-smi (video/render) and journalctl (systemd-journal)
# without any sudo grant — these never touch sudoers.
usermod -aG video,render,systemd-journal "$SVC_USER"
echo "[setup] added $SVC_USER to video,render,systemd-journal groups"

# Narrow sudoers rule: passwordless systemctl, only for these two units,
# only for these four verbs. Nothing else — no shell, no arbitrary args.
SUDOERS_FILE="/etc/sudoers.d/echolocal-ai-control"
cat > "$SUDOERS_FILE" <<EOF
$SVC_USER ALL=(root) NOPASSWD: /usr/bin/systemctl start whisper-api, \\
  /usr/bin/systemctl stop whisper-api, /usr/bin/systemctl restart whisper-api, \\
  /usr/bin/systemctl status whisper-api, /usr/bin/systemctl start ollama, \\
  /usr/bin/systemctl stop ollama, /usr/bin/systemctl restart ollama, \\
  /usr/bin/systemctl status ollama
EOF
chmod 440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE" || { echo "[setup] FATAL: invalid sudoers syntax"; rm -f "$SUDOERS_FILE"; exit 1; }
echo "[setup] wrote $SUDOERS_FILE"

# App directory the deploy script rsyncs into.
mkdir -p "$APP_DIR" "$APP_DIR/data"
chown -R "$SVC_USER:$SVC_USER" "$APP_DIR"
echo "[setup] prepared $APP_DIR"

# Whisper model-size switching writes here instead of needing sudo to edit
# whisper-api's systemd override directly. whisper-api.service's
# EnvironmentFile= list (see DONE-TODO.md sec 12) should include this path
# in addition to the existing ROCm override.conf — add it manually once:
#   systemctl edit whisper-api   # add: EnvironmentFile=-/opt/whisper-api/model-override.env
if [ ! -f "$WHISPER_OVERRIDE_ENV" ]; then
  touch "$WHISPER_OVERRIDE_ENV"
fi
chown "$SVC_USER:$SVC_USER" "$WHISPER_OVERRIDE_ENV"
echo "[setup] prepared $WHISPER_OVERRIDE_ENV (writable by $SVC_USER, no sudo needed)"

echo "[setup] done. Remaining manual step: confirm whisper-api.service reads"
echo "        $WHISPER_OVERRIDE_ENV via 'systemctl edit whisper-api' (see comment above)."
