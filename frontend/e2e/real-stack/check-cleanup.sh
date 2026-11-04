#!/usr/bin/env bash
# Exercise a real helper failure or direct-PID SIGTERM, including owned descendants.
set -euo pipefail
cd "$(dirname "$0")/../.."
mode="${1:?Usage: check-cleanup.sh failure|term [artifact-path]}"
[[ "$mode" == failure || "$mode" == term ]]
artifact="$(realpath -m "${2:-e2e/artifacts/real-stack-cleanup-$mode.json}")"
test_dir="$(mktemp -d)"
runner=''
trap 'if [[ -n "$runner" ]]; then kill -TERM "$runner" 2>/dev/null || true; fi; rm -rf "$test_dir"' EXIT
cat > "$test_dir/check.scenario.js" <<SCENARIO
export default async ({ accounting, emit }) => {
  await accounting(); emit('cleanup-check ready')
  if ('$mode' === 'failure') throw new Error('intentional cleanup assertion failure')
  await new Promise(() => setInterval(() => {}, 1000))
}
SCENARIO
setsid bash e2e/real-stack/run.sh "$test_dir/check.scenario.js" "$test_dir/results.json" > "$test_dir/log" 2>&1 &
runner=$!
for attempt in $(seq 1 450); do
  if grep -q 'PASS cleanup-check ready' "$test_dir/log"; then break; fi
  if ! kill -0 "$runner" 2>/dev/null; then cat "$test_dir/log"; exit 1; fi
  sleep 0.2
done
grep -q 'PASS cleanup-check ready' "$test_dir/log"
started=$SECONDS
if [[ "$mode" == term ]]; then kill -TERM "$runner"; fi
for attempt in $(seq 1 75); do
  if ! kill -0 "$runner" 2>/dev/null; then break; fi
  sleep 0.2
done
if kill -0 "$runner" 2>/dev/null; then echo 'FAIL cleanup exceeded 15 seconds'; exit 1; fi
result=0
wait "$runner" || result=$?
runner=''
expected=1
if [[ "$mode" == term ]]; then expected=143; fi
[[ "$result" == "$expected" ]]
metadata="$(grep '^RUNNER ' "$test_dir/log")"
container="$(sed -E 's/.*container=([^ ]+).*/\1/' <<< "$metadata")"
port="$(sed -E 's/.*serverPort=([^ ]+).*/\1/' <<< "$metadata")"
app_temp="$(sed -E 's/.*temp=([^ ]+).*/\1/' <<< "$metadata")"
! docker ps -a --format '{{.Names}}' | grep -Fxq -- "$container"
! curl --silent --max-time 2 "http://127.0.0.1:$port" >/dev/null
[[ ! -d "$app_temp" ]]
! pgrep -f "$app_temp"
mkdir -p "$(dirname "$artifact")"
printf '{"mode":"%s","exit":%s,"seconds":%s,"containerRemoved":true,"serverPortClosed":true,"tempRemoved":true,"descendantsStopped":true}\n' "$mode" "$result" "$((SECONDS-started))" > "$artifact"
printf 'PASS %s cleanup: exit %s, container removed, port %s closed, temp/descendants gone (%ss); %s\n' "$mode" "$result" "$port" "$((SECONDS-started))" "$artifact"
