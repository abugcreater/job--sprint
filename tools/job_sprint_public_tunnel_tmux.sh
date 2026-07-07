#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-start}"
SESSION="${JOB_SPRINT_PUBLIC_TUNNEL_SESSION:-job-sprint-public-tunnel}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

session_exists() {
  tmux has-session -t "$SESSION" 2>/dev/null
}

capture_session() {
  tmux capture-pane -t "$SESSION" -p -S -260 2>/dev/null || true
}

print_current_url() {
  capture_session | tr -d '\n' | grep -Eo 'https://[a-zA-Z0-9.-]+\.lhr\.life' | tail -n 1 || true
}

start_session() {
  if session_exists; then
    echo "Job Sprint public tunnel tmux session already running: $SESSION"
    print_current_url
    exit 0
  fi
  tmux new-session -d -s "$SESSION" "cd \"$ROOT_DIR\" && bash tools/job_sprint_public_tunnel.sh"
  sleep 12
  local url
  url="$(print_current_url)"
  if [[ -z "$url" ]]; then
    echo "Public tunnel session started, but no URL was captured yet. Run status again in a few seconds." >&2
    exit 1
  fi
  echo "Job Sprint public tunnel ready."
  echo "$url"
}

status_session() {
  if ! session_exists; then
    echo "Job Sprint public tunnel tmux session is not running." >&2
    exit 1
  fi
  local url
  url="$(print_current_url)"
  if [[ -n "$url" ]]; then
    echo "Job Sprint public tunnel tmux session is running."
    echo "$url"
  else
    echo "Job Sprint public tunnel tmux session is running, but no URL has been captured yet." >&2
    exit 1
  fi
}

stop_session() {
  if session_exists; then
    tmux kill-session -t "$SESSION"
    echo "Job Sprint public tunnel tmux session stopped."
  else
    echo "Job Sprint public tunnel tmux session is not running."
  fi
}

case "$COMMAND" in
  start)
    start_session
    ;;
  status)
    status_session
    ;;
  stop)
    stop_session
    ;;
  log)
    if ! session_exists; then
      echo "Job Sprint public tunnel tmux session is not running." >&2
      exit 1
    fi
    capture_session
    ;;
  url)
    print_current_url
    ;;
  *)
    echo "Usage: $0 {start|status|stop|log|url}" >&2
    exit 2
    ;;
esac
