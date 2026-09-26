#!/usr/bin/env bash
# Read-only check that the Remi dev server on port 3001 is the one this skill started.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)
RUN_DIR="$ROOT/.cursor/skills/verify-remi/run"
PID_FILE="$RUN_DIR/dev.pid"
ENV_FILE="$ROOT/frontend/.env"

fail() {
  echo "doctor: $*" >&2
  exit 1
}

[[ -s "$PID_FILE" ]] || fail "no run/dev.pid. Start with scripts/launch.sh. Do not drive a server you did not start."
launch_pid=$(cat "$PID_FILE")
kill -0 "$launch_pid" 2>/dev/null || fail "pid $launch_pid from run/dev.pid is not running."

mapfile -t listen_pids < <(lsof -nP -iTCP:3001 -sTCP:LISTEN -t 2>/dev/null | sort -u || true)
if [[ ${#listen_pids[@]} -eq 0 ]]; then
  fail "nothing is listening on port 3001."
fi
if [[ ${#listen_pids[@]} -ne 1 ]]; then
  echo "doctor: more than one listener on port 3001. Refusing to drive." >&2
  lsof -nP -iTCP:3001 -sTCP:LISTEN >&2 || true
  exit 1
fi
listener=${listen_pids[0]}

ancestor_ok=0
cursor=$listener
for _ in $(seq 1 15); do
  if [[ "$cursor" == "$launch_pid" ]]; then
    ancestor_ok=1
    break
  fi
  parent=$(awk '/^PPid:/ { print $2 }' "/proc/$cursor/status" 2>/dev/null || true)
  [[ -n "$parent" && "$parent" != "0" ]] || break
  cursor=$parent
done
if [[ $ancestor_ok -ne 1 ]]; then
  echo "doctor: listener pid $listener is not a child of launch pid $launch_pid." >&2
  echo "doctor: refusing to double-drive a shared instance." >&2
  ps -p "$listener" -o pid,ppid,cmd >&2 || true
  exit 1
fi

home_file=$(mktemp)
curl -fsS --max-time 10 -o "$home_file" http://localhost:3001/ || fail "GET http://localhost:3001/ failed. 127.0.0.1 is not the bind address."
# SSR HTML contains null bytes. grep -a still searches them.
grep -a -q "Remi - Your weekly meal planner" "$home_file" || fail "home response missing English title."
grep -a -q "Probando" "$home_file" || fail "home response missing home copy."
grep -a -q "Weekly menu" "$home_file" || fail "home response missing Weekly menu link."
rm -f "$home_file"

session_file=$(mktemp)
session_code=$(curl -sS --max-time 10 -o "$session_file" -w "%{http_code}" http://localhost:3001/api/auth/get-session) || fail "GET /api/auth/get-session failed to connect."
session_body=$(tr -d '[:space:]' <"$session_file")
rm -f "$session_file"
[[ "$session_code" == "200" ]] || fail "GET /api/auth/get-session returned HTTP $session_code body=$session_body"
[[ "$session_body" == "null" || "$session_body" == \{* ]] || fail "unexpected session body: $session_body"

auth_submit="blocked"
if [[ -f "$ENV_FILE" ]] && grep -q '^DATABASE_URL=.\+' "$ENV_FILE"; then
  # shellcheck disable=SC1090
  set -a
  # Only read the keys the check needs. Do not export the whole env into later steps.
  database_url=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
  set +a
  if command -v pg_isready >/dev/null 2>&1 && pg_isready -d "$database_url" >/dev/null 2>&1; then
    auth_submit="ready"
  else
    auth_submit="blocked (DATABASE_URL set but pg_isready failed)"
  fi
else
  auth_submit="blocked (no frontend/.env DATABASE_URL)"
fi

echo "doctor: ok"
echo "doctor: listener=$listener launch=$launch_pid"
echo "doctor: home=200 session=$session_code body=$session_body"
echo "doctor: auth-submit: $auth_submit"
echo "doctor: bind is [::1]:3001 — use http://localhost:3001/ not 127.0.0.1"
if [[ -f "$RUN_DIR/dev.log" ]] && grep -q "Base URL could not be determined" "$RUN_DIR/dev.log"; then
  echo "doctor: BETTER_AUTH_URL unset (server warning). Planner and home are still drivable. Do not treat sign-in as successful."
fi
