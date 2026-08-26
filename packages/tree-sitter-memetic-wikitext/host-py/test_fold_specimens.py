"""The fold's gates, each over ground that only moves when someone means it.

FOUR PROPERTIES, FOUR BEDS. An earlier single gate hashed 250 live memes out of `bags/lares` and
called the result a parity check. Those memes are authored content under continuous revision, so the
gate measured `f(x)` while `x` drifted: an edit and a grammar regression produced the same red. Over
seventeen days it fired on 60 memes, every one of them a content edit, and it never once caught a
grammar change. A gate whose signal is entirely noise stops being read, which is what happened.

Each property below sits on ground chosen to suit it:

  · REGRESSION SENTINEL — hashes pinned over FROZEN specimens in `fixtures/specimens/`. The input
    lives beside the pinned hash, so a hash can only move by a commit that also moves the specimen.
  · CONSTRUCT COVERAGE — the specimens must reach every named node type the grammar DECLARES, read
    from `src/node-types.json` (the parser generator writes it; no hand-kept list to drift).
  · LIVING GROUND — the real corpus keeps a gate, but on INVARIANTS rather than hashes: no meme
    parses into an ERROR node, and every span slices back into its own bytes. Content edits cannot red
    that; a grammar break does, and so does committing a meme the grammar cannot read.
  · DETERMINISM — the same bytes fold to the same tree, twice.

WHY THE LIVE CORPUS STAYS IN THE SUITE AT ALL. It reaches shapes nobody would author on purpose, and
that breadth is worth keeping. What it cannot do is witness EQUALITY, because it does not hold still.

WHAT THIS TRADES AWAY, stated so nobody rediscovers it as a surprise: a change that alters tree shape
while still raising nothing and still reconstructing spans, on a construct no specimen freezes, passes
here. The cure for that is a re-bake-and-read at the moment a grammar changes — a tool for the author,
never a gate on every push over content edited for unrelated reasons.
"""

from __future__ import annotations

import json
import os

import memeast_fold as mf
import pytest

_HERE = os.path.dirname(os.path.abspath(__file__))
_PKG = os.path.normpath(os.path.join(_HERE, ".."))
_SPECIMEN_DIR = os.path.join(_PKG, "fixtures", "specimens")
_SPECIMEN_MANIFEST = os.path.join(_PKG, "fixtures", "specimens-0.1.0.json")
# The bag carries its plain name: the entity slots dropped the @{slug} marker.
_BAGS = os.path.normpath(os.path.join(_PKG, "..", "..", "bags", "lares"))


def _specimens() -> list[str]:
    return sorted(f for f in os.listdir(_SPECIMEN_DIR) if f.endswith(".mem"))


def _declared_named_types() -> set[str]:
    """Every named node type the GRAMMAR declares. The parser generator writes this file, so the
    universe this suite measures against cannot drift from the grammar the way a hand-kept list would."""
    with open(os.path.join(_PKG, "src", "node-types.json"), encoding="utf-8") as fh:
        return {n["type"] for n in json.load(fh) if n.get("named")}


def _named_types_in(path: str) -> set[str]:
    from tree_sitter import Parser

    with open(path, "rb") as fh:
        tree = Parser(mf._language()).parse(fh.read())
    seen, stack = set(), [tree.root_node]
    while stack:
        node = stack.pop()
        if node.is_named:
            seen.add(node.type)
        stack.extend(node.children)
    return seen


def _walk(node, visit) -> None:
    visit(node)
    for child in node.get("children", []):
        _walk(child, visit)
    if isinstance(node.get("body"), dict):
        _walk(node["body"], visit)


# ── the regression sentinel — frozen ground ──────────────────────────────────────────────────────
@pytest.mark.parametrize("name", _specimens())
def test_specimen_folds_to_its_pinned_hash(name):
    """A specimen's fold is pinned beside the specimen itself. Moving this hash requires a commit that
    also moves the input, which is the whole difference between this and the corpus gate it replaces."""
    with open(_SPECIMEN_MANIFEST, encoding="utf-8") as fh:
        pinned = json.load(fh)["specimens"]
    assert name in pinned, (
        f"{name} carries no pinned hash. A specimen the manifest does not name is a specimen nothing "
        f"gates — re-bake with `python host-py/bake_specimens.py` or add it deliberately."
    )
    with open(os.path.join(_SPECIMEN_DIR, name), "rb") as fh:
        data = fh.read()
    assert mf.structural_hash(mf.fold(data)) == pinned[name]["hash"], (
        f"{name} folds differently than pinned. The specimen has NOT changed unless this commit "
        f"changed it, so this reads as a grammar or fold change — intended (re-bake in the same "
        f"commit) or a regression (fix it)."
    )


