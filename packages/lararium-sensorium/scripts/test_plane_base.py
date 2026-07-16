#!/usr/bin/env python3
"""test_plane_base — the base space, the pushforward, and the gates that refuse a crossing.

THE CLAIM UNDER TEST: a record-base reading and a pattern-base reading name different universes, and
after this repair the house cannot compare them by accident. The tests below pin four things:

  1. THE PUSHFORWARD COSTS NOTHING WHERE NOTHING WAS HIDDEN — where `lar_provenance` runs one-to-one
     (every bed on disk, and the live memory registry), the extension map is the IDENTITY and every
     published number stands. The mistype was a LOADED GUN, not a fired one.
  2. THE PUSHFORWARD EARNS ITS KEEP WHERE THE MAP FANS OUT — a record exhibiting two patterns gets
     BOTH, summed. The collapse it replaces kept whichever pattern the store's row order handed over
     last, which is not a choice anyone made.
  3. THE GATES REFUSE. Mixed base, missing base — both raise, in the H0 radius and the H1 gate.
  4. THE CEILING SCORES THE RIGHT BASE. A pattern plane asked about its own rows scores its primary
     key and reads 100%; asked about the record base it reads the truth.
"""
from __future__ import annotations

import math

import pytest

from plane_base import (
    BASE_PATTERN,
    BASE_RECORD,
    BaseMismatch,
    PatternRegistry,
    combine_sum_histogram,
    combine_union_set,
    pushforward,
    records_to_patterns,
    require_base,
    sheaf_section,
)
from plane_capacity import partition_entropy
from sensorium_consistency import consistency_radius
from sensorium_fusion import cohomology_obstruction


def _registry(exhibits: dict, counts: "dict | None" = None) -> PatternRegistry:
    """A registry standing over a hand-laid provenance map — the cosheaf, minus chroma."""
    reg = PatternRegistry()
    for h, cids in exhibits.items():
        reg.trees[h] = {"type": h, "children": []}
        reg.exhibits[h] = list(cids)
        reg.count[h] = (counts or {}).get(h, len(cids))
    return reg


# ── 1. the identity case: a one-to-one map pushes forward to itself ───────────────────────


def test_pushforward_is_identity_where_the_map_runs_one_to_one():
    """Every bed on disk carries one pattern per record. There the pushforward hands each record
    its own pattern's fiber, UNCHANGED — so the re-typed projector reproduces the old reading
    exactly, and the repair buys safety without moving a single published number."""
    reg = _registry({"h1": ["r1"], "h2": ["r2"], "h3": ["r3"]})
    fibers = {"h1": {"a": 1}, "h2": {"b": 2}, "h3": {"c": 3}}
    out = pushforward(reg, ["r1", "r2", "r3"], lambda h: fibers[h], combine_sum_histogram)
    assert out == {"r1": {"a": 1}, "r2": {"b": 2}, "r3": {"c": 3}}


def test_records_to_patterns_hands_back_a_set_not_a_scalar():
    """The fiber is a SET. Even in the one-to-one case the type says so, because the caller must not
    be able to write code that only works while the corpus happens to be functional."""
    reg = _registry({"h1": ["r1"]})
    assert records_to_patterns(reg, ["r1"]) == {"r1": frozenset({"h1"})}


# ── 2. the fan-out case: the collapse the repair replaces ─────────────────────────────────


def test_pushforward_sums_every_pattern_lying_over_one_record():
    """A record exhibiting two patterns carries BOTH fibers, summed (the colimit). A last-write-wins
    collapse would return exactly one of them, chosen by the store's iteration order."""
    reg = _registry({"h1": ["r1", "r2"], "h2": ["r1"]})
    fibers = {"h1": {"x": 1, "y": 1}, "h2": {"y": 5}}
    out = pushforward(reg, ["r1", "r2"], lambda h: fibers[h], combine_sum_histogram)
    assert out["r1"] == {"x": 1, "y": 6}      # BOTH patterns, summed — never one of them
    assert out["r2"] == {"x": 1, "y": 1}


def test_the_collapse_the_repair_replaces_would_have_dropped_a_pattern():
    """Pin the divergence explicitly: the old crossing wrote `trees[cid] = tree` per provenance line,
    so the LAST pattern iterated won and the earlier ones vanished with no error and no note. This
    test asserts the two readings actually differ, so nobody re-introduces the collapse as a
    'simplification'."""
    reg = _registry({"h1": ["r1"], "h2": ["r1"]})
    fibers = {"h1": {"x": 1}, "h2": {"y": 1}}

    last_write_wins = {}
    for h in reg.patterns:
        for cid in reg.exhibits[h]:
            last_write_wins[cid] = fibers[h]

    honest = pushforward(reg, ["r1"], lambda h: fibers[h], combine_sum_histogram)
    assert last_write_wins["r1"] == {"y": 1}          # one pattern, silently
    assert honest["r1"] == {"x": 1, "y": 1}           # both, out loud
    assert honest["r1"] != last_write_wins["r1"]


def test_combine_must_be_named_and_union_is_the_other_honest_choice():
    """A record with several patterns has no canonical single value; the caller states the colimit it
    took. Union is the set-valued sibling of the sum."""
    reg = _registry({"h1": ["r1"], "h2": ["r1"]})
    out = pushforward(reg, ["r1"], lambda h: {h}, combine_union_set)
    assert out["r1"] == {"h1", "h2"}


def test_a_record_no_pattern_reaches_enters_no_reading():
    """The pushforward's domain is the records some LIVE pattern lies over. A record nothing reaches
    is absent from the section, never present with a fabricated zero."""
    reg = _registry({"h1": ["r1"]})
    out = pushforward(reg, ["r1", "r_orphan"], lambda h: {"a": 1}, combine_sum_histogram)
    assert "r_orphan" not in out


