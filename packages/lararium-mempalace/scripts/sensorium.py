"""sensorium — a NAMELESS ENTITY composed from a #has cap-stack {source · land · embed · [worldline]}.

A Sensorium DERIVES its identity FROM its composed cap-stack; `kind` names its role for the operator/
@daemon. Content policy rides the land capability: append-only eidetic ground, mutable reflection, or
another declared stream policy. Other streams/corpuses attach the same way; the TS @daemon supervises
the fleet (spawns/points/drains, carries no payload). The pipeline
(capture) + the recall read-face ride the built caps (capture_stream.Pipeline + content_io); the worldline
cap (the fork-DAG + kapae) wires in at Phase 4.

Blind-by-composition (has-stack-ontology): compose REFUSES a missing required cap — a sensorium without
a source/land/embed cannot exist, rather than erroring later. Meme: lar:///ha.ka.ba/lararium/sensorium/compose.
"""
from __future__ import annotations

from dataclasses import dataclass
import os

import content_io as cio
from capture_stream import ContentStoreLandCap, Pipeline


@dataclass(frozen=True)
class SensoriumPaths:
    """The file-capabilities a rooted sensorium derives.

    A root is the only persistent address a caller may hold.  The child palaces
    are capabilities derived from that address, never independently supplied
    coordinates that can drift apart.
    """

    root: str
    content: str
    structure: str
    form: str
    persistence: str
    worldline: str


def sensorium_paths(root: str) -> SensoriumPaths:
    """Derive the standard palace stack for any text/input-stream sensorium."""
    root = os.path.realpath(os.path.expanduser(root))
    return SensoriumPaths(
        root=root,
        content=os.path.join(root, "content"),
        structure=os.path.join(root, "structure"),
        form=os.path.join(root, "form"),
        persistence=os.path.join(root, "persistence"),
        worldline=os.path.join(root, "worldline"),
    )


@dataclass(frozen=True)
class PersistenceCap:
    """A rooted testimony capability declaration.

    The cap carries policy and its owned leaf address. It opens no collection
    and derives no standing: `persistence_io` stores testimony/witnesses, while
    the standing keel remains the separate policy reader.
    """

    path: "str | None"
    half_life: "float | None"
    active: bool = False


@dataclass(frozen=True)
class OrderCap:
    """Declared evidence that orders durable vectors for derived stream readings."""

    projector: str
    basis: str


_INACTIVE_PERSISTENCE = PersistenceCap(path=None, half_life=None)


def compose_persistence_cap(root: str, *, half_life: "float | None" = None,
                            active: bool = False) -> PersistenceCap:
    """Declare rooted persistence without materializing testimony state.

    Activation names a later lifecycle decision only. It does not open the
    store here; capture never promotes content records into testimony atoms.
    """
    if half_life is not None and half_life <= 0:
        raise ValueError("persistence half_life must be positive or null (standing by witness)")
    return PersistenceCap(path=sensorium_paths(root).persistence, half_life=half_life, active=active)


def compose_content_land(root: str, *, append_only: bool = True, required_keys=None,
                         expected_dim=None, expected_model=None) -> ContentStoreLandCap:
    """Compose a rooted content landing capability with its declared durability policy.

    Callers hold a sensorium root; this capability derives `content/` and carries
    schema/model guards at the leaf.  No named sensorium type owns that policy.
    """
    paths = sensorium_paths(root)
    store = cio.ContentStore(paths.content, required_keys=required_keys, expected_dim=expected_dim,
                             expected_model=expected_model, append_only=append_only)
    return ContentStoreLandCap(store)


