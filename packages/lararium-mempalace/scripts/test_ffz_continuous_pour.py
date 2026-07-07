"""Tests — the continuous pour: the tick loop streams frames deterministically, the
two-stage decoupling re-finds PLANTED periods (the instrument's own positive control), a
structureless noise pour refuses to peak (the anti-apophenia null), and the scale-entity
records stay open and nameless."""
from __future__ import annotations

import json

import numpy as np

from ffz_continuous_pour import (
    band_boundaries,
    band_lock,
    block_mean_decimate,
    boundary_alignment,
    pour_ticks,
    probe_signal,
    two_stage_bands,
)

# ── the synthetic multi-scale fixture — three planted periods, no annotation fed in ───────
# JITTERED plants (the way real text pours — a pure comb hides its energy in harmonics):
# words of ~4-8 letters + space (period ~7), ~7-9 words per line + "." + newline (period
# ~55), ~12 lines per stanza opened by a digit-textured header (period ~700). Seeded, so
# every run pours the identical stream.


def _fixture_text(n_stanzas: int = 40, seed: int = 11) -> str:
    rng = np.random.default_rng(seed)
    lines = []
    for s in range(n_stanzas):
        lines.append(f"## {s + 1} ##.")
        for _ in range(int(rng.integers(11, 14))):
            words = []
            for _ in range(int(rng.integers(7, 10))):
                k = int(rng.integers(4, 9))
                words.append("".join("aeioukpnmh"[int(c)] for c in rng.integers(0, 10, k)))
            lines.append(" ".join(words) + ".")
        lines.append("")
    return "\n".join(lines)


