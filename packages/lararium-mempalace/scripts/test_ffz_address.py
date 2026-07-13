#!/usr/bin/env python3
"""test_ffz_address — the membership tree must BE an ultrametric, and must never become a count."""
from __future__ import annotations

import itertools
import random

from ffz_address import (
    BANDS,
    DEPTH,
    NULL_BAND,
    FfzAddress,
    address_bits,
    branching,
    coarsen,
    common_prefix,
    distance,
    meet,
    parse,
)


def _rand(rng: random.Random) -> FfzAddress:
    pick = lambda n: rng.choice([NULL_BAND] + [str(i) for i in range(n)])  # noqa: E731
    return FfzAddress(pick(3), pick(4), pick(4), pick(5), pick(5))


def test_ultrametric_inequality():
    """d(a,c) <= max(d(a,b), d(b,c)) — the STRONG triangle inequality. A metric only promises the sum;
    an ultrametric promises the max, and that is what lets distance read as 'how far up the tree'."""
    rng = random.Random(4241)
    pool = [_rand(rng) for _ in range(60)]
    for a, b, c in itertools.islice(itertools.permutations(pool, 3), 4000):
        assert distance(a, c) <= max(distance(a, b), distance(b, c))


def test_identity_and_symmetry():
    rng = random.Random(17)
    for _ in range(200):
        a, b = _rand(rng), _rand(rng)
        assert distance(a, b) == distance(b, a)
    full = FfzAddress("t", "a", "m", "b", "s")
    assert distance(full, full) == 0


def test_null_band_shares_an_absence_never_a_cell():
    """Two moments both lacking a Beat share no Beat — they share an ABSENCE. A geology bed must not
    manufacture closeness out of the band it never had."""
    g1 = FfzAddress("chant", "hawaiian", 11, NULL_BAND, 340)
    g2 = FfzAddress("chant", "hawaiian", 11, NULL_BAND, 341)
    # They agree down to Measure (3 bands), and the NULL Beat stops the walk — the segments never count.
    assert common_prefix(g1, g2) == 3
    assert distance(g1, g2) == DEPTH - 3


def test_truncation_coarsens_and_the_prefix_still_reads():
    """A LABEL truncates cleanly where a COUNT cannot (the Hox boundary): lop the prefix of a colinear
    sequence and its meaning shatters; lop a membership path and the coarser container remains."""
    a = FfzAddress("proj", "sess", 2, 17, 4)
    m = coarsen(a, "measure")
    assert m.measure == "2" and m.beat == NULL_BAND and m.segment == NULL_BAND
    assert distance(a, m) == 0 or common_prefix(a, m) == 3   # the shared head survives the cut


def test_meet_is_the_lowest_common_ancestor():
    a = FfzAddress("proj", "sess", 2, 17, 4)
    b = FfzAddress("proj", "sess", 2, 18, 1)
    lca = meet(a, b)
    assert lca.measure == "2" and lca.beat == NULL_BAND
    assert DEPTH - common_prefix(a, b) == distance(a, b) == 2


def test_path_round_trips():
    a = FfzAddress("t", "a", 3, 9, 2, block=5)
    assert parse(a.path()) == a
    short = parse("proj.sess")
    assert short.theme == "proj" and short.measure == NULL_BAND   # a truncated address stays valid


def test_the_address_prices_itself_in_bits():
    """The path is a PREFIX CODE, so the grain speaks the same currency as the two-part code. Geology
    pays only for the bands it EARNED — an ungrounded band costs nothing."""
    rhizome = FfzAddress("proj", "sess", 2, 17, 4)
    geology = FfzAddress("proj", "sess", 2, NULL_BAND, 4)
    alpha = branching([rhizome, geology, FfzAddress("other", "s2", 1, 3, 9)])
    assert address_bits(geology, alpha) < address_bits(rhizome, alpha)
    assert address_bits(rhizome, {}) == 0.0          # no observed alphabet → no price claimed


def test_no_band_is_a_count():
    """The seal: a band LABELS a cell, never tallies one. Distance must not read arithmetic difference —
    beat 17 and beat 18 sit exactly as far apart as beat 17 and beat 900."""
    a = FfzAddress("t", "a", 1, 17, 0)
    near = FfzAddress("t", "a", 1, 18, 0)
    far = FfzAddress("t", "a", 1, 900, 0)
    assert distance(a, near) == distance(a, far)


def test_bands_run_coarse_to_fine():
    """The path is written coarse→fine, so a PREFIX is always the coarser read — which is what makes
    truncation a zoom-out rather than a corruption."""
    assert BANDS == ("theme", "arc", "measure", "beat", "segment")
