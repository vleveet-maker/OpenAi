#!/usr/bin/env bash
set -euo pipefail

: "${WORKER_AGENT_DIR:=/opt/owmcgp-remote-relay/services/worker-agent}"
: "${WORKER_NODE_BIN:=/usr/local/bin/node}"
: "${WORKER_DISPLAY_WAIT_SECONDS:=30}"
: "${DISPLAY:=:2}"

if [[ -z "${WORKER_PROFILE_PATH:-}" ]]; then
  echo "WORKER_PROFILE_PATH is required" >&2
  exit 1
fi

mkdir -p "$WORKER_PROFILE_PATH"

if command -v xdpyinfo >/dev/null 2>&1; then
  for _ in $(seq 1 "$WORKER_DISPLAY_WAIT_SECONDS"); do
    if xdpyinfo >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

cd "$WORKER_AGENT_DIR"
exec "$WORKER_NODE_BIN" dist/server.js
