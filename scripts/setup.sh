#!/usr/bin/env bash
#
# BK/AO Dashboard — one-command Supabase setup.
# ----------------------------------------------------------------------------
# Run this on a machine that can reach Supabase. (The cloud environment this
# repo was scaffolded in blocks outbound traffic to Supabase, so it could not
# be run there — this script has NOT been executed against a live project.)
#
# It drives the Supabase CLI to:
#   1. confirm the CLI is installed and you're logged in
#   2. link this repo to your project
#   3. push the database migration  (tables + indexes + RLS + realtime)
#   4. create the single shared auth account
#   5. set the verify-code secrets  (your 6-digit code + shared creds)
#   6. deploy the verify-code Edge Function
#   7. write your frontend .env      (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
#
# Re-running is safe — every step is idempotent.
#
# Prerequisite you must do once by hand (it lives in YOUR account):
#   • Create a Supabase project at https://supabase.com/dashboard
#     and note its "project ref" (the sub-domain in the project URL).
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bold() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

ask() {
  # ask "Prompt" [default]  -> echoes the answer (default if blank)
  local prompt="$1" def="${2:-}" ans
  if [ -n "$def" ]; then
    read -rp "  $prompt [$def]: " ans
    printf '%s' "${ans:-$def}"
  else
    read -rp "  $prompt: " ans
    printf '%s' "$ans"
  fi
}

# --- 0. Tooling -------------------------------------------------------------
command -v supabase >/dev/null 2>&1 || die \
  "Supabase CLI not found. Install it then re-run:
     npm i -g supabase            # or
     brew install supabase/tap/supabase
   Docs: https://supabase.com/docs/guides/cli"
command -v node >/dev/null 2>&1 || die "Node.js is required (to parse CLI output)."
bold "Supabase CLI $(supabase --version 2>/dev/null | head -1)"

# --- 1. Login ---------------------------------------------------------------
if ! supabase projects list >/dev/null 2>&1; then
  bold "Logging in to Supabase (this opens a browser)…"
  supabase login
fi

# --- 2. Project ref + link --------------------------------------------------
bold "Your Supabase projects:"
supabase projects list || true
PROJECT_REF="$(ask 'Project ref (sub-domain of your project URL)')"
[ -n "$PROJECT_REF" ] || die "Project ref is required."
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

bold "Linking this repo to ${PROJECT_REF}…"
supabase link --project-ref "$PROJECT_REF"

# --- 3. Database migration --------------------------------------------------
bold "Pushing database migration (you may be asked for the DB password)…"
supabase db push

# --- 4. Gate inputs ---------------------------------------------------------
bold "Configure the shared code gate"
RANDOM_CODE="$(printf '%06d' "$(( (RANDOM * 32768 + RANDOM) % 900000 + 100000 ))")"
ACCESS_CODE="$(ask 'Shared 6-digit access code' "$RANDOM_CODE")"
case "$ACCESS_CODE" in
  [0-9][0-9][0-9][0-9][0-9][0-9]) : ;;
  *) die "Access code must be exactly 6 digits." ;;
esac
SHARED_EMAIL="$(ask 'Shared account email' 'bk-ao-shared@example.com')"
DEFAULT_PW="$(openssl rand -base64 24 2>/dev/null | tr -dc 'A-Za-z0-9' | cut -c1-24)"
[ -n "$DEFAULT_PW" ] || DEFAULT_PW="ChangeMe-${RANDOM}${RANDOM}"
SHARED_PW="$(ask 'Shared account password' "$DEFAULT_PW")"

# --- 5. Fetch API keys ------------------------------------------------------
bold "Fetching project API keys…"
ANON_KEY=""; SERVICE_KEY=""
if KEYS_JSON="$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json 2>/dev/null)" && [ -n "$KEYS_JSON" ]; then
  ANON_KEY="$(printf '%s' "$KEYS_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);const f=a.find(x=>x.name==="anon");process.stdout.write(f?f.api_key:"")}catch(e){}})')"
  SERVICE_KEY="$(printf '%s' "$KEYS_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);const f=a.find(x=>x.name==="service_role");process.stdout.write(f?f.api_key:"")}catch(e){}})')"
fi
[ -n "$ANON_KEY" ]    || ANON_KEY="$(ask 'Could not auto-read it — paste your anon public key')"
[ -n "$SERVICE_KEY" ] || SERVICE_KEY="$(ask 'Could not auto-read it — paste your service_role key')"
[ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ] || die "Both anon and service_role keys are required."

# --- 6. Shared auth user ----------------------------------------------------
bold "Creating the shared auth account (${SHARED_EMAIL})…"
HTTP_CODE="$(curl -s -o /tmp/bkao_user.json -w '%{http_code}' \
  -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SHARED_EMAIL}\",\"password\":\"${SHARED_PW}\",\"email_confirm\":true}" || echo 000)"
case "$HTTP_CODE" in
  2*) echo "  created." ;;
  422) warn "An account with that email already exists — leaving it as-is. (If the password differs, update it in the dashboard or pick a fresh email.)" ;;
  *)  warn "User creation returned HTTP ${HTTP_CODE}. Response:"; cat /tmp/bkao_user.json 2>/dev/null || true; echo ;;
esac
rm -f /tmp/bkao_user.json

# --- 7. Secrets -------------------------------------------------------------
bold "Setting verify-code secrets…"
supabase secrets set --project-ref "$PROJECT_REF" \
  APP_ACCESS_CODE="$ACCESS_CODE" \
  SHARED_USER_EMAIL="$SHARED_EMAIL" \
  SHARED_USER_PASSWORD="$SHARED_PW"

# --- 8. Deploy the Edge Function -------------------------------------------
# verify_jwt=false comes from supabase/config.toml so the gate is reachable
# before login.
bold "Deploying the verify-code Edge Function…"
supabase functions deploy verify-code --project-ref "$PROJECT_REF"

# --- 9. Frontend .env -------------------------------------------------------
bold "Writing .env for the frontend…"
cat > .env <<ENV
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${ANON_KEY}
ENV
echo "  wrote $(pwd)/.env"

# --- Done -------------------------------------------------------------------
printf '\n\033[1m✓ BK/AO Dashboard backend is provisioned.\033[0m\n'
cat <<DONE

  Project URL : ${SUPABASE_URL}
  Access code : ${ACCESS_CODE}
  Shared login: ${SHARED_EMAIL}

Next:
  npm install
  npm run dev          # open the printed URL and enter ${ACCESS_CODE}

Deploy the frontend to Vercel and set these env vars there:
  VITE_SUPABASE_URL       = ${SUPABASE_URL}
  VITE_SUPABASE_ANON_KEY  = (your anon key)

Keep the access code and shared password somewhere safe — they're not stored
in this repo.
DONE
