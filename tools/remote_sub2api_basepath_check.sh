#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: bash tools/remote_sub2api_basepath_check.sh http(s)://<domain-or-host>" >&2
  exit 2
fi

if [[ "$BASE_URL" != http://* && "$BASE_URL" != https://* ]]; then
  echo "BASE_URL must start with http:// or https://" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
TMP_DIR="$(mktemp -d /tmp/job-sprint-sub2api-check.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT
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

fetch() {
  local path="$1"
  local output="$2"
  local headers="$3"
  curl -sS "${CURL_COMMON_ARGS[@]}" -o "$output" -D "$headers" -w '%{http_code}' "${BASE_URL}${path}" || true
}

require_code() {
  local path="$1"
  local expected="$2"
  local output="$TMP_DIR/out"
  local headers="$TMP_DIR/headers"
  local code
  code="$(fetch "$path" "$output" "$headers")"
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL ${path}: expected ${expected}, got ${code}" >&2
    exit 1
  fi
  if awk 'tolower($1)=="www-authenticate:"{found=1} END{exit found ? 0 : 1}' "$headers"; then
    echo "FAIL ${path}: browser Basic Auth header present" >&2
    exit 1
  fi
  echo "OK ${path} ${code}"
}

HTML="$TMP_DIR/sub2api.html"
HTML_HEADERS="$TMP_DIR/sub2api.headers"
html_code="$(fetch "/sub2api/" "$HTML" "$HTML_HEADERS")"
if [[ "$html_code" != "200" ]]; then
  echo "FAIL /sub2api/: expected 200, got ${html_code}" >&2
  exit 1
fi
echo "OK /sub2api/ ${html_code}"

if awk 'tolower($1)=="www-authenticate:"{found=1} END{exit found ? 0 : 1}' "$HTML_HEADERS"; then
  echo "FAIL /sub2api/: browser Basic Auth header present" >&2
  exit 1
fi

if grep -Eq '(src|href)="/(assets/|logo\.png)' "$HTML"; then
  echo "FAIL /sub2api/: HTML still contains root-absolute asset references" >&2
  exit 1
fi

if ! grep -Eq '(src|href)="/sub2api/(assets/|logo\.png)' "$HTML"; then
  echo "FAIL /sub2api/: HTML does not contain /sub2api asset references" >&2
  exit 1
fi
echo "OK /sub2api/ asset references rewritten"

logo_path="$(grep -Eo '/sub2api/logo\.png[^"'\'' >]*' "$HTML" | head -n 1 || true)"
js_path="$(grep -Eo '/sub2api/assets/[^"'\'' >]+\.js' "$HTML" | head -n 1 || true)"
css_path="$(grep -Eo '/sub2api/assets/[^"'\'' >]+\.css' "$HTML" | head -n 1 || true)"

if [[ -z "$logo_path" || -z "$js_path" || -z "$css_path" ]]; then
  echo "FAIL /sub2api/: could not discover logo/js/css assets from rewritten HTML" >&2
  exit 1
fi

require_code "$logo_path" "200"
require_code "$js_path" "200"
require_code "$css_path" "200"
require_code "/sub2api/api/v1/settings/public" "200"

JS="$TMP_DIR/sub2api-index.js"
JS_HEADERS="$TMP_DIR/sub2api-index.headers"
js_code="$(fetch "$js_path" "$JS" "$JS_HEADERS")"
if [[ "$js_code" != "200" ]]; then
  echo "FAIL ${js_path}: expected 200 for JS inspection, got ${js_code}" >&2
  exit 1
fi

if grep -q 'Ze="/api/v1"' "$JS"; then
  echo "FAIL ${js_path}: JS still points API base to /api/v1" >&2
  exit 1
fi

if ! grep -q 'Ze="/sub2api/api/v1"' "$JS"; then
  echo "FAIL ${js_path}: JS does not point API base to /sub2api/api/v1" >&2
  exit 1
fi

if grep -q 'Ht("/")' "$JS"; then
  echo "FAIL ${js_path}: JS still uses root Vue router base" >&2
  exit 1
fi

if ! grep -q 'Ht("/sub2api/")' "$JS"; then
  echo "FAIL ${js_path}: JS does not use /sub2api/ Vue router base" >&2
  exit 1
fi

if grep -Eq '["'\''`]/?assets/' "$JS"; then
  echo "FAIL ${js_path}: JS still contains root or root-like dynamic asset dependencies" >&2
  exit 1
fi

if grep -q '"/sub2api/assets/' "$JS"; then
  echo "FAIL ${js_path}: JS dynamic dependencies are absolute and will be doubled by Vite preload" >&2
  exit 1
fi

dynamic_js_path="$(grep -Eo 'sub2api/assets/[^"'\''` >]+\.js' "$JS" | head -n 1 || true)"
dynamic_css_path="$(grep -Eo 'sub2api/assets/[^"'\''` >]+\.css' "$JS" | head -n 1 || true)"

if [[ -z "$dynamic_js_path" || -z "$dynamic_css_path" ]]; then
  echo "FAIL ${js_path}: could not discover dynamic JS/CSS dependencies" >&2
  exit 1
fi

require_code "/${dynamic_js_path}" "200"
require_code "/${dynamic_css_path}" "200"

echo "OK ${js_path} base path rewrite"
echo "remote Sub2API base path check passed"