class Sensorium:
    """A composed sensorium — it runs a capture Pipeline (source→land, crash-safe re-derivation) and
    serves a recall read-face over the same land-cap. Nameless — `kind` names a role only."""

    def __init__(self, *, kind: str, pipeline: "Pipeline | None" = None, land,
                 worldline=None, persistence: "PersistenceCap | None" = None,
                 order: "OrderCap | None" = None, pipeline_factory=None, observer=None) -> None:
        if (pipeline is None) == (pipeline_factory is None):
            raise ValueError("Sensorium requires exactly one of pipeline or pipeline_factory")
        self.kind = kind
        self._pipeline = pipeline
        self._pipeline_factory = pipeline_factory
        self._land = land
        self._worldline = worldline  # the fork-DAG + kapae cap (Phase 4); None until wired
        # Every entity carries the dormant axis. Rooted compositions replace
        # this with a path-bearing declaration, still inactive until a later
        # persistence lifecycle activates testimony handling.
        self._persistence = persistence if persistence is not None else _INACTIVE_PERSISTENCE
        self._order = order
        self._observer = observer

    def capture(self, pointer, **route) -> dict:
        """Run one capture pass (idempotent re-derivation) over this entity's cap-stack.

        Fixed sources keep one pipeline.  Stream sources compose a fresh pipeline
        per pass: source and plane caps may carry pass-local state, while land and
        embed capabilities remain warm on the sensorium itself.
        """
        pipeline = self._pipeline_factory(pointer, **route) if self._pipeline_factory else self._pipeline
        summary = pipeline.run_pass(pointer)
        if self._observer is not None:
            summary = {**summary, **self._observer(pointer, **route)}
        return summary

    def recall(self, embedding: list, k: int = 8, where: "dict | None" = None) -> dict:
        """The read-face (the MCP Resource): nearest-neighbor recall over the sensorium's store."""
        return self._land.store.search(embedding, k, where)


def compose_sensorium(*, kind: str, source, land, embed=None, worldline=None, persistence=None, order=None,
                      planes=None) -> Sensorium:
    """Compose a sensorium from its cap-stack. Blind-by-composition: a missing required cap REFUSES
    (a sensorium without source/land is unrepresentable), never a later error branch. Optional
    `planes` (structure/form caps, plane_fanout.py) fan the same records out past the content leg."""
    missing = [n for n, cap in (("source", source), ("land", land)) if cap is None]
    if missing:
        raise ValueError(f"compose_sensorium[{kind}]: missing required cap(s) {missing} — a sensorium's "
                         "identity IS its cap-stack; it cannot compose without them")
    return Sensorium(kind=kind, pipeline=Pipeline(source=source, land=land, embed=embed, planes=planes),
                     land=land, worldline=worldline, persistence=persistence, order=order)


def compose_stream_sensorium(*, kind: str, land, source_factory, embed=None,
                             planes_factory=None, observer=None, worldline=None,
                             persistence=None, order=None) -> Sensorium:
    """Compose a rooted or ephemeral text/input-stream sensorium from capabilities.

    `land` and `embed` are warm capabilities. `source_factory` and
    `planes_factory` are invoked for every pass, which prevents source identity
    or pass-local plane state from leaking from a live hook into a harvest.
    This is the common model for every stream sensorium: no class hierarchy by
    surface, only a nameless entity that #has this stack.
    """
    missing = [name for name, cap in (("source_factory", source_factory), ("land", land)) if cap is None]
    if missing:
        raise ValueError(f"compose_stream_sensorium[{kind}]: missing required cap(s) {missing}")

    def make_pipeline(pointer, **route) -> Pipeline:
        source = source_factory(**route)
        if source is None:
            raise ValueError(f"compose_stream_sensorium[{kind}]: source_factory returned no source cap")
        # A plane may derive from the pointer's declared manifest or modality;
        # source parsing remains deferred to Pipeline.run_pass(pointer).
        planes = planes_factory(pointer=pointer, **route) if planes_factory is not None else None
        return Pipeline(source=source, land=land, embed=embed, planes=planes)

    return Sensorium(kind=kind, pipeline_factory=make_pipeline, land=land,
                     worldline=worldline, persistence=persistence, order=order, observer=observer)
