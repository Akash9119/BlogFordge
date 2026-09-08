#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Build and (re)start the BlogForge stack. Safe to re-run — this is also the
# update path: `git pull && bash deploy/deploy.sh`.
#
#     bash deploy/deploy.sh
#
# Preflights the three .env files first, because every one of the failures they
# cause looks like a container that starts and immediately exits.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."   # repo root, wherever this was invoked from

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31m!! %s\033[0m\n' "$1"; exit 1; }

# --- Preflight -------------------------------------------------------------
log "Checking configuration"

for f in .env Backend/.env ai-service/.env; do
  [[ -f $f ]] || fail "Missing $f — copy the matching .env.example and fill it in."
done

# Read a KEY=value out of a .env without sourcing it (values contain URLs,
# '&' and '?' that a shell would mangle).
envget() { sed -n "s/^[[:space:]]*$2=//p" "$1" | tail -n1 | tr -d '"'"'"'\r'; }

for key in MONGODB_URI JWT_SECRET JWT_REFRESH_SECRET \
           CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET; do
  [[ -n $(envget Backend/.env "$key") ]] || fail "Backend/.env: $key is empty."
done

for key in JWT_SECRET JWT_REFRESH_SECRET; do
  v=$(envget Backend/.env "$key")
  (( ${#v} >= 32 )) || fail "Backend/.env: $key must be >= 32 chars in production."
done

# The shared service token is the only thing in front of the AI service.
api_token=$(envget Backend/.env AI_SERVICE_TOKEN)
ai_token=$(envget ai-service/.env AI_SERVICE_TOKEN)
if [[ -n $(envget Backend/.env AI_SERVICE_URL) || -n $ai_token ]]; then
  [[ -n $api_token ]] || fail "Backend/.env: AI_SERVICE_TOKEN is empty — the API will refuse to start."
  [[ $api_token == "$ai_token" ]] || fail "AI_SERVICE_TOKEN differs between Backend/.env and ai-service/.env."
fi

site=$(envget .env SITE_ADDRESS)
[[ -n $site ]] || fail ".env: SITE_ADDRESS is empty (use ':80' or your domain)."
# An empty PUBLIC_ORIGIN leaves CORS_ORIGINS blank, which the API reads as
# "allow every origin" — a silent downgrade, so catch it here.
[[ -n $(envget .env PUBLIC_ORIGIN) ]] || fail ".env: PUBLIC_ORIGIN is empty."
echo "   SITE_ADDRESS = $site"
if [[ $site == :* ]]; then
  echo "   (plain HTTP — set a domain here to get automatic HTTPS)"
fi

# --- Build and start -------------------------------------------------------
log "Building images"
docker compose build

log "Starting stack"
docker compose up -d --remove-orphans

log "Waiting for the API to report healthy"
for i in $(seq 1 60); do
  state=$(docker inspect -f '{{.State.Health.Status}}' blogforge-api-1 2>/dev/null || echo starting)
  if [[ $state == healthy ]]; then break; fi
  if [[ $i -eq 60 ]]; then
    docker compose logs --tail=50 api
    fail "API never became healthy — the log above says why."
  fi
  sleep 3
done
echo "   API healthy."

log "Pruning dangling build layers"
docker image prune -f >/dev/null

docker compose ps

cat <<'NEXT'

Stack is up. First deployment only:

  docker compose exec api npm run seed:admin    # create the first admin user
  docker compose exec api npm run ai:reindex    # build the RAG corpus

Logs:    docker compose logs -f
Restart: docker compose restart api
Update:  git pull && bash deploy/deploy.sh

NEXT
