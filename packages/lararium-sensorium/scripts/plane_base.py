#!/usr/bin/env python3
"""plane_base — the BASE SPACE every plane reading stands over, and the ONE road between them.

THE TYPE THE HOUSE WAS MISSING. Two of the sensorium's planes carry records of categorically
different things, and every cross-plane instrument compared them as though they lived over one base:

    content      id = a DRAWER cid        → one fiber per RECORD    → a SHEAF over the record base
    structure    id = a STRUCTURAL HASH   → one fiber per PATTERN   → a COSHEAF-shaped REGISTRY
                                            (count · first_sighting · last_sighting · lar_provenance)
    form         id = a DRAWER cid        → one fiber per RECORD    → a SHEAF (fiber = a membership
                                            subset of the induced constructicon)
    persistence  id = a CLAIM cid         → one fiber per CLAIM     → a SHEAF over the CLAIM base

A structure row answers "what does this SHAPE do across the corpus"; a content row answers "what does
this RECORD say". A sup-norm between them reads a distance between two different universes and returns
a number anyway. The registry survives — it holds the truer object — so the instruments re-type to it.

THE EXTENSION MAP. `lar_provenance` on a structure row lists the records exhibiting that pattern. That
list IS the cosheaf's pushforward, and `pushforward()` below is the ONLY road across the planes. It
carries the two facts the ad-hoc crossings hid:

  1. THE FIBER IS A SET. A record may exhibit MANY patterns (a re-parse, an edit under one turn_key, a
     multi-source drawer). `records_to_patterns()` returns a frozenset per record, never a scalar — a
     caller wanting one pattern per record must SAY which one and eat the loss out loud.
  2. THE MAP IS LOSSY BY DESIGN. `structurepalace_io.PROVENANCE_CAP` truncates a pattern's provenance
     at 64 records. Past the cap, `count` keeps rising and the record list does not, so a hot pattern
     pushes forward onto strictly fewer records than exhibit it. `PatternRegistry.truncated` names every
     such pattern, and the ceiling report prints the number.

THE GATE. `require_base()` refuses any restriction set that mixes bases or omits one. A reader cannot
hand a pattern-plane section to the H0 radius or the H1 gate without first naming the base, which means
the wrong comparison no longer type-checks — it raises with the two bases named.

CLOCK PURITY: the sighting registers here read as immutable DATA off the store; nothing reads a host
clock. DETERMINISM: every map sorts; no RNG rides any path.

Meme: lar:///ha.ka.ba/lararium/sensorium/plane-base
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field

# ── the four bases (the universes a fiber can sit over) ───────────────────────────────────

BASE_RECORD = "record"      # a drawer cid — what the corpus SAYS
BASE_PATTERN = "pattern"    # a structural hash — what a SHAPE does across the corpus
BASE_TEMPLATE = "template"  # an induced-constructicon index — what a FORM covers
BASE_CLAIM = "claim"        # a testimony claim cid — what a CLAIM asserts

BASES = (BASE_RECORD, BASE_PATTERN, BASE_TEMPLATE, BASE_CLAIM)

#: Which base each durable plane's row ids ACTUALLY key on, read off the writers:
#: content_io/form_encoder store by cid · structurepalace_io stores by structural hash ·
#: persistence_io stores by claim_cid. A plane not listed here has no declared base and no
#: instrument may read it cross-plane.
PLANE_BASE = {
    "content": BASE_RECORD,
    "structure": BASE_PATTERN,
    "form": BASE_RECORD,
    "persistence": BASE_CLAIM,
}

#: The planes whose rows need the pushforward before any record-base instrument may read them.
COSHEAF_PLANES = tuple(p for p, b in PLANE_BASE.items() if b != BASE_RECORD)


class BaseMismatch(TypeError):
    """Raised where a reading over one base meets a reading over another. Never caught silently:
    the two bases name themselves in the message so the crossing shows in the traceback."""


# ── the typed section (a plane reading that carries its own universe) ─────────────────────


@dataclass(frozen=True)
class Section:
    """One plane's reading, stamped with the base it stands over and how it got there.

    `origin` reads as testimony, never decoration: a section minted straight off a plane whose rows
    key on this base says "native"; a section carried across by the extension map says
    "pushforward:lar_provenance" and names its combine. An instrument may therefore assert not just
    THAT the bases agree but that a pattern plane earned its record-base reading honestly."""

    plane: str
    base: str
    variance: str          # "sheaf" (restrict/meet) or "cosheaf" (extend/coface)
    value: dict            # unit -> salience
    origin: str = "native"

    def __post_init__(self) -> None:
        if self.base not in BASES:
            raise BaseMismatch(f"plane_base: plane '{self.plane}' names an unknown base '{self.base}'")

    def as_restriction(self) -> dict:
        """The wire shape the H0/H1 instruments read — base and origin ride ALONG, so a restriction
        can never travel without its universe."""
        return {"plane": self.plane, "base": self.base, "variance": self.variance,
                "value": dict(self.value), "origin": self.origin}


def sheaf_section(plane: str, value: dict, *, base: str, origin: str = "native") -> dict:
    """A sheaf restriction over a NAMED base. No default base: a caller who does not know which
    universe their numbers live in has no business handing them to a cross-plane instrument."""
    return Section(plane=plane, base=base, variance="sheaf", value=value, origin=origin).as_restriction()


def cosheaf_section(plane: str, value: dict, *, base: str, origin: str = "native") -> dict:
    """A cosheaf face over a NAMED base — extension up into a coface stalk, never a restriction down."""
    return Section(plane=plane, base=base, variance="cosheaf", value=value,
                   origin=origin).as_restriction()


def require_base(restrictions: list, base: str, *, instrument: str) -> None:
    """THE GATE every cross-plane instrument runs FIRST. Refuses an unstamped restriction and refuses
    a mixed base, naming both universes. This is the line that used to be absent: without it, a
    pattern-plane reading and a record-plane reading meet in a sup-norm and produce a number."""
    for r in restrictions:
        got = r.get("base")
        if got is None:
            raise BaseMismatch(
                f"{instrument}: restriction '{r.get('plane')}' carries no base. A plane reading with no "
                f"declared universe cannot enter a cross-plane comparison — stamp it via "
                f"plane_base.sheaf_section(..., base=...), or push it forward with plane_base.pushforward().")
        if got != base:
            raise BaseMismatch(
                f"{instrument}: restriction '{r.get('plane')}' stands over base '{got}', the instrument "
                f"reads base '{base}'. These name DIFFERENT universes (a {got} is not a {base}); a sup-norm "
                f"between them measures nothing. Route it through plane_base.pushforward() first.")


# ── the pattern registry (the cosheaf, read as it stands) ─────────────────────────────────


@dataclass
class PatternRegistry:
    """The structure plane read AS ITSELF: a fiber per pattern, each carrying its recurrence count,
    its sightings, and the record list it lies over. Tombstoned patterns never enter (kapae: a
    set-aside shape feeds no plane) — the gate reads `lar_tombstoned`, the key the writer stamps."""

    trees: dict = field(default_factory=dict)       # pattern hash -> the stored parse tree
    count: dict = field(default_factory=dict)       # pattern hash -> recurrence count
    exhibits: dict = field(default_factory=dict)    # pattern hash -> [record cid], the provenance list
    first_seen: dict = field(default_factory=dict)  # pattern hash -> sighting (immutable DATA)
    last_seen: dict = field(default_factory=dict)
    tombstoned: int = 0                             # patterns the kapae gate held back
    truncated: list = field(default_factory=list)   # patterns whose provenance hit PROVENANCE_CAP

    @property
    def patterns(self) -> list:
        """The pattern base, sorted — the universe the cosheaf's fibers sit over."""
        return sorted(self.trees)

    def coverage(self, cids: list) -> dict:
        """How much of the record base the extension map can actually reach. A pattern past the
        provenance cap lies over records it can no longer name, so the pushforward's domain falls
        SHORT of the corpus — this reports the shortfall instead of hiding it."""
        reached = set()
        for cid_list in self.exhibits.values():
            reached.update(cid_list)
        known = set(cids)
        return {"records": len(known), "reached": len(reached & known),
                "unreached": len(known - reached),
                "truncated_patterns": len(self.truncated),
                "lossy": bool(self.truncated) or bool(known - reached)}


