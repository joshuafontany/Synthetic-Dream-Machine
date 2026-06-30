#!/bin/bash
# rate-sealed — rate ONE text on the five Syad facets through a BLIND judge channel.
# Reads the rubric + text by absolute path in THIS shell, passes them inline, and runs
# the judges from a blank temp CWD (setup-blind-judge) so no file on disk can leak an
# answer-key or a peer score. Label-LAST: the rubric MUST demand rationale first, the
# five facet scores last, so the score forms after the reasoning, not before it.
#
# usage:  rate-sealed.sh <rubric.md> <text-file> [judge-spec ...]
#   judge-spec = name:model  (default panel below is a PLACEHOLDER — cross-FAMILY
#   judges, no Lares-native model rating Lares output, are a next-sprint decision).
# prints: one line per judge ->  <item_id>\t<judge>\t<json-profile>
#
# SCAFFOLD: this builds the sealed STRUCTURE. It does NOT run a live LLM judge in the
# qa_anchor sprint — wire a real `$JUDGE_CMD` only after the prereg is frozen and the
# cross-family panel is chosen. Ported from qa-rig/syad-skill-draft/harness.
set -u
RUBRIC="$1"; TEXTFILE="$2"; shift 2 || true
HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -f "$RUBRIC" ] || { echo "no rubric: $RUBRIC" >&2; exit 1; }
[ -f "$TEXTFILE" ] || { echo "no text: $TEXTFILE" >&2; exit 1; }
ITEM_ID="$(basename "$TEXTFILE")"

PROMPT="$(cat "$RUBRIC")
=== TEXT TO RATE ===
$(cat "$TEXTFILE")
=== END TEXT ===
Reason FIRST (rationale per facet), then return ONLY the JSON object of the five
facet scores LAST, no trailing prose."

SEAL="$(bash "$HARNESS_DIR/setup-blind-judge.sh")"
cd "$SEAL" || exit 1

# default panel — PLACEHOLDER specs; override by passing judge-specs as args.
JUDGES=("$@")
[ ${#JUDGES[@]} -eq 0 ] && JUDGES=("judgeA:MODEL_A" "judgeB:MODEL_B" "judgeC:MODEL_C")

JUDGE_CMD="${JUDGE_CMD:-}"   # e.g. JUDGE_CMD="copilot -s --deny-tool=shell"
for spec in "${JUDGES[@]}"; do
  jn=${spec%%:*}; model=${spec##*:}
  if [ -z "$JUDGE_CMD" ]; then
    echo "scaffold: would rate $ITEM_ID with $jn ($model) from sealed CWD $SEAL" >&2
    continue
  fi
  out=$($JUDGE_CMD -p "$PROMPT" --model "$model" 2>/dev/null)
  js=$(printf '%s' "$out" | grep -aoE '\{[^{}]*philosopher[^{}]*\}' | head -1)
  printf '%s\t%s\t%s\n' "$ITEM_ID" "$jn" "$js"
done
