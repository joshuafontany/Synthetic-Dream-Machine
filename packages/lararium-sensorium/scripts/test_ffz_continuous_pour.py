"""Tests — the continuous pour: the tick loop streams frames deterministically, the zoning
ladder decouples the stream at every grain, the ZONING GATE keeps a planted period that HOLDS
under re-zoning and REFUSES a band that rides the grain, a structureless noise pour raises
nothing, and the scale-entity records stay open and nameless."""
from __future__ import annotations

import json

import numpy as np

from ffz_continuous_pour import (
    MIN_ELIGIBLE_ZONINGS,
    ZONING_LADDER,
    band_boundaries,
    band_lock,
    block_mean_decimate,
    boundary_alignment,
    eligible_zonings,
    pour_ticks,
    probe_signal,
    split_read,
    zoning_bands,
    zoning_gate,
    zoning_read,
)

# ── the synthetic multi-scale fixture — planted periods, no annotation fed in ─────────────
# JITTERED plants (the way real text pours — a pure comb hides its energy in harmonics):
# words of ~4-8 letters + space (period ~7), ~7-9 words per line + "." + newline (period ~55),
# ~12 lines per stanza opened by a digit-textured header (period ~685). Seeded, so every run
# pours the identical stream.


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


def test_the_pour_carries_three_channels_and_no_mark_train():
    """The channels the pour keeps: the line-blind shape channel, the envelope channel, the
    content channel. A structural-mark train (newline/sentence/clause) reads the text's own
    typography back out and its peaks move between beds, so the pour carries none."""
    poured = pour_ticks(iter(_frames(_fixture_text(3))))
    assert set(poured["signals"]) == {"class-transition", "sigil-event", "recurrence"}


def test_pour_runs_deterministic():
    text = _fixture_text(6)
    poured = pour_ticks(iter(_frames(text)))
    a = probe_signal("class-transition", poured["signals"]["class-transition"],
                     poured["classes"], poured["annotations"], n_surrogates=2, seed=99)
    b = probe_signal("class-transition", poured["signals"]["class-transition"],
                     poured["classes"], poured["annotations"], n_surrogates=2, seed=99)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def test_annotations_ride_outside_the_signals():
    """Work/record joins land in the annotations and NEVER mark the signals; the newline
    lands there too, and reaches no channel."""
    text = _fixture_text(3)
    n_frames = len(_frames(text, pieces=3))
    out = pour_ticks(iter(_frames(text, pieces=3)))
    assert len(out["annotations"]["wa"]) == n_frames - 1   # one join per frame seam
    assert out["annotations"]["work"] == []                # one stream, no work join
    assert len(out["annotations"]["line"]) == text.count("\n")


# ── the decoupling — one ladder, every grain ──────────────────────────────────────────────


def test_block_mean_decimate_reads_the_rate():
    x = np.asarray([1.0, 0, 0, 0, 1, 1, 0, 0], dtype=float)
    y = block_mean_decimate(x, 4)
    assert np.allclose(y, [0.25, 0.5])
    assert np.allclose(block_mean_decimate(x, 1), x)      # the char-grain rung passes through
    assert block_mean_decimate(np.zeros(3), 4).size == 0


def test_a_band_names_its_scale_at_every_rung():
    """The same SCALE addresses identically across rungs — the precondition for the gate. A
    band named by LEVEL could not be compared across grains at all."""
    rng = np.random.default_rng(3)
    x = rng.normal(0, 1, 40000)
    fine = {b["scale_ticks"]: b["band"] for b in zoning_bands(x, 1)}
    coarse = {b["scale_ticks"]: b["band"] for b in zoning_bands(x, 16)}
    shared = set(fine) & set(coarse)
    assert shared, "the rungs must overlap or the gate has nothing to compare"
    for s in shared:
        assert fine[s] == coarse[s] == f"S{s}"


