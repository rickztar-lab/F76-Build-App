#!/bin/bash
# Corre todas las pruebas de navegador contra el index.html del repo.
# Uso: bash tests/run_all.sh
# Requiere: python3, node, Playwright global + Chromium (ver tests/helpers.js).

set -u
cd "$(dirname "$0")/.."

PORT="${PORT:-8180}"
export BASE_URL="http://localhost:${PORT}"

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for i in $(seq 1 20); do
  if curl -s -o /dev/null "$BASE_URL/index.html"; then break; fi
  sleep 0.25
done

PASS=0
FAIL=0
FAILED_NAMES=""

for t in tests/test_*.js; do
  echo ""
  echo "=== $t ==="
  if node "$t"; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
    FAILED_NAMES="$FAILED_NAMES $t"
  fi
done

echo ""
echo "==================================="
echo "Suites OK: $PASS · Suites con fallos: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "Fallaron:$FAILED_NAMES"
  exit 1
fi
