#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:${PORT:-8000}}"
BASE_URL="${BASE_URL%/}"
COOKIE_FILE="$(mktemp /tmp/job-sprint-health-cookies.XXXXXX)"
OUT_FILE="$(mktemp /tmp/job-sprint-health.XXXXXX)"
trap 'rm -f "$COOKIE_FILE" "$OUT_FILE"' EXIT

check() {
  local path="$1"
  local expected="$2"
  local code
  shift 2
  code="$(curl -sS -o "$OUT_FILE" -w '%{http_code}' "$@" "${BASE_URL}${path}" || true)"
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL ${path}: expected ${expected}, got ${code}" >&2
    cat "$OUT_FILE" >&2 || true
    exit 1
  fi
  echo "OK ${path} ${code}"
}

check_body_contains() {
  local pattern="$1"
  if ! rg -q "$pattern" "$OUT_FILE"; then
    echo "FAIL body missing pattern: ${pattern}" >&2
    cat "$OUT_FILE" >&2 || true
    exit 1
  fi
}

check "/api/health" "200"
check "/login.html" "200"
check_body_contains "登录 AI 求职教练"

if [[ -n "${JOB_SPRINT_AUTH_USER:-}" && -n "${JOB_SPRINT_AUTH_PASSWORD:-${JOB_SPRINT_AUTH_PASS:-}}" ]]; then
  auth_value="${JOB_SPRINT_AUTH_PASSWORD:-${JOB_SPRINT_AUTH_PASS:-}}"
  code="$(curl -sS -o "$OUT_FILE" -w '%{http_code}' -c "$COOKIE_FILE" \
    -H "content-type: application/json" \
    -d "{\"username\":\"${JOB_SPRINT_AUTH_USER}\",\"password\":\"${auth_value}\"}" \
    "${BASE_URL}/api/auth/login" || true)"
  if [[ "$code" != "200" ]]; then
    echo "FAIL /api/auth/login: expected 200, got ${code}" >&2
    cat "$OUT_FILE" >&2 || true
    exit 1
  fi
  echo "OK /api/auth/login ${code}"
  check "/api/auth/session" "200" -b "$COOKIE_FILE"
  check "/schedule.html" "200" -b "$COOKIE_FILE"
  check "/data/schedule.json" "200" -b "$COOKIE_FILE"
  check "/data/interview_kb.json" "200" -b "$COOKIE_FILE"
else
  check "/api/auth/session" "401"
  check "/schedule.html" "302"
  check "/data/schedule.json" "401"
fi

check "/assets/schedule.js" "200"
check "/assets/schedule.css" "200"

echo "health check passed: ${BASE_URL}"
