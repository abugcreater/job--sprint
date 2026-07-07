#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: bash tools/remote_job_sprint_check.sh <BASE_URL>" >&2
  exit 2
fi

if [[ -z "${JOB_SPRINT_AUTH_USER:-}" || -z "${JOB_SPRINT_AUTH_PASSWORD:-${JOB_SPRINT_AUTH_PASS:-}}" ]]; then
  echo "JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS are required" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
COOKIE_FILE="$(mktemp /tmp/job-sprint-remote-cookies.XXXXXX)"
OUT_FILE="$(mktemp /tmp/job-sprint-remote-check.XXXXXX)"
PAYLOAD_FILE="$(mktemp /tmp/job-sprint-remote-payload.XXXXXX)"
trap 'rm -f "$COOKIE_FILE" "$OUT_FILE" "$PAYLOAD_FILE"' EXIT

check() {
  local path="$1"
  local expected="$2"
  local code
  shift 2
  code="$(curl -sS --connect-timeout 8 -o "$OUT_FILE" -w '%{http_code}' "$@" "${BASE_URL}${path}" || true)"
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL ${path}: expected ${expected}, got ${code}" >&2
    exit 1
  fi
  echo "OK ${path} ${code}"
}

check_no_basic_auth() {
  local path="$1"
  local header
  header="$(curl -sS -I --connect-timeout 8 "${BASE_URL}${path}" | awk 'tolower($1)=="www-authenticate:"{print $0; exit}' | tr -d '\r' || true)"
  if [[ -n "$header" ]]; then
    echo "FAIL ${path}: browser Basic Auth header still present" >&2
    exit 1
  fi
  echo "OK ${path} no browser Basic Auth"
}

check "/" "302"
check "/login.html" "200"
check "/api/auth/session" "401"
check "/api/health" "200"
check "/job-sprint/schedule.html" "302"
check_no_basic_auth "/"
check_no_basic_auth "/job-sprint/schedule.html"

auth_value="${JOB_SPRINT_AUTH_PASSWORD:-${JOB_SPRINT_AUTH_PASS:-}}"
code="$(curl -sS --connect-timeout 8 -o "$OUT_FILE" -w '%{http_code}' -c "$COOKIE_FILE" \
  -H "content-type: application/json" \
  -d "{\"username\":\"${JOB_SPRINT_AUTH_USER}\",\"password\":\"${auth_value}\"}" \
  "${BASE_URL}/api/auth/login" || true)"
if [[ "$code" != "200" ]]; then
  echo "FAIL /api/auth/login: expected 200, got ${code}" >&2
  exit 1
fi
echo "OK /api/auth/login ${code}"

check "/api/auth/session" "200" -b "$COOKIE_FILE"
check "/api/progress" "200" -b "$COOKIE_FILE"
remote_acceptance_marker="remote-check-$(date +%s)"
REMOTE_ACCEPTANCE_MARKER="$remote_acceptance_marker" node - "$OUT_FILE" "$PAYLOAD_FILE" <<'NODE'
const fs = require("fs");
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const progress = input && input.progress && typeof input.progress === "object" && !Array.isArray(input.progress)
  ? input.progress
  : {};
const remoteAcceptance = progress.remoteAcceptance && typeof progress.remoteAcceptance === "object" && !Array.isArray(progress.remoteAcceptance)
  ? progress.remoteAcceptance
  : {};
progress.remoteAcceptance = { ...remoteAcceptance, [process.env.REMOTE_ACCEPTANCE_MARKER]: true };
fs.writeFileSync(process.argv[3], JSON.stringify({ progress }));
NODE
progress_code="$(curl -sS --connect-timeout 8 -o "$OUT_FILE" -w '%{http_code}' -b "$COOKIE_FILE" \
  -H "content-type: application/json" \
  --data-binary "@${PAYLOAD_FILE}" \
  "${BASE_URL}/api/progress" || true)"
if [[ "$progress_code" != "200" ]]; then
  echo "FAIL /api/progress remote save: expected 200, got ${progress_code}" >&2
  exit 1
fi
echo "OK /api/progress remote save ${progress_code}"
check "/api/progress" "200" -b "$COOKIE_FILE"
REMOTE_ACCEPTANCE_MARKER="$remote_acceptance_marker" node - "$OUT_FILE" <<'NODE'
const fs = require("fs");
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!input.progress || !input.progress.remoteAcceptance || input.progress.remoteAcceptance[process.env.REMOTE_ACCEPTANCE_MARKER] !== true) {
  throw new Error("remote acceptance progress marker was not persisted");
}
NODE
echo "OK /api/progress remote readback"
check "/" "200" -b "$COOKIE_FILE"
check "/schedule.html" "200" -b "$COOKIE_FILE"
check "/data/schedule.json" "200" -b "$COOKIE_FILE"
check "/assets/schedule.js" "200"

echo "remote job-sprint check passed"
