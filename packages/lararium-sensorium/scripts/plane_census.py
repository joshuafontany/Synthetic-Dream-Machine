#!/usr/bin/env python
"""plane_census — counts a palace's records through a channel no reader owns.

The status verbs count through the chroma client — the same library the read
paths ride — so a reader pointed at the wrong collection reports its error as
a fact (a plane full of records read as empty, because the counter asked for
a name nobody wrote). This organ audits that: it opens `chroma.sqlite3`
READ-ONLY with stdlib sqlite3 and counts every collection's METADATA segment
directly. Where the census and a status verb disagree, the status verb lies.

The census NEVER writes, never imports chromadb, and never guesses a palace:
an unnamed target refuses LOUD (designation carries authority).

Emits NDJSON, one row per (palace, collection), in total order — a double run
yields identical bytes:

    {"palace": "<dir>", "collection": "<name>", "records": N}
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys

# The record count lives on the METADATA segment: every stored record lands a
# metadata row, while vectors ride the HNSW index dir and leave the VECTOR
# segment's sqlite count at zero. Counting VECTOR here would report an honest
# store as empty — the exact failure this organ exists to catch.
_CENSUS_SQL = """
SELECT c.name, count(e.id)
FROM collections c
JOIN segments s ON s.collection = c.id AND s.scope = 'METADATA'
LEFT JOIN embeddings e ON e.segment_id = s.id
GROUP BY c.name
ORDER BY c.name
"""


def census_palace(palace_dir: str) -> "list[tuple[str, int]]":
    """Counts every collection in one palace dir; refuses LOUD when the dir
    holds no chroma.sqlite3 — a silent zero would read as an empty store."""
    db = os.path.join(palace_dir, "chroma.sqlite3")
    if not os.path.isfile(db):
        raise SystemExit(
            f"plane_census: no chroma.sqlite3 under {palace_dir!r} — the named "
            "palace holds no store here. A silent zero would read as an empty "
            "plane; refusing instead."
        )
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        return [(name, int(n)) for name, n in con.execute(_CENSUS_SQL)]
    finally:
        con.close()


def walk_root(root: str) -> "list[str]":
    """Finds every palace dir (any dir holding chroma.sqlite3) under root,
    in sorted order so the emitted census stays byte-stable."""
    found = []
    for dirpath, _dirnames, filenames in os.walk(root):
        if "chroma.sqlite3" in filenames:
            found.append(dirpath)
    return sorted(found)


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--palace",
        action="append",
        default=[],
        help="a palace dir holding chroma.sqlite3 (repeatable)",
    )
    ap.add_argument(
        "--root",
        help="walk this dir and census every palace found beneath it",
    )
    args = ap.parse_args(argv)

    palaces = list(args.palace)
    if args.root:
        palaces.extend(walk_root(args.root))
    if not palaces:
        raise SystemExit(
            "plane_census: no palace named — pass `--palace <dir>` or "
            "`--root <dir>`. An unnamed census would count whichever store "
            "sits at a default; name the target, or stop."
        )

    for palace_dir in sorted(dict.fromkeys(palaces)):
        for collection, records in census_palace(palace_dir):
            sys.stdout.write(
                json.dumps(
                    {
                        "palace": palace_dir,
                        "collection": collection,
                        "records": records,
                    },
                    sort_keys=True,
                )
                + "\n"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
