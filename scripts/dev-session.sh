#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_BIND_HOST="${BACKEND_BIND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8081}"
FRONTEND_BIND_HOST="${FRONTEND_BIND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
PUBLIC_HOST="${PUBLIC_HOST:-}"

cd "$ROOT_DIR"

if [[ ! -x ".venv/bin/python" ]]; then
  echo "Missing .venv/bin/python. Create the virtualenv and install backend deps first." >&2
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "Missing node_modules. Run npm install first." >&2
  exit 1
fi

backend_pid=""
frontend_pid=""

detect_public_host() {
  if [[ -n "$PUBLIC_HOST" ]]; then
    printf '%s\n' "$PUBLIC_HOST"
    return
  fi

  if command -v tailscale >/dev/null 2>&1; then
    local ts_ip
    ts_ip="$(tailscale ip -4 2>/dev/null | head -n 1 | tr -d '[:space:]')"
    if [[ -n "$ts_ip" ]]; then
      printf '%s\n' "$ts_ip"
      return
    fi
  fi

  hostname -I 2>/dev/null | awk '{print $1}'
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi

  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  wait "$backend_pid" 2>/dev/null || true
  wait "$frontend_pid" 2>/dev/null || true
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

display_host="$(detect_public_host)"
if [[ -z "$display_host" ]]; then
  display_host="localhost"
fi

echo "Starting backend reload server on http://${display_host}:${BACKEND_PORT} (bind ${BACKEND_BIND_HOST})"
TS_GRAPH_HOST="$display_host" \
TS_GRAPH_PORT="$BACKEND_PORT" \
.venv/bin/python -m uvicorn backend.app:create_app \
  --factory \
  --reload \
  --host "$BACKEND_BIND_HOST" \
  --port "$BACKEND_PORT" &
backend_pid=$!

echo "Starting frontend dev server on http://${display_host}:${FRONTEND_PORT} (bind ${FRONTEND_BIND_HOST})"
npm run dev -- --host "$FRONTEND_BIND_HOST" --port "$FRONTEND_PORT" &
frontend_pid=$!

echo ""
echo "Dev environment is starting."
echo "Frontend: http://${display_host}:${FRONTEND_PORT}"
echo "Backend:  http://${display_host}:${BACKEND_PORT}"
echo "Press Ctrl+C to stop both processes."

wait -n "$backend_pid" "$frontend_pid"
