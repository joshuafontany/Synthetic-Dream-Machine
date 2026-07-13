#!/usr/bin/env python3
"""ffz_continuous_pour — the continuous pour: true-stream FFZ wave decoupling over a corpus.

THE QUESTION. The frozen-rhythm probe reads the corpus at ONE imposed grain (the line —
a bootstrap pet-name). This probe drops every imposed segmentation: it pours the corpus
end-to-end as ONE continuous character stream, decouples the stream into dyadic detail
bands (MODWT), reads the FFZ lock PER BAND, and asks the data where its own scales live.
Known grains (line breaks, wa/record joins, work joins) ride ONLY as held-out annotations
for the witness read — they never enter the signal loop.

THE TICK (chosen + justified): the CHARACTER TRANSITION. The finest honest grain the text
carries — a word tick presupposes a tokenizer (an imposed segmentation), while a character
arrives the way a real-time media sample arrives: one frame after another, no lookbehind
past the previous frame's tail. Each tick t reads only (char[t-1], char[t]).

THE SIGNALS (named, per tick):
  · class-transition — 1.0 where the character CLASS changes (letter | digit | whitespace |
    punct | other; the apostrophe/okina folds into letter, the newline folds into
    WHITESPACE so this channel stays LINE-BLIND). Word texture, clause texture, and — if
    line lengths carry a real rhythm — line texture must EMERGE here, never get marked.
  · break-* — the structural marks the text ITSELF carries, one UNIT-HEIGHT channel per mark
    class: break-newline · break-sentence (.!?) · break-clause (,;:) · break-any (any of the
    three). No channel carries a weight, because a weight IS a prior — hand the ladder
    `newline 1.0, sentence 0.6, clause 0.3` and every band inherits that ranking, then hands
    it back as a finding. Split instead: each class rides its own pour, and the per-band
    energy excess MEASURES which mark bears the rhythm at which scale (`discovered_weight`
    in the emergence read). The instrument finds the weighting; it never supplies it.
  · sigil-event — 1.0 at each memetic-wikitext envelope mark (a `<<~` open or `>>` close).
    Active in the wrapped beds only; the extracted pour zeroes it (reported as flat).
  · recurrence — the CONTENT channel: 1.0 where the 12-gram ending at t has already
    poured within the last 65536 ticks (a bounded recency memory — streaming-honest).
    Refrains and genealogy list-frames pulse it; the placebo's Markov babble destroys
    long repeats, so a scale alive here and dead in the placebo reads CONTENT-BORNE —
    the shape channels alone cannot split shape from meaning.

THE DECOUPLING (two-stage MODWT — the honest-decimation seam, surfaced): a full char-grain
MODWT to whole-pour scale (~2^19 ticks) costs minutes per signal, so the pour splits:
  · FINE stage — MODWT-MRA (db4, swt) at char grain, F1..F7 (scales 2..128 ticks);
  · COARSE stage — block-mean decimate by 64 (anti-aliased: the mean over a 64-char block
    reads the local event RATE, the natural coarse observable), then MODWT-MRA over the
    rate, emitting only bands with ≥ 4 samples per period: C2..Ck (scales 256..~2^19).
    Contiguous coverage tick→whole-pour, no band duplicated, no band under-resolved.

THE PER-BAND LOCK + THE ANTI-APOPHENIA TOOTH: any bandpass detail RINGS at its own scale —
even white noise autocorrelates inside a band — so a raw per-band lock would fabricate.
The cure extends the guard rather than weakening it: every band's energy AND lock read
against N seeded BLOCK-SHUFFLE SURROGATES (block = half the band's scale, in stage
samples) run through the IDENTICAL pipeline. Why per band: variance conservation makes a
single global permutation null suppress every non-dominant scale (the dominant comb
concentrates, the rest fall below the flat spread), so a global null masks real coarser
structure; the block-shuffle keeps sub-band structure IN the null and kills only the
band's own arrangement — the finest band's block of 1 degenerates to the full
permutation, one law across the ladder. A band counts PEAKED only when its variance
stands a local-max EXCESS ≥ the calibrated threshold over the null mean — excess-over-
null, so neither filter ringing nor sub-scale texture manufactures a scale. THE LOCK GAUGE (found on the positive control, kept honest): the
per-band locked-fraction CANNOT gate a peak — the surrogate's band rings and locks too,
saturating both readings in the fine bands — so the lock reads as a REPORTED rhythm gauge
(each band's beat + locked-fraction beside its surrogate's), never a peak tooth.
recover_clock and SchmittLock run UNMODIFIED at shipped thresholds; each band
stride-decimates to its own scale first (the band's passband sits below the decimated
Nyquist, so no aliasing) — an adaptation at the signal, never at the guards. The threshold
calibrates on the synthetic planted-period fixture (the instrument's own positive
control), never on the corpus.

THE EMERGENCE READ: for each peaked band, boundaries = the band's crest events (local
maxima above the band RMS), and the spans between consecutive boundaries land as candidate
SCALE-ENTITIES — nameless open records ({"span", "has": {…caps…}}), each with its band,
extent, energy, and recurrence links (cosine over raw char-class histograms) to similar
spans. No record carries a pre-label.

CLOCK PURITY + STREAMING: the tick ordinal indexes everything; no wall-clock touches any
path; every random draw seeds explicitly. The tick loop consumes FRAMES in sequence (an
iterator with per-stream seq — the StreamAdapter shape real-time media will speak); the
carried state spans one character, a 12-char gram tail, and the recurrence channel's
bounded recency table. THE BATCH SEAM, surfaced honestly: MODWT-MRA here runs
as a batch over the collected signal. An à-trous MODWT admits a causal streaming form with
a per-level lag of (filter_len − 1)·2^(j−1) ticks; the media era needs that port — named
here, not built.

Usage (the mempalace venv, from this directory):
  ~/.venv/bin/python3 ffz_continuous_pour.py pour --root <bed> [--root <bed> ...]
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

_SENTENCE_END = frozenset(".!?")
_CLAUSE_MARK = frozenset(",;:")
_SIGIL_RE = re.compile(r"<<~|>>")

#: The recurrence channel's grammar: a repeat fires when the K_GRAM-char tail ending at t
#: last poured within RECUR_WINDOW ticks — a bounded memory horizon, streaming-honest.
K_GRAM = 12
RECUR_WINDOW = 65536

#: The two decoupling stages: fine char-grain levels (scales 2..128 ticks), then the
#: block-mean decimation factor and the coarse levels that carry coverage to whole-pour
#: scale. The coarse stage EMITS only bands holding ≥ 4 samples per characteristic period
#: (scale ≥ 4·decim — an under-resolved band would alias its own stage grain), so the
#: ladder runs contiguous: F1..F7 = 2..128, C2..Ck = 256..~2^19.
FINE_LEVELS = 7
COARSE_DECIM = 64
COARSE_LEVELS = 13
COARSE_MIN_SAMPLES_PER_PERIOD = 4
_WAVELET = "db4"

#: The peak tooth — calibrated on the synthetic planted-period fixture (the positive
#: control), never on the corpus: a band peaks when its variance stands at a LOCAL MAX of
#: the excess ladder AND clears this ratio over the surrogate-mean variance.
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
    """THE POUR — the single streaming pass. Consumes frames in sequence; the carried
    state spans the previous character, a K_GRAM-char tail, and the recurrence channel's
    bounded recency table — all crossing frame joins, so the stream runs truly continuous.
    Returns the per-tick signals + the poured class codes + the HELD-OUT annotations
    (newline ticks · record joins · work joins), which the walker collects OUTSIDE the
    feature functions — no segmentation enters the signal loop."""
    cls_codes: list = []
    class_transition: list = []
    break_newline: list = []
    break_sentence: list = []
    break_clause: list = []
    break_any: list = []
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
        # sectioner cuts at wa markers, outside any envelope mark).
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
            # THE MARKS RIDE SPLIT AND UNIT-HEIGHT. A graded channel would hand the ladder a ranking
            # nobody measured, and every band would inherit it and hand it back as a finding. Split
            # instead: each class pours its own unit-height channel, and the per-band excess MEASURES
            # which mark bears the rhythm at which scale.
            nl = 1.0 if ch == "\n" else 0.0
            sent = 1.0 if ch in _SENTENCE_END else 0.0
            claus = 1.0 if ch in _CLAUSE_MARK else 0.0
            break_newline.append(nl)
            break_sentence.append(sent)
            break_clause.append(claus)
            break_any.append(1.0 if (nl or sent or claus) else 0.0)
            if nl:
                line_breaks.append(t)
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
            "break-any": np.asarray(break_any, dtype=float),
            "break-newline": np.asarray(break_newline, dtype=float),
            "break-sentence": np.asarray(break_sentence, dtype=float),
            "break-clause": np.asarray(break_clause, dtype=float),
            "sigil-event": np.asarray(sigil_event, dtype=float),
            "recurrence": np.asarray(recurrence, dtype=float),
        },
        "annotations": {
            "line": line_breaks,
            "wa": record_joins,
            "work": work_joins,
        },
    }


# ── the decoupling — two-stage MODWT-MRA ──────────────────────────────────────────────────


def block_mean_decimate(x: np.ndarray, factor: int) -> np.ndarray:
    """Anti-aliased decimation: the mean over each length-`factor` block (the local event
    RATE — the natural coarse observable for an event-train signal). The tail remainder
    (< one block) drops; the loss stays under one coarse sample."""
    x = np.asarray(x, dtype=float).ravel()
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


def two_stage_bands(x: np.ndarray, *, fine_levels: int = FINE_LEVELS,
                    coarse_decim: int = COARSE_DECIM, coarse_levels: int = COARSE_LEVELS) -> list:
    """Decouple one tick signal into the full dyadic ladder, tick-grain → whole-pour:
    fine-stage details at char grain (scales 2..2^fine_levels ticks), then coarse-stage
    details over the block-mean-decimated rate signal (scales coarse_decim·2..
    coarse_decim·2^coarse_levels ticks). Returns band rows fine→coarse:
    {"band", "stage", "level", "scale_ticks", "sample_stride", "series", "variance"}."""
    out = []
    for j, d in enumerate(_mra_details(x, fine_levels), start=1):
        out.append({"band": f"F{j}", "stage": "fine", "level": j, "scale_ticks": 1 << j,
                    "sample_stride": 1, "series": d, "variance": float(np.var(d))})
    y = block_mean_decimate(x, coarse_decim)
    for j, d in enumerate(_mra_details(y, coarse_levels), start=1):
        if (1 << j) < COARSE_MIN_SAMPLES_PER_PERIOD:
            continue  # an under-resolved coarse band would alias its own stage grain
        out.append({"band": f"C{j}", "stage": "coarse", "level": j,
                    "scale_ticks": coarse_decim * (1 << j), "sample_stride": coarse_decim,
                    "series": d, "variance": float(np.var(d))})
    return out


# ── the per-band FFZ lock read (guards unweakened) ────────────────────────────────────────


def band_lock(series: np.ndarray, level: int, *, window: int = 128, stride: int = 8,
              step_budget: int = 4096) -> dict:
    """Stream ONE band through the UNMODIFIED lock machinery. The band stride-decimates to
    its own scale first — stride 2^(level−2), capped so ≥ 64 samples survive — which keeps
    the band's characteristic period inside the detector's honest lag range without
    touching a threshold (the passband sits below the decimated Nyquist: no aliasing).
    recover_clock snapshots over a sliding window feed SchmittLock at shipped defaults; a
    STEP BUDGET widens the snapshot stride on a very long band (cost bounding only — the
    window, the thresholds, and the guards stand as shipped). Returns the streaming
    verdict; `beat_ticks` reports in ORIGINAL tick units."""
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


# ── the surrogate tooth — per-band block-shuffle nulls through the identical pipeline ─────


def block_shuffle(x: np.ndarray, block: int, rng: np.random.Generator) -> np.ndarray:
    """One block-shuffle surrogate: contiguous length-`block` blocks permute (seeded), the
    sub-block tail keeps its place at the end. Structure FINER than the block survives
    intact; arrangement at the block scale and above dies. Block 1 degenerates to the full
    permutation — the whole null ladder speaks one law."""
    x = np.asarray(x, dtype=float).ravel()
    block = max(1, int(block))
    nb = x.size // block
    if nb < 2:
        return x.copy()
    head = x[:nb * block].reshape(nb, block)
    return np.concatenate([head[rng.permutation(nb)].ravel(), x[nb * block:]])


def null_profile(x: np.ndarray, bands: list, *, n_surrogates: int, seed: int) -> list:
    """The anti-apophenia null, PER BAND: each band reads against N seeded BLOCK-SHUFFLE
    surrogates with block = HALF the band's scale (in the band's own stage samples), run
    through the identical decoupling + lock. Why per-band: variance conservation makes a
    single global permutation null suppress every non-dominant scale (the dominant comb
    concentrates, all other bands fall below the flat spread — real coarser structure
    masks); the block-shuffle keeps the finer structure IN the null, so a band's excess
    reads arrangement-at-its-own-scale and nothing else. Whatever energy/lock the null
    band still shows reads as filter-ringing plus sub-scale texture, never as the scale's
    own structure. Returns per-band rows {"band", "variance", "locked_frac"} (null means)
    aligned with `bands`."""
    x = np.asarray(x, dtype=float).ravel()
    y = block_mean_decimate(x, COARSE_DECIM)
    out = []
    for row in bands:
        src = x if row["stage"] == "fine" else y
        block = max(1, (1 << row["level"]) // 2)
        # A coarse band holds few samples, so its variance ratio wobbles — and its null
        # costs nothing — so the null DEEPENS where it runs noisy.
        n_surr = max(1, n_surrogates) if row["stage"] == "fine" else max(16, n_surrogates)
        variances: list = []
        lockfracs: list = []
        for s in range(n_surr):
            rng = np.random.default_rng(seed + 7919 * s + 101 * row["level"]
                                        + (0 if row["stage"] == "fine" else 4993))
            details = _mra_details(block_shuffle(src, block, rng), row["level"])
            if len(details) < row["level"]:
                continue
            d = details[row["level"] - 1]
            variances.append(float(np.var(d)))
            if s == 0:
                # The lock reads as a REPORTED gauge, never a gate — one null carries it.
                lockfracs.append(band_lock(d, row["level"])["locked_frac"])
        out.append({"band": row["band"],
                    "variance": float(np.mean(variances)) if variances else 0.0,
                    "variance_std": float(np.std(variances)) if variances else 0.0,
                    "n_surrogates": len(variances),
                    "locked_frac": float(np.mean(lockfracs)) if lockfracs else 0.0})
    return out


def peak_read(bands: list, locks: list, surr: list) -> list:
    """Mark the bands the DATA elevates. Per band: excess = variance / surrogate-mean
    variance. A band PEAKS when the excess clears PEAK_ENERGY_EXCESS at a LOCAL MAX along
    the ladder — structure over the permutation null, so band-ringing never fabricates a
    scale. The lock margin (locked_frac − surrogate locked_frac) reports as a rhythm gauge
    beside each verdict; it cannot gate (the surrogate's own band rings and locks, so the
    margin saturates flat in fine bands and runs noisy in short coarse ones). Returns
    per-band verdict rows (fine→coarse)."""
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
        # The dispersion tooth: the observed variance must clear the null's own spread
        # (mean + 3σ over the replicates), so a few-sample coarse band's wobble never
        # crosses on luck alone.
        over_spread = row["variance"] >= (s.get("variance", 0.0)
                                          + 3.0 * s.get("variance_std", 0.0))
        peaked = bool(excess[i] >= PEAK_ENERGY_EXCESS and local_max and over_spread)
        out.append({
            "band": row["band"], "scale_ticks": row["scale_ticks"],
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


# ── the emergence read — boundaries, spans, nameless scale-entities ───────────────────────


def band_boundaries(row: dict) -> list:
    """Boundary candidates for one band: the CREST events — local maxima of the band series
    standing above the band RMS — reported in original tick units (block centers for a
    decimated stage). A pulse-train structure crests at its events; the crest sequence
    carries the band's own segmentation."""
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
    """The candidate scale-entities for one peaked band: the spans between consecutive
    boundaries, each an OPEN nameless record — {"span": [t0, t1], "has": {band · scale ·
    energy · recurs}} — never pre-labeled. Emission caps at MAX_SPANS_EMITTED (top spans by
    energy); recurrence links ride cosine similarity over raw char-class histograms, each
    span linking to its most similar PRIOR emitted span at or above LINK_SIM_FLOOR."""
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
    each truth matches at most once. `tol_saturated` flags the vacuous case — a tolerance
    wider than half the annotations' median gap matches almost anything, so a coarse
    band's read against a fine grain names its own emptiness."""
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
                 *, n_surrogates: int = 3, seed: int = 4241) -> dict:
    """The full read for ONE tick signal: decouple → per-band lock → surrogate tooth →
    peak verdicts → per-peaked-band boundaries, witness alignment, and scale-entities.
    A flat signal (no events — e.g. sigil-event over an extracted pour) skips honestly."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if float(np.var(x)) < _EPS:
        return {"signal": name, "note": "signal-flat: skipped", "n_ticks": n,
                "bands": [], "n_peaked": 0, "peaked": []}
    bands = two_stage_bands(x)
    locks = [band_lock(row["series"], row["level"]) for row in bands]
    for row, lk in zip(bands, locks):
        lk["beat_ticks"] = int(lk["beat"] * row["sample_stride"] * lk.get("within_stride", 1))
    surr = null_profile(x, bands, n_surrogates=n_surrogates, seed=seed)
    verdicts = peak_read(bands, locks, surr)
    peaked_rows = []
    for row, lk, v in zip(bands, locks, verdicts):
        if not v["peaked"]:
            continue
        bounds = band_boundaries(row)
        tol = max(2, row["scale_ticks"] // 4)
        witness = {grain: boundary_alignment(bounds, marks, tol)
                   for grain, marks in annotations.items()}
        entities = scale_entities(row, bounds, classes, n)
        peaked_rows.append({"band": row["band"], "scale_ticks": row["scale_ticks"],
                            "n_boundaries": len(bounds), "witness": witness,
                            "entities": entities})
    band_rows = []
    for row, lk, v in zip(bands, locks, verdicts):
        band_rows.append({**v, "lock": {k: lk[k] for k in
                                        ("locked_frac", "final_state", "beat", "beat_ticks",
                                         "lock_quality", "samples", "within_stride")
                                        if k in lk}})
    return {
        "signal": name,
        "n_ticks": n,
        "bands": band_rows,
        "n_peaked": sum(1 for v in verdicts if v["peaked"]),
        "peaked": peaked_rows,
    }


def probe_root(root: str, *, n_surrogates: int = 3, seed: int = 4241) -> dict:
    """One bed's continuous pour: frames off the durable store → the tick signals → the
    per-signal reads → the emergence summary. Writes nothing — the caller lands the JSON."""
    poured = pour_ticks(frames_from_bed(root))
    ann = poured["annotations"]
    reads = [probe_signal(name, sig, poured["classes"], ann,
                          n_surrogates=n_surrogates, seed=seed)
             for name, sig in poured["signals"].items()]
    # The emergence questions, answered per bed off the blind channel.
    blind = next((r for r in reads if r["signal"] == "class-transition"), None)
    line_refound = 0.0
    if blind:
        for p in blind.get("peaked", []):
            line_refound = max(line_refound, p["witness"].get("line", {}).get("f1", 0.0))
    # THE DISCOVERED WEIGHT — the reading that replaces the prior we cut. Each mark class poured its own
    # unit-height channel, so the per-band energy excess now MEASURES what a typed constant used to
    # assert: which mark bears the rhythm, at which scale. A class that peaks nowhere carries no rhythm,
    # whatever weight a designer would have felt like giving it.
    discovered = {}
    for r in reads:
        if not r["signal"].startswith("break-") or r["signal"] == "break-any":
            continue
        peaks = [b for b in r.get("bands", []) if b["peaked"]]
        discovered[r["signal"]] = {
            "n_peaked": r.get("n_peaked", 0),
            "peak_bands": [{"band": b["band"], "scale_ticks": b["scale_ticks"],
                            "energy_excess": b["energy_excess"]} for b in peaks],
            "max_excess": max((b["energy_excess"] for b in r.get("bands", [])), default=0.0),
        }

    return {
        "root": root,
        "n_ticks": poured["n_ticks"],
        "annotation_counts": {k: len(v) for k, v in ann.items()},
        "discovered_break_weight": discovered,
        "design": {
            "tick": "character transition (finest honest grain; per-tick state = one char)",
            "stages": {"fine_levels": FINE_LEVELS, "coarse_decim": COARSE_DECIM,
                       "coarse_levels": COARSE_LEVELS, "wavelet": _WAVELET},
            "peak_tooth": {"energy_excess": PEAK_ENERGY_EXCESS,
                           "null": "per-band block-shuffle, block = scale/2 in stage samples",
                           "surrogates": n_surrogates, "seed": seed,
                           "lock_gauge": "reported beside its null, never a gate"},
        },
        "signals": reads,
        "emergence": {
            "scales_peaked_blind": blind["n_peaked"] if blind else 0,
            "line_refound_f1_blind": round(line_refound, 4),
            "scales_peaked_by_signal": {r["signal"]: r.get("n_peaked", 0) for r in reads},
        },
    }


# ── the placebo split — the cross-domain read the controls exist for ──────────────────────

#: Split thresholds — a band's excess ratio (real / placebo) at or beyond this reads the
#: scale as borne by what the placebo destroys (content); its reciprocal, by what only the
#: babble manufactures. Between them, a scale surviving both pours reads shape-borne.
SPLIT_RATIO = 1.4


def split_read(real: dict, placebo: dict) -> dict:
    """The placebo split over two landed pour profiles (the same signal set, wa-aligned
    beds): per signal, per band — the real and placebo excesses, their RATIO, and the lock
    qualities side by side. Verdicts stay coarse and open: `shape-borne` (both pours clear
    the peak tooth — the scale survives meaning-death), `content-borne` (real excess ≥
    SPLIT_RATIO × placebo — the scale dies with meaning), `babble-borne` (the placebo
    manufactures it), else `null`. A verdict reads the ratio, never re-gates the peaks."""
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
        p_of = {b["band"]: b for b in ps.get("bands", [])}
        rows = []
        for rb in rs.get("bands", []):
            pb = p_of.get(rb["band"])
            if pb is None:
                continue
            e_r, e_p = rb["energy_excess"], pb["energy_excess"]
            ratio = e_r / max(e_p, _EPS)
            if e_r >= SPLIT_RATIO * e_p:
                verdict = "content-borne"
            elif e_p >= SPLIT_RATIO * e_r:
                verdict = "babble-borne"
            elif rb["peaked"] and pb["peaked"]:
                verdict = "shape-borne"
            else:
                verdict = "null"
            rows.append({"band": rb["band"], "scale_ticks": rb["scale_ticks"],
                         "excess_real": e_r, "excess_placebo": e_p,
                         "ratio": round(ratio, 4),
                         "peaked_real": rb["peaked"], "peaked_placebo": pb["peaked"],
                         "q_real": rb["lock"]["lock_quality"],
                         "q_placebo": pb["lock"]["lock_quality"],
                         "beat_ticks_real": rb["lock"]["beat_ticks"],
                         "beat_ticks_placebo": pb["lock"]["beat_ticks"],
                         "verdict": verdict})
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
        description="ffz_continuous_pour — pour a bed end-to-end at char grain, decouple, "
                    "and read where the data's own scales peak")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("pour", help="the per-bed continuous-pour reading")
    p.add_argument("--root", action="append", required=True,
                   help="a populated test-bed root (repeatable)")
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
    for r in args.root:
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
