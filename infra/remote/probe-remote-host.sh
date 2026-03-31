#!/usr/bin/env bash
set -euo pipefail

echo "# Remote Host Audit"
echo
echo "timestamp: $(date -Is)"
echo "hostname: $(hostname)"
echo

echo "## os-release"
if [[ -f /etc/os-release ]]; then
  cat /etc/os-release
else
  echo "missing: /etc/os-release"
fi
echo

echo "## uname"
uname -a || true
echo

echo "## init"
if command -v systemctl >/dev/null 2>&1; then
  systemctl --version | head -n 1
else
  echo "systemctl: unavailable"
fi
echo

echo "## node"
if command -v node >/dev/null 2>&1; then
  node -v
else
  echo "node: unavailable"
fi

if command -v npm >/dev/null 2>&1; then
  npm -v
else
  echo "npm: unavailable"
fi
echo

echo "## memory"
free -h || true
echo

echo "## disk"
df -h || true
echo

echo "## browsers"
command -v google-chrome || true
command -v chromium || true
command -v chromium-browser || true
command -v microsoft-edge || true
echo

echo "## listening ports"
ss -ltnp || true
