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
# Copilot CLI's authoritative project cwd lives beside the selected session in
# the native SQLite store.  Do not let an event hook's ambient cwd rename a
# session's wing.
if [ -z "$project_cwd" ] && [ "${transcript##*/}" = "session-store.db" ] && [ -n "${sid:-}" ]; then
project_cwd="$(python3 - "$transcript" "$sid" <<'PY' 2>/dev/null
import sqlite3, sys
try:
    con = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
    row = con.execute("SELECT cwd FROM sessions WHERE id=?", (sys.argv[2],)).fetchone()
    if row and isinstance(row[0], str): print(row[0])
finally:
    try: con.close()
    except Exception: pass
PY
)"
fi
base="$(basename "${project_cwd:-${cwd:-$PWD}}")"
slug="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]' | tr ' -' '__' | sed 's/[^a-z0-9_]//g')"
[ -n "$slug" ] || slug="unsorted"
wing="wing_${slug}"
fi

# Stage just this transcript so sibling scratch / memory / json never get swept.
# Claude .jsonl + Codex rollout stage as-is. Copilot CLI remains a native SQLite pointer;
# Copilot VS Code JSONL still takes its declared adapter path during bulk comparison.
# A live hook owns a source-scoped directory under the ONE harvest-stage root, separate from
# bulk's `bulk/...` and the vanilla comparator's `comparator/...` lanes. The original filename stays intact; the directory
# names ingress only, never memory identity.
# Surface comes from the native path, not a staging filename prefix.
case "$transcript" in
  */.codex/sessions/*)      surface=codex ;;
  */GitHub.copilot-chat/transcripts/*) surface=copilot-vscode ;;
  */.copilot/session-store.db) surface=copilot-cli ;;
  *)                        surface=claude ;;
esac
direct_sqlite=0
if [ "$surface" != "copilot-cli" ]; then
  source_key="$(printf '%s' "$transcript" | sha256sum 2>/dev/null | cut -c1-16)"
  [ -n "$source_key" ] || exit 0
  stage="$_lares_state/harvest-stage/live/$wing/$surface/$source_key"
  mkdir -p "$stage" 2>/dev/null || exit 0
else
  direct_sqlite=1
fi
case "$transcript" in
  */.copilot/session-store.db)
    # The database itself is the durable native source. Pass its session selector to Python;
    # no Claude-shaped export and no staging spelling sits between the two.
    [ -n "${sid:-}" ] || exit 0
    ;;
  *)
    dst="$stage/$(basename "$transcript")"
    ln -f "$transcript" "$dst" 2>/dev/null || cp -f "$transcript" "$dst" 2>/dev/null || exit 0
    ;;
esac

# Detached: submit one native source pointer to the serialized Python holder.
# The source cap derives its CID ledger and idempotently lands the fresh tail;
# telemetry remains a separate, best-effort projection.
(
  # The CLI sends a descriptor only. SQLite remains SQLite all the way to the
  # source cap; file-backed surfaces use their stable live pointer directory.
  if [ "$direct_sqlite" = 1 ]; then
    "$LARES" sense capture "$transcript" --wing "$wing" --session-id "$sid" >/dev/null 2>&1
  else
    "$LARES" sense capture "$stage" --wing "$wing" >/dev/null 2>&1
  fi
  # Tasked-spirit (sub-agent) verbatim, DISTINCT from the main agent — mines
  # <session>/subagents/agent-*.jsonl into wing_<w>__spirits, named from each
  # handoff (Mask → Pet-Name-by-role), both sides. Reads the ORIGINAL transcript
  # (not the staged copy) to find the subagents/ dir. Non-Claude → no-op.
  "$LARES" sense subagents "$transcript" --wing "$wing" >/dev/null 2>&1
  # Gradient readings (lar-telemetry through @admin) on both wings — parent + spirits.
  "$LARES" sense telemetry --wing "$wing" >/dev/null 2>&1
  "$LARES" sense telemetry --wing "${wing}__spirits" >/dev/null 2>&1
  # Keep live pointers stable. Removing a shared pointer after one Stop races a
  # simultaneous Stop for the same session; it also creates a growing trail of
  # per-run stage names. One source-scoped directory is the durable live lane.
) >/dev/null 2>&1 &

exit 0
