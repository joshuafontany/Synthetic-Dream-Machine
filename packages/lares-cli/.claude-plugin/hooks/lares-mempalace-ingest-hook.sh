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

# ── The hook-lever (spawn-contention guard) ──────────────────────────────────
# `lares hooks pause` / `lares mempalace quiesce` writes a marker; while it exists
# this hook NO-OPS so a migration/teardown runs without minting warm write-daemons
# (the daemon-spawn whack-a-mole cure — kill the SPAWNER, not the children). The
# marker path mirrors larStateHome() in TS: LAR_ROOT/state (isolated) else the XDG
# state home. `lares hooks resume` removes it. Keep this BEFORE any daemon-minting.
if [ -n "${LAR_ROOT:-}" ]; then
  _lares_state="$LAR_ROOT/state"
else
  _lares_state="${XDG_STATE_HOME:-$HOME/.local/state}/lares"
fi
[ -f "$_lares_state/hooks.paused" ] && exit 0

input="$(cat)"
# Harness-aware: Claude Code + Codex Stop hooks deliver `transcript_path` on stdin;
# Copilot CLI sessionEnd delivers `sessionId` only — its conversation lives in the
# global SQLite store ~/.copilot/session-store.db (events.jsonl is gone, CLI 1.0.6x).
transcript="$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("transcript_path",""))' 2>/dev/null)"
cwd="$(printf '%s' "$input" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("cwd",""))' 2>/dev/null)"

if [ -z "${transcript:-}" ]; then
  sid="$(printf '%s' "$input" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("sessionId",d.get("session_id","")))' 2>/dev/null)"
  [ -n "${sid:-}" ] && [ -f "$HOME/.copilot/session-store.db" ] && transcript="$HOME/.copilot/session-store.db"
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
# Surface the drawer's origin (staged name prefixed `<surface>__…` → lar_surface).
case "$transcript" in
  */.codex/sessions/*)      surface=codex ;;
  */.copilot/session-store.db) surface=copilot-cli ;;
  *)                        surface=claude ;;
esac
case "$transcript" in
  */.copilot/session-store.db)
    # session-store.db holds EVERY session; the normalizer exports one jsonl per
    # session into a dir + a stdout manifest. Stage just THIS session's file (by sid).
    HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"
    NORM="$HOOK_DIR/../../../../packages/lararium-mempalace/scripts/copilot_sqlite_normalize.py"
    [ -n "${sid:-}" ] || { rm -rf "$stage"; exit 0; }
    raw="$stage/raw"; mkdir -p "$raw"
    python3 "$NORM" "$transcript" "$raw" >/dev/null 2>&1 || { rm -rf "$stage"; exit 0; }
    [ -f "$raw/$sid.jsonl" ] || { rm -rf "$stage"; exit 0; }
    mv "$raw/$sid.jsonl" "$stage/${surface}__$sid.jsonl" 2>/dev/null || { rm -rf "$stage"; exit 0; }
    rm -rf "$raw"
    ;;
  *)
    dst="$stage/${surface}__$(basename "$transcript")"
    ln "$transcript" "$dst" 2>/dev/null || cp "$transcript" "$dst" 2>/dev/null || { rm -rf "$stage"; exit 0; }
    ;;
esac

# Detached: drawer mine (leg 1, verbatim — VM-free, ALWAYS lands) THEN lar-telemetry
# (leg 2, the gradient readings) THROUGH the @admin seat, then clean up.
#   lar-telemetry routes the lar_* projection through the running @admin daemon
#   (mempalace through the seat, Option D). Daemon down → telemetry no-ops; the
#   verbatim drawer already landed and the `lares harvest --all` lar_hv sweep
#   re-enriches it later (verbatim-always / telemetry-eventual,
#   lar:///ha.ka.ba/@lararium/api/lar-telemetry).
(
  # DRAWER leg — route THROUGH the @daemon nalu (the {chat}→@daemon-nalu→mempalace path): each new
  # turn → `capture` verb → capture cap → WAL → flush `mine --source ndjson`. `lares capture` falls
  # back to a direct `mempalace mine --extract exchange` when the daemon is down (verbatim-always),
  # so the drawer never gets lost. Idempotent (per-wing capture watermark).
  "$LARES" capture "$stage" --wing "$wing" >/dev/null 2>&1
  # Tasked-spirit (sub-agent) verbatim, DISTINCT from the main agent — mines
  # <session>/subagents/agent-*.jsonl into wing_<w>__spirits, named from each
  # handoff (Mask → Pet-Name-by-role), both sides. Reads the ORIGINAL transcript
  # (not the staged copy) to find the subagents/ dir. Non-Claude → no-op.
  "$LARES" subagents "$transcript" --wing "$wing" >/dev/null 2>&1
  # Gradient readings (lar-telemetry through @admin) on both wings — parent + spirits.
  "$LARES" telemetry --wing "$wing" >/dev/null 2>&1
  "$LARES" telemetry --wing "${wing}__spirits" >/dev/null 2>&1
  rm -rf "$stage"
) >/dev/null 2>&1 &

exit 0
