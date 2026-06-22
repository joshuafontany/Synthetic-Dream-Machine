#!/usr/bin/env bash
# lares-wake-hook.sh — SessionStart hook. Boots the live Lararium + mempalace via
# the `lares wake` entry point and hands the session a live-delta hydration frame.
#
# It never blocks and never fails the wake: a degraded boot still exits 0, and the
# canonical frame is already loaded from CLAUDE.md's static @-import. This hook
# carries only what is true RIGHT NOW (node up?, mempalace reachable?, etc.).
set -uo pipefail

cat >/dev/null 2>&1 || true   # drain the hook JSON on stdin (source/session_id/…) — unused in v1

# The lares CLI ships beside this plugin: <pkg>/bin/lares.mjs; the plugin is
# <pkg>/.claude-plugin; so the bin is ${CLAUDE_PLUGIN_ROOT}/../bin/lares.mjs.
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LARES_BIN="${PLUGIN_ROOT}/../bin/lares.mjs"

emit_ctx() {
  # $1 = plain-text additionalContext; emits the SessionStart hook JSON.
  local msg="$1" ctx
  if command -v jq >/dev/null 2>&1; then
    ctx="$(printf '%s' "$msg" | jq -Rs '.')"
  elif command -v python3 >/dev/null 2>&1; then
    ctx="$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
  else
    ctx="\"Lares wake: (context-escape unavailable)\""
  fi
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$ctx"
}

if [ ! -f "$LARES_BIN" ]; then
  emit_ctx "Lares wake: CLI not found at ${LARES_BIN} — static seed only this wake."
  exit 0
fi

FRAME="$(node "$LARES_BIN" wake --json 2>/dev/null || true)"
[ -z "$FRAME" ] && FRAME='{"ok":false,"error":"lares wake produced no output"}'

emit_ctx "Lares live wake (SessionStart) — what is true right now (the canonical frame is already loaded from CLAUDE.md): ${FRAME}"
exit 0