def test_the_provenance_cap_makes_the_map_lossy_and_the_registry_says_so():
    """structurepalace_io caps provenance at 64 records. Past the cap a pattern's `count` keeps
    rising and its record list does not, so the pushforward reaches strictly fewer records than
    exhibit the pattern. The registry NAMES that pattern rather than quietly under-reaching.

    This is not hypothetical: the live memory registry carries 2 such patterns today."""
    from structurepalace_io import PROVENANCE_CAP

    capped = [f"r{i}" for i in range(PROVENANCE_CAP)]
    reg = _registry({"hot": capped}, counts={"hot": PROVENANCE_CAP + 40})
    reg.truncated.append("hot")
    cov = reg.coverage(capped + ["r_unnamed"])
    assert cov["lossy"] is True
    assert cov["truncated_patterns"] == 1
    assert cov["unreached"] == 1


# ── 3. the gates ──────────────────────────────────────────────────────────────────────────


def test_require_base_refuses_a_restriction_with_no_declared_base():
    with pytest.raises(BaseMismatch, match="carries no base"):
        require_base([{"plane": "structure", "variance": "sheaf", "value": {}}],
                     BASE_RECORD, instrument="t")


def test_require_base_refuses_a_mixed_base_and_names_both_universes():
    with pytest.raises(BaseMismatch, match="pattern.*record|record.*pattern"):
        require_base([sheaf_section("content", {}, base=BASE_RECORD),
                      sheaf_section("structure", {}, base=BASE_PATTERN)],
                     BASE_RECORD, instrument="t")


def test_the_h0_radius_refuses_a_pattern_plane_meeting_a_record_plane():
    """THE CROSSING THAT USED TO RETURN A NUMBER. A structure reading keyed on structural hashes and
    a content reading keyed on drawer cids met in a sup-norm; the units never collided, so the pair
    read `vacuous` or — worse, where an id happened to collide — a distance. Now it raises."""
    with pytest.raises(BaseMismatch):
        consistency_radius(
            [sheaf_section("content", {"u": 0.5}, base=BASE_RECORD),
             sheaf_section("structure", {"u": 0.9}, base=BASE_PATTERN)],
            {"units": ["u"]})


def test_the_h1_gate_refuses_a_mixed_base_nerve():
    """The agreement nerve builds edges from unit-set OVERLAPS. Units from different universes
    produce a topology of nothing and a confident dim H1 = 0."""
    with pytest.raises(BaseMismatch):
        cohomology_obstruction({
            "restrictions": [sheaf_section("content", {"u": 0.5}, base=BASE_RECORD),
                             sheaf_section("structure", {"u": 0.5}, base=BASE_PATTERN)],
            "stalk": {"units": ["u"]}})


def test_a_correctly_typed_assignment_still_computes():
    """The gate refuses the crossing, never the work: an all-record-base assignment runs as before."""
    out = consistency_radius(
        [sheaf_section("content", {"u": 0.1}, base=BASE_RECORD),
         sheaf_section("structure", {"u": 0.9}, base=BASE_RECORD)],
        {"units": ["u"]})
    assert out["radius"] == pytest.approx(0.8)


def test_a_section_carries_its_origin_so_a_pushed_forward_reading_confesses():
    s = sheaf_section("structure", {"r1": 0.5}, base=BASE_RECORD,
                      origin="pushforward:lar_provenance/combine_sum_histogram")
    assert s["base"] == BASE_RECORD
    assert s["origin"].startswith("pushforward:")


def test_an_unknown_base_never_mints_a_section():
    with pytest.raises(BaseMismatch):
        sheaf_section("structure", {}, base="vibes")


# ── 4. the ceiling scores the record base, never its own primary key ──────────────────────


def test_a_pattern_plane_scoring_its_own_rows_reads_one_hundred_percent_by_construction():
    """THE SELF-MANUFACTURE. Every structural hash is distinct, so H over the structure plane's own
    id column is log2(N_patterns) — a perfect score against itself, telling nobody anything. That is
    the reading the ceiling used to print for the live memory sensorium: 870 rows, 9.765 bits, 100%."""
    hashes = [f"h{i}" for i in range(870)]
    assert partition_entropy(hashes) == pytest.approx(math.log2(870))


def test_the_same_plane_over_the_record_base_reads_the_truth():
    """The wrapped Kumulipo structure plane, exactly as it sits on disk: THREE patterns covering the
    54 records in a 50/2/2 split. Its native ceiling reads 1.585 bits (27.5% of log2(54)) — the
    figure the campaign published. Its RECORD ceiling — the one the DPI bound actually needs — reads
    0.455 bits, SEVEN POINT NINE PERCENT. The envelope costs the structure plane 92 points of
    capacity, not 71: the published number was itself scoring the id column."""
    reg = _registry({"a": [f"r{i}" for i in range(50)], "b": ["r50", "r51"], "c": ["r52", "r53"]})
    cids = [f"r{i}" for i in range(54)]
    labels = [records_to_patterns(reg, cids)[c] for c in cids]
    native = partition_entropy(["a", "b", "c"])
    record = partition_entropy(labels)
    target = math.log2(54)
    assert native == pytest.approx(1.585, abs=1e-3)             # the id column — 27.5% of target
    assert native / target == pytest.approx(0.275, abs=1e-3)
    assert record == pytest.approx(0.455, abs=1e-3)             # the channel — 7.9% of target
    assert record / target == pytest.approx(0.079, abs=1e-3)
