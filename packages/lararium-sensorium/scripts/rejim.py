#!/usr/bin/env python3
"""rejim — DETECT the nameless regimes in a stream, BEFORE naming them.

A `rejim` (Indonesian/Malay: regime — the sciences' term for a characteristic dynamical pattern a stream
holds; "flow" served as the guiding metaphor) is a nameless entity the continuous pour DISCOVERS: a real
characteristic scale/rhythm the stream's own structure holds, distinguishable from noise and from an alias
of the reading grain. Detection stands on the CONTENT channel alone (no memetic-wikitext sigils), so the
capability travels from the sigil-bearing test beds (chat · pidgin · liturgical — one grammar-family) to
sigil-less target corpuses. Naming rides LATER (naming-by-condensation); a rejim stays nameless until then,
carrying only its capability record — the same way a content block is a nameless cid-keyed entity until a
Voice reads it.

THE CROSS-SCALE COUPLING (the two-witness realness test, after cyclostratigraphy's TimeOpt): a real regime
shows a `rejim cepat` (a fast regime) whose amplitude envelope is MODULATED BY a `rejim lambat` (a slow
regime it nests in) — a nesting noise cannot counterfeit. On the sigil-bearing beds the lambat may ride the
sigil-frame cadence (red steers black); on a sigil-less corpus it is a content-internal slow regime. v0
reads the STRUCTURAL nesting; the amplitude-modulation witness rides v1.

Meme: lar:///ha.ka.ba/lararium/sensorium/rejim
"""
from __future__ import annotations

import numpy as np

from ffz_continuous_pour import pour_ticks, reference_row, zoning_gate, zoning_read

# The channels a stream carries, each a distinct bearer of rhythm. Detection reads CONTENT by default —
# the only channel a sigil-less corpus carries — so the capability generalizes off the framed test beds.
CONTENT = "recurrence"       # the content-borne geology (black channel): refrains, genealogy, frozen pulse
SHAPE = "class-transition"   # the word/clause texture (line-blind)
FRAME = "sigil-event"        # the memetic-wikitext exchange-frame cadence (red channel; framed beds only)

#: Surrogate draws for the anti-fabrication null — a MINIMAL gate (a regime must clear its own block-shuffle
#: surrogates). Deliberately low for the live cadence; the sharpened gate (red-noise/IAAFT null + FDR, the
#: swarm's convergence) raises this when it lands. Named here so every caller shares the one value.
DEFAULT_N_SURROGATES = 3


def detect_rejim(text: str, *, channel: str = CONTENT, n_surrogates: int = DEFAULT_N_SURROGATES,
                 seed: int = 4241) -> dict:
    """Pour a stream and DETECT its nameless rejim on one channel — the real characteristic scales the
    stream's own structure holds (the gate's REPRODUCED scales), each emitted as a nameless capability
    record, ordered cepat→lambat (fast→slow). Content-only by default, so the SAME detector runs on a
    sigil-less target as on a framed test bed — the sigils never enter detection, only its validation.

    Each rejim retains its reference band series (`_series`/`_stride`, private, in-memory only) so the
    cross-scale coupling can read the flow's amplitude envelope — dropped before the record persists."""
    poured = pour_ticks([{"stream": "rejim", "text": text}])
    n = poured["n_ticks"]
    signals = poured["signals"]
    if channel not in signals:
        raise ValueError(f"rejim: channel {channel!r} unknown — one of {sorted(signals)}")
    reads = zoning_read(signals[channel], n_surrogates=n_surrogates, seed=seed)
    gate = zoning_gate(reads, n)
    rejim = []
    for g in gate:
        if not g["reproduced"]:
            continue
        ref = reference_row(reads, g["scale_ticks"], g["eligible_zonings"])
        if ref is None:
            continue
        row, lk, _v = ref
        rejim.append({
            "scale": g["scale_ticks"],
            "channel": channel,
            "lock": {k: lk[k] for k in ("locked_frac", "beat", "beat_ticks", "lock_quality") if k in lk},
            "reference_zoning": row["zoning"],
            "name": None,                            # NAMELESS — awaiting naming-by-condensation
            "_series": np.asarray(row["series"], dtype=float),   # retained for the coupling; not persisted
            "_stride": int(row["sample_stride"]),
        })
    rejim.sort(key=lambda a: a["scale"])
    return {"n_ticks": n, "channel": channel, "rejim": rejim,
            "refused": [g["band"] for g in gate if g["verdict"] == "MOVED"],
            "untestable": [g["band"] for g in gate if g["verdict"] == "UNTESTABLE"]}


def _envelope(series: np.ndarray, win: int) -> np.ndarray:
    """The amplitude ENVELOPE of a bandpassed flow — rectify its oscillation (|·|) and smooth over ~one
    of its own periods, leaving how STRONG the flow runs from place to place. numpy-only (no scipy)."""
    a = np.abs(np.asarray(series, dtype=float))
    if win < 2:
        return a
    kernel = np.ones(win) / win
    return np.convolve(a, kernel, mode="same")


