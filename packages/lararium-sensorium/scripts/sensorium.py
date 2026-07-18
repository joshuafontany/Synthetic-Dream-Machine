"""sensorium — a NAMELESS ENTITY composed from a #has cap-stack {source · land · embed · [worldline]}.

A Sensorium DERIVES its identity FROM its composed cap-stack; `kind` names its role for the operator/
@daemon. Content policy rides the land capability: append-only eidetic ground, mutable reflection, or
another declared stream policy. Other streams/corpuses attach the same way; the TS @daemon supervises
the fleet (spawns/points/drains, carries no payload). The pipeline
(capture) + the recall read-face ride the built caps (capture_stream.Pipeline + content_io); the worldline
cap (the fork-DAG + kapae) wires in when a rooted composition declares it.

Blind-by-composition (has-stack-ontology): compose REFUSES a missing required cap — a sensorium without
a source/land/embed cannot exist, rather than erroring later. Meme: lar:///ha.ka.ba/lararium/sensorium/compose.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
import os
import tempfile

import content_io as cio
from capture_stream import ContentStoreLandCap, Pipeline
from sidecar_caps import acquire_root_lock, release_lock, root_mutation


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


def _lar_data_home() -> str:
    """Resolve the data home the SAME way TS `larDataHome` (xdg-base.ts) resolves it: `LAR_ROOT/data`
    for an isolated instance, else `$XDG_DATA_HOME/lares` (unset → `~/.local/share/lares`). The two
    views stay byte-identical by convention so a name a caller addresses lands on the one root both
    surfaces name."""
    lar_root = os.environ.get("LAR_ROOT")
    if lar_root:
        return os.path.join(lar_root, "data")
    xdg = (os.environ.get("XDG_DATA_HOME") or "").strip()
    return os.path.join(xdg or os.path.join(os.path.expanduser("~"), ".local", "share"), "lares")


def sensorium_dir(name: str) -> str:
    """Turn a sensorium NAME into its root — `<data>/sensoriums/<name>` — mirroring TS `sensoriumDir`
    (vessel-paths.ts). The one seam a `lares sense <sensorium>` / MCP `sensorium=` address crosses to
    reach a target root; `memory` resolves the same dir the memory default names."""
    return os.path.join(_lar_data_home(), "sensoriums", name)


def sensorium_names() -> "list[str]":
    """Roster every sensorium standing under `<data>/sensoriums` — the names an address may reach.
    Mirrors TS `sensoriumNames`; an absent dir reads as an empty roster rather than raising."""
    root = os.path.join(_lar_data_home(), "sensoriums")
    try:
        return sorted(e.name for e in os.scandir(root) if e.is_dir())
    except OSError:
        return []


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


def declare_sensorium_contract(*, has, order: "OrderCap | dict | None" = None,
                               apertures: "dict[str, str] | None" = None) -> dict:
    """Normalize the portable `#has` declaration and refuse malformed evidence."""
    if not isinstance(has, (list, tuple)):
        raise ValueError("sensorium contract: has needs a list of capabilities")
    normalized_has = list(dict.fromkeys(has))
    if any(not isinstance(cap, str) or not cap for cap in normalized_has):
        raise ValueError("sensorium contract: every #has capability needs a non-empty name")
    out = {"has": normalized_has}
    if order is not None:
        if isinstance(order, OrderCap):
            projector, basis = order.projector, order.basis
        elif isinstance(order, dict):
            projector, basis = order.get("projector"), order.get("basis")
        else:
            projector = basis = None
        if not isinstance(projector, str) or not projector or not isinstance(basis, str) or not basis:
            raise ValueError("sensorium contract: order needs non-empty projector and basis")
        out["order"] = {"projector": projector, "basis": basis}
    if apertures is not None:
        if (not isinstance(apertures, dict) or
                any(not isinstance(cell, str) or not cell or not isinstance(provider, str) or not provider
                    for cell, provider in apertures.items())):
            raise ValueError("sensorium contract: apertures need non-empty cells and providers")
        out["apertures"] = dict(apertures)
    return out


def compose_sensorium_contract(contributions) -> dict:
    """Fold cap fragments into one current declaration.

    A cap adds names and may witness order or apertures.  Two caps may repeat a
    witness, but they may not disagree about one entity's order or one aperture
    provider.  This mirrors the Mesh composition seam before a Python driver
    persists its rooted manifest.
    """
    normalized = [declare_sensorium_contract(**contribution) for contribution in contributions]
    orders = [contract["order"] for contract in normalized if "order" in contract]
    if any(order != orders[0] for order in orders):
        raise ValueError("sensorium contract: one entity cannot compose conflicting order evidence")
    apertures = {}
    for contract in normalized:
        for cell, provider in contract.get("apertures", {}).items():
            if cell in apertures and apertures[cell] != provider:
                raise ValueError(f"sensorium contract: aperture {cell} has conflicting providers")
            apertures[cell] = provider
    return declare_sensorium_contract(
        has=[cap for contract in normalized for cap in contract["has"]],
        order=orders[0] if orders else None,
        apertures=apertures or None,
    )


def _atomic_json_write(path: str, value: dict) -> None:
    """Replace one declaration atomically after its complete JSON body reaches disk."""
    fd, temporary = tempfile.mkstemp(prefix=".manifest-", suffix=".json", dir=os.path.dirname(path))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(value, fh, indent=2)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def write_ndjson_atomically(path: str, rows) -> None:
    """Replace one derived NDJSON projection only after its complete body reaches disk."""
    fd, temporary = tempfile.mkstemp(prefix=".projection-", suffix=".ndjson", dir=os.path.dirname(path))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def read_stream_manifest(root: str, *, absent_ok: bool = False) -> "dict | None":
    """Read one rooted declaration without interpreting cap-owned extension fields.

    Projectors share this file boundary instead of each carrying a private JSON
    parse.  The reader validates common declaration evidence when present and
    returns the original mapping intact, so a cap may own richer fields without
    another projector flattening or discarding them.
    """
    path = os.path.join(sensorium_paths(root).root, "manifest.json")
    try:
        with open(path, encoding="utf-8") as fh:
            manifest = json.load(fh)
    except FileNotFoundError:
        if absent_ok:
            return None
        raise ValueError(f"stream manifest at {path!r} is absent") from None
    except (OSError, ValueError) as exc:
        raise ValueError(f"stream manifest at {path!r} cannot be read: {exc}") from exc
    if not isinstance(manifest, dict):
        raise ValueError(f"stream manifest at {path!r} must hold an object")
    schema = manifest.get("schema")
    if schema is not None and schema != 1:
        raise ValueError(f"stream manifest at {path!r} carries unsupported schema {schema!r}")
    order = manifest.get("order")
    if order is not None:
        if not isinstance(order, dict) or not isinstance(order.get("projector"), str) or not order["projector"] \
                or not isinstance(order.get("basis"), str) or not order["basis"]:
            raise ValueError(f"stream manifest at {path!r} carries malformed order evidence")
    apertures = manifest.get("apertures")
    if apertures is not None and (not isinstance(apertures, dict) or
                                  any(not isinstance(cell, str) or not cell or
                                      not isinstance(provider, str) or not provider
                                      for cell, provider in apertures.items())):
        raise ValueError(f"stream manifest at {path!r} carries malformed aperture evidence")
    return manifest


def compose_persistence_cap(root: str, *, half_life: "float | None" = None,
                            active: bool = False) -> PersistenceCap:
    """Declare rooted persistence without materializing testimony state.

    Activation names a later lifecycle decision only. It does not open the
    store here; capture never promotes content records into testimony blocks.
    """
    if half_life is not None and half_life <= 0:
        raise ValueError("persistence half_life must be positive or null (standing by witness)")
    return PersistenceCap(path=sensorium_paths(root).persistence, half_life=half_life, active=active)


def write_stream_manifest(root: str, *, name: str, lar: str, order: OrderCap,
                          apertures: "dict[str, str] | None" = None,
                          worldline: "dict | None" = None, ephemeral: bool = False) -> str:
    """Write one rooted stream declaration while preserving its original mint time.

    The declaration records cap locations and the evidence that orders derived
    readings.  `apertures` remains separate: it names readings a projector may
    earn, never the sequence evidence itself.
    """
    if not order.projector or not order.basis:
        raise ValueError("stream manifest needs a non-empty order projector and basis")
    paths = sensorium_paths(root)
    os.makedirs(paths.root, exist_ok=True)
    lock = acquire_root_lock(paths.root, "sensorium_manifest")
    try:
        return _write_stream_manifest_unlocked(
            paths, name=name, lar=lar, order=order, apertures=apertures,
            worldline=worldline, ephemeral=ephemeral,
        )
    finally:
        release_lock(lock)


def set_stream_ephemeral(root: str, ephemeral: bool) -> str:
    """Change only the lifecycle dial of one declared stream under its root lock."""
    if not isinstance(ephemeral, bool):
        raise ValueError("stream lifecycle needs a boolean ephemeral value")
    paths = sensorium_paths(root)
    path = os.path.join(paths.root, "manifest.json")
    if not os.path.isfile(path):
        raise ValueError(f"stream manifest at {path!r} is absent")
    lock = acquire_root_lock(paths.root, "sensorium_manifest")
    try:
        try:
            with open(path, encoding="utf-8") as fh:
                manifest = json.load(fh)
        except FileNotFoundError:
            raise ValueError(f"stream manifest at {path!r} is absent") from None
        except (OSError, ValueError) as exc:
            raise ValueError(f"stream manifest at {path!r} cannot carry a lifecycle transition: {exc}") from exc
        if not isinstance(manifest, dict):
            raise ValueError(f"stream manifest at {path!r} must hold an object")
        manifest["ephemeral"] = ephemeral
        _atomic_json_write(path, manifest)
        return path
    finally:
        release_lock(lock)


def _write_stream_manifest_unlocked(paths: SensoriumPaths, *, name: str, lar: str, order: OrderCap,
                                    apertures: "dict[str, str] | None", worldline: "dict | None",
                                    ephemeral: bool) -> str:
    """Read, refuse drift, and replace one manifest while its rooted lock stays held."""
    path = os.path.join(paths.root, "manifest.json")
    existing = None
    try:
        with open(path, encoding="utf-8") as fh:
            existing = json.load(fh)
    except FileNotFoundError:
        pass
    except (OSError, ValueError) as exc:
        raise ValueError(f"stream manifest at {path!r} cannot carry a safe rewrite: {exc}") from exc
    if existing is not None:
        if not isinstance(existing, dict):
            raise ValueError(f"stream manifest at {path!r} must hold an object")
        expected = {"sensorium": name, "lar": lar,
                    "order": {"projector": order.projector, "basis": order.basis}}
        drift = [key for key, value in expected.items() if existing.get(key) not in (None, value)]
        declared = {
            "ephemeral": ephemeral,
            **({"apertures": apertures} if apertures is not None else {}),
            **({"worldline": worldline} if worldline is not None else {}),
        }
        drift.extend(key for key, value in declared.items() if existing.get(key) not in (None, value))
        if drift:
            raise ValueError(f"stream manifest at {path!r} conflicts on {', '.join(drift)}")
    created = existing.get("created") if isinstance(existing, dict) else None
    manifest = dict(existing or {})
    declared_has = manifest.get("has", {})
    if not isinstance(declared_has, dict):
        raise ValueError(f"stream manifest at {path!r} must hold an object at has")
    owned_has = {
        "content": {"dir": "content", "engine": "content", "variance": "sheaf"},
        "structure": {"dir": "structure", "engine": "structurepalace", "variance": "sheaf"},
        "form": {"dir": "form", "engine": "formpalace", "variance": "sheaf"},
        "persistence": {"dir": "persistence", "engine": "persistence", "variance": "cosheaf"},
    }
    cap_drift = [cap for cap, declaration in owned_has.items()
                 if cap in declared_has and declared_has[cap] != declaration]
    if cap_drift:
        raise ValueError(f"stream manifest at {path!r} conflicts on has.{', has.'.join(cap_drift)}")
    manifest.update({
        "schema": 1,
        "sensorium": name,
        "lar": lar,
        "has": {**declared_has, **owned_has},
        "order": {"projector": order.projector, "basis": order.basis},
        "persistencePolicy": manifest.get("persistencePolicy", {"halfLife": None}),
        "bands": manifest.get("bands", {"grain": "membership", "computed": "sidecar"}),
        "coupling": manifest.get("coupling", {"children": []}),
        "ephemeral": ephemeral,
        "created": created or datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    })
    if apertures:
        manifest["apertures"] = apertures
    if worldline is not None:
        manifest["has"]["worldline"] = {"dir": "worldline", "engine": "worldline", "variance": "sheaf"}
        manifest["worldline"] = worldline
    contract = compose_sensorium_contract([{
        "has": list(manifest["has"]), "order": order,
        "apertures": manifest.get("apertures"),
    }])
    manifest["order"] = contract["order"]
    if "apertures" in contract:
        manifest["apertures"] = contract["apertures"]
    _atomic_json_write(path, manifest)
    return path


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
                 order: "OrderCap | None" = None, pipeline_factory=None, observer=None,
                 after_capture=None, mutation_root: "str | None" = None) -> None:
        if (pipeline is None) == (pipeline_factory is None):
            raise ValueError("Sensorium requires exactly one of pipeline or pipeline_factory")
        self.kind = kind
        self._pipeline = pipeline
        self._pipeline_factory = pipeline_factory
        self._land = land
        self._worldline = worldline  # the fork-DAG + kapae cap; None until a rooted composition wires it
        # Every entity carries the dormant axis. Rooted compositions replace
        # this with a path-bearing declaration, still inactive until a later
        # persistence lifecycle activates testimony handling.
        self._persistence = persistence if persistence is not None else _INACTIVE_PERSISTENCE
        self._order = order
        self._observer = observer
        self._after_capture = after_capture
        self._mutation_root = mutation_root

    def capture(self, pointer, **route) -> dict:
        """Run one capture pass (idempotent re-derivation) over this entity's cap-stack.

        Fixed sources keep one pipeline.  Stream sources compose a fresh pipeline
        per pass: source and plane caps may carry pass-local state, while land and
        embed capabilities remain warm on the sensorium itself.
        """
        with root_mutation(self._mutation_root, exclusive=False):
            pipeline = self._pipeline_factory(pointer, **route) if self._pipeline_factory else self._pipeline
            summary = pipeline.run_pass(pointer)
            if self._observer is not None:
                summary = {**summary, **self._observer(pointer, **route)}
            if self._after_capture is not None:
                summary = {**summary, **self._after_capture(pointer, summary, **route)}
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
                             persistence=None, order=None, after_capture=None,
                             mutation_root: "str | None" = None) -> Sensorium:
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
                     worldline=worldline, persistence=persistence, order=order, observer=observer,
                     after_capture=after_capture, mutation_root=mutation_root)
