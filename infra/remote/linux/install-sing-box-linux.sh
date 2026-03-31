#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
INSTALL_DIR="${2:-/usr/local/bin}"
ARCHIVE_PATH=""
TEMP_DIR=""

cleanup() {
  if [[ -n "$ARCHIVE_PATH" && -f "$ARCHIVE_PATH" ]]; then
    rm -f "$ARCHIVE_PATH"
  fi

  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

resolve_latest_version() {
  python3 - <<'PY'
import json
import urllib.request

with urllib.request.urlopen(
    "https://api.github.com/repos/SagerNet/sing-box/releases/latest",
    timeout=30,
) as response:
    payload = json.load(response)
    print(str(payload["tag_name"]).lstrip("v"))
PY
}

if [[ -z "$VERSION" ]]; then
  VERSION="$(resolve_latest_version)"
fi

ARCHIVE="sing-box-${VERSION}-linux-amd64.tar.gz"
ARCHIVE_URL="https://github.com/SagerNet/sing-box/releases/download/v${VERSION}/${ARCHIVE}"
ARCHIVE_PATH="/tmp/${ARCHIVE}"
TEMP_DIR="$(mktemp -d)"

curl -fsSL "$ARCHIVE_URL" -o "$ARCHIVE_PATH"
tar -xzf "$ARCHIVE_PATH" -C "$TEMP_DIR"

BINARY_PATH="$(find "$TEMP_DIR" -type f -name sing-box | head -n 1)"

if [[ -z "$BINARY_PATH" ]]; then
  echo "sing-box binary not found in downloaded archive" >&2
  exit 1
fi

install -m 0755 "$BINARY_PATH" "${INSTALL_DIR}/sing-box"
echo "${INSTALL_DIR}/sing-box"
