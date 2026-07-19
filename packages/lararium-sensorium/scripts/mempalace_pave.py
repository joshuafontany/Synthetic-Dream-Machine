#!/usr/bin/env python3
"""mempalace_pave — RE-PAVE the mempalace projection from the content plane.

Read every content block `(cid, text)` and index it into the derived surfaces. The content plane is the ONE
source of record; this rebuilds the mempalace VIEW over it, keyed by content's OWN cid — cid-PARITY by
construction, never a divergent drawer-id. A full re-pave clears the projection and re-indexes: idempotent,
rebuildable, the one-bit test satisfied end to end. The block source is INJECTED (the ContentStore's own
enumerate in prod), so the pave stays decoupled from the store's API and testable in isolation.
"""
from __future__ import annotations

from typing import Iterable, Tuple


def pave(blocks: "Iterable[Tuple[str, str]]", projection, rebuild: bool = True) -> int:
    """Index every content block into the projection, keyed by content's own cid.

    `blocks` yields `(cid, text)` — the content plane's own blocks, so the projection inherits content's cid
    (parity). `rebuild=True` clears the derived surfaces first — a full re-pave from the source of record;
    `rebuild=False` appends (an incremental catch-up over new blocks). Returns the block count paved.
    """
    if rebuild:
        projection.clear()
    n = 0
    for cid, text in blocks:
        projection.index_block(cid, text)
        n += 1
    return n
