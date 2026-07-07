#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-start}"
LOCAL_HOST="${JOB_SPRINT_TUNNEL_LOCAL_HOST:-127.0.0.1}"
LOCAL_PORT="${JOB_SPRINT_TUNNEL_LOCAL_PORT:-18080}"
REMOTE_HOST="${JOB_SPRINT_TUNNEL_REMOTE_HOST:-203.0.113.10}"
REMOTE_USER="${JOB_SPRINT_TUNNEL_REMOTE_USER:-ubuntu}"
REMOTE_BIND="${JOB_SPRINT_TUNNEL_REMOTE_BIND:-127.0.0.1}"
REMOTE_PORT="${JOB_SPRINT_TUNNEL_REMOTE_PORT:-8000}"
SSH_KEY="${JOB_SPRINT_TUNNEL_SSH_KEY:-}"
PID_DIR="${JOB_SPRINT_TUNNEL_PID_DIR:-/tmp}"
PID_FILE="${PID_DIR}/job-sprint-tunnel-${LOCAL_PORT}.pid"
URL="http://${LOCAL_HOST}:${LOCAL_PORT}/"

if [[ -z "$SSH_KEY" ]]; then
  SSH_KEY="$(printf "%s/.ssh/%s.%s" "$HOME" "fk_sha_01" "pem")"
fi

ssh_base=(
  ssh
  -i "$SSH_KEY"
  -o ExitOnForwardFailure=yes
  -o ServerAliveInterval=30
  -o ServerAliveCountMax=2
  -o StrictHostKeyChecking=no
  -L "${LOCAL_HOST}:${LOCAL_PORT}:${REMOTE_BIND}:${REMOTE_PORT}"
  "${REMOTE_USER}@${REMOTE_HOST}"
)

require_key() {
  if [[ ! -r "$SSH_KEY" ]]; then
    echo "SSH key is not readable: $SSH_KEY" >&2
    exit 1
  fi
}

pid_alive() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

http_ok() {
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "${URL}api/auth/session" || true)"
  [[ "$code" == "200" || "$code" == "401" ]]
}

print_url() {
  echo "$URL"
}

start_tunnel() {
  require_key
  if pid_alive; then
    echo "Job Sprint tunnel already running: pid $(cat "$PID_FILE")"
    print_url
    exit 0
  fi
  mkdir -p "$PID_DIR"
  "${ssh_base[@]}" -f -N
  sleep 0.5
  local pid
  pid="$(pgrep -f "ssh .*${LOCAL_HOST}:${LOCAL_PORT}:${REMOTE_BIND}:${REMOTE_PORT}.*${REMOTE_USER}@${REMOTE_HOST}" | tail -n 1 || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid" > "$PID_FILE"
  fi
  if ! http_ok; then
    echo "Tunnel started, but Job Sprint health check failed at ${URL}api/auth/session" >&2
    [[ -n "${pid:-}" ]] && kill "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    exit 1
  fi
  echo "Job Sprint tunnel ready."
  print_url
}

stop_tunnel() {
  if pid_alive; then
    kill "$(cat "$PID_FILE")"
    rm -f "$PID_FILE"
    echo "Job Sprint tunnel stopped."
    exit 0
  fi
  rm -f "$PID_FILE"
  local pids
  pids="$(pgrep -f "ssh .*${LOCAL_HOST}:${LOCAL_PORT}:${REMOTE_BIND}:${REMOTE_PORT}.*${REMOTE_USER}@${REMOTE_HOST}" || true)"
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill
    echo "Job Sprint tunnel stopped."
  else
    echo "Job Sprint tunnel is not running."
  fi
}

status_tunnel() {
  if http_ok; then
    echo "Job Sprint tunnel is reachable."
    print_url
    exit 0
  fi
  if pid_alive; then
    echo "Job Sprint tunnel process exists, but local health check failed: pid $(cat "$PID_FILE")" >&2
    exit 1
  fi
  echo "Job Sprint tunnel is not reachable." >&2
  exit 1
}

case "$COMMAND" in
  start)
    start_tunnel
    ;;
  stop)
    stop_tunnel
    ;;
  restart)
    stop_tunnel >/dev/null || true
    start_tunnel
    ;;
  status)
    status_tunnel
    ;;
  url)
    print_url
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|url}" >&2
    exit 2
    ;;
esac
