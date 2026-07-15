#!/usr/bin/env python3
"""ffz_continuous_pour — the continuous pour: true-stream FFZ wave decoupling over a corpus.

THE QUESTION. Every imposed segmentation (the line, the record, the chunk) manufactures the
finding it then reports (MAUP). This probe drops all of them: it pours the corpus end-to-end
as ONE continuous character stream, decouples the stream into dyadic detail bands (MODWT),
reads the FFZ lock PER BAND, and asks the data where its own scales live. Known grains (line
breaks, wā/record joins, work joins) ride ONLY as held-out annotations for the witness read —
they never enter the signal loop.

THE TICK: the CHARACTER TRANSITION. The finest honest grain the text carries — a word tick
presupposes a tokenizer (an imposed segmentation), while a character arrives the way a
real-time media sample arrives: one frame after another, no lookbehind past the previous
frame's tail. Each tick t reads only (char[t-1], char[t]).

THE SIGNALS (three; each names a distinct bearer of rhythm):
  · class-transition — 1.0 where the character CLASS changes (letter | digit | whitespace |
    punct | other; the apostrophe/okina folds into letter, the newline folds into WHITESPACE,
    so this channel stays LINE-BLIND). Word texture, clause texture, and — if line lengths
    carry a real rhythm — line texture must EMERGE here, never get marked.
  · sigil-event — 1.0 at each memetic-wikitext envelope mark (a `<<~` open or `>>` close).
    The ENVELOPE channel: it fires on a wrapped bed and lies flat on an extracted one, so the
    controls quarantine it by construction.
  · recurrence — the CONTENT channel: 1.0 where the 12-gram ending at t has already poured
    within the last 65536 ticks (a bounded recency memory — streaming-honest). Refrains and
    genealogy list-frames pulse it; a Markov-babble placebo destroys long repeats, so a scale
    alive here and dead in the placebo reads CONTENT-BORNE. The shape channel alone cannot
    split shape from meaning.

WHY NO STRUCTURAL-MARK CHANNEL. A channel that pours the text's own punctuation and newlines
(one unit-height train per mark class) reads its OWN typography back out. Measured: the mark
channels' peaks MOVE between beds of the same chant — on the Hawaiian (63k ticks) the newline
train peaked at scale 4 and the sentence train at scale 32, while the clause train peaked
nowhere; on the Beckwith English (396k ticks) the newline and sentence trains peaked nowhere
and the clause train peaked at scale 65536. A real band HOLDS under a change of grain; an
ALIAS MOVES. All of them moved, so the pour carries none of them. The wā beat reached us
through the RECURRENCE channel, never through a mark train.

THE ZONING LADDER (the decoupling, and the gate, in ONE operation). A pour at ONE grain cannot
tell a band from an alias of its own grain. So the pour runs the SAME stream at a ladder of
block-mean decimations D ∈ ZONING_LADDER (D = 1 pours at char grain; D > 1 pours the local
event RATE over a length-D block, the natural coarse observable for an event train). Each
zoning emits dyadic detail bands at scale_ticks = D·2^j. A band NAMES ITS SCALE, never its
level, so the same scale is addressable across every zoning that can resolve it:

    THE GATE — a scale earns REPRODUCED only by peaking under EVERY zoning eligible to
    resolve it. A scale that peaks under some zonings and not others MOVED with the grain: it
    reads as an artifact of the zoning, and the pour REFUSES it — no boundaries, no spans, no
    entities. The refusal is the finding.

One operation, three defences: the anti-alias check, the MAUP sensitivity analysis, and the
well-formedness check.

ELIGIBILITY (an admissibility window, never a detection threshold — it decides what a band may
be ASKED, never what the answer is): a zoning D resolves scale S only with ≥ SAMPLES_PER_CYCLE
stage samples inside one cycle (S/D ≥ 4) and ≥ CYCLES_PER_POUR cycles inside the pour
(n/S ≥ 4). A scale with fewer than MIN_ELIGIBLE_ZONINGS eligible rungs stands UNTESTABLE: the
ladder's own floor sits at scale 4 (only D = 1 resolves it), so the finest bands cannot be
re-zoned at all, and the gate says so instead of certifying them.

THE SURROGATE'S LIMIT, SAID PLAINLY. The per-band block-shuffle null answers exactly one
question — does this band hold more energy than a stream with its arrangement destroyed? It
CANNOT catch a deterministic alias: an alias is perfectly reproducible, so it survives every
noise-null, and it survives the surrogate BY CONSTRUCTION (the surrogate re-pours through the
same filters at the same grain, so the grain's own artifact rides both the observation and the
null). The surrogate therefore certifies ENERGY-ABOVE-NULL and nothing else. Alias duty sits
with the zoning gate, which changes the grain the surrogate holds fixed.

THE PER-BAND LOCK. Any bandpass detail RINGS at its own scale — even white noise autocorrelates
inside a band — and the surrogate's band rings and locks too, saturating both readings in the
fine bands. So the lock reads as a REPORTED rhythm gauge (each band's beat + locked-fraction
beside its surrogate's), never a peak tooth. recover_clock and SchmittLock run UNMODIFIED at
shipped thresholds; each band stride-decimates to its own scale first (the band's passband sits
below the decimated Nyquist, so no aliasing) — an adaptation at the signal, never at the guards.

THE EMERGENCE READ: for each REPRODUCED scale, boundaries = the crest events of its reference
band (local maxima above the band RMS, read at the finest eligible zoning), and the spans
between consecutive boundaries land as candidate SCALE-ENTITIES — nameless open records
({"span", "has": {…caps…}}), each with its scale, extent, energy, and recurrence links (cosine
over raw char-class histograms). No record carries a pre-label.

CLOCK PURITY + STREAMING: the tick ordinal indexes everything; no wall-clock touches any path;
every random draw seeds explicitly. The tick loop consumes FRAMES in sequence (an iterator with
per-stream seq — the StreamAdapter shape real-time media will speak); the carried state spans
one character, a 12-char gram tail, and the recurrence channel's bounded recency table. THE
BATCH SEAM, surfaced honestly: MODWT-MRA here runs as a batch over the collected signal. An
à-trous MODWT admits a causal streaming form with a per-level lag of (filter_len − 1)·2^(j−1)
ticks; the media era needs that port — named here, not built.

Usage (the mempalace venv, from this directory):
  ~/.venv/bin/python3 ffz_continuous_pour.py pour --sensorium <place> [--sensorium <place> ...]
      [--seed 4241] [--surrogates 3]

Meme: lar:///ha.ka.ba/lararium/sensorium/ffz-continuous-pour
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

import numpy as np

from ffz_clock import recover_clock
from nalu_gate import SchmittLock

# ── the tick grammar ───────────────────────────────────────────────────────────────────────

#: Character classes, coded small for the poured class array (uint8 per tick).
_CLASSES = ("letter", "digit", "ws", "punct", "other")
_N_CLASSES = len(_CLASSES)
_C_LETTER, _C_DIGIT, _C_WS, _C_PUNCT, _C_OTHER = range(_N_CLASSES)

_SIGIL_RE = re.compile(r"<<~|>>")

#: The recurrence channel's grammar: a repeat fires when the K_GRAM-char tail ending at t
#: last poured within RECUR_WINDOW ticks — a bounded memory horizon, streaming-honest.
K_GRAM = 12
RECUR_WINDOW = 65536

#: THE ZONING LADDER — the block-mean decimations the same stream pours through. D = 1 reads
#: at char grain; D > 1 reads the event RATE over a length-D block. The rungs run dyadic so a
#: scale addresses identically at every rung (D·2^j lands on one grid), which lets the gate
#: compare a SCALE across grains without a matching tolerance to hand-set.
ZONING_LADDER = (1, 2, 4, 8, 16, 32, 64, 128, 256)

#: Bands per zoning: levels j = 2..LEVELS_PER_ZONING, i.e. scales D·4 .. D·2^L. The span sets
#: the ladder's OVERLAP — every scale from 16 upward lands inside ≥ 3 rungs' reach, which is
#: what makes the gate testable rather than vacuous.
LEVELS_PER_ZONING = 10

#: The admissibility window (what a band may be ASKED, never what the answer reads): a cycle
#: needs ≥ 4 stage samples to exist at all, and the pour needs ≥ 4 cycles for a rhythm claim
#: to mean anything. Both ends of the same sufficiency argument, one constant each.
SAMPLES_PER_CYCLE = 4
CYCLES_PER_POUR = 4

#: A scale with fewer eligible rungs than this cannot be re-zoned, so the gate REFUSES to
#: certify it and says UNTESTABLE. Three rungs = the minimum that can distinguish "holds"
#: from "moves" (two rungs would let a single coincidence certify).
MIN_ELIGIBLE_ZONINGS = 3

_WAVELET = "db4"

#: The peak tooth — an INHERITED constant, calibrated on the synthetic planted-period fixture
#: (the instrument's own positive control), never on a corpus: a band peaks when its variance
#: stands at a LOCAL MAX of the excess ladder AND clears this ratio over the surrogate-mean
#: variance. It gates ENERGY only; the zoning gate above it gates REALITY.
PEAK_ENERGY_EXCESS = 1.25

#: Output caps — the JSON stays bounded; totals report beside the capped lists.
MAX_SPANS_EMITTED = 128
LINK_SIM_FLOOR = 0.90

_EPS = 1e-12


def char_class(ch: str) -> int:
    """Classify one character. The apostrophe and the okina fold into LETTER (a Hawaiian
    word carries them inside), and the newline folds into WHITESPACE — the class channel
    stays line-blind by construction."""
    if ch.isalpha() or ch in "'ʻ‘’":
        return _C_LETTER
    if ch.isdigit():
        return _C_DIGIT
    if ch.isspace():
        return _C_WS
    if ch in ".,;:!?\"()[]{}<>~/-_*#=&|`\\@%+^$":
        return _C_PUNCT
    return _C_OTHER


# ── the frames — per-stream seq, chant order, no global clock ──────────────────────────────


def frames_from_bed(root: str):
    """Yield the bed's records as FRAMES in chant order — {"stream": <logical source>,
    "seq": <per-stream ordinal>, "text": <chunk>} — logical sources sorted (work by work),
    the sectioner's chunk ordinals within each. Reads the durable content store only; the
    seq rides per stream (StreamAdapter shape), never a global counter."""
    import content_io as cio

    store = cio.ContentStore(os.path.join(root, "content"))
    records = []
    offset = 0
    while True:
        page = store.scan(offset, 256)
        records.extend(page.get("records") or [])
        if page.get("next") is None:
            break
        offset = page["next"]
    records.sort(key=lambda r: ((r.get("metadata") or {}).get("source_file", ""),
                                int((r.get("metadata") or {}).get("chunk_index", 0))))
    seq_of: dict = {}
    for r in records:
        src = (r.get("metadata") or {}).get("source_file", "")
        seq_of[src] = seq_of.get(src, -1) + 1
        yield {"stream": src, "seq": seq_of[src], "text": r.get("document") or ""}


def pour_ticks(frames) -> dict:
    """THE POUR — the single streaming pass. Consumes frames in sequence; the carried state
    spans the previous character, a K_GRAM-char tail, and the recurrence channel's bounded
    recency table — all crossing frame joins, so the stream runs truly continuous. Returns the
    per-tick signals + the poured class codes + the HELD-OUT annotations (newline ticks ·
    record joins · work joins), which the walker collects OUTSIDE the feature functions — no
    segmentation enters the signal loop, and the newline reaches no channel."""
    cls_codes: list = []
    class_transition: list = []
    sigil_event: list = []
    recurrence: list = []
    line_breaks: list = []
    record_joins: list = []
    work_joins: list = []
    prev_cls: "int | None" = None
    prev_stream: "str | None" = None
    tail = ""                    # the last K_GRAM chars, carried across frame joins
    last_seen: dict = {}         # gram → the tick it last poured (the recency table)
    t = 0
    for frame in frames:
        text = frame["text"]
        if t > 0:
            # The annotation harvest rides the walker, never the features.
            if frame["stream"] != prev_stream:
                work_joins.append(t)
            record_joins.append(t)
        prev_stream = frame["stream"]
        # Sigil marks scan per frame (a sigil never spans a record boundary — the
        # sectioner cuts at wā markers, outside any envelope mark).
        sigil_at = set()
        for m in _SIGIL_RE.finditer(text):
            sigil_at.add(m.start())
        for i, ch in enumerate(text):
            c = char_class(ch)
            cls_codes.append(c)
            if prev_cls is None:
                class_transition.append(0.0)
            else:
                class_transition.append(1.0 if c != prev_cls else 0.0)
            if ch == "\n":
                line_breaks.append(t)      # a held-out annotation, never a channel
            sigil_event.append(1.0 if i in sigil_at else 0.0)
            tail = (tail + ch)[-K_GRAM:]
            if len(tail) == K_GRAM:
                seen = last_seen.get(tail)
                recurrence.append(1.0 if seen is not None and t - seen <= RECUR_WINDOW
                                  else 0.0)
                last_seen[tail] = t
            else:
                recurrence.append(0.0)
            prev_cls = c
            t += 1
    return {
        "n_ticks": t,
        "classes": np.asarray(cls_codes, dtype=np.uint8),
        "signals": {
            "class-transition": np.asarray(class_transition, dtype=float),
            "sigil-event": np.asarray(sigil_event, dtype=float),
            "recurrence": np.asarray(recurrence, dtype=float),
        },
        "annotations": {
            "line": line_breaks,
            "wa": record_joins,
            "work": work_joins,
        },
    }


# ── the decoupling — one zoning, one dyadic band ladder ───────────────────────────────────


def block_mean_decimate(x: np.ndarray, factor: int) -> np.ndarray:
    """Anti-aliased decimation: the mean over each length-`factor` block (the local event
    RATE — the natural coarse observable for an event-train signal). Factor 1 passes the
    stream through untouched. The tail remainder (< one block) drops; the loss stays under one
    coarse sample."""
    x = np.asarray(x, dtype=float).ravel()
    factor = max(1, int(factor))
    if factor == 1:
        return x.copy()
    n = (x.size // factor) * factor
    if n == 0:
        return np.zeros(0, dtype=float)
    return x[:n].reshape(-1, factor).mean(axis=1)


def _mra_details(x: np.ndarray, levels: int) -> list:
    """MODWT-MRA detail bands D1..Dk (fine→coarse) over a 1-D signal, symmetric-padded to a
    dyadic-aligned length then cropped back. A short signal reduces the level count; a
    degenerate one returns []."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if n < 8:
        return []
    import pywt

    lvl = max(1, min(levels, int(np.floor(np.log2(n)))))
    q = 1 << lvl
    padlen = ((n + q - 1) // q) * q
    xp = np.pad(x, (0, padlen - n), mode="symmetric") if padlen > n else x
    try:
        mra = pywt.mra(xp, _WAVELET, level=lvl, transform="swt")
    except Exception:  # noqa: BLE001 — a wavelet/length edge falls to haar, then to nothing
        try:
            mra = pywt.mra(xp, "haar", level=lvl, transform="swt")
        except Exception:  # noqa: BLE001
            return []
    # pywt.mra returns [cAn, D_n(coarse), …, D_1(fine)]; the ladder here runs fine→coarse.
    return [np.asarray(d, dtype=float)[:n] for d in reversed(mra[1:])]


def band_name(scale_ticks: int) -> str:
    """A band NAMES ITS SCALE. The level is a property of the zoning that read it, so a band
    named by level cannot be compared across grains — and a band that cannot be compared
    across grains cannot be gated for alias."""
    return f"S{int(scale_ticks)}"


def eligible_zonings(scale_ticks: int, n_ticks: int,
                     ladder: "tuple[int, ...]" = ZONING_LADDER) -> "list[int]":
    """The rungs that may be ASKED about this scale: enough stage samples inside one cycle,
    enough cycles inside the pour, and a level the ladder actually emits."""
    out = []
    if n_ticks // max(scale_ticks, 1) < CYCLES_PER_POUR:
        return out
    for d in ladder:
        if scale_ticks % d:
            continue
        ratio = scale_ticks // d
        if ratio < SAMPLES_PER_CYCLE or ratio > (1 << LEVELS_PER_ZONING):
            continue
        if ratio & (ratio - 1):
            continue                              # off the dyadic grid this rung emits
        if (n_ticks // d) < 8:
            continue                              # the stage carries no transform
        out.append(d)
    return out


def zoning_bands(x: np.ndarray, decim: int, *, levels: int = LEVELS_PER_ZONING) -> list:
    """Decouple the stream at ONE zoning: block-mean to the rung's grain, then dyadic detail
    bands at scales decim·2^j for j = 2..levels (j < 2 would hold < SAMPLES_PER_CYCLE samples
    per cycle — a band aliasing its own stage grain). Rows fine→coarse:
    {"band", "zoning", "level", "scale_ticks", "sample_stride", "series", "variance"}."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    y = block_mean_decimate(x, decim)
    out = []
    for j, d in enumerate(_mra_details(y, levels), start=1):
        if (1 << j) < SAMPLES_PER_CYCLE:
            continue
        scale = decim * (1 << j)
        if n // max(scale, 1) < CYCLES_PER_POUR:
            continue
        out.append({"band": band_name(scale), "zoning": decim, "level": j,
                    "scale_ticks": scale, "sample_stride": decim,
                    "series": d, "variance": float(np.var(d))})
    return out


# ── the per-band FFZ lock read (guards unweakened) ────────────────────────────────────────


def band_lock(series: np.ndarray, level: int, *, window: int = 128, stride: int = 8,
              step_budget: int = 4096) -> dict:
    """Stream ONE band through the UNMODIFIED lock machinery. The band stride-decimates to
    its own scale first — stride 2^(level−2), capped so ≥ 64 samples survive — which keeps
    the band's characteristic period inside the detector's honest lag range without touching a
    threshold (the passband sits below the decimated Nyquist: no aliasing). recover_clock
    snapshots over a sliding window feed SchmittLock at shipped defaults; a STEP BUDGET widens
    the snapshot stride on a very long band (cost bounding only — the window, the thresholds,
    and the guards stand as shipped). Returns the streaming verdict; `beat_ticks` reports in
    ORIGINAL tick units."""
    x = np.asarray(series, dtype=float).ravel()
    within = max(1, 1 << max(0, level - 2))
    if x.size // within < 64:
        within = max(1, x.size // 64)
    x = x[::within]
    n = x.size
    if n < 16:
        return {"note": "band-too-short", "samples": n, "locked_frac": 0.0,
                "final_state": "unlocked", "beat": 0, "beat_ticks": 0,
                "lock_quality": 0.0, "within_stride": within}
    lock = SchmittLock()
    win = min(window, n)
    stride = max(stride, n // max(1, step_budget))
    steps = 0
    locked_steps = 0
    reading = None
    for k in range(win, n + 1, stride):
        snap = recover_clock(x[max(0, k - win):k])
        reading = lock.step(snap.lock_quality, snap.beat)
        steps += 1
        if reading.asserted:
            locked_steps += 1
    full = recover_clock(x)
    return {
        "samples": n,
        "within_stride": within,
        "steps": steps,
        "locked_frac": round(locked_steps / steps, 4) if steps else 0.0,
        "final_state": reading.state.value if reading else "unlocked",
        "beat": full.beat,
        "beat_ticks": 0,  # the caller scales by the band's total stride
        "lock_quality": round(full.lock_quality, 4),
        "locked": full.locked,
        "holdover": full.holdover,
    }


# ── the surrogate — an ENERGY null, and nothing more ──────────────────────────────────────


def block_shuffle(x: np.ndarray, block: int, rng: np.random.Generator) -> np.ndarray:
    """One block-shuffle surrogate: contiguous length-`block` blocks permute (seeded), the
    sub-block tail keeps its place at the end. Structure FINER than the block survives intact;
    arrangement at the block scale and above dies. Block 1 degenerates to the full permutation
    — the whole null ladder speaks one law."""
    x = np.asarray(x, dtype=float).ravel()
    block = max(1, int(block))
    nb = x.size // block
    if nb < 2:
        return x.copy()
    head = x[:nb * block].reshape(nb, block)
    return np.concatenate([head[rng.permutation(nb)].ravel(), x[nb * block:]])


def null_profile(x: np.ndarray, bands: list, *, n_surrogates: int, seed: int) -> list:
    """The ENERGY null, PER BAND: each band reads against N seeded BLOCK-SHUFFLE surrogates
    with block = HALF the band's scale (in the band's own stage samples), run through the
    identical decoupling + lock.

    WHAT IT ANSWERS: does this band hold more energy than the same stream with its arrangement
    at that scale destroyed? Per-band rather than global because variance conservation makes a
    single global permutation suppress every non-dominant scale (the dominant comb
    concentrates, the rest fall below the flat spread), masking real coarser structure; the
    block-shuffle keeps sub-band texture IN the null and kills only the band's own arrangement.

    WHAT IT CANNOT ANSWER, AND MUST NOT BE READ AS ANSWERING: whether the band names a real
    scale. A deterministic alias of the zoning grain rides the surrogate exactly as it rides
    the observation — the surrogate re-pours through the same filters at the same grain — and
    an alias, being perfectly reproducible, survives any noise-null by construction. Alias duty
    sits with the ZONING GATE, which varies the grain this null holds fixed.

    Returns per-band rows {"band", "variance", "variance_std", "n_surrogates", "locked_frac"}
    (null means) aligned with `bands`."""
    x = np.asarray(x, dtype=float).ravel()
    out = []
    stage_of: dict = {}
    for row in bands:
        d = int(row["zoning"])
        if d not in stage_of:
            stage_of[d] = block_mean_decimate(x, d)
        src = stage_of[d]
        block = max(1, (1 << row["level"]) // 2)
        # A short stage series' variance wobbles, and its null costs little — so the null
        # DEEPENS where it runs noisy. A cost rule, never a finding rule.
        n_surr = max(1, n_surrogates) if src.size >= 4096 else max(16, n_surrogates)
        variances: list = []
        lockfracs: list = []
        for s in range(n_surr):
            rng = np.random.default_rng(seed + 7919 * s + 101 * row["level"] + 4993 * d)
            details = _mra_details(block_shuffle(src, block, rng), row["level"])
            if len(details) < row["level"]:
                continue
            dser = details[row["level"] - 1]
            variances.append(float(np.var(dser)))
            if s == 0:
                # The lock reads as a REPORTED gauge, never a gate — one null carries it.
                lockfracs.append(band_lock(dser, row["level"])["locked_frac"])
        out.append({"band": row["band"],
                    "variance": float(np.mean(variances)) if variances else 0.0,
                    "variance_std": float(np.std(variances)) if variances else 0.0,
                    "n_surrogates": len(variances),
                    "locked_frac": float(np.mean(lockfracs)) if lockfracs else 0.0})
    return out


def peak_read(bands: list, locks: list, surr: list) -> list:
    """Mark the bands the DATA elevates ON ENERGY, within one zoning. Per band: excess =
    variance / surrogate-mean variance. A band PEAKS when the excess clears PEAK_ENERGY_EXCESS
    at a LOCAL MAX along the ladder AND clears the null's own spread (mean + 3σ over the
    replicates, so a few-sample band's wobble never crosses on luck alone). The lock margin
    (locked_frac − surrogate locked_frac) reports as a rhythm gauge beside each verdict; it
    cannot gate (the surrogate's own band rings and locks, so the margin saturates flat in fine
    bands and runs noisy in short coarse ones).

    A peak here reads ENERGY-ABOVE-NULL AT THIS GRAIN — a candidate, never a finding. The
    zoning gate rules on it."""
    surr_of = {r["band"]: r for r in surr}
    excess = []
    for row in bands:
        sv = surr_of.get(row["band"], {}).get("variance", 0.0)
        excess.append(row["variance"] / max(sv, _EPS) if row["variance"] > _EPS else 0.0)
    out = []
    for i, row in enumerate(bands):
        lk = locks[i]
        s = surr_of.get(row["band"], {})
        margin = lk["locked_frac"] - s.get("locked_frac", 0.0)
        left = excess[i - 1] if i > 0 else -np.inf
        right = excess[i + 1] if i + 1 < len(excess) else -np.inf
        local_max = excess[i] >= left and excess[i] >= right
        over_spread = row["variance"] >= (s.get("variance", 0.0)
                                          + 3.0 * s.get("variance_std", 0.0))
        peaked = bool(excess[i] >= PEAK_ENERGY_EXCESS and local_max and over_spread)
        out.append({
            "band": row["band"], "scale_ticks": row["scale_ticks"],
            "zoning": row["zoning"],
            "variance": row["variance"],
            "surrogate_variance": s.get("variance", 0.0),
            "energy_excess": round(excess[i], 4),
            "locked_frac": lk["locked_frac"],
            "surrogate_locked_frac": round(s.get("locked_frac", 0.0), 4),
            "lock_margin": round(margin, 4),
            "energy_local_max": bool(local_max),
            "peaked": peaked,
        })
    return out


# ── THE ZONING GATE — a real band HOLDS, an alias MOVES ───────────────────────────────────


def zoning_read(x: np.ndarray, *, ladder: "tuple[int, ...]" = ZONING_LADDER,
                n_surrogates: int = 3, seed: int = 4241) -> dict:
    """Pour ONE signal at every rung of the zoning ladder. Returns {decim: {"bands": rows,
    "verdicts": rows, "locks": rows}} — the raw material the gate rules on."""
    x = np.asarray(x, dtype=float).ravel()
    out = {}
    for d in ladder:
        bands = zoning_bands(x, d)
        if not bands:
            continue
        locks = [band_lock(row["series"], row["level"]) for row in bands]
        for row, lk in zip(bands, locks):
            lk["beat_ticks"] = int(lk["beat"] * row["sample_stride"]
                                   * lk.get("within_stride", 1))
        surr = null_profile(x, bands, n_surrogates=n_surrogates, seed=seed)
        out[d] = {"bands": bands, "locks": locks,
                  "verdicts": peak_read(bands, locks, surr)}
    return out


def zoning_gate(reads: dict, n_ticks: int,
                ladder: "tuple[int, ...]" = ZONING_LADDER) -> list:
    """THE GATE. For every scale any rung RAISED (the energy tooth fired), ask every rung
    ELIGIBLE to resolve that scale whether the scale still stands there.

    THE HOLD TEST, and why it reads ORDINALLY rather than by re-firing the tooth. A rung's
    peak FLAG carries the inherited energy threshold and a 3σ dispersion tooth whose spread
    widens as a rung's stage sample count falls, so the flag flickers at coarse rungs on a
    scale whose excess plainly holds — demanding the flag at every rung would manufacture
    REFUSALS the way a tuned threshold manufactures findings. So the hold test asks the two
    questions that carry no tunable number:

      · does the scale stand ABOVE ITS OWN NULL at this grain (excess ≥ 1 — the null's own
        unit, not a chosen level)?
      · does this rung ELEVATE that scale over its dyadic neighbours (a local max of the
        rung's excess ladder — an ordering, not a threshold)?

    A band locked to the ZONING GRAIN (the classic alias: the artifact sits at the rung's own
    floor, scale 4·D) fails both at every rung whose floor lies elsewhere, because at those
    rungs the artifact has moved to a different SCALE. That is the whole discrimination.

      REPRODUCED — ≥ MIN_ELIGIBLE_ZONINGS eligible rungs, the tooth raised it somewhere, and
                   EVERY eligible rung holds it. The scale survived re-zoning: a finding.
      MOVED      — some eligible rung drops it. The scale rode the grain, not the text.
                   REFUSED: it emits no boundaries, no spans, no entities.
      UNTESTABLE — too few eligible rungs to re-zone at all (the ladder floor, scale 4, admits
                   only D = 1). The gate declines to certify rather than passing it through.

    Returns one row per raised scale, level-blind, sorted by scale."""
    raised_at: dict = {}
    excess_at: dict = {}
    localmax_at: dict = {}
    for d, r in reads.items():
        for v in r["verdicts"]:
            s = v["scale_ticks"]
            excess_at.setdefault(s, {})[d] = v["energy_excess"]
            localmax_at.setdefault(s, {})[d] = bool(v["energy_local_max"])
            if v["peaked"]:
                raised_at.setdefault(s, set()).add(d)
    out = []
    for scale in sorted(set(excess_at)):
        elig = [d for d in eligible_zonings(scale, n_ticks, ladder) if d in reads]
        raised = sorted(raised_at.get(scale, set()) & set(elig))
        if not raised:
            continue                              # no rung raised it — no claim to rule on
        held = [d for d in elig
                if excess_at[scale].get(d, 0.0) >= 1.0 and localmax_at[scale].get(d, False)]
        if len(elig) < MIN_ELIGIBLE_ZONINGS:
            verdict = "UNTESTABLE"
        elif len(held) == len(elig):
            verdict = "REPRODUCED"
        else:
            verdict = "MOVED"
        out.append({
            "band": band_name(scale),
            "scale_ticks": scale,
            "eligible_zonings": elig,
            "raised_zonings": raised,
            "held_zonings": held,
            "dropped_zonings": [d for d in elig if d not in held],
            "hold_fraction": round(len(held) / len(elig), 4) if elig else 0.0,
            "energy_excess_by_zoning": {str(d): excess_at[scale].get(d) for d in elig},
            "verdict": verdict,
            "reproduced": verdict == "REPRODUCED",
        })
    return out


def reference_row(reads: dict, scale: int, elig: list) -> "tuple[dict, dict, dict] | None":
    """The band a REPRODUCED scale reports from: the FINEST eligible rung (most stage samples
    → the sharpest crest localization). Returns (band, lock, verdict)."""
    for d in sorted(elig):
        r = reads.get(d)
        if not r:
            continue
        for row, lk, v in zip(r["bands"], r["locks"], r["verdicts"]):
            if row["scale_ticks"] == scale:
                return row, lk, v
    return None


# ── the emergence read — boundaries, spans, nameless scale-entities ───────────────────────


def band_boundaries(row: dict) -> list:
    """Boundary candidates for one band: the CREST events — local maxima of the band series
    standing above the band RMS — reported in original tick units (block centers for a
    decimated stage). A pulse-train structure crests at its events; the crest sequence carries
    the band's own segmentation."""
    d = np.asarray(row["series"], dtype=float)
    if d.size < 3:
        return []
    rms = float(np.sqrt(np.mean(d * d)))
    if rms < _EPS:
        return []
    stride = int(row["sample_stride"])
    half = stride // 2
    out = []
    for i in range(1, d.size - 1):
        if d[i] > rms and d[i] >= d[i - 1] and d[i] > d[i + 1]:
            out.append(i * stride + half)
    return out


def _span_features(classes: np.ndarray, t0: int, t1: int) -> np.ndarray:
    """A span's recurrence feature: the normalized char-class histogram of the RAW poured
    text over [t0, t1) — cheap, content-bearing, tokenizer-free."""
    seg = classes[t0:t1]
    if seg.size == 0:
        return np.zeros(_N_CLASSES, dtype=float)
    h = np.bincount(seg, minlength=_N_CLASSES).astype(float)
    return h / h.sum()


def scale_entities(row: dict, boundaries: list, classes: np.ndarray, n_ticks: int) -> dict:
    """The candidate scale-entities for one REPRODUCED scale: the spans between consecutive
    boundaries, each an OPEN nameless record — {"span": [t0, t1], "has": {band · scale ·
    energy · recurs}} — never pre-labeled. Emission caps at MAX_SPANS_EMITTED (top spans by
    energy); recurrence links ride cosine similarity over raw char-class histograms, each span
    linking to its most similar PRIOR emitted span at or above LINK_SIM_FLOOR."""
    d = np.asarray(row["series"], dtype=float)
    stride = int(row["sample_stride"])
    edges = [0] + [b for b in boundaries if 0 < b < n_ticks] + [n_ticks]
    spans = []
    for a, b in zip(edges[:-1], edges[1:]):
        if b <= a:
            continue
        seg = d[a // stride: max(a // stride + 1, b // stride)]
        energy = float(np.mean(seg * seg)) if seg.size else 0.0
        spans.append((a, b, energy))
    total = len(spans)
    spans.sort(key=lambda s: (-s[2], s[0]))
    kept = sorted(spans[:MAX_SPANS_EMITTED])
    feats = [_span_features(classes, a, b) for a, b, _ in kept]
    records = []
    for i, (a, b, energy) in enumerate(kept):
        recurs = []
        best, best_sim = -1, LINK_SIM_FLOOR
        for j in range(i):
            denom = float(np.linalg.norm(feats[i]) * np.linalg.norm(feats[j]))
            sim = float(np.dot(feats[i], feats[j]) / denom) if denom > _EPS else 0.0
            if sim >= best_sim:
                best, best_sim = j, sim
        if best >= 0:
            recurs.append({"span": [int(kept[best][0]), int(kept[best][1])],
                           "sim": round(best_sim, 4)})
        records.append({
            "span": [int(a), int(b)],
            "has": {
                "band": row["band"],
                "scale_ticks": row["scale_ticks"],
                "energy": round(energy, 8),
                "recurs": recurs,
            },
        })
    return {"n_spans_total": total, "n_spans_emitted": len(records), "spans": records}


# ── the witness — discovered boundaries vs the held-out pet-name grains ────────────────────


def boundary_alignment(pred: list, true: list, tol: int) -> dict:
    """Greedy two-pointer matching of discovered boundaries against one held-out annotation
    set, within ± tol ticks. Precision reads over the predictions, recall over the truths;
    each truth matches at most once. `tol_saturated` flags the vacuous case — a tolerance wider
    than half the annotations' median gap matches almost anything, so a coarse band's read
    against a fine grain names its own emptiness."""
    pred = sorted(int(p) for p in pred)
    true = sorted(int(t) for t in true)
    matched = 0
    ti = 0
    for p in pred:
        while ti < len(true) and true[ti] < p - tol:
            ti += 1
        if ti < len(true) and abs(true[ti] - p) <= tol:
            matched += 1
            ti += 1
    precision = matched / len(pred) if pred else 0.0
    recall = matched / len(true) if true else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    gaps = np.diff(np.asarray(true, dtype=float)) if len(true) > 1 else np.zeros(0)
    median_gap = float(np.median(gaps)) if gaps.size else 0.0
    return {"tol": tol, "n_pred": len(pred), "n_true": len(true), "matched": matched,
            "precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4),
            "tol_saturated": bool(median_gap > 0 and 2 * tol > median_gap)}


# ── the probe — one signal, one bed, the whole read ────────────────────────────────────────


def probe_signal(name: str, x: np.ndarray, classes: np.ndarray, annotations: dict,
                 *, n_surrogates: int = 3, seed: int = 4241,
                 ladder: "tuple[int, ...]" = ZONING_LADDER) -> dict:
    """The full read for ONE tick signal: pour at every zoning → per-band energy null → the
    ZONING GATE → for the scales that HELD, boundaries, witness alignment, and scale-entities.
    A scale the gate refuses emits nothing but its refusal. A flat signal (no events — e.g.
    sigil-event over an extracted pour) skips honestly."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if float(np.var(x)) < _EPS:
        return {"signal": name, "note": "signal-flat: skipped", "n_ticks": n,
                "gate": [], "n_reproduced": 0, "reproduced": [], "refused": [],
                "untestable": []}
    reads = zoning_read(x, ladder=ladder, n_surrogates=n_surrogates, seed=seed)
    gate = zoning_gate(reads, n, ladder)
    reproduced_rows = []
    for g in gate:
        if not g["reproduced"]:
            continue
        ref = reference_row(reads, g["scale_ticks"], g["eligible_zonings"])
        if ref is None:
            continue
        row, lk, _v = ref
        bounds = band_boundaries(row)
        tol = max(2, row["scale_ticks"] // 4)
        witness = {grain: boundary_alignment(bounds, marks, tol)
                   for grain, marks in annotations.items()}
        reproduced_rows.append({
            "band": g["band"], "scale_ticks": g["scale_ticks"],
            "reference_zoning": row["zoning"],
            "n_boundaries": len(bounds),
            "lock": {k: lk[k] for k in ("locked_frac", "final_state", "beat", "beat_ticks",
                                        "lock_quality", "samples", "within_stride") if k in lk},
            "witness": witness,
            "entities": scale_entities(row, bounds, classes, n),
        })
    return {
        "signal": name,
        "n_ticks": n,
        "zonings": sorted(reads),
        "gate": gate,
        "n_reproduced": len(reproduced_rows),
        "reproduced": reproduced_rows,
        "refused": [g["band"] for g in gate if g["verdict"] == "MOVED"],
        "untestable": [g["band"] for g in gate if g["verdict"] == "UNTESTABLE"],
    }


def probe_root(root: str, *, n_surrogates: int = 3, seed: int = 4241) -> dict:
    """One bed's continuous pour: frames off the durable store → the tick signals → the
    per-signal zoning gate. Writes nothing — the caller lands the JSON."""
    poured = pour_ticks(frames_from_bed(root))
    ann = poured["annotations"]
    reads = [probe_signal(name, sig, poured["classes"], ann,
                          n_surrogates=n_surrogates, seed=seed)
             for name, sig in poured["signals"].items()]
    blind = next((r for r in reads if r["signal"] == "class-transition"), None)
    line_refound = 0.0
    if blind:
        for p in blind.get("reproduced", []):
            line_refound = max(line_refound, p["witness"].get("line", {}).get("f1", 0.0))
    return {
        "root": root,
        "n_ticks": poured["n_ticks"],
        "annotation_counts": {k: len(v) for k, v in ann.items()},
        "design": {
            "tick": "character transition (finest honest grain; per-tick state = one char)",
            "zoning_ladder": list(ZONING_LADDER),
            "levels_per_zoning": LEVELS_PER_ZONING,
            "wavelet": _WAVELET,
            "energy_tooth": {"energy_excess": PEAK_ENERGY_EXCESS,
                             "null": "per-band block-shuffle, block = scale/2 in stage samples",
                             "surrogates": n_surrogates, "seed": seed,
                             "limit": "an ENERGY null: blind to a deterministic alias"},
            "zoning_gate": {"rule": "a scale peaks under EVERY eligible rung or it is REFUSED",
                            "min_eligible_zonings": MIN_ELIGIBLE_ZONINGS},
        },
        "signals": reads,
        "emergence": {
            "scales_reproduced_blind": blind["n_reproduced"] if blind else 0,
            "line_refound_f1_blind": round(line_refound, 4),
            "reproduced_by_signal": {r["signal"]: [g["band"] for g in r.get("gate", [])
                                                   if g["reproduced"]] for r in reads},
            "refused_by_signal": {r["signal"]: r.get("refused", []) for r in reads},
        },
    }


# ── the placebo split — the cross-domain read the controls exist for ──────────────────────

#: Split thresholds — a scale's excess ratio (real / placebo) at or beyond this reads the scale
#: as borne by what the placebo destroys (content); its reciprocal, by what only the babble
#: manufactures. Between them, a scale surviving both pours reads shape-borne.
SPLIT_RATIO = 1.4


def _gate_of(read: dict) -> dict:
    return {g["band"]: g for g in read.get("gate", [])}


def _excess_of(g: dict) -> float:
    """A scale's excess at its FINEST eligible rung — the same rung the reproduced read
    reports from, so the split and the gate speak of one band."""
    ex = g.get("energy_excess_by_zoning") or {}
    for d in sorted(int(k) for k in ex):
        v = ex.get(str(d))
        if v is not None:
            return float(v)
    return 0.0


def split_read(real: dict, placebo: dict) -> dict:
    """The placebo split over two landed pour profiles (the same signal set, wā-aligned beds):
    per signal, per SCALE — the real and placebo excesses, their RATIO, and both gate verdicts
    side by side. Verdicts stay coarse and open: `shape-borne` (both pours REPRODUCE the scale
    — it survives meaning-death), `content-borne` (real excess ≥ SPLIT_RATIO × placebo — the
    scale dies with meaning), `babble-borne` (the placebo manufactures it), else `null`. A
    verdict reads the ratio; it never re-gates."""
    out = {"real_root": real.get("root"), "placebo_root": placebo.get("root"),
           "ratio_threshold": SPLIT_RATIO, "signals": []}
    placebo_of = {s["signal"]: s for s in placebo.get("signals", [])}
    for rs in real.get("signals", []):
        ps = placebo_of.get(rs["signal"])
        if ps is None or rs.get("note") or ps.get("note"):
            out["signals"].append({"signal": rs["signal"],
                                   "note": rs.get("note") or (ps or {}).get("note")
                                   or "placebo profile absent"})
            continue
        p_of = _gate_of(ps)
        rows = []
        for band, rg in _gate_of(rs).items():
            pg = p_of.get(band)
            e_r = _excess_of(rg)
            e_p = _excess_of(pg) if pg else 0.0
            ratio = e_r / max(e_p, _EPS)
            if e_r >= SPLIT_RATIO * e_p:
                verdict = "content-borne"
            elif e_p >= SPLIT_RATIO * e_r:
                verdict = "babble-borne"
            elif rg["reproduced"] and pg and pg["reproduced"]:
                verdict = "shape-borne"
            else:
                verdict = "null"
            rows.append({"band": band, "scale_ticks": rg["scale_ticks"],
                         "excess_real": round(e_r, 4), "excess_placebo": round(e_p, 4),
                         "ratio": round(ratio, 4),
                         "gate_real": rg["verdict"],
                         "gate_placebo": pg["verdict"] if pg else "absent",
                         "verdict": verdict})
        rows.sort(key=lambda r: r["scale_ticks"])
        out["signals"].append({
            "signal": rs["signal"],
            "bands": rows,
            "content_borne": [r["band"] for r in rows if r["verdict"] == "content-borne"],
            "shape_borne": [r["band"] for r in rows if r["verdict"] == "shape-borne"],
            "babble_borne": [r["band"] for r in rows if r["verdict"] == "babble-borne"],
        })
    return out


# ── the CLI face ───────────────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser(
        description="ffz_continuous_pour — pour a bed end-to-end at char grain, decouple at a "
                    "ladder of zonings, and keep only the scales that HOLD under re-zoning")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("pour", help="the per-bed continuous-pour reading")
    p.add_argument("--sensorium", action="append", required=True,
                   help="a populated test-bed sensorium (repeatable)")
    p.add_argument("--seed", type=int, default=4241)
    p.add_argument("--surrogates", type=int, default=3)
    s = sub.add_parser("split", help="the placebo split over two landed pour profiles")
    s.add_argument("--real", required=True, help="the real bed root (pour landed)")
    s.add_argument("--placebo", required=True, help="the placebo bed root (pour landed)")
    args = ap.parse_args()
    if args.cmd == "split":
        def _load(root: str) -> dict:
            with open(os.path.join(os.path.expanduser(root), "probe",
                                   "continuous-pour.json"), encoding="utf-8") as f:
                return json.load(f)
        real_root = os.path.expanduser(args.real)
        out = split_read(_load(args.real), _load(args.placebo))
        path = os.path.join(real_root, "probe", "pour-split.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        return
    summaries = []
    for r in args.sensorium:
        root = os.path.expanduser(r)
        out = probe_root(root, n_surrogates=args.surrogates, seed=args.seed)
        os.makedirs(os.path.join(root, "probe"), exist_ok=True)
        path = os.path.join(root, "probe", "continuous-pour.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        summaries.append({"root": root, "out": path, "n_ticks": out["n_ticks"],
                          "emergence": out["emergence"]})
    sys.stdout.write(json.dumps(summaries, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
