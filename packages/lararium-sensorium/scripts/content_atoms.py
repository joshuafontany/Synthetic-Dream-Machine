#!/usr/bin/env python3
"""content_atoms — the CONTENT→atoms adapter: page a ContentStore into (cid, text) atoms for the pave.

The content plane holds the ONE verbatim source; the pave reads it as a stream of `(cid, text)` atoms
and fans each into the derived recall surfaces. This adapter bridges content_io's ContentStore (its
`scan(offset, limit)` page API) and mempalace_pave.pave — it yields content's OWN cids, so the
projection inherits cid-parity by construction. The store rides in as an argument (never opened here),
so the adapter stays decoupled from content_io and witnesses against a fake store in isolation.
"""
from __future__ import annotations

from typing import Callable, Iterator, Tuple


def authored_only(meta: dict) -> bool:
    """A `keep` policy — the authored voice, without the low-volume murmur. Content holds every stratum
    (eidetic ground); a DERIVED plane reads by volume, so a harness/thinking drawer (lar_volume=low —
    the <command-*>/<local-command-*>/caveat scaffolding) never enters the recall view. A record with no
    lar_volume (a generic, non-session corpus) reads as `normal` → kept, so those streams are untouched."""
    return (meta.get("lar_volume") or "normal") == "normal"


def content_atoms(store, page: int = 256, keep: "Callable[[dict], bool] | None" = None,
                  dedup_key: "str | None" = None) -> "Iterator[Tuple[str, str]]":
    """Drain the store's `scan` into `(cid, text)` atoms — content's own cids, verbatim documents.

    Pages `scan(offset, limit)` until it reports no `next`. A record carrying no document yields an
    empty text (the surfaces hold no verbatim regardless); its cid still rides, so a later resolve
    fetches the bytes from content. `keep(meta)` filters records into the VIEW without touching content
    — the stream stays whole; the projection reads only what it should (e.g. `authored_only`).

    `dedup_key` (a metadata key, e.g. `lar_turn_key`) collapses records sharing one value to the FIRST
    seen — a turn re-carried across a resume or a rewind (same turn-key, distinct cids under different
    source_files) lands ONCE in the view, while content keeps every copy (the eidetic ground of what each
    transcript held). Identity keys on the TURN, not the source, so genuinely-distinct turns that merely
    share bytes (a repeated "yes") keep their own turn-keys and both ride — the record stays true."""
    seen: "set | None" = set() if dedup_key else None
    offset = 0
    while True:
        page_rec = store.scan(offset, page)
        records = page_rec.get("records") or []
        for r in records:
            meta = r.get("metadata") or {}
            if keep is not None and not keep(meta):
                continue
            if seen is not None:
                k = meta.get(dedup_key)
                if k not in (None, ""):
                    if k in seen:
                        continue          # one turn already rode the view — its re-carry stays in content only
                    seen.add(k)
            yield r.get("cid"), (r.get("document") or "")
        nxt = page_rec.get("next")
        if nxt is None:
            break
        offset = nxt


def content_getter(store) -> "Callable[[str], str | None]":
    """The resolve hook the derived surfaces call to fetch verbatim by cid — content stays the ONE
    holder of the bytes. Returns the store's document for a cid, or None when the cid holds no row."""
    def get(cid: str) -> "str | None":
        rec = store.get(cid)
        return rec.get("document") if rec else None
    return get