def read_pattern_registry(root: str) -> PatternRegistry:
    """Read `<root>/structure` as the cosheaf it holds — one fiber per pattern, provenance intact.

    Chroma import rides inside, so the pure types above compose without it."""
    from structurepalace_io import PROVENANCE_CAP, StructurePalaceStore

    reg = PatternRegistry()
    store = StructurePalaceStore(os.path.join(root, "structure"))
    got = store._col.get(include=["documents", "metadatas"])  # noqa: SLF001 — the registry reads its own plane
    for i, h in enumerate(got.get("ids") or []):
        meta = (got.get("metadatas") or [{}])[i] or {}
        if meta.get("lar_tombstoned"):
            reg.tombstoned += 1
            continue
        doc = (got.get("documents") or [None])[i]
        try:
            tree = json.loads(doc) if doc else None
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            continue
        if not isinstance(tree, dict):
            continue
        cids = [p["verbatim_sha"] for p in provenance
                if isinstance(p, dict) and p.get("verbatim_sha")]
        count = int(meta.get("count", 1))
        reg.trees[h] = tree
        reg.count[h] = count
        reg.exhibits[h] = cids
        reg.first_seen[h] = meta.get("first_sighting", "")
        reg.last_seen[h] = meta.get("last_sighting", "")
        if len(provenance) >= PROVENANCE_CAP and count > len(provenance):
            # The cap bit: recurrence outran the record list, so this pattern lies over records it
            # can no longer name. Every pushforward through it under-reaches, and says so.
            reg.truncated.append(h)
    return reg


# ── THE PUSHFORWARD (the one road from the pattern base to the record base) ───────────────


