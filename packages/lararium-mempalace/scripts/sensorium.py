"""sensorium — a NAMELESS ENTITY composed from a #has cap-stack {source · land · embed · [worldline]}.

A Sensorium DERIVES its identity FROM its composed cap-stack; `kind` names its role for the operator/
@daemon. The AI-session **Memory** sensorium (append-only immutable ground — verbatim/eidetic) and the
**Dream** sensorium (mutable schema — primary dreaming) PIN the fleet; other streams/corpuses attach the
same way; the TS @daemon supervises the fleet (spawns/points/drains, carries no payload). The pipeline
(capture) + the recall read-face ride the built caps (capture_stream.Pipeline + content_io); the worldline
cap (the fork-DAG + kapae) wires in at Phase 4.

Blind-by-composition (has-stack-ontology): compose REFUSES a missing required cap — a sensorium without
a source/land/embed cannot exist, rather than erroring later. Meme: lar:///ha.ka.ba/@lararium/sensorium/compose.
"""
from __future__ import annotations

import content_io as cio
from capture_stream import ContentStoreLandCap, Pipeline


class Sensorium:
    """A composed sensorium — it runs a capture Pipeline (source→land, crash-safe re-derivation) and
    serves a recall read-face over the same land-cap. Nameless — `kind` names a role only."""

    def __init__(self, *, kind: str, pipeline: Pipeline, land, worldline=None) -> None:
        self.kind = kind
        self._pipeline = pipeline
        self._land = land
        self._worldline = worldline  # the fork-DAG + kapae cap (Phase 4); None until wired

    def capture(self, pointer) -> dict:
        """Run one capture pass (idempotent re-derivation) — land the source's un-landed records."""
        return self._pipeline.run_pass(pointer)

    def recall(self, embedding: list, k: int = 8, where: "dict | None" = None) -> dict:
        """The read-face (the MCP Resource): nearest-neighbor recall over the sensorium's store."""
        return self._land.store.search(embedding, k, where)


def compose_sensorium(*, kind: str, source, land, embed=None, worldline=None) -> Sensorium:
    """Compose a sensorium from its cap-stack. Blind-by-composition: a missing required cap REFUSES
    (a sensorium without source/land is unrepresentable), never a later error branch."""
    missing = [n for n, cap in (("source", source), ("land", land)) if cap is None]
    if missing:
        raise ValueError(f"compose_sensorium[{kind}]: missing required cap(s) {missing} — a sensorium's "
                         "identity IS its cap-stack; it cannot compose without them")
    return Sensorium(kind=kind, pipeline=Pipeline(source=source, land=land, embed=embed), land=land, worldline=worldline)


def compose_memory_sensorium(palace_path: str, *, source, embed=None, expected_dim=None,
                             expected_model=None) -> Sensorium:
    """The PINNED Memory sensorium — the IMMUTABLE GROUND (append-only, verbatim/eidetic; the SSGM
    immutable episodic ledger). Carries the session-memory schema guard + the embedder-identity floor."""
    store = cio.ContentStore(palace_path, required_keys={"wing", "room"}, expected_dim=expected_dim,
                             expected_model=expected_model, append_only=True)
    return compose_sensorium(kind="memory", source=source, land=ContentStoreLandCap(store), embed=embed)


def compose_dream_sensorium(palace_path: str, *, source, embed=None) -> Sensorium:
    """The PINNED Dream sensorium — the MUTABLE schema layer (primary dreaming; reflections consolidate/
    supersede here). append_only OFF (the dream reconciles the schema); the Memory ground it reflects
    over stays immutable."""
    store = cio.ContentStore(palace_path, append_only=False)
    return compose_sensorium(kind="dream", source=source, land=ContentStoreLandCap(store), embed=embed)
