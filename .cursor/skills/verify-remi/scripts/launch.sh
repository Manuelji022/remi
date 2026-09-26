#!/usr/bin/env bash
# Start the Remi Vite dev server for verification. Refuses a shared port 3001.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)
RUN_DIR="$ROOT/.cursor/skills/verify-remi/run"
LOG="$RUN_DIR/dev.log"
PID_FILE="$RUN_DIR/dev.pid"

mkdir -p "$RUN_DIR"

listeners() {
  lsof -nP -iTCP:3001 -sTCP:LISTEN 2>/dev/null || true
}

if [[ -s "$PID_FILE" ]]; then
  old_pid=$(cat "$PID_FILE")
  if kill -0 "$old_pid" 2>/dev/null; then
    echo "launch: already running as pid $old_pid. Refusing to start another server." >&2
    exit 1
  fi
fi

existing=$(listeners)
if [[ -n "$existing" ]]; then
  echo "launch: port 3001 is already taken. Refusing to double-drive a shared instance." >&2
  echo "$existing" >&2
  exit 1
fi

cd "$ROOT"
: >"$LOG"
# New session so cleanup can kill the whole pnpm/vite group and nothing else.
setsid pnpm --filter frontend dev >>"$LOG" 2>&1 < /dev/null &
echo $! >"$PID_FILE"

for _ in $(seq 1 60); do
  if grep -q "Local:   http://localhost:3001/" "$LOG"; then
    echo "launch: ready http://localhost:3001/ pid $(cat "$PID_FILE")"
    echo "launch: log $LOG"
    exit 0
  fi
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "launch: dev server exited before ready. Log:" >&2
    cat "$LOG" >&2
    exit 1
  fi
  sleep 0.5
done

echo "launch: timed out waiting for Local: http://localhost:3001/ in $LOG" >&2
cat "$LOG" >&2
exit 1