def records_to_patterns(registry: PatternRegistry, cids: list) -> dict:
    """The extension map's raw shape: record cid -> the FROZENSET of patterns lying over it.

    A set, not a scalar. Where a record exhibits several patterns, every caller sees it and decides
    out loud; the projector's silent last-write-wins had no such conversation."""
    out: dict = {c: set() for c in cids}
    known = set(cids)
    for h in registry.patterns:                       # sorted: the map regenerates identically
        for cid in registry.exhibits[h]:
            if cid in known:
                out[cid].add(h)
    return {c: frozenset(v) for c, v in out.items()}


def combine_sum_histogram(fibers: list) -> dict:
    """The colimit combine: sum the pattern fibers lying over one record, key by key.

    A record exhibiting ONE pattern gets that pattern's fiber back UNCHANGED — so a corpus where the
    map runs one-to-one reproduces the single-pattern reading exactly, and the pushforward costs
    nothing where nothing was being hidden."""
    out: dict = {}
    for f in fibers:
        for k, v in f.items():
            out[k] = out.get(k, 0) + v
    return out


def combine_union_set(fibers: list) -> set:
    """The set-valued combine: union the pattern fibers over one record (a form-style membership read)."""
    out: set = set()
    for f in fibers:
        out |= set(f)
    return out


def pushforward(registry: PatternRegistry, cids: list, fiber, combine) -> dict:
    """THE EXTENSION MAP: carry a PATTERN-base fiber assignment forward onto the RECORD base along
    `lar_provenance`. Returns {record cid -> the combined fiber}, over exactly those records some
    live pattern lies over.

      fiber   : pattern hash -> that pattern's value (a histogram, a set, whatever the plane's own
                mechanism mints — the pushforward never invents one)
      combine : the list of fibers over one record -> the record's value. NAME IT. A record with
                several patterns has no canonical single value, and the caller owes the corpus a
                statement of which colimit it took.

    Nothing else in the house may cross the planes. Every cross-plane instrument runs through here."""
    per_record = records_to_patterns(registry, cids)
    out: dict = {}
    for cid in cids:                                   # corpus order held; the map is deterministic
        hs = sorted(per_record.get(cid) or ())         # sorted: combine sees one stable order
        if not hs:
            continue                                   # no pattern lies over it → it enters no reading
        fibers = [fiber(h) for h in hs]
        fibers = [f for f in fibers if f is not None]
        if not fibers:
            continue
        out[cid] = combine(fibers)
    return out


def record_trees(registry: PatternRegistry, cids: list) -> dict:
    """record cid -> the TUPLE of parse trees lying over it (pattern order sorted, so the map
    regenerates identically). The plural is the point: a tree-per-record is a PROPERTY of the corpus,
    never a guarantee of the store."""
    per_record = records_to_patterns(registry, cids)
    return {c: tuple(registry.trees[h] for h in sorted(per_record[c]))
            for c in cids if per_record.get(c)}


def sole_pattern_tree(registry: PatternRegistry, cids: list, *, instrument: str) -> dict:
    """record cid -> its ONE parse tree, for the instruments whose mechanism is only defined on a
    FUNCTIONAL map (form induction needs one pre-order stream per record; two streams are not one).

    Where the map fans out this RAISES and names the records. It does not pick. The old crossing
    picked — silently, by store iteration order — which is how an instrument ends up reading a
    structure nobody chose. On every bed on disk and on the live memory registry the map runs
    one-to-one today, so this hands back exactly what the corpus already holds; it fires the day
    that stops being true, which is precisely when someone needs to know."""
    trees = record_trees(registry, cids)
    multi = sorted(c for c, ts in trees.items() if len(ts) > 1)
    if multi:
        raise BaseMismatch(
            f"{instrument}: {len(multi)} record(s) exhibit MORE THAN ONE structural pattern "
            f"(e.g. {multi[:3]}), and this instrument's mechanism is defined on one tree per record. "
            f"There is no canonical choice among them — decide the colimit out loud "
            f"(plane_base.pushforward with a named combine), never by store order.")
    return {c: ts[0] for c, ts in trees.items()}


def pushforward_origin(combine) -> str:
    """The testimony a pushed-forward section carries in `origin` — the map and the colimit, named."""
    return f"pushforward:lar_provenance/{getattr(combine, '__name__', 'combine')}"


# ── the labeled-tree fold (the DECKARD grain a pattern fiber reads through) ───────────────


def to_labeled(node) -> "dict | None":
    """Fold a stored parser tree into the DECKARD LabeledTree grain — the content-free label rides
    structurepalace_io's own `_node_label` (type/shape, never values).

    THE CEILING THIS IMPOSES: dropping values is exactly what costs the wrapped bed its structure
    capacity. The fold stays faithful to what the plane stores; `plane_capacity` prints the price."""
    from structurepalace_io import _node_label

    if isinstance(node, dict):
        label = _node_label(node)
        kids = [v for v in node.values() if isinstance(v, (dict, list))]
    elif isinstance(node, list):
        label = "[list]"
        kids = list(node)
    else:
        return None
    children = []
    for k in kids:
        c = to_labeled(k)
        if c is not None:
            children.append(c)
    return {"label": label, "children": children}