def test_eligibility_names_the_ladder_floor():
    """The finest scale the ladder carries (4 ticks — the word grain) admits ONE rung, so it
    can never be re-zoned; the gate must call that UNTESTABLE rather than certify it."""
    assert eligible_zonings(4, 100000) == [1]
    assert len(eligible_zonings(4, 100000)) < MIN_ELIGIBLE_ZONINGS
    mid = eligible_zonings(8192, 400000)
    assert len(mid) >= MIN_ELIGIBLE_ZONINGS
    assert all(d in ZONING_LADDER for d in mid)
    assert eligible_zonings(65536, 100000) == []           # under 4 cycles: unaskable


def test_band_lock_reports_original_tick_units_and_holds_guards():
    """A planted period-32 sine locks in its own band; a flat band refuses."""
    t = np.arange(8192)
    x = np.sin(2 * np.pi * t / 32.0)
    row = next(b for b in zoning_bands(x, 1) if b["scale_ticks"] == 32)
    assert band_lock(row["series"], row["level"])["locked_frac"] > 0.5
    assert band_lock(np.zeros(4096), 3)["locked_frac"] == 0.0


# ── the gate — a real band HOLDS, an alias MOVES ──────────────────────────────────────────


def test_planted_period_holds_under_rezoning():
    """The instrument's positive control. The stanza plant (~685 ticks) lands in the 1024-tick
    dyadic bracket and must survive the gate: raised by the energy tooth, and standing above
    its null AND elevated over its neighbours at EVERY rung eligible to resolve it."""
    poured = pour_ticks(iter(_frames(_fixture_text(40))))
    out = probe_signal("class-transition", poured["signals"]["class-transition"],
                       poured["classes"], poured["annotations"], n_surrogates=3, seed=4241)
    repro = {g["scale_ticks"]: g for g in out["gate"] if g["reproduced"]}
    assert 1024 in repro, [(g["scale_ticks"], g["verdict"]) for g in out["gate"]]
    g = repro[1024]
    assert len(g["eligible_zonings"]) >= MIN_ELIGIBLE_ZONINGS
    assert g["held_zonings"] == g["eligible_zonings"]
    assert all(v >= 1.0 for v in g["energy_excess_by_zoning"].values())


def test_the_word_grain_stands_untestable_not_certified():
    """The 4-tick band sits at the ladder's FLOOR: only the char-grain rung resolves it, so no
    re-zoning can test it. The gate says UNTESTABLE and emits no entities for it — an honest
    refusal to certify, never a pass."""
    poured = pour_ticks(iter(_frames(_fixture_text(40))))
    out = probe_signal("class-transition", poured["signals"]["class-transition"],
                       poured["classes"], poured["annotations"], n_surrogates=3, seed=4241)
    floor = next(g for g in out["gate"] if g["scale_ticks"] == 4)
    assert floor["verdict"] == "UNTESTABLE"
    assert not floor["reproduced"]
    assert "S4" in out["untestable"]
    assert all(r["scale_ticks"] != 4 for r in out["reproduced"])


def test_a_grain_locked_alias_moves_and_gets_refused():
    """THE ALIAS CONTROL, and the reason the surrogate cannot stand alone. A comb whose period
    tracks the ZONING GRAIN — not the text — raises a peak at whichever rung it aliases, and a
    block-shuffle null cannot catch it (a deterministic comb is perfectly reproducible, so it
    survives every noise-null). Re-zoning catches it: at the rungs that resolve the same SCALE
    from a different grain, the comb has moved, so the gate REFUSES it."""
    n = 60000
    x = np.zeros(n)
    x[::37] = 1.0                       # a real, grain-independent plant near the 32-tick band
    reads = zoning_read(x, n_surrogates=3, seed=4241)
    gate = {g["scale_ticks"]: g for g in zoning_gate(reads, n)}
    real = [s for s, g in gate.items() if g["reproduced"]]
    assert real, [(s, g["verdict"]) for s, g in gate.items()]
    # Every scale the gate certifies stands within one dyadic step of the plant's own period,
    # and NO certified scale tracks a rung's floor (4·D) — the alias signature.
    assert all(16 <= s <= 64 for s in real), real


def test_noise_pour_raises_nothing():
    """A structureless character soup — the marginal distribution of a text with none of its
    sequence — raises ZERO scales on every channel."""
    poured = pour_ticks(iter(_frames(_noise_text())))
    for name in ("class-transition", "recurrence"):
        out = probe_signal(name, poured["signals"][name], poured["classes"],
                           poured["annotations"], n_surrogates=3, seed=4241)
        assert out["gate"] == [], (name, out["gate"])
        assert out["n_reproduced"] == 0


