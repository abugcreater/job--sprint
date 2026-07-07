#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: bash tools/remote_https_job_sprint_check.sh https://<domain-or-host>" >&2
  exit 2
fi

if [[ "$BASE_URL" != https://* ]]; then
  echo "BASE_URL must start with https://" >&2
  exit 2
fi

if [[ -z "${JOB_SPRINT_AUTH_USER:-}" || -z "${JOB_SPRINT_AUTH_PASSWORD:-${JOB_SPRINT_AUTH_PASS:-}}" ]]; then
  echo "JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS are required" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
AUTH_VALUE="${JOB_SPRINT_AUTH_PASSWORD:-${JOB_SPRINT_AUTH_PASS:-}}"
OUT_FILE="$(mktemp /tmp/job-sprint-https-check.XXXXXX)"
COOKIE_FILE="$(mktemp /tmp/job-sprint-https-cookies.XXXXXX)"
PAYLOAD_FILE="$(mktemp /tmp/job-sprint-https-payload.XXXXXX)"
trap 'rm -f "$OUT_FILE" "$COOKIE_FILE" "$PAYLOAD_FILE"' EXIT
CURL_COMMON_ARGS=(--connect-timeout 10 --max-time 20)

if [[ "${JOB_SPRINT_CURL_NO_PROXY:-}" == "1" ]]; then
  CURL_COMMON_ARGS+=(--noproxy '*')
fi

if [[ -n "${JOB_SPRINT_CURL_RESOLVE:-}" ]]; then
  IFS=',' read -r -a resolve_entries <<< "$JOB_SPRINT_CURL_RESOLVE"
  for resolve_entry in "${resolve_entries[@]}"; do
    if [[ -n "$resolve_entry" ]]; then
      CURL_COMMON_ARGS+=(--resolve "$resolve_entry")
    fi
  done
fi

check() {
  local path="$1"
  local expected="$2"
  shift 2
  local code
  code="$(curl -sS "${CURL_COMMON_ARGS[@]}" -o "$OUT_FILE" -w '%{http_code}' "$@" "${BASE_URL}${path}" || true)"
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL ${path}: expected ${expected}, got ${code}" >&2
    exit 1
  fi
  echo "OK ${path} ${code}"
}

check_any() {
  local path="$1"
  shift
  local code
  code="$(curl -sS "${CURL_COMMON_ARGS[@]}" -o "$OUT_FILE" -w '%{http_code}' "${BASE_URL}${path}" || true)"
  for expected in "$@"; do
    if [[ "$code" == "$expected" ]]; then
      echo "OK ${path} ${code}"
      return
    fi
  done
  echo "FAIL ${path}: got ${code}" >&2
  exit 1
}

check_no_basic_auth() {
  local path="$1"
  local header
  header="$(curl -sS -I "${CURL_COMMON_ARGS[@]}" "${BASE_URL}${path}" | awk 'tolower($1)=="www-authenticate:"{print $0; exit}' | tr -d '\r' || true)"
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
check_any "/sub2api/" "200" "302"
check_no_basic_auth "/"
check_no_basic_auth "/job-sprint/schedule.html"
check_no_basic_auth "/sub2api/"

bash "$(dirname "$0")/remote_sub2api_basepath_check.sh" "$BASE_URL"

login_code="$(curl -sS "${CURL_COMMON_ARGS[@]}" -o "$OUT_FILE" -w '%{http_code}' -c "$COOKIE_FILE" \
  -H "content-type: application/json" \
  -d "{\"username\":\"${JOB_SPRINT_AUTH_USER}\",\"password\":\"${AUTH_VALUE}\"}" \
  "${BASE_URL}/api/auth/login" || true)"
if [[ "$login_code" != "200" ]]; then
  echo "FAIL /api/auth/login: expected 200, got ${login_code}" >&2
  exit 1
fi
echo "OK /api/auth/login ${login_code}"

check "/api/auth/session" "200" -b "$COOKIE_FILE"
check "/api/progress" "200" -b "$COOKIE_FILE"
REMOTE_ACCEPTANCE_MARKER="remote-check-$(date +%s)"
REMOTE_ACCEPTANCE_MARKER="$REMOTE_ACCEPTANCE_MARKER" node - "$OUT_FILE" "$PAYLOAD_FILE" <<'NODE'
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
progress_code="$(curl -sS "${CURL_COMMON_ARGS[@]}" -o "$OUT_FILE" -w '%{http_code}' -b "$COOKIE_FILE" \
  -H "content-type: application/json" \
  --data-binary "@${PAYLOAD_FILE}" \
  "${BASE_URL}/api/progress" || true)"
if [[ "$progress_code" != "200" ]]; then
  echo "FAIL /api/progress remote save: expected 200, got ${progress_code}" >&2
  exit 1
fi
echo "OK /api/progress remote save ${progress_code}"
check "/api/progress" "200" -b "$COOKIE_FILE"
REMOTE_ACCEPTANCE_MARKER="$REMOTE_ACCEPTANCE_MARKER" node - "$OUT_FILE" <<'NODE'
const fs = require("fs");
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!input.progress || !input.progress.remoteAcceptance || input.progress.remoteAcceptance[process.env.REMOTE_ACCEPTANCE_MARKER] !== true) {
  throw new Error("remote acceptance progress marker was not persisted");
}
NODE
echo "OK /api/progress remote readback"
check "/" "200" -b "$COOKIE_FILE"
if ! grep -q "React 版 Job Sprint" "$OUT_FILE"; then
  echo "FAIL /: logged-in root did not return React shell" >&2
  exit 1
fi
echo "OK / React shell"
check "/react/index.html" "200" -b "$COOKIE_FILE"
if ! grep -q "React 版 Job Sprint" "$OUT_FILE"; then
  echo "FAIL /react/index.html: React shell missing" >&2
  exit 1
fi
echo "OK /react/index.html React shell"
check "/schedule.html" "200" -b "$COOKIE_FILE"
check "/data/schedule.json" "200" -b "$COOKIE_FILE"
check "/assets/schedule.js" "200"

HTTP_URL="http://${BASE_URL#https://}"
http_code="$(curl -sS "${CURL_COMMON_ARGS[@]}" -o "$OUT_FILE" -w '%{http_code}' "$HTTP_URL/" || true)"
case "$http_code" in
  301|302|307|308) echo "OK http-to-https redirect ${http_code}" ;;
  *) echo "FAIL http endpoint must redirect to HTTPS, got ${http_code}" >&2; exit 1 ;;
esac

echo "remote HTTPS job-sprint check passed"
