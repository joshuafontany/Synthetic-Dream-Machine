#!/usr/bin/env bash
# bcc-witness — verify every bags carrier's block check with the repo's OWN verifyBcc, and exit
# non-zero if any mismatch stands.
#
# ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
# The stamping sweep verified the corpus ad hoc, and the first repair after it re-derived the
# algorithm by hand instead of importing it — exactly the two-implementations drift the stamp-build
# header warns about: two computations that agree today and part silently the day one changes. This
# witness imports `verifyBcc` from the built package, so the reader that gates the corpus IS the
# reader the emitter answers to. One algorithm, one authority.
#
# Readings per carrier: ok · mismatch · unchecked. `unchecked` is LEGAL (the BCC is optional; a
# carrier declaring no uri-path names no meme to check) — only `mismatch` fails the witness.
# A run that checked nothing must not read as a run that found nothing: the summary always prints
# counts, and zero carriers scanned is itself a failure.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

node --input-type=module -e '
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const { verifyBcc } = await import(pathToFileURL("packages/lararium-tw5/dist/carrier-check.js"));
const files = execSync("find bags -name \"*.mem\"", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
let ok = 0, mismatch = 0, unchecked = 0, torn = 0;
for (const f of files) {
  const verdict = verifyBcc(readFileSync(f, "utf8"));
  if (verdict === "ok") ok++;
  else if (verdict === "unchecked") unchecked++;
  else if (verdict === "torn") { torn++; console.error(`  TORN ${f}`); }
  else { mismatch++; console.log(`  MISMATCH ${f}`); }
}
console.log(`bcc-witness: ok ${ok} · mismatch ${mismatch} · unchecked ${unchecked} · torn ${torn} (of ${files.length})`);
if (files.length === 0 || mismatch > 0 || torn > 0) process.exit(1);
'
