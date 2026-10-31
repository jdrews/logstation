#!/usr/bin/env bash
set -euo pipefail

# E2E test harness for logstation.
#
# Usage: scripts/test-e2e.sh
#
# Lifecycle (everything torn down via trap on exit, success or failure):
#   1. Prepare a temp work dir with an isolated e2e config file (dedicated
#      port, polling tailer) and an empty log file.
#   2. Build the web frontend, the logstation binary, and loggenerator.
#   3. Start loggenerator, appending a line to the log file every 250 ms.
#   4. Start logstation, serving the built web app and the /ws endpoint.
#   5. Run the Playwright suite against the live instance.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

E2E_PORT="${E2E_PORT:-8899}"
# Single source of truth for the instance name: written into the e2e config
# below and exported to the Playwright specs.
E2E_NAME="logstation-e2e"
BASE_URL="http://127.0.0.1:${E2E_PORT}"

WORK_DIR="$(mktemp -d /tmp/logstation-e2e-XXXXXX)"
mkdir -p "$WORK_DIR/bin" "$WORK_DIR/logs"
E2E_LOGFILE="$WORK_DIR/logs/e2e.log"
# Create the log file up front: the tailer's glob must match before
# logstation starts, or Follow() panics.
touch "$E2E_LOGFILE"

# Pre-seeded e2e config: one tailed log file, a dedicated port so the suite
# never collides with a developer's running instance, and a polling tailer
# (the most deterministic option across local and CI filesystems).
cat > "$WORK_DIR/e2e.conf" <<EOF
logs = ["$E2E_LOGFILE"]
logStationName = "$E2E_NAME"
syntaxColors = [
    { color="hired", regex=".*ERROR.*" },
    { color="higreen", regex=".*INFO.*" },
]
tailingMethod = "polling"
pollingTimeMS = 250

[server_settings]
webServerPort = $E2E_PORT
webServerAddress = "127.0.0.1"
webSocketSecurity = false
disableCORS = false
EOF

LOGSTATION_PID=""
GENERATOR_PID=""
RESULT=0

cleanup() {
  RESULT=$?
  # On failure, preserve the logstation/generator logs for triage.
  # A successful run leaves nothing behind.
  if [ "$RESULT" -ne 0 ]; then
    mkdir -p "$REPO_ROOT/e2e-failure-logs"
    cp -f "$WORK_DIR"/*.log "$REPO_ROOT/e2e-failure-logs/" 2>/dev/null || true
    echo "E2E failed (exit $RESULT); logs saved to $REPO_ROOT/e2e-failure-logs/"
  fi
  echo ""
  echo "Cleaning up e2e environment..."
  if [ -n "$GENERATOR_PID" ] && kill -0 "$GENERATOR_PID" 2>/dev/null; then
    kill "$GENERATOR_PID" 2>/dev/null || true
  fi
  if [ -n "$LOGSTATION_PID" ] && kill -0 "$LOGSTATION_PID" 2>/dev/null; then
    kill "$LOGSTATION_PID" 2>/dev/null || true
  fi
  # Backstop for anything that outlived its PID (re-spawned children, etc.)
  pkill -f "$WORK_DIR/e2e.conf" 2>/dev/null || true
  pkill -f "loggenerator.*$E2E_LOGFILE" 2>/dev/null || true
  rm -rf "$WORK_DIR"
  exit $RESULT
}
trap cleanup EXIT

# ── Build ────────────────────────────────────────────────────────────────────
if [ ! -d web/node_modules ]; then
  echo "Installing web dependencies..."
  (cd web && yarn install)
fi
echo "Building web frontend..."
(cd web && yarn build)

echo "Building logstation..."
go build -o "$WORK_DIR/bin/logstation" .

# Prefer a local loggenerator checkout; fall back to installing the module
# from github.com/jdrews/loggenerator (the CI path — no checkout there).
if [ -f loggenerator/main.go ]; then
  echo "Building loggenerator from local checkout..."
  (cd loggenerator && go build -o "$WORK_DIR/bin/loggenerator" .)
else
  echo "Installing loggenerator from github.com/jdrews/loggenerator..."
  GOBIN="$WORK_DIR/bin" go install github.com/jdrews/loggenerator@latest
fi

# ── loggenerator ─────────────────────────────────────────────────────────────
echo "Starting loggenerator writing to $E2E_LOGFILE (one line per 250 ms)..."
"$WORK_DIR/bin/loggenerator" -logfile "$E2E_LOGFILE" -interval 250 \
  > "$WORK_DIR/generator.log" 2>&1 &
GENERATOR_PID=$!

# ── logstation ───────────────────────────────────────────────────────────────
echo "Starting logstation on port $E2E_PORT..."
"$WORK_DIR/bin/logstation" -c "$WORK_DIR/e2e.conf" \
  > "$WORK_DIR/logstation.log" 2>&1 &
LOGSTATION_PID=$!

echo "Waiting for logstation at $BASE_URL..."
for i in $(seq 1 30); do
  if curl -sf "$BASE_URL/settings/logstation-name" > /dev/null 2>&1; then
    echo "logstation is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: logstation did not come up (see $WORK_DIR/logstation.log)" >&2
    cat "$WORK_DIR/logstation.log" >&2
    exit 1
  fi
  sleep 1
done

# ── Playwright ───────────────────────────────────────────────────────────────
cd "$REPO_ROOT/test/e2e"
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund
fi

echo "Running E2E tests..."
set +e
E2E_BASE_URL="$BASE_URL" E2E_LOGFILE="$E2E_LOGFILE" E2E_NAME="$E2E_NAME" \
  npx playwright test
RESULT=$?
set -e

exit $RESULT
