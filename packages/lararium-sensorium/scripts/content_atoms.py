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


def content_atoms(store, page: int = 256) -> "Iterator[Tuple[str, str]]":
    """Drain the store's `scan` into `(cid, text)` atoms — content's own cids, verbatim documents.

    Pages `scan(offset, limit)` until it reports no `next`. A record carrying no document yields an
    empty text (the surfaces hold no verbatim regardless); its cid still rides, so a later resolve
    fetches the bytes from content."""
    offset = 0
    while True:
        page_rec = store.scan(offset, page)
        records = page_rec.get("records") or []
        for r in records:
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
