#!/usr/bin/env bash
# domain-registry-witness — every domain-separation tag is unique, well-formed, and lives in the registry.
#
# ── WHY A DOMAIN TAG NEEDS A WITNESS AND A DOC DOES NOT ─────────────────────────────────────────
# A typo in a domain tag does not fail loudly. It silently mints a SECOND protocol whose signatures verify
# against nothing and whose derived keys open nothing — and every test that signs AND verifies with the
# same typo passes. Nothing surfaces until two vessels that should agree do not.
#
# So the invariant rides here rather than in a reader's care:
#   · UNIQUE      — two purposes never share a tag. Fusing them is the whole failure the tags prevent.
#   · WELL-FORMED — every tag reads `lar:///ha.ka.ba/lares/domain/<name>/v<N>`, one ontology.
#   · REGISTERED  — no domain literal is written outside `domains.ts`. A tag typed at a call site is a
#                   tag nothing can audit, and it is how the two spellings arose in the first place.
#
# Prior art on the pattern itself: HKDF's `info` (RFC 5869), TLS 1.3's HkdfLabel (RFC 8446 §7.1), MLS's
# labelled signatures (RFC 9420), BIP-340 tagged hashes, EIP-712's domainSeparator. What they share is not
# the string — it is that the TABLE is the artifact, as multiformats makes plainest.
#
# Exit 0 = the registry holds.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import pathlib, re, sys

REG = pathlib.Path("packages/lararium-mesh/src/domains.ts")
if not REG.exists():
    print(f"[domain-registry] no registry at {REG}"); sys.exit(1)

src = REG.read_text()
names = re.findall(r'^export const (\w+) = d\("([a-z0-9-]+)"\);', src, re.M)
root  = re.search(r'const DOMAIN_ROOT = "([^"]+)"', src).group(1)

fail = []

# ── UNIQUE ──────────────────────────────────────────────────────────────────────────────────────
seen = {}
for export, name in names:
    if name in seen:
        fail.append(f"duplicate domain name {name!r}: {seen[name]} and {export} would share one tag")
    seen[name] = export

# ── WELL-FORMED ─────────────────────────────────────────────────────────────────────────────────
if not root.startswith("lar:///ha.ka.ba/"):
    fail.append(f"DOMAIN_ROOT {root!r} does not ride the stable ha.ka.ba root")
for _export, name in names:
    if not re.fullmatch(r"[a-z][a-z0-9-]*", name):
        fail.append(f"domain name {name!r} is not lowercase-kebab")

# ── REGISTERED — no literal outside this file ───────────────────────────────────────────────────
# A NEGATIVE test on FOREIGN tags stays legal: `lar-some-other-board/v1` and `lar-test/*` exist to prove
# a wrong domain REFUSES, so they must never be registered. They are recognised by not being ours.
LITERAL = re.compile(r'"(lar:///ha\.ka\.ba/lares/domain/[^"]*|lar-[a-z-]+/v\d+[^"]*|lares [a-z-]+ v\d+)"')
LEGAL_FOREIGN = re.compile(r"lar-some-other-|lar-test/")
stray = []
for p in sorted(pathlib.Path("packages").rglob("*.ts")):
    s = str(p)
    if "/dist/" in s or "generated" in s or p == REG:
        continue
    for i, line in enumerate(p.read_text(errors="replace").splitlines(), 1):
        for m in LITERAL.finditer(line):
            if LEGAL_FOREIGN.search(m.group(1)):
                continue
            stray.append(f"{s}:{i}  {m.group(1)}")

print(f"[domain-registry] {len(names)} domains, all under {root}")
if stray:
    print(f"  {len(stray)} domain literal(s) written OUTSIDE the registry:")
    for x in stray[:20]:
        print(f"    {x}")
    fail.append("literals outside the registry")

if fail:
    for f in fail:
        if f != "literals outside the registry":
            print(f"  {f}")
    sys.exit(1)
print("  unique · well-formed · none written outside the registry")
PY
