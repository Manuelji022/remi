#!/usr/bin/env bash
set -euo pipefail
trap 'printf "FAIL real-stack runner at line %s\n" "$LINENO" >&2' ERR
runner="$(realpath "$0")"
cd "$(dirname "$runner")/../.."
root="$PWD"
scenario="$(realpath "${1:?Usage: run.sh <scenario-file> [artifact-path]}")"
artifact="$(realpath -m "${2:-e2e/artifacts/real-stack-$(basename "$scenario" .scenario.js)-results.json}")"
# Re-enter with an allowlisted environment before any application tooling runs.
if [[ "${REMI_REAL_STACK_CLEAN:-}" != 1 ]]; then
  exec env -i PATH="$PATH" HOME="$HOME" REAL_STACK_BROWSER_BIN="${REAL_STACK_BROWSER_BIN:-$(command -v agent-browser)}" REMI_REAL_STACK_CLEAN=1 bash "$runner" "$scenario" "$artifact"
fi
unset DATABASE_URL AI_GATEWAY_API_KEY AI_WEEKLY_MENU_MODEL
export NODE_ENV=development AI_WEEKLY_MENU_MOCK=true TZ=UTC
browser_bin="$(realpath "$REAL_STACK_BROWSER_BIN")"
if [[ "$(od -An -tx1 -N4 "$browser_bin" | tr -d ' \n')" != 7f454c46 ]]; then
  echo 'Use REAL_STACK_BROWSER_BIN=/absolute/path/to/native/agent-browser (ELF); JS/shell launchers are refused.' >&2
  exit 1
fi
export REAL_STACK_BROWSER_BIN="$browser_bin"
container="remi-real-stack-$(date +%s)-$$"
tmp="$(mktemp -d)"
server=''
stage=''
run_stage() {
  setsid "$@" & stage=$!
  local result=0
  wait "$stage" || result=$?
  stage=''
  return "$result"
}
export REAL_STACK_BROWSER="$container"
cleanup() {
  trap '' INT TERM
  for pid in "$stage" "$server"; do [[ -z "$pid" ]] || kill -TERM -- "-$pid" 2>/dev/null || true; done
  sleep 0.2
  for pid in "$stage" "$server"; do
    [[ -z "$pid" ]] || { kill -KILL -- "-$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; }
  done
  timeout -k 1 5 "$browser_bin" --config "$tmp/browser.json" --session "$REAL_STACK_BROWSER" close >/dev/null 2>&1 || true
  timeout -k 1 10 docker rm -f "$container" >/dev/null 2>&1 || true
  unset NODE_OPTIONS
  cd "$root"
  rm -rf "$tmp"
}
cat > "$tmp/browser.json" <<'BROWSER'
{"allowedDomains":["127.0.0.1","localhost"],"proxy":"http://127.0.0.1:9","proxyBypass":"127.0.0.1,localhost","args":"--no-sandbox\n--disable-background-networking\n--disable-quic\n--host-resolver-rules=MAP * 127.0.0.1"}
BROWSER
export AGENT_BROWSER_CONFIG="$tmp/browser.json"
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p "$(dirname "$artifact")"
rm -f "$artifact" "${artifact%.json}.png" "${artifact%.json}-error.png" "${artifact%.json}-failure.png"
docker image inspect postgres:18 >/dev/null
run_stage docker run --pull=never --rm -d --name "$container" \
  -e POSTGRES_PASSWORD=synthetic -e POSTGRES_DB=remi_real_stack \
  -p 127.0.0.1::5432 postgres:18 >/dev/null
port="$(docker port "$container" 5432/tcp)"
export DATABASE_URL="postgres://postgres:synthetic@127.0.0.1:${port##*:}/remi_real_stack"
node -e 'if (!["127.0.0.1","localhost"].includes(new URL(process.env.DATABASE_URL).hostname)) throw Error("Nonlocal database refused")'
for attempt in $(seq 1 60); do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres -d remi_real_stack >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -h 127.0.0.1 -U postgres -d remi_real_stack >/dev/null
# Copy only app inputs. Neither dotenv files nor generated build state are read.
mkdir "$tmp/app"
tar --exclude='.env*' --exclude=node_modules --exclude=.output --exclude=.nitro --exclude=.tanstack --exclude=dist --exclude=e2e/artifacts -cf - . | tar -xf - -C "$tmp/app"
mkdir "$tmp/app/node_modules"
for dependency in "$PWD"/node_modules/* "$PWD"/node_modules/.bin; do
  ln -s "$dependency" "$tmp/app/node_modules/$(basename "$dependency")"
done
printf 'verifyDepsBeforeRun: false\n' > "$tmp/app/pnpm-workspace.yaml"
export REAL_STACK_MODULES="$(realpath ../node_modules)"
cd "$tmp/app"
cat > real-stack.vite.ts <<'CONFIG'
import { mergeConfig } from 'vite'
import config from './vite.config.ts'
export default mergeConfig(config, { server: { fs: { allow: [process.cwd(), process.env.REAL_STACK_MODULES] } } })
CONFIG
export BETTER_AUTH_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
app_port="$(node --input-type=module -e 'import net from "node:net"; const s=net.createServer(); s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
export BETTER_AUTH_URL="http://127.0.0.1:$app_port"
export NODE_OPTIONS="--import=$PWD/e2e/real-stack/network.mjs"
# The copied migration config sees no .env; all repository migrations run.
run_stage pnpm db:migrate
run_stage pnpm exec tsx e2e/real-stack/helper.ts seed "$tmp/cookie.json"
setsid pnpm dev --config real-stack.vite.ts --host 127.0.0.1 --port "$app_port" --strictPort >"$tmp/server.log" 2>&1 &
server=$!
printf 'RUNNER pid=%s container=%s temp=%s serverPort=%s\n' "$$" "$container" "$tmp" "$app_port"
ready=0
for attempt in $(seq 1 90); do
  if ! kill -0 "$server" 2>/dev/null; then break; fi
  if curl --silent --max-time 3 --fail "$BETTER_AUTH_URL/api/auth/get-session" >/dev/null; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then cat "$tmp/server.log"; exit 1; fi
# Scenarios run from the isolated copy too, with the app's installed modules.
cp "$scenario" "$tmp/app/e2e/real-stack/selected.scenario.js"
run_stage pnpm exec tsx e2e/real-stack/helper.ts run "$tmp/cookie.json" "$artifact" || { cat "$tmp/server.log"; exit 1; }
cleanup
trap - EXIT
if docker ps -a --format '{{.Names}}' | grep -Fxq -- "$container"; then exit 1; fi
if curl --silent --max-time 2 "$BETTER_AUTH_URL" >/dev/null; then echo 'Server leaked' >&2; exit 1; fi
node --input-type=module - "$artifact" "$container" "$app_port" <<'RESULT'
import { readFileSync, writeFileSync } from 'node:fs'
const [path, container, serverPort] = process.argv.slice(2)
const report = JSON.parse(readFileSync(path, 'utf8'))
report.verdict = 'PASS'
report.cleanup = { container, containerRemoved: true, serverPort, serverPortClosed: true }
writeFileSync(path, JSON.stringify(report) + '\n')
RESULT
printf 'PASS cleanup: container %s removed; server port %s closed\nArtifact: %s\n' "$container" "$app_port" "$artifact"
