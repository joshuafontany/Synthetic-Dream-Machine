#!/usr/bin/env bash
# typecheck-witness — report every package's REAL type errors, and exit non-zero if any stand.
#
# ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
# `tsc` colorizes by default, so its output carries ANSI escapes BETWEEN the word "error" and the
# code: the literal bytes read `error\033[0m\033[90m TS2741`. A reader grepping for "error TS" —
# the obvious thing to grep for — matches NOTHING, and a package with two dozen real errors reports
# clean. The silence is indistinguishable from success, which makes it the worst kind of check: one
# that answers confidently and answers wrong.
#
# So this passes `--pretty false` and greps the plain form. It also drops TS6059 ("not under
# rootDir"), which every package emits by design: they resolve siblings through path mappings into
# source, and that arrangement is the monorepo's, not a fault in the code being checked.
#
# Run it rather than a hand-rolled grep. A check worth trusting is one whose failure mode you have
# seen fail.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

status=0
for dir in packages/*/; do
  pkg=$(basename "$dir")
  [ -f "$dir/tsconfig.json" ] || continue
  cfg="tsconfig.json"
  [ -f "$dir/tsconfig.typecheck.json" ] && cfg="tsconfig.typecheck.json"

  errs=$( (cd "$dir" && npx tsc --noEmit --pretty false -p "$cfg" 2>&1) | grep "error TS" | grep -v "TS6059" )
  count=$(printf '%s' "$errs" | grep -c . )

  if [ "$count" -eq 0 ]; then
    printf '  %-22s ok\n' "$pkg"
  else
    printf '  %-22s %s error(s)\n' "$pkg" "$count"
    printf '%s\n' "$errs" | sed 's/^/      /'
    status=1
  fi
done

# A run that checked nothing must not read as a run that found nothing.
[ "$status" -eq 0 ] && echo "typecheck-witness: every package clean"
exit "$status"