def _amplitude_modulation(cepat: dict, lambat: dict) -> "float | None":
    """The TWO-WITNESS realness test (after cyclostratigraphy's TimeOpt): does the fast regime's amplitude
    ENVELOPE oscillate at the SLOW regime's period? A real nesting — the rejim cepat riding on the rejim
    lambat — leaves the fast band strong where the slow flow crests and weak in its troughs, so the fast
    envelope carries the slow period; independent flows leave the envelope flat there. Returns the
    normalized envelope-autocorrelation at the lambat lag (0..1); a coupling noise cannot counterfeit.
    None when the band series is unavailable."""
    s = cepat.get("_series")
    stride = cepat.get("_stride")
    if s is None or stride is None or len(s) < 8:
        return None
    period = max(2, cepat["scale"] // max(stride, 1))          # the cepat's own period in band samples
    env = _envelope(s, period)
    env = env - env.mean()
    lag = int(round(lambat["scale"] / max(stride, 1)))         # the lambat period in the cepat's sample grid
    if lag < 1 or lag >= len(env):
        return None
    denom = float(np.dot(env, env))
    if denom < 1e-12:
        return None
    ac = float(np.dot(env[:-lag], env[lag:]) / denom)          # envelope autocorr at the slow period
    return max(0.0, ac)


def couple_rejim(reading: dict) -> "list[dict]":
    """The cepat⊥lambat coupling — pair a FAST regime (rejim cepat) with a SLOWER regime (rejim lambat) it
    nests in, and witness the nesting. `ratio` reads the structural nesting (fast periods per slow);
    `modulation` reads the two-witness realness (the cepat's amplitude envelope oscillating at the lambat
    period — the noise-proof coupling). A high modulation says the fast regime genuinely RIDES the slow one,
    not that two independent flows happen to share a stream. Cepat-first."""
    al = reading.get("rejim", [])
    couples = []
    for i, cepat in enumerate(al):
        for lambat in al[i + 1:]:
            if lambat["scale"] > cepat["scale"]:
                couples.append({
                    "cepat": cepat["scale"], "lambat": lambat["scale"],
                    "ratio": lambat["scale"] / cepat["scale"],   # fast periods nested in one slow
                    "channel": cepat["channel"],
                    "modulation": _amplitude_modulation(cepat, lambat),
                })
    return couples


def dfa_alpha(x: np.ndarray, *, n_min: int = 16, n_max: "int | None" = None, n_scales: int = 14) -> "float | None":
    """Detrended Fluctuation Analysis exponent α — the long-memory meter (Peng; Pulse-Seeker's import).
    Integrate the series to a walk, fit local linear trends in windows of size n, measure the residual
    fluctuation F(n) ∝ n^α. α≈0.5 = white / STRUCTURELESS; α>0.5 = persistent long-range structure; a
    real geology stream sits α≈0.6–0.9. Gauges STRUCTURE vs NOISE — NOT real vs a structured placebo: a
    Markov babble that preserves shape/line/lexicon still reads α>0.5 (the shape component survives — the
    kumulipo smoke-test measured real 0.913 AND its placebo 0.826). numpy-only. None when too short."""
    x = np.asarray(x, dtype=float).ravel()
    N = x.size
    if N < 4 * n_min:
        return None
    y = np.cumsum(x - x.mean())
    hi = n_max or N // 4
    ns = np.unique(np.logspace(np.log10(n_min), np.log10(max(hi, n_min + 1)), n_scales).astype(int))
    pts = []
    for n in ns:
        if n < 4 or N // n < 1:
            continue
        t = np.arange(n)
        rms = []
        for w in range(N // n):
            seg = y[w * n:(w + 1) * n]
            resid = seg - np.polyval(np.polyfit(t, seg, 1), t)
            rms.append(float(np.sqrt(np.mean(resid ** 2))))
        if rms:
            pts.append((n, float(np.mean(rms))))
    if len(pts) < 3:
        return None
    logn = np.log(np.array([p[0] for p in pts], dtype=float))
    logf = np.log(np.array([p[1] for p in pts], dtype=float) + 1e-12)
    return float(np.polyfit(logn, logf, 1)[0])


def stream_realness(text: str, *, channel: str = CONTENT) -> dict:
    """Does the stream carry long-range STRUCTURE, or is it STRUCTURELESS noise? Pour the channel and read
    its DFA α. Returns {alpha, verdict}: 'long-range' (α>0.55) · 'noise' (α≈0.5 — no long-range structure;
    a rejim detected here would read noise) · 'too-short'. A cheap FIRST-LINE gate: it rejects structureless
    noise, but it is NOT a placebo gate — a structured Markov babble that preserves shape/line/lexicon still
    reads 'long-range' (the shape component survives babble; the kumulipo smoke-test read real 0.913 AND its
    placebo 0.826). Separating real from a STRUCTURED placebo lives in the content-plane meaning-recurrence
    (graded ρ≈0.6, expensive — the full detect_rejim gate), never this cheap α."""
    poured = pour_ticks([{"stream": "rejim", "text": text}])
    a = dfa_alpha(poured["signals"][channel])
    if a is None:
        return {"alpha": None, "verdict": "too-short"}
    return {"alpha": a, "verdict": "long-range" if a > 0.55 else "noise"}


def strip_private(reading: dict) -> dict:
    """Drop the retained band series (`_series`/`_stride`) from every rejim — the persistable record.
    The band arrays serve only the in-memory coupling; a landed rejim resolves back to the stream by
    its scale + span, never by a stored series (the derived-view discipline: hold no verbatim)."""
    return {**reading, "rejim": [{k: v for k, v in a.items() if not k.startswith("_")}
                                  for a in reading.get("rejim", [])]}
