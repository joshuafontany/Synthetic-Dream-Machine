#!/usr/bin/env python3
"""mempalace_pave — RE-PAVE the mempalace projection from the content plane.

Read every content atom `(cid, text)` and index it into the derived surfaces. The content plane is the ONE
source of record; this rebuilds the mempalace VIEW over it, keyed by content's OWN cid — cid-PARITY by
construction, never a divergent drawer-id. A full re-pave clears the projection and re-indexes: idempotent,
rebuildable, the one-bit test satisfied end to end. The atom source is INJECTED (the ContentStore's own
enumerate in prod), so the pave stays decoupled from the store's API and testable in isolation.
"""
from __future__ import annotations

from typing import Iterable, Tuple


def pave(atoms: "Iterable[Tuple[str, str]]", projection, rebuild: bool = True) -> int:
    """Index every content atom into the projection, keyed by content's own cid.

    `atoms` yields `(cid, text)` — the content plane's own atoms, so the projection inherits content's cid
    (parity). `rebuild=True` clears the derived surfaces first — a full re-pave from the source of record;
    `rebuild=False` appends (an incremental catch-up over new atoms). Returns the atom count paved.
    """
    if rebuild:
        projection.clear()
    n = 0
    for cid, text in atoms:
        projection.index_atom(cid, text)
        n += 1
    return n
