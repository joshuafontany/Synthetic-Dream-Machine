#!/usr/bin/env bash
# sweep-guard — refuse to sweep a path another hand is writing.
#
# A corpus sweep reads, modifies and writes every file in a loop. Where a parallel session edits a file
# between the read and the write, the write WINS and the edit vanishes — leaving a well-formed carrier
# that verifies, round-trips, and carries none of what someone just wrote. Five edits went that way in
# one afternoon, and nothing found them: a clobbered edit leaves no pattern, only an absence.
#
# git already knows. `git status --porcelain <path>` names every file with uncommitted work, tracked or
# not, and a sweep that refuses on a non-empty answer costs nothing and closes the whole failure mode.
#
#   usage:  tools/sweep-guard.sh bags/   &&   <the sweep>
set -uo pipefail
cd "$(dirname "$0")/.."
TARGET="${1:-bags/}"
DIRTY="$(git status --porcelain -- "$TARGET")"
[ -z "$DIRTY" ] && { echo "[sweep-guard] $TARGET carries no uncommitted work — a sweep may proceed"; exit 0; }
echo "[sweep-guard] REFUSED — $TARGET carries uncommitted work another hand may be mid-edit on:"
echo "$DIRTY" | head -20
[ "$(echo "$DIRTY" | wc -l)" -gt 20 ] && echo "  … and $(( $(echo "$DIRTY" | wc -l) - 20 )) more"
echo "  Commit or stash it first. A sweep that runs over a live edit destroys it silently."
exit 1
