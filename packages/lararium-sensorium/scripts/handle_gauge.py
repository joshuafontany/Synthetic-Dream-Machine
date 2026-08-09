#!/usr/bin/env python3
"""handle_gauge — how many file handles does this process hold right now?

WHY THIS EXISTS, AND WHY IT COMES BEFORE ANY FIX. A palace holder reaches chroma through
`mempalace.palace.get_collection`, which caches one PersistentClient per palace directory on a
module-level backend. Chromadb frees the rust-side SQLite and HNSW handles only on an explicit
close; a bare dereference leaves them open. So a process that pours many sensoriums accumulates
handles with the number of palaces it touched rather than with its concurrency.

That much has been suspected for a long while, carried as a figure — a peak against a larger
earlier peak — whose measurement method nobody wrote down. A figure without its method cannot say
whether it read a peak under load, a steady state, or one unlucky pour. So the first thing this
module produces is not a cure. It is a BASELINE, taken by a stated method, that a later reading can
be compared against.

THE INSTRUMENT DECIDES WHAT COUNTS AS PROGRESS. Absence of finding and absence of looking generate
identically, and for as long as nothing counted handles the question could not move in either
direction — a fix would have looked the same as no fix. Counting is what turns it into a loop.

READS ONLY, COSTS NOTHING. A directory listing of the process's own descriptor table. No chroma, no
sqlite, no imports beyond the standard library, so a caller may take a reading from anywhere,
including from inside a failure path.

Meme: lar:///ha.ka.ba/lararium/api/sensorium-runbook
"""

from __future__ import annotations

import os


def open_handle_count() -> "int | None":
    """Open descriptors held by THIS process, or None where the platform will not say.

    Linux answers through `/proc/self/fd`. Everywhere else returns None rather than a guess — a
    fabricated count would read like a measurement and compare like one.
    """
    try:
        return len(os.listdir("/proc/self/fd"))
    except OSError:
        return None


def handles_available() -> bool:
    """Can this platform answer at all? Callers skip rather than assert when it cannot."""
    return open_handle_count() is not None


class HandleReading:
    """A before/after pair around a block, so a caller reads the DELTA rather than a total.

    A total says little — an interpreter holds descriptors for its own reasons and the number drifts
    with imports. What a leak hunt wants is what a block left behind after it claimed to be done.

        with HandleReading() as r:
            ... open and close some palaces ...
        assert r.delta == 0
    """

    def __init__(self) -> None:
        self.before: "int | None" = None
        self.after: "int | None" = None

    def __enter__(self) -> "HandleReading":
        self.before = open_handle_count()
        return self

    def __exit__(self, *_exc) -> "bool":
        self.after = open_handle_count()
        return False

    @property
    def delta(self) -> "int | None":
        """Descriptors the block did not give back, or None when the platform stayed silent."""
        if self.before is None or self.after is None:
            return None
        return self.after - self.before

    def __repr__(self) -> str:
        return f"HandleReading(before={self.before}, after={self.after}, delta={self.delta})"
