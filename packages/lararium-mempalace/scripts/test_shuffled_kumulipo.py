"""Tests — the shape-placebo's named transform: lines verbatim and merely permuted
within their own wa scope, markers/blanks/rules pinned in place, the sectioner cutting
identical labels both modes, and the permutation deterministic under its seed."""
from __future__ import annotations

import pytest

from kumulipo_sections import section_corpus_file
from shuffled_kumulipo import _URI_SWAPS, _movable, _verify_mirror, shuffle_text
from test_kumulipo_sections import _ENVELOPE_HEAD, _ENVELOPE_TAIL, _mini_beckwith, _mini_liliuokalani


def _multi_line_lili() -> str:
    """A liliuokalani-shaped mini whose eras carry enough lines for a shuffle to bite."""
    body = """## Title Page

FRONT MATTER

## The First Era

line alpha one
line bravo two
line charlie three
line delta four

refrain echoes here
line foxtrot six

## Second Era

second golf one
second hotel two
second india three
second juliet four
second kilo five

## Kalakaua and Liliuokalani's Genealogy

genealogy row one
genealogy row two
"""
    return _ENVELOPE_HEAD + body + _ENVELOPE_TAIL


# ── determinism ──────────────────────────────────────────────────────────────────────────


def test_same_seed_regenerates_identical_bytes():
    real = _multi_line_lili()
    a = shuffle_text(real, "kumulipo-liliuokalani.md", seed=5)
    b = shuffle_text(real, "kumulipo-liliuokalani.md", seed=5)
    assert a == b


def test_different_seed_moves_the_permutation():
    real = _multi_line_lili()
    a = shuffle_text(real, "kumulipo-liliuokalani.md", seed=5)
    b = shuffle_text(real, "kumulipo-liliuokalani.md", seed=6)
    assert a != b


# ── the transform's vows ─────────────────────────────────────────────────────────────────


def _swap_uris(text: str) -> str:
    """The namespace swap the transform applies to the envelope — the comparison ground."""
    for old, new in _URI_SWAPS:
        text = text.replace(old, new)
    return text


def test_lines_survive_verbatim_as_a_multiset():
    real = _swap_uris(_multi_line_lili())
    fake = shuffle_text(_multi_line_lili(), "kumulipo-liliuokalani.md", seed=7)
    assert sorted(real.split("\n")) == sorted(fake.split("\n"))
    assert real != fake                     # ... and the order genuinely moved


def test_markers_blanks_and_rules_hold_their_positions():
    real = _multi_line_lili()
    fake = shuffle_text(real, "kumulipo-liliuokalani.md", seed=7)
    for r_line, f_line in zip(real.split("\n"), fake.split("\n")):
        if not _movable(r_line):
            assert f_line == r_line


def test_shuffle_never_crosses_a_wa_boundary():
    real = _multi_line_lili()
    fake = shuffle_text(real, "kumulipo-liliuokalani.md", seed=7)
    r = section_corpus_file("kumulipo-liliuokalani.md", real, extract=True)[0]
    f = section_corpus_file("kumulipo-liliuokalani.md", fake, extract=True)[0]
    assert [l for l, _ in r["sections"]] == [l for l, _ in f["sections"]]
    for (label, r_body), (_, f_body) in zip(r["sections"], f["sections"]):
        assert sorted(r_body.split("\n")) == sorted(f_body.split("\n")), label


def test_sectioner_cuts_identical_labels_both_modes_on_beckwith():
    real = _mini_beckwith()
    fake = shuffle_text(real, "kumulipo-beckwith.md", seed=7)
    for extract in (False, True):
        r = section_corpus_file("kumulipo-beckwith.md", real, extract=extract)
        f = section_corpus_file("kumulipo-beckwith.md", fake, extract=extract)
        assert [[l for l, _ in s["sections"]] for s in r] == \
               [[l for l, _ in s["sections"]] for s in f]
        assert [s["source"] for s in r] == [s["source"] for s in f]


def test_envelope_survives_verbatim_modulo_namespace():
    real = _mini_liliuokalani()
    fake = shuffle_text(real, "kumulipo-liliuokalani.md", seed=7)
    # The tiny mini carries single-line sections — nothing movable pairs up — so the
    # shuffled text equals the URI-swapped real byte-for-byte.
    assert fake == _swap_uris(real)


def test_mirror_witness_fails_loud_on_an_under_destroyed_shuffle():
    # The single-line mini cannot move any section; the wrapped-mode floor trips.
    real = _mini_liliuokalani()
    fake = shuffle_text(real, "kumulipo-liliuokalani.md", seed=7)
    with pytest.raises(ValueError, match="under-destroys"):
        _verify_mirror("kumulipo-liliuokalani.md", real, fake)


def test_mirror_witness_passes_on_a_real_shuffle():
    real = _multi_line_lili()
    fake = shuffle_text(real, "kumulipo-liliuokalani.md", seed=7)
    report = _verify_mirror("kumulipo-liliuokalani.md", real, fake)
    wrapped = report["kumulipo/liliuokalani:wrapped"]
    assert wrapped["moved"] * 2 >= wrapped["sections"]
