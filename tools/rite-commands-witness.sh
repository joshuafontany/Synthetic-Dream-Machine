#!/usr/bin/env bash
# rite-commands-witness — every command the founding rite instructs resolves to a door that answers.
#
# ── WHY THE RITE NEEDS AN INSTRUMENT AND NOT A READER ───────────────────────────────────────────
# The founding runbook is the OPERATOR-INSTRUCTION SOURCE: a human or an agent resolves the next
# command from it, once, on the night a hearth becomes permanent. A stale command there fails at the
# worst moment a command can fail — mid-rite, after the clear, with the vault sealed.
#
# And it drifts silently. Nothing in a CLI refactor reaches a prose document, so the rite keeps reading
# fluently while naming verbs that stopped answering. The vessel collapse retired fifteen spellings in
# one act; the rite named eleven of them.
#
# So the reading is derived rather than trusted:
#   · every FIRST word must appear in the live `lares help` projection
#   · every SUB-DOOR must appear in its command module's dispatch
#
# It reads the BUILT binary, never the source — the same discipline the surface-parity witness keeps,
# because a typecheck agrees with itself while a stale sibling dist ships a door that cannot load.
#
# NOTHING IS EXECUTED. The rite instructs `vessel clear --force`; a witness that ran what it checks
# would burn the operator's hearth to prove the command exists.
#
# Exit 0 = every instructed command resolves.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import re, pathlib, subprocess, sys

RITE = pathlib.Path("bags/lararium/ha.ka.ba/lararium/mesh/founding-runbook.mem")
BIN  = "packages/lares-cli/dist/src/bin/lares.js"
if not RITE.exists():
    print(f"[rite-commands] no rite at {RITE}"); sys.exit(1)

help_out = subprocess.run(["node", BIN, "help"], capture_output=True, text=True)
if help_out.returncode != 0 or not help_out.stdout.strip():
    print("[rite-commands] the built binary did not answer `help` — run `pnpm -r build`.")
    print("  A stale sibling dist is the usual cause: the CLI resolves workspace packages from THEIR dist.")
    sys.exit(1)

live = set(re.findall(r'^\s{2,4}(?:\S+ )?([a-z][a-z0-9-]+)\s', help_out.stdout, re.M))
rite = RITE.read_text()

cmds = sorted({m.group(1) for m in re.finditer(
    r'(?m)^\s*lares ((?:[a-z][a-z0-9-]*)(?: [a-z][a-z0-9-]*)?)', rite)})

CMDS_DIR = pathlib.Path("packages/lares-cli/src/commands")
fail, subs_checked = [], 0

for c in cmds:
    parts = c.split()
    verb  = parts[0]
    if verb not in live:
        fail.append(f"{c!r} — no top-level verb `{verb}` answers"); continue
    if len(parts) < 2:
        continue
    sub = parts[1]
    module = CMDS_DIR / f"{verb}.ts"
    if not module.exists():
        continue                      # the door dispatches elsewhere; the top verb already answered
    body = module.read_text()
    subs_checked += 1
    # A sub-door reads as a quoted literal (switch case, comparison, quoted map key) OR as a bare
    # object key in a dispatch map — `vessel.ts` writes the latter, and demanding quotes would
    # manufacture a finding about a door that answers.
    if not (re.search(rf'["\'`]{re.escape(sub)}["\'`]', body)
            or re.search(rf'(?m)^\s*{re.escape(sub)}\s*:', body)):
        fail.append(f"{c!r} — `{sub}` names no branch in commands/{verb}.ts")

# ── AND EVERY CODE SYMBOL THE RITE CITES MUST EXIST ─────────────────────────────────────────────
# The rite explains itself by pointing at functions — `provisionThresholdRecoveryAtFounding`,
# `assertSealReady`, `personaSlotCeiling`. A citation that names nothing is worse than none: it sends a
# reader to a symbol they cannot find, on a night when the reader is deciding whether to trust the step.
# One was already stale — the founding chain cited `charterKeySetHash`, and the code calls
# `sealKeySetHash`.
blob = "".join(q.read_text(errors="replace") for q in pathlib.Path("packages").rglob("*.ts")
               if "/dist/" not in str(q) and "/src/" in str(q))
cited = sorted({m for m in re.findall(r'`([a-zA-Z_][a-zA-Z0-9_]*(?:#[a-zA-Z][a-zA-Z0-9_]*)?)`', rite)
                if re.search(r'[a-z][A-Z]|#', m)})
ghosts = [c for c in cited if c.split("#")[-1] not in blob]
for g in ghosts:
    fail.append(f"`{g}` — cited by the rite, defined nowhere in source")

print(f"[rite-commands] {len(cmds)} commands instructed, {subs_checked} sub-doors checked, "
      f"{len(cited)} symbols cited")
if fail:
    for f in fail: print(f"    {f}")
    print("  The rite is the operator-instruction source — fix the RITE, or restore the door.")
    sys.exit(1)
print("  every instructed command resolves to a door that answers, and every cited symbol exists")
PY
