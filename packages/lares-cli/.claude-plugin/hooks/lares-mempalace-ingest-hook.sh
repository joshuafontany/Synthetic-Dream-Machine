#!/usr/bin/env bash
# Lares <-> mempalace ingest hook (our integration layer — the @admin memory-shore).
#
# WHY THIS EXISTS:
#   The vendored mempalace submodule's stop/precompact hook mines the WHOLE
#   ~/.claude/projects/<proj>/ dir into one hardcoded `--wing sessions` mega-wing
#   (no per-project boundary, scratch files swept). mempalace stays external
#   (vendored, not edited), so our fix lives here.
#
# WHAT IT DOES — two legs of the tensegrity, "called along with the save":
#   1. DRAWER leg (the verbatim compression member): mine THIS session's
#      transcript into a PER-PROJECT wing, convos/exchange (no LLM extract —
#      the navigational structure rides in-stream). Idempotent (file-level dedup).
#   2. BEARING leg (the domain tension): `lares harvest --writeback` reads the
#      newly-added drawers, runs the sovereign gradient parser, and writes our
#      `lar_*` domain metadata back ONTO them + deterministic hall routing.
#      Idempotent (lar_hv skips already-harvested drawers — only the new ones cost).
#
# Detached so the hook returns instantly. Fires from Stop + SessionEnd/PreCompact.
set -uo pipefail

input="$(cat)"
# Harness-aware: Claude Code + Codex Stop hooks deliver `transcript_path` on stdin;
# Copilot CLI sessionEnd delivers `sessionId` only — resolve its events.jsonl.
transcript="$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("transcript_path",""))' 2>/dev/null)"
cwd="$(printf '%s' "$input" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("cwd",""))' 2>/dev/null)"

if [ -z "${transcript:-}" ]; then
  sid="$(printf '%s' "$input" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("sessionId",d.get("session_id","")))' 2>/dev/null)"
  [ -n "${sid:-}" ] && [ -f "$HOME/.copilot/session-state/$sid/events.jsonl" ] && transcript="$HOME/.copilot/session-state/$sid/events.jsonl"
fi

[ -n "${transcript:-}" ] && [ -f "$transcript" ] || exit 0

# Per-project wing from the working directory name:
#   /home/joshu/Synthetic-Dream-Machine -> wing_synthetic_dream_machine
#   /home/joshu                          -> wing_joshu
base="$(basename "${cwd:-$PWD}")"
slug="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]' | tr ' -' '__' | sed 's/[^a-z0-9_]//g')"
[ -n "$slug" ] || slug="unsorted"
wing="wing_${slug}"

MP="$HOME/.local/bin/mempalace"; [ -x "$MP" ] || MP="mempalace"
LARES="$HOME/.local/bin/lares"; [ -x "$LARES" ] || LARES="lares"

# Stage just this transcript so sibling scratch / memory / json never get swept.
# Claude .jsonl + Codex rollout are mined as-is (mempalace parses both); Copilot
# events.jsonl has no mempalace parser → normalize it to a Claude-shaped jsonl first.
stage="$(mktemp -d 2>/dev/null)" || exit 0
case "$transcript" in
  */.copilot/session-state/*)
    HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"
    NORM="$HOOK_DIR/../../../../packages/lararium-mempalace/scripts/copilot_normalize.py"
    sid="$(basename "$(dirname "$transcript")")"
    python3 "$NORM" "$transcript" > "$stage/$sid.jsonl" 2>/dev/null || { rm -rf "$stage"; exit 0; }
    ;;
  *)
    ln "$transcript" "$stage/" 2>/dev/null || cp "$transcript" "$stage/" 2>/dev/null || { rm -rf "$stage"; exit 0; }
    ;;
esac

# Detached: drawer mine (leg 1) THEN tensegrity writeback (leg 2), then clean up.
(
  "$MP" mine "$stage" --mode convos --extract exchange --wing "$wing" --agent claude >/dev/null 2>&1
  "$LARES" harvest --writeback --wing "$wing" >/dev/null 2>&1
  rm -rf "$stage"
) >/dev/null 2>&1 &

exit 0
