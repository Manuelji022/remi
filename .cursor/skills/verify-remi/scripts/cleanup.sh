#!/usr/bin/env bash
# Kill only the Vite and Chrome processes this skill started. Keep evidence and logs.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)
RUN_DIR="$ROOT/.cursor/skills/verify-remi/run"

kill_group() {
  local label=$1
  local pid_file=$2
  if [[ ! -s "$pid_file" ]]; then
    echo "cleanup: no $label pid file"
    return 0
  fi
  local pid
  pid=$(cat "$pid_file")
  if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
    echo "cleanup: $label pid file is not numeric, leaving it" >&2
    return 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    # Negative pid is the process group created by setsid in launch.sh / the drive script.
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.25
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 -- "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
    echo "cleanup: stopped $label pid $pid"
  else
    echo "cleanup: $label pid $pid was already gone"
  fi
}

kill_group chrome "$RUN_DIR/chrome.pid"
kill_group dev "$RUN_DIR/dev.pid"

if [[ -d "$RUN_DIR/chrome-profile" ]]; then
  rm -rf "$RUN_DIR/chrome-profile"
  echo "cleanup: removed chrome profile"
fi

if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "cleanup: port 3001 is still listening. Not killing it, because it is not the recorded pid." >&2
  lsof -nP -iTCP:3001 -sTCP:LISTEN >&2 || true
  exit 1
fi

echo "cleanup: port 3001 is free. Evidence under .cursor/skills/verify-remi/evidence/ was left in place."
