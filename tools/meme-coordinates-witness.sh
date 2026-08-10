#!/usr/bin/env bash
# meme-coordinates-witness — do a meme's DERIVED coordinates still name where it stands?
#
# `file-path` and `uri-path` mirror facts the filesystem already holds, and nothing stamps them:
# an author writes them once, and a directory move leaves every copy behind. 351 of them drifted
# that way before this witness stood — a hand-maintained mirror cannot notice what it missed.
#
# `@lares-history` sits exempt BY KIND: it archives prior worldlines, and its memes record the
# coordinates they were written with. Correcting those would edit the record rather than the map.
#
# Exit 0 = every coordinate names its own file. Exit 1 = the drift, listed.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import pathlib, re, sys

drift = []
for f in sorted(pathlib.Path("bags").rglob("*.mem")):
    if f.parts[1] == "@lares-history":
        continue
    head = f.read_text(errors="replace")[:4000]
    m = re.search(r'(?m)^file-path\s*=\s*"(.*?)"', head)
    if m and m.group(1) != str(f):
        drift.append((str(f), m.group(1)))

if not drift:
    print(f"[meme-coordinates] every file-path names its own file")
    sys.exit(0)

print(f"[meme-coordinates] {len(drift)} meme(s) declare a path they do not stand in:")
for actual, declared in drift:
    print(f"  {actual}")
    print(f"      declares  {declared}")
sys.exit(1)
PY
