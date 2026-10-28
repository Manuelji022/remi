#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

container_name="remi-ai-generation-guard-test-$$"
container_id=''
temp_dir="$(mktemp -d)"
artifact="${AI_GUARD_ARTIFACT:-/tmp/remi-ai-componentization-review/ai-generation-guard-postgres.json}"
image="${POSTGRES_TEST_IMAGE:-postgres:18}"

cleanup() {
  if [[ -n "$container_id" ]]; then
    docker rm -f "$container_id" >/dev/null 2>&1 || true
  fi
  rm -rf "$temp_dir"
}
trap cleanup EXIT INT TERM

rm -f "$artifact"
mkdir -p "$(dirname "$artifact")"

docker image inspect "$image" >/dev/null
docker run --pull=never --rm -d \
  --name "$container_name" \
  -e POSTGRES_USER=remi_ai_guard_test \
  -e POSTGRES_PASSWORD=remi_ai_guard_local_only \
  -e POSTGRES_DB=remi_ai_guard_test \
  -p 127.0.0.1::5432 \
  "$image" >/dev/null
container_id="$container_name"

mapping=''
for attempt in $(seq 1 30); do
  mapping="$(docker port "$container_name" 5432/tcp 2>/dev/null | head -n 1 || true)"
  if [[ -n "$mapping" ]]; then break; fi
  sleep 1
done
if [[ -z "$mapping" ]]; then
  echo "Disposable PostgreSQL container did not publish a local port" >&2
  exit 1
fi
port="${mapping##*:}"
database_url="postgres://remi_ai_guard_test:remi_ai_guard_local_only@127.0.0.1:${port}/remi_ai_guard_test"

ready=0
for attempt in $(seq 1 60); do
  if docker exec "$container_name" pg_isready -U remi_ai_guard_test -d remi_ai_guard_test >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo "Disposable PostgreSQL did not become ready" >&2
  exit 1
fi

DATABASE_URL="$database_url" pnpm db:migrate
DATABASE_URL="$database_url" PGMAX=3 pnpm exec tsx e2e/ai-generation-guard.postgres.ts multi > "$temp_dir/multi.json"
DATABASE_URL="$database_url" PGMAX=1 pnpm exec tsx e2e/ai-generation-guard.postgres.ts single > "$temp_dir/single.json"

# Remove the owned container before recording success; EXIT still removes it after failures.
docker rm -f "$container_name" >/dev/null
container_id=''

node --input-type=module - "$temp_dir/multi.json" "$temp_dir/single.json" "$artifact" "$image" "$port" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs'
const [multiPath, singlePath, artifactPath, image, port] = process.argv.slice(2)
const result = {
  suite: 'AI Weekly Menu PostgreSQL generation guard',
  verdict: 'PASS',
  isolatedContainerImage: image,
  binding: `127.0.0.1:${port}`,
  migrations: 'pnpm db:migrate applied the repository Drizzle migrations including 0006 and 0007',
  cleanup: 'synthetic rows deleted; disposable container removed before artifact creation',
  runs: [
    JSON.parse(readFileSync(multiPath, 'utf8')),
    JSON.parse(readFileSync(singlePath, 'utf8')),
  ],
}
writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`)
console.log(`Verified PostgreSQL guard artifact: ${artifactPath}`)
NODE
