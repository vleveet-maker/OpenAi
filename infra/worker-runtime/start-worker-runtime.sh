#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
export BROWSER_ACCESS_VNC_PORT="${BROWSER_ACCESS_VNC_PORT:-5900}"
export BROWSER_ACCESS_HTTP_PORT="${BROWSER_ACCESS_HTTP_PORT:-6080}"

XVFB_PID=""
FLUXBOX_PID=""
X11VNC_PID=""
WEBSOCKIFY_PID=""
APP_PID=""

cleanup() {
  for pid in "$APP_PID" "$WEBSOCKIFY_PID" "$X11VNC_PID" "$FLUXBOX_PID" "$XVFB_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

mkdir -p /tmp/.X11-unix

Xvfb :99 -screen 0 1280x1024x24 >/tmp/xvfb.log 2>&1 &
XVFB_PID=$!

sleep 1

fluxbox >/tmp/fluxbox.log 2>&1 &
FLUXBOX_PID=$!

x11vnc \
  -display :99 \
  -rfbport "${BROWSER_ACCESS_VNC_PORT}" \
  -forever \
  -shared \
  -localhost \
  -nopw >/tmp/x11vnc.log 2>&1 &
X11VNC_PID=$!

websockify \
  --web /usr/share/novnc/ \
  "${BROWSER_ACCESS_HTTP_PORT}" \
  "localhost:${BROWSER_ACCESS_VNC_PORT}" >/tmp/websockify.log 2>&1 &
WEBSOCKIFY_PID=$!

npm ci --prefix workers/agent --no-audit --no-fund
npm run dev --prefix workers/agent >/tmp/worker-agent.log 2>&1 &
APP_PID=$!

wait -n "$APP_PID" "$WEBSOCKIFY_PID" "$X11VNC_PID" "$FLUXBOX_PID" "$XVFB_PID"
EXIT_CODE=$?
cleanup
exit "$EXIT_CODE"
