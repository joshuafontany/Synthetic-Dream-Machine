"""Tests — the placebo generator's named null: markers verbatim, envelope verbatim modulo
the namespace swap, per-line token counts held, babble deterministic under its seed, and
the anti-marker guard holding. The real-library tests gate on the shelf standing local;
the committed fixtures carry their own regeneration witness."""
from __future__ import annotations

import os
import random

import pytest

from kumulipo_sections import section_corpus_file, source_text_span
from placebo_kumulipo import (
    CARRIERS,
    DEFAULT_SEED,
    FIXTURES_DIR,
    LIBRARY_DIR,
    _Chain,
    _babble_line,
    _is_marker,
    _kept_slots,
    placebo_text,
)
from test_kumulipo_sections import _mini_beckwith, _mini_liliuokalani


# ── determinism + seed sensitivity ───────────────────────────────────────────────────────


def test_same_seed_regenerates_identical_bytes():
    real = _mini_liliuokalani()
    a = placebo_text(real, "kumulipo-liliuokalani.md", seed=5)
    b = placebo_text(real, "kumulipo-liliuokalani.md", seed=5)
    assert a == b


def test_different_seed_moves_the_babble():
    real = _mini_beckwith()
    a = placebo_text(real, "kumulipo-beckwith.md", seed=5)
    b = placebo_text(real, "kumulipo-beckwith.md", seed=6)
    assert a != b


# ── the mirror: markers, labels, envelope ────────────────────────────────────────────────


def test_sectioner_cuts_placebo_at_identical_labels_both_modes():
    real = _mini_beckwith()
    fake = placebo_text(real, "kumulipo-beckwith.md", seed=7)
    for extract in (False, True):
        r = section_corpus_file("kumulipo-beckwith.md", real, extract=extract)
        f = section_corpus_file("kumulipo-beckwith.md", fake, extract=extract)
        assert [[ln for ln, _ in s["sections"]] for s in r] == \
               [[ln for ln, _ in s["sections"]] for s in f]
        assert [s["source"] for s in r] == [s["source"] for s in f]


def test_envelope_survives_verbatim_modulo_namespace():
    real = _mini_liliuokalani()
    fake = placebo_text(real, "kumulipo-liliuokalani.md", seed=7)
    r_lines, f_lines = real.split("\n"), fake.split("\n")
    assert len(r_lines) == len(f_lines)                 # line count holds everywhere
    lo, hi = source_text_span(r_lines)
    for i, (r, f) in enumerate(zip(r_lines, f_lines)):
        if lo <= i < hi:
            continue                                    # the interior babbles
        assert f == r.replace("ha.ka.ba/lares/library/hawaii/kumulipo/",
                              "ha.ka.ba/lares/testbed/placebo/kumulipo/")
    # The placebo namespace actually lands (the swap fires, not vacuously).
    assert "testbed/placebo/kumulipo" in fake
    assert "library/hawaii/kumulipo" not in fake


def test_interior_babbles_but_token_counts_hold():
    real = _mini_beckwith()
    fake = placebo_text(real, "kumulipo-beckwith.md", seed=11)
    r_lines, f_lines = real.split("\n"), fake.split("\n")
    lo, hi = source_text_span(r_lines)
    moved = 0
    for i in range(lo, hi):
        r, f = r_lines[i], f_lines[i]
        if not r.strip() or _is_marker(r):
            assert f == r
            continue
        assert len(f.split()) == len(r.split())         # per-line token count preserved
        if f != r:
            moved += 1
    assert moved > 0                                    # nonsense actually replaces text


def test_lexicon_stays_inside_the_section():
    # A one-scope body: every babbled token must come from that scope's own words.
    real = _mini_liliuokalani()
    fake = placebo_text(real, "kumulipo-liliuokalani.md", seed=13)
    r = dict(section_corpus_file("kumulipo-liliuokalani.md", real, extract=True)[0]["sections"])
    f = dict(section_corpus_file("kumulipo-liliuokalani.md", fake, extract=True)[0]["sections"])
    for label in r:
        assert set(f[label].split()) <= set(r[label].split()) | {"##"}


# ── the guards ───────────────────────────────────────────────────────────────────────────


def test_anti_marker_guard_never_mints_a_boundary():
    # A poisoned scope whose lexicon IS a marker: every draw collides, the guard mangles.
    chain = _Chain()
    chain.train([["CHANT", "ONE"]])
    rng = random.Random(0)
    for _ in range(32):
        line = _babble_line("CHANT ONE", chain, rng)
        assert not _is_marker(line)


def test_kept_slots_pin_skeleton_and_page_markers():
    tokens = "## The dusky {p. 47} night".split()
    kept = _kept_slots(tokens)
    assert kept == [True, False, False, True, True, False]


def test_missing_source_text_fails_loud():
    with pytest.raises(ValueError, match="no balanced"):
        placebo_text("# bare\n\nno wrapping\n", "kumulipo-liliuokalani.md", seed=1)


# ── the committed fixtures (regeneration witness, gated on the real shelf) ───────────────

# this suite lives in scripts/testbeds/, so the repo root sits five levels up
_REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))))
_LIBRARY = os.path.join(_REPO, LIBRARY_DIR)


@pytest.mark.skipif(not os.path.isdir(_LIBRARY), reason="the kumulipo library rides elsewhere")
def test_committed_fixtures_rederive_byte_identical():
    for basename in CARRIERS:
        with open(os.path.join(_LIBRARY, basename), encoding="utf-8") as fh:
            real = fh.read()
        with open(os.path.join(FIXTURES_DIR, basename), encoding="utf-8") as fh:
            committed = fh.read()
        assert placebo_text(real, basename, seed=DEFAULT_SEED) == committed


@pytest.mark.skipif(not os.path.isdir(_LIBRARY), reason="the kumulipo library rides elsewhere")
def test_real_carriers_mirror_within_ten_percent():
    for basename in CARRIERS:
        with open(os.path.join(_LIBRARY, basename), encoding="utf-8") as fh:
            real = fh.read()
        fake = placebo_text(real, basename, seed=DEFAULT_SEED)
        for extract in (False, True):
            r_srcs = section_corpus_file(basename, real, extract=extract)
            f_srcs = section_corpus_file(basename, fake, extract=extract)
            for r_src, f_src in zip(r_srcs, f_srcs):
                assert [ln for ln, _ in r_src["sections"]] == [ln for ln, _ in f_src["sections"]]
                for (label, r_body), (_, f_body) in zip(r_src["sections"], f_src["sections"]):
                    ratio = len(f_body) / max(1, len(r_body))
                    assert 0.9 <= ratio <= 1.1, f"{r_src['source']}/{label}: {ratio}"
