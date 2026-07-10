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

# ── The EPHEMERAL gate (skip staging entirely) ────────────────────────────────
# Designation carries authority: a session declares itself ephemeral (a
# `<transcript>.ephemeral` sibling, or a `.lar-ephemeral` marker in the session's
# own recorded cwd), or derives it (that recorded cwd sits under a scratch root:
# $TMPDIR / /tmp, a LAR_ROOT sandbox, the corpus-palace `.corpus` scratch).
# EPHEMERAL ≠ DELETED — the transcript survives; only the palace ingest declines.
# LOUD: one skip line on stderr (silence never hides a skip). TS twin: the
# sessionEphemeral verdict in packages/lares-cli/src/ephemeral.ts — keep in lockstep.
if [ "${transcript##*.}" = "jsonl" ]; then
  eph_reason=""
  [ -f "${transcript%.jsonl}.ephemeral" ] && eph_reason="declared: $(basename "${transcript%.jsonl}.ephemeral")"
  if [ -z "$eph_reason" ]; then
    session_cwd="$(python3 -c '
import sys, json
with open(sys.argv[1]) as f:
    for i, line in enumerate(f):
        if i > 60: break
        try: c = json.loads(line).get("cwd")
        except Exception: continue
        if c:
            print(c); break
' "$transcript" 2>/dev/null)"
    if [ -n "${session_cwd:-}" ]; then
      [ -f "$session_cwd/.lar-ephemeral" ] && eph_reason="declared: .lar-ephemeral in $session_cwd"
      if [ -z "$eph_reason" ]; then
        for _root in "${TMPDIR:-/tmp}" /tmp ${LAR_ROOT:+"$LAR_ROOT"} "${LAR_ROOT:-$HOME/.lares}/.corpus"; do
          _root="${_root%/}"
          case "$session_cwd" in
            "$_root"|"$_root"/*) eph_reason="derived: cwd $session_cwd under scratch root $_root"; break ;;
          esac
        done
      fi
    fi
  fi
  if [ -n "$eph_reason" ]; then
    echo "[lares-ingest-hook] EPHEMERAL skip: $(basename "$transcript") — $eph_reason" >&2
    exit 0
  fi
fi

MP="$HOME/.local/bin/mempalace"; [ -x "$MP" ] || MP="mempalace"
LARES="$HOME/.local/bin/lares"; [ -x "$LARES" ] || LARES="lares"

# Wing = the AI PROJECT the transcript belongs to, agnostic to AI surface — the
# project dir's recorded cwd (harvest --all's discoverClaude law), never the
# live payload cwd (it drifts with every agent cd).
# FALLBACK LADDER (the hook must survive a broken dist):
#   `lares wing-of` (the ONE TS wing law, src/wing-law.ts) → inline python (the
#   recorded-cwd mirror) → payload cwd → PWD.
wing=""
if [ "${transcript##*.}" = "jsonl" ]; then
  wing="$("$LARES" wing-of "$transcript" --no-json 2>/dev/null | tail -n1)"
  case "$wing" in wing_*) : ;; *) wing="" ;; esac
fi
if [ -z "$wing" ]; then
project_cwd=""
if [ -n "${transcript:-}" ] && [ "${transcript##*.}" = "jsonl" ]; then
  project_cwd="$(python3 -c '
import sys, json, os, glob
files = sorted(glob.glob(os.path.join(os.path.dirname(sys.argv[1]), "*.jsonl")))
for path in files[:1] + [sys.argv[1]]:
    with open(path) as f:
        for line in f:
            try: c = json.loads(line).get("cwd")
            except Exception: continue
            if c: print(c); sys.exit(0)
' "$transcript" 2>/dev/null)"
fi
base="$(basename "${project_cwd:-${cwd:-$PWD}}")"
slug="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]' | tr ' -' '__' | sed 's/[^a-z0-9_]//g')"
[ -n "$slug" ] || slug="unsorted"
wing="wing_${slug}"
fi

# Stage just this transcript so sibling scratch / memory / json never get swept.
# Claude .jsonl + Codex rollout are mined as-is (mempalace parses both); Copilot
# events.jsonl has no mempalace parser → normalize it to a Claude-shaped jsonl first.
# STABLE per-wing staging path — never mktemp: mempalace's file-level dedup keys on
# the staged path, so an ephemeral dir re-mints every drawer on each daemon-down
# fallback mine (the 2026-07-01 duplicate-drawer bite). Same session → same path.
stage="$_lares_state/capture-stage/$wing"
mkdir -p "$stage" 2>/dev/null || exit 0
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
    # The stage dir is SHARED per wing (stable path law) — clean only our own files,
    # never the dir: a concurrent session of the same wing may be mid-mine.
    HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"
    NORM="$HOOK_DIR/../../../../packages/lararium-mempalace/scripts/copilot_sqlite_normalize.py"
    [ -n "${sid:-}" ] || exit 0
    raw="$stage/raw-$$"; mkdir -p "$raw"
    dst="$stage/${surface}__$sid.jsonl"
    python3 "$NORM" "$transcript" "$raw" >/dev/null 2>&1 || { rm -rf "$raw"; exit 0; }
    [ -f "$raw/$sid.jsonl" ] || { rm -rf "$raw"; exit 0; }
    mv "$raw/$sid.jsonl" "$dst" 2>/dev/null || { rm -rf "$raw"; exit 0; }
    rm -rf "$raw"
    ;;
  *)
    dst="$stage/${surface}__$(basename "$transcript")"
    ln -f "$transcript" "$dst" 2>/dev/null || cp -f "$transcript" "$dst" 2>/dev/null || exit 0
    ;;
esac

# Detached: drawer mine (leg 1, verbatim — VM-free, ALWAYS lands) THEN lar-telemetry
# (leg 2, the gradient readings) THROUGH the @admin seat, then clean up.
#   lar-telemetry routes the lar_* projection through the running @admin daemon
#   (mempalace through the seat, Option D). Daemon down → telemetry no-ops; the
#   verbatim drawer already landed and the `lares harvest --all` lar_hv sweep
#   re-enriches it later (verbatim-always / telemetry-eventual,
#   lar:///ha.ka.ba/lararium/api/lar-telemetry).
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
  # Remove only OUR staged file — the wing stage dir is shared (stable path law);
  # a concurrent same-wing session's file must survive our cleanup.
  rm -f "$dst"
) >/dev/null 2>&1 &

exit 0