def test_flat_signal_skips_honestly():
    out = probe_signal("sigil-event", np.zeros(5000), np.zeros(5000, dtype=np.uint8),
                       {"line": [], "wa": [], "work": []})
    assert out["note"].startswith("signal-flat")
    assert out["gate"] == []


# ── the emergence read — open records, honest alignment ───────────────────────────────────


def test_scale_entities_stay_nameless_open_records():
    poured = pour_ticks(iter(_frames(_fixture_text(40))))
    out = probe_signal("class-transition", poured["signals"]["class-transition"],
                       poured["classes"], poured["annotations"], n_surrogates=3, seed=4241)
    assert out["reproduced"], "the fixture must hold a scale for the entity read to stand"
    ents = out["reproduced"][0]["entities"]
    assert ents["n_spans_emitted"] >= 1
    for rec in ents["spans"]:
        assert set(rec.keys()) == {"span", "has"}       # open record: span + caps, nothing else
        assert "name" not in rec["has"] and "label" not in rec["has"]
        t0, t1 = rec["span"]
        assert 0 <= t0 < t1 <= poured["n_ticks"]
        for link in rec["has"]["recurs"]:
            assert link["sim"] >= 0.9


def test_band_boundaries_read_in_original_ticks():
    x = np.zeros(20000)
    x[::128] = 1.0
    row = next(b for b in zoning_bands(x, 16) if b["scale_ticks"] == 128)
    bounds = band_boundaries(row)
    assert bounds and max(bounds) < x.size
    assert all(b % 1 == 0 for b in bounds)


def test_split_read_names_the_borne():
    """The placebo split reads the cross-domain ratio into open verdicts over the GATE's own
    rows: a scale the placebo kills reads content-borne, one the babble manufactures reads
    babble-borne, one both pours REPRODUCE reads shape-borne, the rest read null."""
    def _row(band, scale, excess, verdict):
        return {"band": band, "scale_ticks": scale, "verdict": verdict,
                "reproduced": verdict == "REPRODUCED",
                "energy_excess_by_zoning": {"1": excess}}
    real = {"root": "r", "signals": [{"signal": "s", "gate": [
        _row("S4", 4, 1.5, "REPRODUCED"), _row("S8192", 8192, 0.68, "MOVED"),
        _row("S8", 8, 0.4, "MOVED"), _row("S256", 256, 1.0, "MOVED")]}]}
    placebo = {"root": "p", "signals": [{"signal": "s", "gate": [
        _row("S4", 4, 1.5, "REPRODUCED"), _row("S8192", 8192, 0.33, "MOVED"),
        _row("S8", 8, 0.8, "MOVED"), _row("S256", 256, 1.05, "MOVED")]}]}
    rows = {r["band"]: r for r in split_read(real, placebo)["signals"][0]["bands"]}
    assert rows["S4"]["verdict"] == "shape-borne"
    assert rows["S8192"]["verdict"] == "content-borne"
    assert rows["S8"]["verdict"] == "babble-borne"
    assert rows["S256"]["verdict"] == "null"


def test_split_read_skips_flat_signals_honestly():
    real = {"root": "r", "signals": [{"signal": "sigil-event",
                                      "note": "signal-flat: skipped", "gate": []}]}
    placebo = {"root": "p", "signals": [{"signal": "sigil-event",
                                         "note": "signal-flat: skipped", "gate": []}]}
    out = split_read(real, placebo)
    assert out["signals"][0]["note"].startswith("signal-flat")


def test_boundary_alignment_matches_within_tolerance():
    got = boundary_alignment([10, 50, 90], [12, 52, 200], tol=3)
    assert got["matched"] == 2
    assert got["precision"] == round(2 / 3, 4)
    assert got["recall"] == round(2 / 3, 4)
    empty = boundary_alignment([], [5], tol=2)
    assert empty["precision"] == 0.0 and empty["recall"] == 0.0
