#!/usr/bin/env bash
# browser-weld-witness — stand the app, drive a REAL browser, follow an edit toward the node's disk.
#
# ── WHY IT STANDS ALONE ─────────────────────────────────────────────────────────────────────────
# `lararium-browser`'s suite already runs in Chromium, but every vector there is package-scoped: it
# proves an organ. This proves a WELD, and a weld spans the browser's DOM and the node's filesystem —
# two sides no package-scoped suite can hold at once. It also boots a dev server, so it belongs
# outside `pnpm -r test` for the same reason the e2e harness does.
#
# ── ONE VECTOR, ONE FAILURE ─────────────────────────────────────────────────────────────────────
# The driver isolates each seam and names it. A combined "the edit reached disk" assertion would fail
# ambiguously — it reports that the weld broke and not where, which is the diagnosis this exists for.
# `gap` is not `FAILED`: a gap says a leg is unwired or the surface offered no target; a FAILED says a
# wired leg did not carry. Only FAILED sets the exit code.
#
# Usage:  tools/browser-weld-witness.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${WELD_PORT:-5173}"
LOG="$(mktemp -t weld-vite-XXXXXX.log)"
VITE_PID=""

cleanup() {
  [ -n "$VITE_PID" ] && kill "$VITE_PID" 2>/dev/null
  # Reap by PID only. A pattern kill here once matched this house's own waiter shells.
  wait "$VITE_PID" 2>/dev/null
  rm -f "$LOG"
}
trap cleanup EXIT

echo "browser-weld: standing the app on :$PORT"
( cd packages/lararium-app && npx vite --port "$PORT" --strictPort >"$LOG" 2>&1 ) &
VITE_PID=$!

# Wait for the server to ANSWER, never for a fixed sleep — a fixed sleep reports a slow machine as a
# broken one, and this house has already paid for that lesson in a readiness race.
for _ in $(seq 1 60); do
  curl -sf "http://localhost:$PORT/" >/dev/null 2>&1 && break
  sleep 0.5
done
if ! curl -sf "http://localhost:$PORT/" >/dev/null 2>&1; then
  echo "browser-weld: the app never answered on :$PORT — vite log follows"
  tail -12 "$LOG"
  exit 1
fi

WELD_APP_URL="http://localhost:$PORT" node tools/browser-weld/weld.mjs
