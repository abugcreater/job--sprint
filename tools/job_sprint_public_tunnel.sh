#!/usr/bin/env bash
set -euo pipefail

LOCAL_HOST="${JOB_SPRINT_TUNNEL_LOCAL_HOST:-127.0.0.1}"
LOCAL_PORT="${JOB_SPRINT_TUNNEL_LOCAL_PORT:-18080}"
PUBLIC_HOST="${JOB_SPRINT_PUBLIC_TUNNEL_HOST:-localhost.run}"
PUBLIC_USER="${JOB_SPRINT_PUBLIC_TUNNEL_USER:-nokey}"
PUBLIC_REMOTE_PORT="${JOB_SPRINT_PUBLIC_REMOTE_PORT:-80}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/job_sprint_ssh_tunnel.sh" start >/dev/null

echo "Starting temporary public HTTPS tunnel for Job Sprint."
echo "Local origin: http://${LOCAL_HOST}:${LOCAL_PORT}/"
echo "This is a temporary access path. Keep this process running while using the public URL."

exec ssh \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=30 \
  -R "${PUBLIC_REMOTE_PORT}:${LOCAL_HOST}:${LOCAL_PORT}" \
  "${PUBLIC_USER}@${PUBLIC_HOST}"