def test_every_pinned_specimen_still_exists():
    """A manifest entry outliving its file gates nothing and quietly teaches that the manifest is
    approximate."""
    with open(_SPECIMEN_MANIFEST, encoding="utf-8") as fh:
        pinned = json.load(fh)["specimens"]
    orphans = sorted(set(pinned) - set(_specimens()))
    assert not orphans, f"pinned specimens that no longer exist: {orphans}"


# ── construct coverage — the specimens must reach what the grammar declares ───────────────────────
def test_specimens_reach_every_declared_node_type():
    """The frozen set is only as good as its coverage, and coverage chosen by hand cannot notice a
    construct the grammar gained afterwards. So the universe comes from the grammar's own
    `node-types.json`: add a rule and this fails until a specimen exercises it."""
    declared = _declared_named_types()
    reached: set[str] = set()
    for name in _specimens():
        reached |= _named_types_in(os.path.join(_SPECIMEN_DIR, name))
    missing = sorted(declared - reached)
    assert not missing, (
        "The grammar declares node types no frozen specimen exercises, so a change to any of them "
        "would move no pinned hash and pass unseen:\n  " + "\n  ".join(missing)
    )


# ── living ground — invariants, never equality ───────────────────────────────────────────────────
def _live_memes() -> list[str]:
    if not os.path.isdir(_BAGS):
        return []
    out = []
    for root, _dirs, files in os.walk(_BAGS):
        out.extend(os.path.join(root, f) for f in files if f.endswith(".mem"))
    return sorted(out)


_LIVE = _live_memes()
_no_bags = "bags/lares absent — the living-ground smoke rides the operator's tree"


@pytest.mark.skipif(not _LIVE, reason=_no_bags)
def test_every_live_meme_parses_without_an_error_node():
    """THE LIVING-GROUND GATE WITH TEETH. `has_error` marks a tree tree-sitter had to recover into —
    the grammar met input it could not seat.

    This carries the weight that `folds_without_raising` below cannot. The house's graceful-parsing law
    says NO parse breaks badly: the fold recovers rather than throwing, so a deliberately malformed meme
    still folds cleanly and the raise-guard passes. Demonstrated while building this file — a planted
    meme with an unclosed ahu and a dangling sigil raised nothing and slid past both invariants, while
    `root_node.has_error` came back True. A guard that cannot fail certifies nothing; this one fails.

    A content edit reds this ONLY by committing a meme the grammar cannot read, which is a red worth
    having rather than the noise the hash gate produced."""
    from tree_sitter import Parser

    parser = Parser(mf._language())
    broken = []
    for path in _LIVE:
        with open(path, "rb") as fh:
            if parser.parse(fh.read()).root_node.has_error:
                broken.append(os.path.relpath(path, _BAGS))
    assert not broken, (
        "memes the grammar had to recover into an ERROR node — either the meme is malformed or the "
        "grammar lost a construct it used to seat:\n  " + "\n  ".join(broken[:10])
    )


@pytest.mark.skipif(not _LIVE, reason=_no_bags)
def test_every_live_meme_folds_without_raising():
    """A floor, and a weak one — recorded as weak so nobody reads its green as coverage. Graceful
    parsing means the fold recovers instead of throwing, so this fails only on a crash in the fold
    itself, never on malformed input. The error-node gate above is what actually watches the corpus."""
    raised = []
    for path in _LIVE:
        with open(path, "rb") as fh:
            data = fh.read()
        try:
            mf.fold(data)
        except Exception as exc:  # noqa: BLE001 — the claim is that NOTHING raises
            raised.append(f"{os.path.relpath(path, _BAGS)}: {type(exc).__name__}: {exc}")
    assert not raised, "memes the fold could not read:\n  " + "\n  ".join(raised[:10])


@pytest.mark.skipif(not _LIVE, reason=_no_bags)
def test_every_span_slices_back_into_its_own_ground():
    """Spans are BYTE offsets into the source. A span that runs past its ground, or inverts, hands a
    host a slice of something else — the failure a hash comparison reports only as 'different'."""
    broken = []
    for path in _LIVE:
        with open(path, "rb") as fh:
            data = fh.read()

        def check(node, _rel=os.path.relpath(path, _BAGS), _n=len(data)):
            start, end = node["start"], node["end"]
            if not (0 <= start <= end <= _n):
                broken.append(f"{_rel}: {node['kind']} [{start},{end}] outside [0,{_n}]")

        _walk(mf.fold(data), check)
    assert not broken, "spans outside their ground:\n  " + "\n  ".join(broken[:10])


# ── determinism ──────────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("name", _specimens())
def test_fold_is_deterministic_over_a_specimen(name):
    """Same bytes, same tree — over real specimens rather than a four-line string, so the claim covers
    every construct the frozen set reaches."""
    with open(os.path.join(_SPECIMEN_DIR, name), "rb") as fh:
        data = fh.read()
    first, second = mf.fold(data), mf.fold(data)
    assert mf.canonical_json(first) == mf.canonical_json(second)
    assert mf.structural_hash(first) == mf.structural_hash(second)
