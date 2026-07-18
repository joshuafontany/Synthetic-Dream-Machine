#!/usr/bin/env python3
"""loci — the memory-palace SPATIAL-SCHEMA seam. OUR sensorium code speaks locus/imago (the ars-memoriae
lineage: a locus HOLDS, an imago is HELD); the nakama mempalace's drawer-store stands as the FIRST
concrete schema behind it. A block, once PLACED in a palace, becomes an imago resting at a locus (a wing
holds rooms holds the leaf-locus). The content plane keeps the literal CID'd blocks (the ki-matter); a
locus-schema arranges the imagines that reference them (the placed, spatial view).

WHY WRAP. The nakama keeps its drawer ontology inside its own submodule — we never rename it, we consume
it directly for one palace inside each sensorium. Naming OUR side of the boundary in loci/imago gives a
seam: a later spatial schema (a different arrangement — a grid, a graph, a timeline) slots in behind the
same vocabulary without touching the consumers. Today one schema stands: the nakama drawer-mempalace.

Behave-close law: the concrete schema delegates STRAIGHT to the nakama's own palace API (get_collection),
so the sensorium's mempalace behaves close to the upstream mempalace's code/flows — the wrapper adds a
vocabulary and a seam, never a divergent store.
"""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class LocusSchema(Protocol):
    """A spatial schema over placed imagines. An imago = a block placed in the palace (a stored record
    keyed by its content id); a locus = a container it rests in (a wing, addressed by name). The schema
    reads imagines out of a locus and patches the tension-metadata written onto them. One method returns
    the raw underlying store so a consumer that must speak the substrate directly still can (the seam
    stays honest — it wraps, it does not hide)."""

    def locus_store(self) -> Any:
        """The underlying store the imagines rest in (e.g. the nakama chroma collection)."""
        ...

    def schema_name(self) -> str:
        """The concrete schema's name — for provenance + the day a second schema stands beside it."""
        ...


class NakamaLoci:
    """The FIRST concrete spatial schema — the nakama mempalace's drawer-store, consumed directly. An
    imago IS a nakama drawer (a placed, CID-keyed record); a locus IS a nakama wing. Delegates to the
    nakama's own `mempalace.palace.get_collection`, so it behaves exactly as the upstream store does —
    the loci/imago vocabulary rides ON TOP, the drawer ontology stays the nakama's inside its submodule."""

    schema = "nakama-drawer"

    def __init__(self, palace: str) -> None:
        self._palace = palace

    def locus_store(self) -> Any:
        # delegate straight to the nakama palace API — the behave-close law (no divergent store).
        from mempalace.palace import get_collection
        return get_collection(self._palace, _skip_identity_check=True)

    def schema_name(self) -> str:
        return self.schema


def open_loci(palace: str, schema: str = "nakama-drawer") -> LocusSchema:
    """Open a palace under a named spatial schema. Today only the nakama drawer-mempalace stands; a later
    schema registers here and every consumer that speaks loci/imago inherits it without a change. An
    unknown schema refuses loudly rather than silently reaching the default."""
    if schema == "nakama-drawer":
        return NakamaLoci(palace)
    raise ValueError(
        f"loci: spatial schema {schema!r} unknown — only 'nakama-drawer' stands today. "
        "Register a new schema in open_loci before naming it."
    )
