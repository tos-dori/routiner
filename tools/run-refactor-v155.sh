#!/usr/bin/env bash
set -euo pipefail

npm install --no-save acorn@8 playwright@1.52.0 >/dev/null 2>&1
node tools/refactor-v155.js

find src -name '*.js' -print0 | xargs -0 -n1 node --check
test -f styles/app.css
test -f src/data/default-routines.js
test ! -e app.js
test ! -e styles.css
test ! -e ARCHITECTURE_OUTLINE.txt
test ! -e .github/workflows/one-time-outline.yml
test "$(grep -c 'src/app.js' index.html)" -eq 1
test "$(grep -c 'styles/app.css' index.html)" -eq 1
test "$(grep -R -l 'personal_routine_v01' src | wc -l | tr -d ' ')" -eq 1
python3 -m json.tool manifest.webmanifest >/dev/null

npx playwright install --with-deps chromium >/dev/null
python3 -m http.server 4173 >/tmp/routiner-http.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID' EXIT
node tools/browser-smoke-v155.js

rm -rf node_modules package-lock.json
rm -f tools/refactor-v155.js tools/browser-smoke-v155.js tools/run-refactor-v155.sh
rmdir tools 2>/dev/null || true
