#!/bin/bash
# setup-blind-judge — provision a BLANK working directory for a blind judge run.
# Prints the path. A judge invoked with this as CWD, the prompt passed inline (-p),
# reads no rubric file, no answer-key, no peer score — the `view`/`read` tool finds
# nothing on disk. This IS the seal (asserted by qa_anchor.sealed.score_alpha.
# assert_sealed_cwd / assert_key_absent).
#
# usage:  SEAL="$(bash setup-blind-judge.sh)"  then  (cd "$SEAL" && <judge> -p "$PROMPT" ...)
#
# Ported from qa-rig/syad-skill-draft/harness/setup-blind-judge.sh onto the
# qa_anchor lane. SCAFFOLD only — no live judge runs here yet.
set -u
SEAL="$(mktemp -d)"
# leave it empty on purpose — nothing copied in. The prompt carries the rubric inline.
echo "$SEAL"
