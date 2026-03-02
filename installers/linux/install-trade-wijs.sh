#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SERVICE_NAME="trade-wijs"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
STARTUP_SCRIPT="$PROJECT_DIR/installers/linux/startup-trade-wijs.sh"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is missing." >&2
  exit 1
fi

if [[ ! -f "$STARTUP_SCRIPT" ]]; then
  echo "Missing startup script: $STARTUP_SCRIPT" >&2
  exit 1
fi

chmod +x "$STARTUP_SCRIPT"
"$STARTUP_SCRIPT" "$PROJECT_DIR"

SERVICE_CONTENT="[Unit]
Description=Trade Wijs containers
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${PROJECT_DIR}
ExecStart=/bin/bash ${STARTUP_SCRIPT} ${PROJECT_DIR}
ExecStop=/usr/bin/docker compose down
RemainAfterExit=yes
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target"

echo "$SERVICE_CONTENT" | sudo tee "$SERVICE_FILE" >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"

echo "Installer completed."
echo "Containers are running and will auto-start after reboot."
echo "Open: http://localhost:3175"