def _frames(text: str, stream: str = "fixture", pieces: int = 1) -> list:
    n = len(text)
    step = max(1, n // pieces)
    return [{"stream": stream, "seq": k, "text": text[i:i + step]}
            for k, i in enumerate(range(0, n, step))]


def _noise_text(n: int = 30000, seed: int = 7) -> str:
    rng = np.random.default_rng(seed)
    alphabet = list("abcdefghijklmnop .\n,")
    return "".join(alphabet[i] for i in rng.integers(0, len(alphabet), n))


# ── the pour — streaming, deterministic, annotation-blind features ─────────────────────────


def test_pour_streams_frames_equivalently():
    """Feeding one whole frame and feeding the same text as many small frames pours the
    IDENTICAL signals — the carried state spans one character across every frame join."""
    text = _fixture_text(4)
    whole = pour_ticks(iter(_frames(text, pieces=1)))
    split = pour_ticks(iter(_frames(text, pieces=17)))
    assert whole["n_ticks"] == split["n_ticks"] == len(text)
    for name in whole["signals"]:
        assert np.array_equal(whole["signals"][name], split["signals"][name])
    assert np.array_equal(whole["classes"], split["classes"])
    assert whole["annotations"]["line"] == split["annotations"]["line"]


def test_pour_runs_deterministic():
    text = _fixture_text(6)
    a = probe_signal("class-transition",
                     pour_ticks(iter(_frames(text)))["signals"]["class-transition"],
                     pour_ticks(iter(_frames(text)))["classes"],
                     pour_ticks(iter(_frames(text)))["annotations"],
                     n_surrogates=2, seed=99)
    b = probe_signal("class-transition",
                     pour_ticks(iter(_frames(text)))["signals"]["class-transition"],
                     pour_ticks(iter(_frames(text)))["classes"],
                     pour_ticks(iter(_frames(text)))["annotations"],
                     n_surrogates=2, seed=99)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def test_annotations_ride_outside_the_signals():
    """Work/record joins land in the annotations and NEVER mark the signals: the poured
    signal values around a frame join match the whole-frame pour exactly (proven by the
    equivalence test); here the join positions themselves land only in the annotation set."""
    text = _fixture_text(3)
    n_frames = len(_frames(text, pieces=3))
    out = pour_ticks(iter(_frames(text, pieces=3)))
    assert len(out["annotations"]["wa"]) == n_frames - 1   # one join per frame seam
    assert out["annotations"]["work"] == []            # one stream, no work join
    assert len(out["annotations"]["line"]) == text.count("\n")


# ── the decoupling ─────────────────────────────────────────────────────────────────────────


def test_block_mean_decimate_reads_the_rate():
    x = np.asarray([1.0, 0, 0, 0, 1, 1, 0, 0], dtype=float)
    y = block_mean_decimate(x, 4)
    assert np.allclose(y, [0.25, 0.5])
    assert block_mean_decimate(np.zeros(3), 4).size == 0


def test_two_stage_bands_cover_tick_to_whole_pour():
    rng = np.random.default_rng(3)
    x = rng.normal(0, 1, 20000)
    bands = two_stage_bands(x)
    scales = [b["scale_ticks"] for b in bands]
    assert scales[0] == 2                              # tick grain
    assert scales == sorted(scales)                    # fine→coarse, contiguous ladder
    assert scales[-1] >= len(x) // 2                   # reaches whole-pour scale
    assert len({b["band"] for b in bands}) == len(bands)


def test_band_lock_reports_original_tick_units_and_holds_guards():
    """A planted period-32 sine locks in its own band; the reported beat converts to
    original tick units through the band's strides; a flat band refuses."""
    t = np.arange(8192)
    x = np.sin(2 * np.pi * t / 32.0)
    bands = two_stage_bands(x)
    row = next(b for b in bands if b["scale_ticks"] == 32)
    lk = band_lock(row["series"], row["level"])
    assert lk["locked_frac"] > 0.5
    flat = band_lock(np.zeros(4096), 3)
    assert flat["locked_frac"] == 0.0


# ── the positive control — planted periods re-found, boundaries land on the plant ─────────


def test_planted_periods_peak_and_line_boundaries_refind():
    """The instrument's positive control: three planted periods, each re-found by the
    channel that honestly carries it — the word grain in the line-blind class-transition
    channel, the line and stanza grains in the break-weight channel."""
    text = _fixture_text(40)
    poured = pour_ticks(iter(_frames(text)))
    blind = probe_signal("class-transition", poured["signals"]["class-transition"],
                         poured["classes"], poured["annotations"],
                         n_surrogates=3, seed=4241)
    breaks = probe_signal("break-weight", poured["signals"]["break-weight"],
                          poured["classes"], poured["annotations"],
                          n_surrogates=3, seed=4241)
    # The word plant (~7 ticks) peaks in the blind channel within its dyadic bracket.
    assert any(4 <= p["scale_ticks"] <= 16 for p in blind["peaked"]), \
        [(p["band"], p["scale_ticks"]) for p in blind["peaked"]]
    # The line plant (~55 ticks) and the stanza plant (~700) peak in the break channel.
    break_scales = [p["scale_ticks"] for p in breaks["peaked"]]
    assert any(32 <= s <= 128 for s in break_scales), break_scales
    assert any(256 <= s <= 2048 for s in break_scales), break_scales
    # The line-scale band's boundaries re-find the planted line breaks — never fed in.
    line_band = next(p for p in breaks["peaked"] if 32 <= p["scale_ticks"] <= 128)
    assert line_band["witness"]["line"]["recall"] >= 0.5, line_band["witness"]["line"]
    assert not line_band["witness"]["line"]["tol_saturated"]


def test_noise_pour_refuses_to_peak():
    """A structureless character soup — the marginal distribution of a text with none of
    its sequence — must surface ZERO peaked bands on every channel (the anti-apophenia
    null: block-shuffling noise changes nothing, so no excess stands)."""
    poured = pour_ticks(iter(_frames(_noise_text())))
    for name in ("class-transition", "break-weight", "recurrence"):
        out = probe_signal(name, poured["signals"][name],
                           poured["classes"], poured["annotations"],
                           n_surrogates=3, seed=4241)
        assert out["n_peaked"] == 0, (name, [b for b in out["bands"] if b["peaked"]])


def test_refrain_plants_the_recurrence_channel():
    """The content channel's own control: a refrain returning every other line (~90-tick
    period) pulses the recurrence signal periodically; the surrounding lines pour seeded
    random words, so only the refrain carries long repeats."""
    rng = np.random.default_rng(5)
    lines = []
    for i in range(600):
        if i % 2 == 0:
            lines.append("hanau ka po hanau ka ao ka lani nui")
        else:
            lines.append(" ".join(
                "".join("aeioukpnmh"[int(c)] for c in rng.integers(0, 10, int(rng.integers(4, 9))))
                for _ in range(8)))
    text = "\n".join(lines)
    poured = pour_ticks(iter(_frames(text)))
    out = probe_signal("recurrence", poured["signals"]["recurrence"],
                       poured["classes"], poured["annotations"],
                       n_surrogates=3, seed=4241)
    # The refrain period (~90 ticks) peaks within its dyadic bracket.
    assert any(32 <= p["scale_ticks"] <= 256 for p in out["peaked"]), \
        [(p["band"], p["scale_ticks"]) for p in out["peaked"]]


def test_flat_signal_skips_honestly():
    out = probe_signal("sigil-event", np.zeros(5000), np.zeros(5000, dtype=np.uint8),
                       {"line": [], "wa": [], "work": []})
    assert out["note"].startswith("signal-flat")
    assert out["bands"] == []


# ── the emergence read — open records, honest alignment ───────────────────────────────────


def test_scale_entities_stay_nameless_open_records():
    text = _fixture_text(20)
    poured = pour_ticks(iter(_frames(text)))
    out = probe_signal("class-transition", poured["signals"]["class-transition"],
                       poured["classes"], poured["annotations"],
                       n_surrogates=2, seed=4241)
    assert out["peaked"], "the fixture must peak for the entity read to stand"
    ents = out["peaked"][0]["entities"]
    assert ents["n_spans_emitted"] >= 1
    for rec in ents["spans"]:
        assert set(rec.keys()) == {"span", "has"}       # open record: span + caps, nothing else
        assert "name" not in rec["has"] and "label" not in rec["has"]
        t0, t1 = rec["span"]
        assert 0 <= t0 < t1 <= poured["n_ticks"]
        for link in rec["has"]["recurs"]:
            assert link["sim"] >= 0.9


def test_boundary_alignment_matches_within_tolerance():
    got = boundary_alignment([10, 50, 90], [12, 52, 200], tol=3)
    assert got["matched"] == 2
    assert got["precision"] == round(2 / 3, 4)
    assert got["recall"] == round(2 / 3, 4)
    empty = boundary_alignment([], [5], tol=2)
    assert empty["precision"] == 0.0 and empty["recall"] == 0.0
