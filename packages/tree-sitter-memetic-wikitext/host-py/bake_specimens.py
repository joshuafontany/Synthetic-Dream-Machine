#!/usr/bin/env python3
"""Re-bake the frozen specimen hashes — the author-side half of the regression sentinel.

The gate in `test_fold_specimens.py` refuses a fold that moves. When a grammar change moves one ON
PURPOSE, the ritual is to re-bake IN THE SAME COMMIT, so the diff shows both the grammar change and
every hash it moved, side by side, for a reviewer to weigh.

    python host-py/bake_specimens.py            # show what would move
    python host-py/bake_specimens.py --write    # move it

Printing the delta before writing matters: a bake that silently rewrites the manifest turns the gate
into a formality, which is how the corpus gate this replaced ended up unread.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import memeast_fold as mf  # noqa: E402

_PKG = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
_DIR = os.path.join(_PKG, "fixtures", "specimens")
_MANIFEST = os.path.join(_PKG, "fixtures", "specimens-0.1.0.json")


def main() -> int:
    with open(_MANIFEST, encoding="utf-8") as fh:
        doc = json.load(fh)
    was = doc.get("specimens", {})
    now = {}
    for name in sorted(f for f in os.listdir(_DIR) if f.endswith(".mem")):
        with open(os.path.join(_DIR, name), "rb") as fh:
            data = fh.read()
        now[name] = {"hash": mf.structural_hash(mf.fold(data)),
                     "sha256": hashlib.sha256(data).hexdigest()}

    moved = [n for n in now if n in was and was[n]["hash"] != now[n]["hash"]]
    added = [n for n in now if n not in was]
    gone = [n for n in was if n not in now]
    for n in moved:
        edited = was[n]["sha256"] != now[n]["sha256"]
        print(f"  MOVED   {n}  ({'the specimen changed too' if edited else 'SPECIMEN UNCHANGED — a grammar or fold change'})")
        print(f"            {was[n]['hash'][:16]} -> {now[n]['hash'][:16]}")
    for n in added:
        print(f"  ADDED   {n}  {now[n]['hash'][:16]}")
    for n in gone:
        print(f"  DROPPED {n}")
    if not (moved or added or gone):
        print("  nothing to bake — every specimen folds to its pinned hash.")
        return 0
    if "--write" not in sys.argv:
        print("\n  (dry run — pass --write to update the manifest)")
        return 1
    doc["specimens"] = now
    with open(_MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, sort_keys=True)
        fh.write("\n")
    print(f"\n  wrote {_MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
