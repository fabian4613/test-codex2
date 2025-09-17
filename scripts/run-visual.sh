#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-3000}

function cleanup() {
  if [ -f /tmp/next_pid ]; then
    kill "$(cat /tmp/next_pid)" >/dev/null 2>&1 || true
    rm -f /tmp/next_pid
  fi
}
trap cleanup EXIT

echo "[VISUAL] Building Next.js (production)..."
npm run -s build

echo "[VISUAL] Starting Next.js server on :$PORT ..."
( npm run -s start >/tmp/next_start.log 2>&1 & echo $! > /tmp/next_pid )

echo "[VISUAL] Waiting for server to be ready..."
for i in $(seq 1 60); do
  if curl -sf "http://localhost:$PORT/" >/dev/null; then
    echo "[VISUAL] Server ready."
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "[VISUAL] Server failed to start:" >&2
    cat /tmp/next_start.log >&2 || true
    exit 1
  fi
done

echo "[VISUAL] Detecting Chrome binary for Lighthouse..."
CHROME_PATH=${CHROME_PATH:-}
if [ -z "${CHROME_PATH}" ]; then
  if command -v google-chrome >/dev/null 2>&1; then CHROME_PATH=$(command -v google-chrome); fi
  if [ -z "$CHROME_PATH" ] && command -v chromium >/dev/null 2>&1; then CHROME_PATH=$(command -v chromium); fi
  if [ -z "$CHROME_PATH" ] && command -v chromium-browser >/dev/null 2>&1; then CHROME_PATH=$(command -v chromium-browser); fi
fi
if [ -n "$CHROME_PATH" ]; then
  export CHROME_PATH
  echo "[VISUAL] Using CHROME_PATH=$CHROME_PATH"
else
  echo "[VISUAL] WARNING: CHROME_PATH not found; LHCI may fail."
fi

echo "[VISUAL] Running BackstopJS tests..."
set +e
npx backstop test --configPath=backstop.config.js
BACKSTOP_RC=$?
set -e

echo "[VISUAL] Running Lighthouse CI (collect + assert)..."
set +e
npm run -s lhci:collect
LH_COLLECT_RC=$?
npm run -s lhci:assert
LH_ASSERT_RC=$?
set -e

if [ $BACKSTOP_RC -ne 0 ] || [ $LH_COLLECT_RC -ne 0 ] || [ $LH_ASSERT_RC -ne 0 ]; then
  echo "[VISUAL] One or more checks failed: BACKSTOP_RC=$BACKSTOP_RC, LH_COLLECT_RC=$LH_COLLECT_RC, LH_ASSERT_RC=$LH_ASSERT_RC" >&2
  exit 1
fi

echo "[VISUAL] All visual checks passed."

