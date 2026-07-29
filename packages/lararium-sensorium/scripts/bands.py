#!/usr/bin/env python3
"""bands — shared multi-scale analysis over declared ordered sensorium vectors.

Turns a corpus's per-chunk COHESION signal (cosine-drift over the content
embeddings, + form/structure planes when present) into worldline readings.
The live members:

  cohesion_signal   — the per-chunk drift matrix (the shared flow the other
                      members focus; every reading below names one aperture
                      held to this stream)
  changepoint_tree  — the BOUNDARY aperture: `ecp::e.divisive` (bands_ecp.R —
                      nonparametric, multivariate, divisive → a nested cut
                      tree, coarse cuts parenting fine). Python fallback:
                      `ruptures` Binseg / variance-split when R sits absent.
  couple_streams    — one COUPLING aperture: pairwise effective transfer
                      entropy, source-permutation surrogate-gated (coupling.R)
                      — directed predictive dependence, never causation.
  EWS / criticality — early-warning and slaving legs over the same signal.
  stability gate    — the reproduction grade (a hardened-math WITNESS, never
                      the confidence register): resampling-consensus marks a
                      cut REPRODUCED or FRAGILE; an un-witnessed boundary
                      never reads reproduced.

Aperture bands as frequency decomposition ride NO live surface here: the FFZ
membership-tree address (`ffz_address.py`) carries the band ladder as a
prefix code on the li side. The wavelet/EWT/scalogram functions below
(modwt_mra · ewt_servo · ridges) stand as an UNSEATED shelf — callable,
tested, canon-retired; a future aperture may re-summon them by name.

loci_io-style NDJSON over stdio (the established holder contract). Faces:
  * the library: cohesion_signal · modwt_mra · ewt_servo · changepoint_tree ·
    stability_gate · ffz_cells (pure, chroma-free — the VERIFY surface)
  * `decompose --signal <file|-> [--planes N]`  → the full stack over a raw signal
        matrix → one JSON summary (bands · boundaries · cuts · repro_grade) on stdout
  * `analyze  --sensorium <dir> [--signal <file>]` → read the corpus content(+form)
        embeddings back out of the scratch palace, build the cohesion signal, run the
        stack → NDJSON lar_ffz cells + a final JSON summary. GRACEFUL: no chroma /
        mempalace / no vectors ⇒ `{"note":"bands-skipped: …","cells":0}`, the content /
        structure planes UNAFFECTED.

Run under the mempalace venv (PYTHONPATH=<repo>/mempalace only for `analyze`'s chroma
readback; `decompose` needs neither):
  ~/.venv/bin/python3 bands.py decompose --signal fixture.ndjson
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 bands.py analyze --sensorium <dir>

Meme: lar:///ha.ka.ba/lares/api/lares/corpus#the-bands
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys

import numpy as np

# ── the aperture ladder — the FFZ bands, FINE→COARSE (D1..D5) and the address order ──────
# The MODWT detail levels map ONE-TO-ONE: D1=Pulse (finest) … D5=Theme (coarsest). The
# lar_ffz address serializes COARSE→FINE (Theme first — mirrors mesh/ffz-project.ts
# FFZ_ADDRESS_ORDER), so a coarser read drops trailing finer bands cleanly.
BANDS_FINE_TO_COARSE = ["Pulse", "Beat", "Measure", "Arc", "Theme"]
FFZ_ADDRESS_ORDER = ["Theme", "Arc", "Measure", "Beat", "Pulse"]  # coarse→fine (serialize order)
FFZ_ABSENT = "_"
N_BANDS = 5

_WAVELET = "db4"
_EPS = 1e-9
# RELATIVE floor (dimensionless) for scale-invariant precision — a residual is floored to a
# FRACTION of the target variance, never an absolute constant, so a near-noiseless slaving caps
# instead of blowing up with var(target) (#crucible-tested 2026-07-01). Tied to machine epsilon.
_EPS_REL = float(np.finfo(float).eps)

# CRITICALITY discriminator margin — a CRITICAL (Lin–Tegmark) signature is a power law with NO
# finite cutoff, so the power fit must beat the exponential (cutoff) fit by THIS margin on the
# genuine (contiguous) support. An AR(1)/Markov process decays exponentially: on its short
# contiguous support the exponential fits as-well-or-better (margin ≤ 0) → markov, never critical
# (φ=0.9 AR(1) sits at ≤ +0.00; a 1/f^β critical signal at ≥ +0.18) (#crucible-tested 2026-07-01).
_POWER_LAW_MARGIN = 0.10
# CRITICALITY span threshold — a CONTIGUOUS supra-floor run spanning ≥ THIS many decades is a
# span NO finite-correlation-length (exponential) process can reach (a φ=0.9 AR(1) dies by ≈1.6
# decades), so it certifies "critical" on its own even when a coincidentally-high exponential R²
# thins the power margin. Genuine 1/f^β support reaches ≈3 decades (#crucible-tested 2026-07-01).
_CRITICAL_SPAN_DECADES = 2.3
# NOISE-INFLATION variance-ramp threshold — a MONOTONE within-window amplitude ramp of this
# window-variance ratio (late-quartile / early-quartile) reads as pure noise-amplitude inflation,
# NOT critical slowing: it biases the sample lag-1-AC upward while NEITHER colored null reproduces
# the ramp, so it can spuriously fire. A dominant ramp vetoes the FORECAST → NOISE-INFLATION. The
# noise-inflation fixture sits ≥ 8×; a genuine critical-slowing approach ≈ 2.6× (#crucible 2026-07-01).
_NOISE_RAMP_RATIO = 5.0


# ── SIGNAL — the per-chunk cohesion / drift over the plane embeddings ─────────────────────


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < _EPS or nb < _EPS:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def cohesion_signal(planes: list[np.ndarray]) -> np.ndarray:
    """The multivariate COHESION-DRIFT matrix (rows = chunks in sequence, cols = planes).

    For each plane's stacked embeddings `V` (N×dim, in corpus sequence order), the drift
    at chunk i is `1 − cosine(V[i], V[i-1])` (monotone: more drift = less cohesion; the
    first chunk opens at drift 0). This is the wavelet-over-COHESION signal (corpus.md's
    NOVEL ground) — the SAME `1 − cosine` transform the Measure servo's centroidDriftStep
    reads, here run against the PRIOR chunk (sequential) rather than a running centroid, so
    the wavelet sees the raw scale-structure of the drift, un-smoothed. Returns an N×P
    matrix; a single all-zero-length plane contributes a zero column (graceful)."""
    cols = []
    for V in planes:
        V = np.asarray(V, dtype=float)
        if V.ndim != 2 or V.shape[0] == 0:
            continue
        n = V.shape[0]
        d = np.zeros(n, dtype=float)
        for i in range(1, n):
            d[i] = 1.0 - _cosine(V[i], V[i - 1])
        cols.append(d)
    if not cols:
        return np.zeros((0, 0), dtype=float)
    m = min(len(c) for c in cols)
    return np.column_stack([c[:m] for c in cols])


# ── SPINE — the deterministic MODWT-MRA (5 detail levels, shift-invariant, no downsample) ─


def _swt_pad_len(n: int, level: int) -> int:
    """The smallest length ≥ n divisible by 2^level (swt/mra needs a dyadic-aligned length)."""
    q = 1 << level
    return ((n + q - 1) // q) * q


def modwt_mra(signal: np.ndarray, levels: int = N_BANDS, wavelet: str = _WAVELET) -> dict:
    """MODWT multi-resolution analysis of a 1-D signal → the aperture-band details.

    `pywt.mra(x, wavelet, level, transform='swt')` returns [A_level, D_level, …, D2, D1] —
    the SMOOTH FIRST, then details coarse→fine (probe-verified against zero-crossing counts;
    the continuous-pour arc surfaced the prior inverted reading). MODWT-MRA is:
      · NO-downsample  — every band keeps full length (one coefficient per chunk), and
      · shift-invariant — the decomposition never depends on where the window starts, so
      · never-chases-noise — a band reads its OWN scale, not a transient.
    The signal is symmetric-padded to a dyadic-aligned length, decomposed, then each band
    cropped back to N. Returns {"bands": {D1..Dk fine→coarse}, "smooth", "energy", "levels"}
    where `energy[j]` is band j's variance (the per-scale power the auto-tune reads). A
    short signal (< 2^levels) transparently reduces the level count."""
    x = np.asarray(signal, dtype=float).ravel()
    n = x.size
    if n < 4:
        return {"bands": [], "smooth": x.tolist(), "energy": [], "levels": 0, "n": n}
    # Reduce the level count so 2^levels ≤ n (a short corpus can't carry 5 octaves).
    import pywt

    max_lvl = min(levels, int(np.floor(np.log2(max(n, 2)))))
    max_lvl = max(1, max_lvl)
    padlen = _swt_pad_len(n, max_lvl)
    xp = np.pad(x, (0, padlen - n), mode="symmetric") if padlen > n else x
    try:
        mra = pywt.mra(xp, wavelet, level=max_lvl, transform="swt")
    except Exception:  # noqa: BLE001 — a wavelet/length edge → a coarser retry, then flat
        try:
            mra = pywt.mra(xp, "haar", level=max_lvl, transform="swt")
        except Exception:  # noqa: BLE001
            return {"bands": [], "smooth": x.tolist(), "energy": [], "levels": 0, "n": n}
    # pywt returns [A, D_coarse..D_fine]: the smooth leads; reverse the tail so bands read D1..D_lvl fine→coarse.
    details = [np.asarray(mra[k], dtype=float)[:n] for k in range(len(mra) - 1, 0, -1)]
    smooth = np.asarray(mra[0], dtype=float)[:n]
    energy = [float(np.var(d)) for d in details]
    return {
        "bands": [d.tolist() for d in details],
        "smooth": smooth.tolist(),
        "energy": energy,
        "levels": len(details),
        "n": n,
    }


def band_energy_fractions(mra: dict) -> list[float]:
    """Each detail band's fraction of the total detail energy — the 'which band holds the
    signal' read the SPINE test asserts (a fast component concentrates in D1/D2, a slow one
    in the coarse D4/D5)."""
    e = np.asarray(mra.get("energy", []), dtype=float)
    tot = float(e.sum())
    if tot < _EPS:
        return [0.0] * len(e)
    return (e / tot).tolist()


# ── SERVO — EWT spectral boundaries + ssqueezepy ridges, EWMA-hysteresis damped ───────────


def ewt_boundaries(signal: np.ndarray, n_modes: int) -> list[float]:
    """EWT spectral boundaries (normalized 0..π) FROM the signal — the empirical wavelet
    transform finds where the spectrum splits into `n_modes` supports. Graceful: ewtpy
    absent / a degenerate signal ⇒ [] (the servo simply doesn't nudge)."""
    x = np.asarray(signal, dtype=float).ravel()
    if x.size < 8 or n_modes < 2:
        return []
    try:
        import ewtpy

        _, _, boundaries = ewtpy.EWT1D(x, N=n_modes)
        return [float(b) for b in np.asarray(boundaries).ravel()]
    except Exception:  # noqa: BLE001 — ewtpy missing / edge → no spectral evidence
        return []


def ridge_scales(signal: np.ndarray, n_ridges: int = 3) -> list[float]:
    """Dominant scales from a `ssqueezepy` scalogram ridge extraction — the characteristic
    periods the servo votes with. Graceful: ssqueezepy absent / short signal ⇒ []."""
    x = np.asarray(signal, dtype=float).ravel()
    if x.size < 16:
        return []
    try:
        import ssqueezepy as ssq

        Wx, scales = ssq.cwt(x, wavelet="morlet")
        ridges = ssq.extract_ridges(np.abs(Wx), scales, n_ridges=n_ridges)
        ridges = np.asarray(ridges)
        # The mean scale-index per ridge → a characteristic scale vote.
        s = np.asarray(scales, dtype=float).ravel()
        out = []
        for r in np.atleast_2d(ridges):
            idx = np.clip(np.round(np.mean(r)).astype(int), 0, s.size - 1)
            out.append(float(s[idx]))
        return sorted(set(out))
    except Exception:  # noqa: BLE001
        return []


def ewma_hysteresis(prev: float, target: float, evidence: float, threshold: float, alpha: float) -> float:
    """Move a boundary toward `target` by an EWMA step ONLY when the spectral `evidence`
    clears the damped `threshold`; otherwise HOLD (hysteresis). The damped step is the
    Measure servo's EWMA lifted to the boundary domain — it tracks a drifting natural scale
    without chasing noise. Returns the nudged boundary."""
    if evidence <= threshold:
        return prev
    return (1.0 - alpha) * prev + alpha * target


def ewt_servo(signal: np.ndarray, n_modes: int, prev_boundaries: list[float] | None = None,
              alpha: float = 0.3, threshold: float = 0.0) -> dict:
    """The adaptive SERVO: EWT boundaries + ridge scales → nudge `prev_boundaries` toward
    the fresh spectral evidence via EWMA-hysteresis (DAMPED). Returns
    {"boundaries", "ridges", "moved", "evidence"} — `moved` is how many boundaries actually
    shifted (a boundary held when its evidence didn't clear the threshold)."""
    fresh = ewt_boundaries(signal, n_modes)
    ridges = ridge_scales(signal)
    if not fresh:
        return {"boundaries": list(prev_boundaries or []), "ridges": ridges, "moved": 0, "evidence": 0.0}
    if prev_boundaries is None or len(prev_boundaries) != len(fresh):
        # First observation (or a mode-count change) — adopt the fresh boundaries outright.
        return {"boundaries": fresh, "ridges": ridges, "moved": len(fresh), "evidence": 1.0}
    moved = 0
    out = []
    for p, t in zip(prev_boundaries, fresh):
        evidence = abs(t - p)  # the spectral pull = how far the fresh boundary sits from the held one
        nb = ewma_hysteresis(p, t, evidence, threshold, alpha)
        if abs(nb - p) > _EPS:
            moved += 1
        out.append(nb)
    return {"boundaries": out, "ridges": ridges, "moved": moved, "evidence": float(np.mean([abs(a - b) for a, b in zip(out, prev_boundaries)]) if out else 0.0)}


# ── AUTO-TUNE — scale count (EWT/ridge vote + wavelet-variance elbow) + BOCPD hazards ─────


def wavelet_variance_elbow(mra: dict) -> int:
    """The scale-count the corpus's own variance spectrum supports: the level index past
    which per-scale wavelet variance stops falling meaningfully (the elbow). A proxy for
    R `waveslim::wave.variance` — the largest j whose variance clears a fraction of the
    peak, so pure-noise tail scales don't manufacture bands. Clamped to [1, levels]."""
    e = np.asarray(mra.get("energy", []), dtype=float)
    if e.size == 0:
        return 0
    peak = float(e.max())
    if peak < _EPS:
        return 1
    keep = int(np.sum(e >= 0.1 * peak))
    return max(1, min(keep, e.size))


def bocpd_changepoints(signal: np.ndarray, hazard_lambda: float) -> list[int]:
    """Bayesian Online Changepoint Detection over a 1-D band signal (the `bocd` package),
    hazard 1/λ. Returns the indices where the MAP run-length RESETS (a changepoint). The
    scale-specific λ (derived from the band's wavelet variance) makes a coarse band expect
    long segments and a fine band short ones. Graceful: bocd absent ⇒ []."""
    x = np.asarray(signal, dtype=float).ravel()
    if x.size < 4:
        return []
    try:
        import bocd

        bc = bocd.BayesianOnlineChangePointDetection(
            bocd.ConstantHazard(max(2.0, hazard_lambda)),
            bocd.StudentT(mu=0, kappa=1, alpha=1, beta=1),
        )
        rt_prev = 0
        cps = []
        for i, v in enumerate(x):
            bc.update(v)
            rt = int(bc.rt)
            if i > 0 and rt < rt_prev:  # the MAP run-length collapsed → a boundary
                cps.append(i)
            rt_prev = rt
        return cps
    except Exception:  # noqa: BLE001
        return []


# ── TREE — ecp::e.divisive (R leg) → nested changepoint tree; ruptures fallback ───────


def _r_available() -> bool:
    return shutil.which("Rscript") is not None


def _ecp_divisive_R(matrix: np.ndarray, min_size: int, sig_lvl: float) -> list[int] | None:
    """Invoke the thin R leg (bands_ecp.R) → `ecp::e.divisive` over the multivariate
    drift matrix. Returns the ORDERED changepoint indices (0-based, coarse→fine — the
    divisive discovery order IS the hierarchy) or None when R / the leg / ecp is
    unavailable (⇒ the caller falls to the ruptures path). loci_io-style: one NDJSON
    request on stdin, one NDJSON response on stdout."""
    if not _r_available():
        return None
    r_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bands_ecp.R")
    if not os.path.exists(r_script):
        return None
    req = json.dumps({
        "op": "e_divisive",
        "matrix": np.asarray(matrix, dtype=float).tolist(),
        "min_size": int(min_size),
        "sig_lvl": float(sig_lvl),
    })
    try:
        proc = subprocess.run(
            ["Rscript", "--vanilla", r_script],
            input=req, capture_output=True, text=True, timeout=120,
        )
        if proc.returncode != 0:
            return None
        line = [ln for ln in proc.stdout.splitlines() if ln.strip().startswith("{")]
        if not line:
            return None
        resp = json.loads(line[-1])
        if not resp.get("ok"):
            return None
        return [int(c) for c in resp.get("order", [])]
    except Exception:  # noqa: BLE001 — any R fault ⇒ ruptures fallback
        return None


def _ruptures_divisive(matrix: np.ndarray, max_cuts: int, min_size: int) -> tuple[list[int], str]:
    """Python fallback for the divisive tree: `ruptures` Binseg (rbf kernel) run
    incrementally n_bkps=1,2,… — the ORDER a breakpoint first appears IS a divisive
    hierarchy (coarse cuts discovered before fine). Returns the ordered cut indices + the
    engine name. Falls to KernelCPD-rbf, then a variance-split, on any fault."""
    M = np.asarray(matrix, dtype=float)
    if M.ndim == 1:
        M = M.reshape(-1, 1)
    n = M.shape[0]
    if n < 2 * min_size + 1:
        return [], "none"
    cap = min(max_cuts, max(1, n // max(min_size, 1) - 1))
    try:
        import ruptures as rpt

        algo = rpt.Binseg(model="rbf", min_size=min_size, jump=1).fit(M)
        seen: list[int] = []
        for k in range(1, cap + 1):
            try:
                bkps = algo.predict(n_bkps=k)
            except Exception:  # noqa: BLE001 — asked for more cuts than the signal supports
                break
            for b in bkps:
                if b < n and b not in seen:
                    seen.append(int(b))  # the NEW cut this refinement added — the next tree level
        return seen, "ruptures-binseg-rbf"
    except Exception:  # noqa: BLE001 — ruptures absent → a crude variance split
        return _variance_split(M, cap, min_size), "variance-split"


def _variance_split(M: np.ndarray, max_cuts: int, min_size: int) -> list[int]:
    """The last-resort divisive splitter (no ruptures / no R): recursively cut each segment
    at its max cumulative-variance-drop point. Keeps the nested (coarse→fine) order."""
    n = M.shape[0]
    order: list[int] = []
    segments = [(0, n)]
    while segments and len(order) < max_cuts:
        segments.sort(key=lambda s: s[1] - s[0], reverse=True)
        a, b = segments.pop(0)
        if b - a < 2 * min_size:
            continue
        seg = M[a:b]
        best, best_gain = -1, -1.0
        base = float(np.sum(np.var(seg, axis=0)))
        for i in range(min_size, (b - a) - min_size):
            left, right = seg[:i], seg[i:]
            gain = base - (float(np.sum(np.var(left, axis=0))) + float(np.sum(np.var(right, axis=0))))
            if gain > best_gain:
                best_gain, best = gain, i
        if best < 0:
            continue
        cut = a + best
        order.append(cut)
        segments.append((a, cut))
        segments.append((cut, b))
    return order


# ── COUPLE — RTransferEntropy::calc_ete (R leg) → the cross-stream lead-lag plane ─────


def _couple_ete_R(matrix: np.ndarray, lx: int = 1, ly: int = 1, shuffles: int = 100,
                  nboot: int = 100, seed: int = 1, names: list[str] | None = None,
                  q: float = 0.1, quantiles: tuple[int, int] = (5, 95)) -> dict | None:
    """Invoke the thin R leg (coupling.R) → `RTransferEntropy::calc_ete` over the N-signal
    matrix (rows=time, cols=signals) → the pairwise DIRECTIONAL effective-transfer-entropy
    matrix (ete[i][j] = flow i→j) + a source-permutation bootstrap p-value matrix. Returns the
    parsed verdict dict, or None when R / the leg / RTransferEntropy is unavailable (⇒ the
    caller degrades to a graceful skip — coupling has NO python fallback, TE is the R plane).
    loci_io-style: one NDJSON request on stdin, one NDJSON response on stdout."""
    if not _r_available():
        return None
    r_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "coupling.R")
    if not os.path.exists(r_script):
        return None
    M = np.asarray(matrix, dtype=float)
    if M.ndim != 2 or M.shape[1] < 2 or M.shape[0] < 8:
        return None
    req = json.dumps({
        "op": "couple",
        "matrix": M.tolist(),
        "lx": int(lx), "ly": int(ly),
        "shuffles": int(shuffles), "nboot": int(nboot), "seed": int(seed),
        "q": float(q), "quantiles": list(quantiles),
        "names": list(names) if names is not None else [f"s{i}" for i in range(M.shape[1])],
    })
    try:
        proc = subprocess.run(
            ["Rscript", "--vanilla", r_script],
            input=req, capture_output=True, text=True, timeout=600,
        )
        if proc.returncode != 0:
            return None
        line = [ln for ln in proc.stdout.splitlines() if ln.strip().startswith("{")]
        if not line:
            return None
        resp = json.loads(line[-1])
        return resp if resp.get("ok") else None
    except Exception:  # noqa: BLE001 — any R fault ⇒ graceful skip
        return None


def couple_streams(matrix: np.ndarray, lx: int = 1, ly: int = 1, shuffles: int = 100,
                   nboot: int = 100, seed: int = 1, names: list[str] | None = None,
                   alpha: float = 0.05) -> dict:
    """The cross-stream COUPLING plane (corpus.md #the-bands, the sensorium's who-leads-whom).

    `RTransferEntropy::calc_ete` over the N-signal matrix → the directional effective-transfer-
    entropy matrix + bootstrap p-values (the R leg coupling.R). On top of the raw matrices
    this adds the READ the coordinator wants: per ORDERED pair a NET flow (ete[i→j] − ete[j→i],
    the lead-lag) and a SIGNIFICANT-edge list (p ≤ alpha). Rscript never DECIDES — it computes
    the ete/p matrices; the leader read is a pure arithmetic projection here. GRACEFUL: R absent
    / RTransferEntropy absent ⇒ {"note":"coupling-skipped: …","edges":0} (never fatal — TE is
    the R plane with no python fallback, exactly like `analyze`'s no-chroma degrade)."""
    M = np.asarray(matrix, dtype=float)
    if M.ndim == 1:
        M = M.reshape(-1, 1)
    if M.shape[1] < 2:
        return {"note": "coupling-skipped: need ≥2 signals", "edges": 0, "r_available": _r_available()}
    if M.shape[0] < 8:
        return {"note": "coupling-skipped: too few samples (<8)", "edges": 0, "r_available": _r_available()}
    names = list(names) if names is not None else [f"s{i}" for i in range(M.shape[1])]
    res = _couple_ete_R(M, lx=lx, ly=ly, shuffles=shuffles, nboot=nboot, seed=seed, names=names)
    if res is None:
        why = "R absent" if not _r_available() else "RTransferEntropy absent / a fault"
        return {"note": f"coupling-skipped: {why}", "edges": 0, "r_available": _r_available()}
    K = int(res["n_signals"])
    ete = res["ete"]
    pval = res["pval"]
    # Net lead-lag + the significant directed edges (p ≤ alpha) — the who-leads-whom read.
    lead_lag = [[0.0] * K for _ in range(K)]
    edges = []
    for i in range(K):
        for j in range(K):
            if i == j:
                continue
            eij = float(ete[i][j]) if ete[i][j] is not None else 0.0
            eji = float(ete[j][i]) if ete[j][i] is not None else 0.0
            lead_lag[i][j] = eij - eji
            p = pval[i][j]
            if p is not None and float(p) <= alpha and eij > 0:
                edges.append({"from": names[i], "to": names[j], "ete": eij,
                              "p": float(p), "net": eij - eji})
    edges.sort(key=lambda e: (-e["ete"], e["p"]))
    return {
        "engine": res["engine"],
        "n_signals": K,
        "names": names,
        "ete": ete,
        "te": res.get("te"),
        "pval": pval,
        "lead_lag": lead_lag,
        "edges": edges,
        "alpha": alpha,
        "nboot": int(res.get("nboot", nboot)),
        "r_available": True,
    }


# ── TREE — ecp::e.divisive (R leg) → nested changepoint tree; ruptures fallback (cont.) ─


def changepoint_tree(matrix: np.ndarray, max_cuts: int, min_size: int = 2,
                     sig_lvl: float = 0.05) -> dict:
    """The multivariate nested changepoint tree (coarse cuts parent fine cuts). Tries the R
    `ecp::e.divisive` leg first (nonparametric, native-divisive), falls to ruptures
    Binseg-rbf, then a variance split. Returns {"order": [cut indices, coarse→fine],
    "engine": <name>}."""
    order = _ecp_divisive_R(matrix, min_size, sig_lvl)
    if order is not None:
        return {"order": order, "engine": "ecp-e.divisive"}
    o, engine = _ruptures_divisive(matrix, max_cuts, min_size)
    return {"order": o, "engine": engine}


# ── the band allocation — distribute the ordered cuts across the 5 aperture bands ─────────


def allocate_band_cuts(order: list[int], mra: dict) -> list[int]:
    """Split the ordered (coarse→fine) cut list into a NESTED per-band cut-count vector
    [n_theme ≤ n_arc ≤ n_measure ≤ n_beat], weighting each band by its MODWT detail-energy
    so a corpus whose power sits at a coarse scale grows the coarse bands. Nesting is the
    load-bearing invariant: a coarser band's cuts are a PREFIX of a finer band's, so the
    lar_ffz address stays prefix-truncatable (the ultrametric holds). Pulse is per-chunk
    (implicit — the finest block), so only Theme..Beat draw from the shared cut budget."""
    K = len(order)
    # Coarse→fine band energies (D5=Theme … D1=Beat). Pad/truncate to 4 coarse bands.
    frac = band_energy_fractions(mra)  # fine→coarse (D1..Dk)
    coarse_to_fine = list(reversed(frac))  # Theme-ward first
    # Cumulative cut budget grows fine→coarse; map onto [Theme, Arc, Measure, Beat].
    # Beat (finest non-pulse) may use ALL K cuts; each coarser band uses a shrinking prefix.
    if K == 0:
        return [0, 0, 0, 0]
    # Weight the 4 coarse bands; default to a dyadic taper when energy is flat/absent.
    weights = coarse_to_fine[:4] + [0.0] * max(0, 4 - len(coarse_to_fine))
    if sum(weights) < _EPS:
        weights = [1.0, 2.0, 4.0, 8.0]  # Theme few → Beat many (dyadic)
    w = np.asarray(weights[:4], dtype=float)
    # Cumulative, monotone nondecreasing Theme→Beat, capped at K.
    cw = np.cumsum(w / w.sum())  # 0<..<=1, increasing
    counts = [int(round(c * K)) for c in cw]
    # Enforce nondecreasing + [0, K].
    for i in range(1, len(counts)):
        counts[i] = max(counts[i], counts[i - 1])
    counts = [max(0, min(K, c)) for c in counts]
    return counts  # [Theme, Arc, Measure, Beat]


def _segment_labels(n: int, cuts: list[int]) -> list[int]:
    """Assign each of n chunks a segment ordinal given sorted cut positions (a cut at index
    c opens a new segment starting at c)."""
    labels = [0] * n
    seg = 0
    cutset = sorted(set(c for c in cuts if 0 < c < n))
    ci = 0
    for i in range(n):
        while ci < len(cutset) and i >= cutset[ci]:
            seg += 1
            ci += 1
        labels[i] = seg
    return labels


def ffz_cells(order: list[int], band_counts: list[int], n: int,
              grades: dict | None = None) -> list[dict]:
    """Build the per-chunk lar_ffz membership address from the nested cut tree.

    For each aperture band the segmentation uses the first `band_counts[b]` cuts (a PREFIX
    of the finer band's cuts → nesting), so the address is prefix-truncatable exactly like
    mesh/ffz-project.ts ffzMembershipAddress. Pulse = the chunk index (the finest block).
    Returns one row per chunk: {"index", "cells": {Theme,Arc,Measure,Beat,Pulse},
    "lar_ffz": "<profile>/…", "repro_grade": reproduced|fragile}."""
    theme_n, arc_n, measure_n, beat_n = (band_counts + [0, 0, 0, 0])[:4]
    labels = {
        "Theme": _segment_labels(n, order[:theme_n]),
        "Arc": _segment_labels(n, order[:arc_n]),
        "Measure": _segment_labels(n, order[:measure_n]),
        "Beat": _segment_labels(n, order[:beat_n]),
        "Pulse": list(range(n)),
    }
    grades_map = grades or {}
    rows = []
    for i in range(n):
        cells = {b: labels[b][i] for b in FFZ_ADDRESS_ORDER}
        segs = [str(cells[b]) for b in FFZ_ADDRESS_ORDER]
        rows.append({
            "index": i,
            "cells": cells,
            "lar_ffz": "corpus/" + ".".join(segs),
            "repro_grade": grades_map.get(i, "reproduced"),
        })
    return rows


# ── GATE — resampling-consensus: mark a cut REPRODUCED only where a bootstrap reproduces it ─────


def _noise_floor_per_col(M: np.ndarray) -> np.ndarray:
    """Robust per-column noise level from the first-difference MAD (σ = MAD/0.6745/√2 — the
    difference doubles the variance). This is the wavelet-thresholding floor generalized to
    the multivariate signal: the perturbation scale the resampling-gate jitters at."""
    diff = np.diff(M, axis=0)
    if diff.shape[0] == 0:
        return np.full(M.shape[1], 1e-6)
    med = np.median(diff, axis=0)
    sig = np.median(np.abs(diff - med), axis=0) / 0.6745 / np.sqrt(2.0)
    return np.maximum(sig, 1e-6)


def stability_gate(matrix: np.ndarray, order: list[int], n_boot: int = 40,
                   tol: int = 2, seed: int = 12345, method: str = "bootstrap",
                   floor_mult: float = 1.0) -> dict:
    """The reproduction grade — a hardened-math WITNESS (NOT the confidence register; the wiki's
    data→meme/lore→canon promotion is a separate CRDT-layer act that CONSUMES this grade as data).
    Perturb the multivariate signal at its own NOISE FLOOR (index-PRESERVING, so a cut's location
    stays comparable — unlike a sequence-resample, which scrambles where a boundary sits),
    re-detect the changepoint tree on each replicate, and score how often each original cut
    REPRODUCES (a replicate cut lands within `tol` chunks). A cut backed by a shift larger
    than the noise floor survives the jitter (reads REPRODUCED, support ≥ ½); a cut resting on
    sub-floor wiggle reads FRAGILE. Two methods:
      · "bootstrap"  — additive noise-floor jitter (a wild/residual bootstrap), the default.
      · "jackknife"  — leave-a-contiguous-block-out, with index-shift-aware reproduction
                       (a cut past the dropped block is expected `block` chunks earlier).
    Returns {"cut_support", "grade_of_cut", "consensus", "method"}. NEVER lets an
    un-witnessed boundary read reproduced."""
    M = np.asarray(matrix, dtype=float)
    if M.ndim == 1:
        M = M.reshape(-1, 1)
    n = M.shape[0]
    if n < 8 or not order:
        return {"cut_support": {}, "grade_of_cut": {}, "consensus": 0.0, "method": method}
    rng = np.random.default_rng(seed)
    max_cuts = len(order)
    hits = {int(c): 0 for c in order}
    sigma = _noise_floor_per_col(M) * floor_mult
    block = max(2, n // 8)
    valid = 0
    for _ in range(n_boot):
        if method == "jackknife":
            drop = int(rng.integers(0, max(1, n - block)))
            keep = np.concatenate([np.arange(0, drop), np.arange(min(n, drop + block), n)])
            Mr = M[keep]
            shift = block  # indices ≥ drop+block moved left by `block` in Mr
            valid += 1
            rcuts = changepoint_tree(Mr, max_cuts=max_cuts, min_size=2)["order"]
            for c in order:
                exp = int(c) if int(c) < drop else int(c) - shift  # the cut's index in Mr
                if exp < 0:
                    continue
                if any(abs(int(rc) - exp) <= tol for rc in rcuts):
                    hits[int(c)] += 1
        else:  # noise-floor jitter — index-preserving
            Mr = M + rng.normal(0, 1, M.shape) * sigma
            valid += 1
            rcuts = changepoint_tree(Mr, max_cuts=max_cuts, min_size=2)["order"]
            for c in order:
                if any(abs(int(rc) - int(c)) <= tol for rc in rcuts):
                    hits[int(c)] += 1
    denom = max(1, valid)
    support = {int(c): hits[int(c)] / denom for c in order}
    grade = {int(c): ("reproduced" if support[int(c)] >= 0.5 else "fragile") for c in order}
    consensus = float(np.mean(list(support.values()))) if support else 0.0
    return {"cut_support": support, "grade_of_cut": grade, "consensus": consensus, "method": method}


def chunk_grades(order: list[int], grade_of_cut: dict, n: int) -> dict:
    """Each chunk inherits the WEAKEST grade of its BOUNDING cuts — the nearest cut at-or-left
    (its segment opener) AND the nearest cut to its right (its closer), never the whole prefix.
    So a reproduced late region reads reproduced even after an earlier fragile cut. A missing
    (un-witnessed) bounding cut defaults FRAGILE — fail-CLOSED, the gate's own vow + fail-safe
    defaults (an un-witnessed boundary NEVER reads reproduced). An un-CUT chunk (order empty →
    no bounding cut at all) reads reproduced: no boundary claim to distrust."""
    cuts = [int(c) for c in order]
    grade: dict = {}
    for i in range(n):
        left = max((c for c in cuts if c <= i), default=None)
        right = min((c for c in cuts if c > i), default=None)
        bounding = [grade_of_cut.get(c, "fragile") for c in (left, right) if c is not None]
        grade[i] = "fragile" if any(r == "fragile" for r in bounding) else "reproduced"
    return grade


def wavelet_threshold_floor(mra: dict) -> float:
    """The per-band noise floor via universal (VisuShrink) wavelet thresholding on the
    finest detail: `σ·√(2·ln n)`, σ = MAD(D1)/0.6745. Below this the finest band reads pure
    noise — a cut resting only on sub-floor detail is suspect. Returns the threshold (0 when
    no bands)."""
    bands = mra.get("bands", [])
    if not bands:
        return 0.0
    d1 = np.asarray(bands[0], dtype=float)
    n = max(2, d1.size)
    sigma = float(np.median(np.abs(d1 - np.median(d1))) / 0.6745)
    return sigma * float(np.sqrt(2.0 * np.log(n)))


# ── EWS — the PREDICTIVE bands leg: forecast the regime-shift BEFORE it commits ────────────
#
# sensorium-machina.md #the-py-r-web (the dynamical-systems leg): critical-slowing-
# down. As a system approaches a bifurcation it loses resilience — recovery from perturbation
# slows — and this shows up BEFORE the transition commits as a RISING lag-1 autocorrelation
# and RISING variance. The `changepoint_tree` (ecp) detects a shift once it COMMITS; the EWS
# leg forecasts its APPROACH. The R keel (sensorium-machina #ki) is LOAD-BEARING:
# a rising-trend indicator is worthless without a false-positive guard, so a forecast FIRES
# only on (a) SURROGATE-significance — the observed Kendall-τ beats an AR(1)-null ensemble —
# AND (b) MULTI-BAND agreement — several MODWT bands independently show the rising trend.
#
# The lightweight estimators (rolling variance / lag-1-AC / Kendall-τ) run NATIVE (numpy only,
# dependency-light hot path); the R `earlywarnings::generic_ews` + `surrogates_ews` route is
# used WHEN PRESENT (ews.R, graceful skip when absent) — mirroring the ecp / ruptures degrade.


def kendall_tau(y: np.ndarray) -> float:
    """Kendall's τ-b of a series against its time index — the monotone-TREND statistic EWS
    reads (a rising indicator ⇒ τ > 0). Native O(n²) (n = the rolling-indicator length, a few
    hundred), tie-corrected. Returns 0 for a degenerate/short series."""
    y = np.asarray(y, dtype=float).ravel()
    n = y.size
    if n < 3:
        return 0.0
    conc = disc = 0
    ty = 0  # ties in y (x = time is never tied)
    for i in range(n - 1):
        dy = y[i + 1:] - y[i]
        conc += int(np.sum(dy > 0))
        disc += int(np.sum(dy < 0))
        ty += int(np.sum(dy == 0))
    n0 = n * (n - 1) // 2
    denom = math.sqrt(max(1.0, (n0 - ty)) * n0)
    return (conc - disc) / denom if denom > 0 else 0.0


def _rolling(x: np.ndarray, window: int, fn) -> np.ndarray:
    """A right-aligned rolling map — `fn` over each length-`window` slice, one value per step
    from index `window-1` on. Returns the indicator series (length n-window+1)."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if n < window or window < 2:
        return np.zeros(0, dtype=float)
    return np.asarray([fn(x[i - window + 1:i + 1]) for i in range(window - 1, n)], dtype=float)


def _lag1_ac(seg: np.ndarray) -> float:
    """Lag-1 autocorrelation of one window (the critical-slowing-down precursor)."""
    s = np.asarray(seg, dtype=float).ravel()
    s = s - s.mean()
    d = float(np.dot(s, s))
    if d < _EPS:
        return 0.0
    return float(np.dot(s[:-1], s[1:]) / d)


def _skew(seg: np.ndarray) -> float:
    s = np.asarray(seg, dtype=float).ravel()
    sd = s.std()
    if sd < _EPS:
        return 0.0
    return float(np.mean(((s - s.mean()) / sd) ** 3))


def generic_ews(x: np.ndarray, window: int = 50) -> dict:
    """The generic early-warning indicators over a 1-D signal (mirrors R
    `earlywarnings::generic_ews`): the rolling lag-1-AC, variance, and skewness series, each
    with its Kendall-τ TREND. A rising AC1/variance (τ > 0) is the critical-slowing-down
    precursor. Returns {ar1_tau, var_tau, skew_tau, n_windows, …}. Graceful (τ=0) when the
    signal is shorter than the window."""
    x = np.asarray(x, dtype=float).ravel()
    ar1 = _rolling(x, window, _lag1_ac)
    var = _rolling(x, window, lambda s: float(np.var(s)))
    skew = _rolling(x, window, _skew)
    return {
        "ar1": ar1.tolist(), "variance": var.tolist(), "skewness": skew.tolist(),
        "ar1_tau": kendall_tau(ar1), "var_tau": kendall_tau(var), "skew_tau": kendall_tau(skew),
        "n_windows": int(ar1.size), "window": window,
    }


def ar1_surrogate(x: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """One AR(1)-null SURROGATE of `x`: fit `x[t] ≈ a·x[t-1]` (+ residual σ), then simulate a
    fresh series of the same length with the SAME a and σ. The AR(1) null carries the signal's
    linear autocorrelation but NO trend in it — so an indicator that TRENDS in `x` but not in
    the surrogate ensemble is unlikely to be an AR(1)-noise artefact (the `surrogates_ews`
    false-positive guard)."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if n < 3:
        return x.copy()
    xc = x - x.mean()
    denom = float(np.dot(xc[:-1], xc[:-1]))
    a = float(np.dot(xc[:-1], xc[1:]) / denom) if denom > _EPS else 0.0
    a = float(np.clip(a, -0.999, 0.999))
    resid = xc[1:] - a * xc[:-1]
    sd = float(np.std(resid)) or 1e-6
    s = np.zeros(n)
    # Match the observed INITIAL CONDITION (s[0] = x[0]−mean) rather than draw from the
    # stationary distribution: a series that opens far from equilibrium (a burn-in transient)
    # then produces surrogates with the SAME transient, so the null is FAIR — a burn-in-driven
    # rising trend appears in the surrogates too and no longer reads as a false CSD forecast.
    s[0] = xc[0]
    for t in range(1, n):
        s[t] = a * s[t - 1] + rng.normal(0, sd)
    return s + x.mean()


def phase_randomized_surrogate(x: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """One PHASE-RANDOMIZED (Fourier) surrogate of `x`: preserve the FULL power spectrum (all
    of the signal's COLOR — its linear autocorrelation at every lag) and randomize only the
    Fourier phases → a stationary Gaussian series with an IDENTICAL spectrum but no trend and
    no time-asymmetry. THE COLORED NULL (sensorium-machina #ki, the hardening): a
    white shuffle destroys the color and OVER-rejects on long-range-correlated streams (text
    and code ARE colored), so a rising-variance artefact of the color reads as a false
    positive; this null keeps the color and only tests for the trend/nonstationarity the
    critical-slowing-down forecast actually claims. Preserves DC (mean) and the Nyquist term."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if n < 4:
        return x.copy()
    X = np.fft.rfft(x)
    mag = np.abs(X)
    phases = rng.uniform(0.0, 2.0 * np.pi, mag.size)
    phases[0] = 0.0  # keep DC real (preserve the mean)
    if n % 2 == 0:
        phases[-1] = 0.0  # Nyquist term is real for an even-length series
    s = np.fft.irfft(mag * np.exp(1j * phases), n=n)
    return np.asarray(s, dtype=float)


def surrogate_pvalue(x: np.ndarray, window: int, indicator: str = "ar1",
                     n_surr: int = 200, seed: int = 1, surrogate: str = "ar1") -> float:
    """One-sided surrogate p-value for a RISING indicator trend: the fraction of NULL
    surrogates whose indicator Kendall-τ is ≥ the observed τ. A small p ⇒ the rising trend is
    unlikely under a null that carries the signal's autocorrelation (the R-keel: detection that
    survives its own null, sensorium-machina #ki). Two COLORED nulls, never a white
    shuffle: `surrogate="ar1"` — the init-matched AR(1) null (carries lag-1 AC + the observed
    burn-in transient, so a from-equilibrium transient appears in the null too); `="phase"` —
    the phase-randomized null (carries the FULL spectrum, so a variance-inflation artefact of
    the color appears in the null too). Graceful p=1.0 on a short signal."""
    x = np.asarray(x, dtype=float).ravel()
    key = {"ar1": _lag1_ac, "variance": lambda s: float(np.var(s)), "skewness": _skew}[indicator]
    obs = kendall_tau(_rolling(x, window, key))
    if _rolling(x, window, key).size < 3:
        return 1.0
    gen = phase_randomized_surrogate if surrogate == "phase" else ar1_surrogate
    rng = np.random.default_rng(seed)
    ge = 1  # +1 (the observed itself) — a conservative, never-zero p
    for _ in range(n_surr):
        sur = gen(x, rng)
        if kendall_tau(_rolling(sur, window, key)) >= obs:
            ge += 1
    return ge / (n_surr + 1)


def _ews_R(x: np.ndarray, window: int) -> dict | None:
    """Route to the R `earlywarnings` leg (ews.R → generic_ews + surrogates_ews) when the
    package is installed. Returns the parsed verdict or None (⇒ the native estimators run).
    Graceful, exactly like `_ecp_divisive_R` — R / earlywarnings absent is never fatal."""
    if not _r_available():
        return None
    r_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ews.R")
    if not os.path.exists(r_script):
        return None
    req = json.dumps({"op": "generic_ews", "x": np.asarray(x, dtype=float).ravel().tolist(),
                      "window": int(window)})
    try:
        proc = subprocess.run(["Rscript", "--vanilla", r_script], input=req,
                              capture_output=True, text=True, timeout=180)
        if proc.returncode != 0:
            return None
        line = [ln for ln in proc.stdout.splitlines() if ln.strip().startswith("{")]
        if not line:
            return None
        resp = json.loads(line[-1])
        return resp if resp.get("ok") else None
    except Exception:  # noqa: BLE001 — any R fault ⇒ native fallback
        return None


def forecast_ews(matrix: np.ndarray, window: int = 50, n_surr: int = 200,
                 alpha: float = 0.05, min_bands: int = 2, seed: int = 1) -> dict:
    """The PREDICTIVE bands leg — forecast an approaching bifurcation from critical-slowing-
    down (sensorium-machina #the-py-r-web). Feeds:
      · the POOLED signal (mean across columns) carries the PRIMARY indicators — rolling
        lag-1-AC + variance + their Kendall-τ, with an AR(1)-surrogate p-value on each.
      · the MODWT detail BANDS carry the multi-band agreement guard — each band's rolling-
        variance Kendall-τ; agreement = how many bands trend UP together.

    THE GUARD (the R keel, LOAD-BEARING) — three teeth, ALL required to FIRE:
      (1) AC1-SIGNIFICANT — the lag-1-AC rising trend beats BOTH colored nulls (the AR(1)
          init-matched AND the phase-randomized spectral null; p = max of the two ≤ alpha).
          The AC1 rise is the critical-slowing-down-SPECIFIC tooth.
      (2) VARIANCE ≠ AC1 SEPARATION + the RAMP VETO — a rising VARIANCE with NO rising AC1 reads
          as pure NOISE-AMPLITUDE INFLATION (no bifurcation), NOT a forecast. AND a DOMINANT
          monotone within-window variance RAMP (late/early window-variance ratio ≥ _NOISE_RAMP_
          RATIO) VETOES the fire even when the AC1 reads significant: the ramp biases the sample
          lag-1-AC upward and NEITHER colored null reproduces it (the AR(1) null fits one constant
          σ; the phase-randomized null is stationary), so a ramp-driven AC1 is untrustworthy → the
          path reports NOISE-INFLATION. Genuine critical slowing rides a MODEST ramp (≈2.6×).
      (3) MULTI-BAND agreement — ≥ `min_bands` MODWT bands show a rising variance-τ.
    A single tooth alone stays a WATCH, never a fire (the apophenia the keel guards against).
    Returns the full verdict (fired · state · the per-indicator τ / colored-null p · the
    variance-vs-AC1 separation · the per-band agreement · the R/native engine)."""
    M = np.asarray(matrix, dtype=float)
    if M.ndim == 1:
        M = M.reshape(-1, 1)
    n = M.shape[0]
    win = max(5, min(window, n // 2)) if n >= 10 else 0
    if n < 12 or win < 5:
        return {"fired": False, "note": "ews-skipped: too few samples (<12)", "n": n,
                "r_available": _r_available()}
    pooled = M.mean(axis=1)

    # PRIMARY indicators — R route when earlywarnings stands, else native.
    r_out = _ews_R(pooled, win)
    if r_out is not None:
        ar1_tau, var_tau = float(r_out.get("ar1_tau", 0.0)), float(r_out.get("var_tau", 0.0))
        ar1_p = float(r_out.get("ar1_p", 1.0))
        var_p = float(r_out.get("var_p", 1.0))
        engine = "earlywarnings-R"
    else:
        gews = generic_ews(pooled, win)
        ar1_tau, var_tau = gews["ar1_tau"], gews["var_tau"]
        # CONSERVATIVE: the trend must beat BOTH colored nulls — the AR(1) init-matched null
        # (guards the burn-in transient) AND the phase-randomized spectral null (guards the
        # color-driven variance-inflation artefact). p = the WORSE (max) of the two.
        ar1_p = max(surrogate_pvalue(pooled, win, "ar1", n_surr=n_surr, seed=seed, surrogate="ar1"),
                    surrogate_pvalue(pooled, win, "ar1", n_surr=n_surr, seed=seed, surrogate="phase"))
        var_p = max(surrogate_pvalue(pooled, win, "variance", n_surr=n_surr, seed=seed, surrogate="ar1"),
                    surrogate_pvalue(pooled, win, "variance", n_surr=n_surr, seed=seed, surrogate="phase"))
        engine = "native-ews"

    # MULTI-BAND agreement — each MODWT detail band's rolling-variance trend.
    mra = modwt_mra(pooled)
    band_taus = []
    for j, bname in enumerate(BANDS_FINE_TO_COARSE[: mra.get("levels", 0)]):
        bsig = np.asarray(mra["bands"][j], dtype=float)
        bwin = max(5, min(win, bsig.size // 2))
        vtau = kendall_tau(_rolling(bsig, bwin, lambda s: float(np.var(s)))) if bsig.size >= 12 else 0.0
        band_taus.append({"band": bname, "var_tau": vtau, "rising": vtau > 0.0})
    n_rising = sum(1 for b in band_taus if b["rising"])

    # THE WITHIN-WINDOW VARIANCE-RAMP guard (the third false-positive tooth) — a MONOTONE
    # amplitude ramp (rising σ, FIXED dynamics: no critical slowing) biases the SAMPLE lag-1-AC
    # upward inside the window, and NEITHER colored null reproduces that ramp (the AR(1) null
    # fits ONE constant σ; the phase-randomized null is stationary), so the spurious rising AC1
    # can clear the surrogate test → a FALSE forecast. A dominant rising variance ramp IS the
    # noise-inflation engine, not a bifurcation: measure its magnitude (the late-quartile /
    # early-quartile window-variance ratio) and VETO the fire. Genuine critical slowing rides its
    # robust AC1 tooth at a MODEST measured ramp (the CSD fixture ≈ 2.6×), so it is untouched.
    var_series = _rolling(pooled, win, lambda s: float(np.var(s)))
    if var_series.size >= 4:
        q = max(1, var_series.size // 4)
        ramp_ratio = float(np.mean(var_series[-q:]) / (np.mean(var_series[:q]) + _EPS))
    else:
        ramp_ratio = 1.0

    # THE VARIANCE ≠ AC1 SEPARATION (the false-positive teeth): a rising AC1 that beats the
    # colored null is the CSD-specific tooth; a rising VARIANCE alone (AC1 NOT rising) is pure
    # noise-amplitude inflation — no bifurcation. Only the AC1 tooth may FIRE.
    ac1_sig = bool(ar1_tau > 0.0 and ar1_p <= alpha)
    var_sig = bool(var_tau > 0.0 and var_p <= alpha)
    # a DOMINANT monotone amplitude ramp — the noise-inflation false-positive engine; even a
    # (ramp-biased) AC1 that reads significant is untrustworthy under it, so it vetoes the fire.
    strong_ramp = bool(var_sig and ramp_ratio >= _NOISE_RAMP_RATIO)
    noise_inflation = bool(strong_ramp or (var_sig and not ac1_sig))  # ramp, or var-up-AC1-flat
    surrogate_sig = ac1_sig or var_sig                # kept for back-compat (any null beaten)
    multi_band = n_rising >= min_bands

    # THE FIRE CONDITION — AC1-significant (CSD-specific) AND multi-band agreement, AND NO
    # dominant variance ramp. Variance CORROBORATES but can never fire alone, and a dominant
    # ramp VETOES (that path reports NOISE-INFLATION, never FORECAST).
    fired = bool(ac1_sig and multi_band and not strong_ramp)
    if fired:
        state = "FORECAST"
    elif noise_inflation:
        state = "NOISE-INFLATION"       # variance up, AC1 flat → the guarded false positive
    elif ac1_sig or var_sig or multi_band:
        state = "WATCH"
    else:
        state = "QUIET"

    return {
        "fired": fired,
        "state": state,
        "n": n, "window": win,
        "ar1_tau": ar1_tau, "ar1_p": ar1_p,
        "var_tau": var_tau, "var_p": var_p,
        "ac1_significant": ac1_sig,
        "var_significant": var_sig,
        "noise_inflation": noise_inflation,
        "variance_ramp_ratio": ramp_ratio,
        "strong_variance_ramp": strong_ramp,
        "surrogate_significant": surrogate_sig,
        "multi_band_agreement": multi_band,
        "bands_rising": n_rising, "min_bands": min_bands,
        "band_taus": band_taus,
        "alpha": alpha, "n_surr": n_surr,
        "engine": engine,
        "r_available": _r_available(),
        "note": (f"critical-slowing-down {state}: AC1-τ {ar1_tau:.2f} (p={ar1_p:.3f}) · "
                 f"var-τ {var_tau:.2f} (p={var_p:.3f}) · ramp {ramp_ratio:.1f}× · {n_rising} bands rising · "
                 f"{'ramp-veto(inflation)' if strong_ramp else 'AC1+var' if ac1_sig and var_sig else 'var-only(inflation)' if noise_inflation else 'AC1' if ac1_sig else 'none'} · engine {engine}"),
    }


# ── CRITICALITY — the two-point mutual-information signature (Lin–Tegmark, NOT Zipf) ──────


def _symbolize(x: np.ndarray, n_bins: int = 4) -> tuple[np.ndarray, int]:
    """A 1-D signal → an integer symbol sequence for the MI estimator. An already-symbolic
    small-alphabet integer array passes through; else RANK-quantile binning into `n_bins`
    (a uniform marginal — the maximum-entropy binning that reads correlation cleanly, robust
    to the signal's scale and heavy tails). Returns (symbols, alphabet_size)."""
    x = np.asarray(x, dtype=float).ravel()
    if x.size == 0:
        return np.zeros(0, dtype=int), 0
    if np.allclose(x, np.round(x)) and x.min() >= 0 and (x.max() - x.min()) < n_bins * 4:
        sym = x.astype(int)
        return sym, int(sym.max()) + 1
    ranks = np.argsort(np.argsort(x))
    sym = (ranks * n_bins // max(1, x.size)).astype(int)
    sym = np.clip(sym, 0, n_bins - 1)
    return sym, int(sym.max()) + 1 if sym.size else 0


def two_point_mi(sym: np.ndarray, d: int, k: int) -> float:
    """Empirical mutual information `I(S_t ; S_{t+d})` in NATS over a symbol sequence — the
    TWO-POINT criticality statistic (Lin & Tegmark 2017). NOT Zipf: Zipf is a ONE-point
    (marginal-frequency) law a Markov process satisfies; the criticality signature lives in
    how MI between tokens DECAYS with separation `d`. Returns 0 for a degenerate d/k."""
    n = sym.size
    if d <= 0 or d >= n or k < 2:
        return 0.0
    a, b = sym[:-d], sym[d:]
    joint = np.zeros((k, k), dtype=float)
    np.add.at(joint, (a, b), 1.0)
    tot = joint.sum()
    if tot < 1.0:
        return 0.0
    joint /= tot
    pa, pb = joint.sum(axis=1), joint.sum(axis=0)
    nz = joint > 0
    outer = np.outer(pa, pb)
    return float(max(0.0, np.sum(joint[nz] * np.log(joint[nz] / outer[nz]))))


def dfa_hurst(x: np.ndarray) -> float:
    """Detrended-fluctuation-analysis Hurst exponent H — the long-range-correlation
    corroborator (H≈0.5 uncorrelated/Markov, H>0.5 PERSISTENT long-range, H<0.5 anti-
    persistent). Integrate to a profile, RMS the linearly-detrended fluctuation per scale,
    fit log-F vs log-scale. Graceful H=0.5 on a short signal."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if n < 32:
        return 0.5
    y = np.cumsum(x - x.mean())
    scales = np.unique(np.geomspace(4, max(4, n // 4), 12).astype(int))
    fs = []
    for s in scales:
        s = int(s)
        if s < 4 or s > n // 2:
            continue
        nseg = n // s
        rms = []
        t = np.arange(s)
        for v in range(nseg):
            seg = y[v * s:(v + 1) * s]
            coef = np.polyfit(t, seg, 1)
            rms.append(float(np.sqrt(np.mean((seg - np.polyval(coef, t)) ** 2))))
        if rms:
            fs.append((s, float(np.mean(rms))))
    if len(fs) < 3:
        return 0.5
    ls = np.log([f[0] for f in fs])
    lf = np.log([max(f[1], _EPS) for f in fs])
    return float(np.polyfit(ls, lf, 1)[0])


def criticality_signature(x: np.ndarray, n_bins: int = 4, n_shuffle: int = 20,
                          seed: int = 1) -> dict:
    """THE TWO-POINT-MI CRITICALITY VERDICT (sensorium-machina #the-py-r-web, the
    dynamical leg; Lin & Tegmark, *Entropy* 2017). Fit MI(d) vs d and classify:

      · CRITICAL — MI(d) decays as a POWER LAW `d^-μ` over DECADES (no finite correlation
        length; long memory a context-free grammar cannot explain).
      · MARKOV   — MI(d) decays EXPONENTIALLY (a finite correlation length, short support) —
        the signature of a finite-order Markov / shuffled-local process.
      · SHUFFLED — MI never clears the shuffle floor (independent tokens, no structure).

    The SHUFFLE NULL (the R-keel) sets a per-distance floor (mean + 3σ over `n_shuffle`
    order-permutations); MI counts only where it clears the floor. The verdict runs a MODEL
    COMPARISON — the log-log (power) vs log-linear (exponential/cutoff) fit — over the CONTIGUOUS
    supra-floor run (a finite-correlation-length process supports MI contiguously up to ≈ξ then
    drops into the floor; scattered floor-crossings past the first gap are finite-sample artefacts
    that falsely inflate the span). CRITICAL iff the power fit BEATS the exponential by a margin
    over ≥ 1 decade of that contiguous support (no finite cutoff); else MARKOV (a cutoff detected).
    `dfa_hurst` corroborates (H>0.5 ⇒ persistent). Graceful on a short signal. Returns {verdict,
    r2_power, r2_exp, mu (power exponent), decades, corr_len, hurst, n_supported, snr}."""
    sym, k = _symbolize(x, n_bins)
    n = sym.size
    if n < 64 or k < 2:
        return {"verdict": "undetermined", "note": f"criticality-skipped: too few samples/symbols (n={n}, k={k})",
                "r2_power": 0.0, "r2_exp": 0.0, "decades": 0.0, "hurst": 0.5, "n_supported": 0}
    dmax = max(4, n // 4)
    dists = np.unique(np.concatenate([np.arange(1, 9), np.geomspace(1, dmax, 16).astype(int)]))
    dists = np.array([d for d in dists if 1 <= d < n], dtype=int)
    mi = np.array([two_point_mi(sym, int(d), k) for d in dists])
    # SHUFFLE FLOOR — the finite-sample MI bias + its scatter under order-permutation (the null).
    rng = np.random.default_rng(seed)
    fl = np.zeros((n_shuffle, dists.size))
    for i in range(n_shuffle):
        sh = sym.copy()
        rng.shuffle(sh)
        fl[i] = np.array([two_point_mi(sh, int(d), k) for d in dists])
    floor = fl.mean(axis=0)
    floor_sd = fl.std(axis=0) + _EPS
    excess = mi - floor
    sig = excess > 3.0 * floor_sd            # MI clears the shuffle floor by 3σ
    supported = int(sig.sum())
    snr = float(np.mean(excess) / (np.mean(floor) + _EPS))
    hurst = dfa_hurst(x)
    if supported < 4 or np.max(excess) < 3.0 * np.max(floor_sd):
        return {"verdict": "shuffled", "r2_power": 0.0, "r2_exp": 0.0, "mu": 0.0,
                "decades": 0.0, "corr_len": 0.0, "hurst": hurst, "n_supported": supported,
                "snr": snr, "n_bins": n_bins,
                "note": f"MI at the shuffle floor (independent tokens) · H={hurst:.2f}"}
    # CONTIGUOUS supra-floor run (from the first supported distance): a finite-correlation-length
    # process supports MI CONTIGUOUSLY up to ≈ξ then falls into the noise floor — scattered
    # floor-crossings PAST the first gap are finite-sample artefacts that falsely inflate
    # corr_len/decades and let an exponential AR(1) mimic a scale-free power law. The
    # discriminator reads the GENUINE (contiguous) support only.
    first = int(np.argmax(sig))                  # first supported index (≥ 4 True here)
    run = first
    while run < sig.size and sig[run]:
        run += 1
    csig = np.zeros(sig.size, dtype=bool)
    csig[first:run] = True
    n_contig = int(csig.sum())
    ds = dists[csig].astype(float)
    le = np.log(np.clip(excess[csig], _EPS, None))
    r2_pow, mu = _mi_linfit(np.log(ds), le)      # power law: log-log straight, slope = -μ
    r2_exp, rate = _mi_linfit(ds, le)            # exponential: log-linear straight
    corr_len = float(dists[csig].max())
    dmin = float(dists[csig].min())
    decades = float(np.log10(max(corr_len, dmin) / max(dmin, 1.0)))
    # MODEL COMPARISON (Lin–Tegmark) — a CRITICAL signature is a power law with NO finite cutoff.
    # Over ≥ 1 decade of contiguous support, CRITICAL iff EITHER the power fit beats the exponential
    # (cutoff) fit by _POWER_LAW_MARGIN, OR the contiguous support itself spans ≥ _CRITICAL_SPAN_
    # DECADES — a reach no finite-correlation-length process attains, so a coincidentally-high
    # exponential R² over a genuinely scale-free range cannot mask it. An AR(1)/Markov process decays
    # EXPONENTIALLY: its short contiguous support fits the exponential as-well-or-better and dies by
    # ≈1.6 decades → markov. Reading raw R² over the SCATTERED support over-called AR(1) "critical".
    critical = bool(n_contig >= 3 and decades >= 1.0
                    and (r2_pow >= r2_exp + _POWER_LAW_MARGIN or decades >= _CRITICAL_SPAN_DECADES))
    verdict = "critical" if critical else "markov"
    return {
        "verdict": verdict, "r2_power": r2_pow, "r2_exp": r2_exp, "mu": -mu,
        "decades": decades, "corr_len": corr_len, "hurst": hurst,
        "n_supported": supported, "snr": snr, "n_bins": n_bins,
        "note": (f"two-point-MI {verdict}: power-law R² {r2_pow:.2f} vs exp R² {r2_exp:.2f} · "
                 f"μ={-mu:.2f} · {decades:.1f} decades · H={hurst:.2f}"),
    }


def _mi_linfit(xx: np.ndarray, yy: np.ndarray) -> tuple[float, float]:
    """Least-squares line fit → (R², slope). The power-vs-exponential discriminator reads the
    two R²s (log-log for power, log-linear for exponential)."""
    xx = np.asarray(xx, dtype=float)
    yy = np.asarray(yy, dtype=float)
    if xx.size < 3:
        return 0.0, 0.0
    coef = np.polyfit(xx, yy, 1)
    pred = np.polyval(coef, xx)
    ss_res = float(np.sum((yy - pred) ** 2))
    ss_tot = float(np.sum((yy - yy.mean()) ** 2))
    return 1.0 - ss_res / (ss_tot + _EPS), float(coef[0])


# ── SLAVING — the aperture ladder AS an order-parameter hierarchy (Haken synergetics) ─────


def _band_envelope(band: np.ndarray, win: int) -> np.ndarray:
    """The local amplitude envelope of a MODWT detail band — a moving-RMS of the coefficients
    (the band's instantaneous power). The order-parameter's envelope is the slaving PRIOR; the
    enslaved band's envelope is what the prior predicts."""
    b = np.asarray(band, dtype=float).ravel()
    w = max(2, int(win))
    kern = np.ones(w) / w
    env2 = np.convolve(b * b, kern, mode="same")
    return np.sqrt(np.clip(env2, 0.0, None))


def _slaving_gain(prior: np.ndarray, target: np.ndarray,
                  warmup: int = 1) -> tuple[float, float, float]:
    """TOP-DOWN precision — regress the enslaved `target` envelope on the order-parameter `prior`.

    The load-bearing quantity is the SIGNAL FRACTION (reliability / R² / Wiener gain),
    computed DIRECTLY and BOUNDED in [0,1]:

        reliability = var(target) / (var(target) + var(residual))

    This is `20·g/(1+g)` (the π↔band map) with `g = var(target)/var(residual)`, but formed
    WITHOUT ever taking the ratio `g` first — so no absolute `_EPS` floor on a vanishing residual,
    no scale-blind blowup, and no silent saturation (#crucible-tested 2026-07-01). As `var(resid)→0`,
    `reliability→1` (standing→20) smoothly, at ANY scale, because both terms carry the same units.

    The `gain` (var-ratio, kept for the reporting/threshold surface) is floored RELATIVELY —
    `var(resid) ≥ _EPS_REL·var(target)` — so it stays finite AND scale-invariant (caps at
    `1/_EPS_REL`), unlike the old absolute `+ _EPS` that let it run to `var(target)·1e9`.
    Returns (gain, reliability, correlation)."""
    p = np.asarray(prior, dtype=float).ravel()
    y = np.asarray(target, dtype=float).ravel()
    m = min(p.size, y.size)
    w = max(0, min(warmup, m))
    p, y = p[w:m], y[w:m]
    if y.size < 8 or np.std(y) < _EPS or np.std(p) < _EPS:
        return 1.0, 0.5, 0.0
    A = np.column_stack([p, np.ones_like(p)])
    coef, *_ = np.linalg.lstsq(A, y, rcond=None)
    resid = y - A @ coef
    var_y = float(np.var(y))
    var_r = float(np.var(resid))
    # the BOUNDED signal-fraction, formed directly (var_y > 0 here — guarded by the std check above).
    reliability = var_y / (var_y + var_r)
    # the reported var-ratio, RELATIVE-floored so it is finite and scale-invariant (caps at 1/_EPS_REL).
    gain = var_y / max(var_r, _EPS_REL * var_y)
    r = float(np.corrcoef(p, y)[0, 1])
    return gain, reliability, r


def slaving_leg(mra: dict, warmup: int = 1) -> dict:
    """THE ORDER-PARAMETER / SLAVING LEG (sensorium-machina #the-py-r-web, the
    top-down leg; Haken synergetics). The aperture ladder IS an order-parameter hierarchy: the
    SLOW/coarse band (Theme) is the order parameter that ENSLAVES the FAST/fine band (Pulse).
    Wire the CIRCULAR CAUSALITY between each adjacent MODWT band pair (coarse→fine):

      · TOP-DOWN (slaving / prediction) — the coarser band's envelope supplies the PRIOR that
        scores the finer band's envelope. `topdown_gain` = the precision (var-reduction) the
        prior buys, read as a confidence via the π↔confidence map (predictive_coding). THIS is
        the mechanism top-down prediction lacked: the higher band's prior scores the lower.
      · BOTTOM-UP (emergence) — the slow mode as a function of aggregated fast fluctuation:
        `bottomup_r` = the correlation of the coarse band with the fine band's running energy.

    Circular causality CLOSES on a pair when BOTH legs run (top-down gain > 1 AND bottom-up
    correlation present). Returns {pairs, levels, note}. Graceful on < 2 bands."""
    bands = mra.get("bands", [])
    levels = int(mra.get("levels", 0))
    if levels < 2:
        return {"pairs": [], "levels": levels, "note": "slaving-skipped: <2 bands"}
    names = BANDS_FINE_TO_COARSE[:levels]
    pairs = []
    for j in range(levels - 1):
        fine = np.asarray(bands[j], dtype=float)        # faster — the enslaved band
        coarse = np.asarray(bands[j + 1], dtype=float)  # slower — the order parameter
        win = 2 ** (j + 3)
        fine_env = _band_envelope(fine, win)
        prior = _band_envelope(coarse, win * 2)         # the order-parameter magnitude (slow)
        gain, reliability, tr = _slaving_gain(prior, fine_env, warmup)
        m = min(coarse.size, fine_env.size)
        cu, fe = np.abs(coarse[:m]), fine_env[:m]
        bu_r = (float(np.corrcoef(cu, fe)[0, 1])
                if m > 8 and np.std(cu) > _EPS and np.std(fe) > _EPS else 0.0)
        pairs.append({
            "order_parameter": names[j + 1], "enslaved": names[j],
            # STANDING from the BOUNDED signal-fraction directly (20·reliability), never the
            # ratio-gain through _to_conf — so it is scale-invariant and never silently saturates.
            # A measured reliability reads as STANDING, never confidence (confidence is only vowed).
            "topdown_gain": gain, "slaving_reliability": 20.0 * reliability,
            "topdown_r": tr, "bottomup_r": bu_r,
            "circular": bool(gain > 1.2 and abs(bu_r) > 0.2),
        })
    strongest = max(pairs, key=lambda p: p["topdown_gain"]) if pairs else None
    return {
        "pairs": pairs, "levels": levels,
        "note": (f"slaving: {strongest['order_parameter']}→{strongest['enslaved']} "
                 f"gain {strongest['topdown_gain']:.2f} (standing {strongest['slaving_reliability']:.1f})"
                 if strongest else "slaving: no pairs"),
    }


# ── the composed stack — signal-matrix → the full bands verdict ───────────────────────────


def run_stack(tree_matrix: np.ndarray, spine_signal: np.ndarray | None = None,
              n_boot: int = 40, gate_method: str = "bootstrap",
              prev_boundaries: list[float] | None = None) -> dict:
    """Compose the whole cap. TWO feeds, by design (corpus.md #the-bands):
      · the SPINE + SERVO read a 1-D COHESION signal (the wavelet-over-cohesion novel
        ground) — `spine_signal`, or the pooled `tree_matrix` when none is given.
      · the TREE + GATE read the MULTIVARIATE `tree_matrix` (ecp::e.divisive is multivariate
        over content(+form+structure)) — so distribution SHIFTS in the embedding sequence
        yield clean nested cuts, not the sparse drift-spike train.
    Flow: SPINE (MODWT) → AUTO-TUNE (variance elbow → scale count) → SERVO (EWT/ridge nudge)
    → TREE (divisive cuts) → allocate cuts across the 5 bands → GATE (resampling grade) →
    per-band BOCPD hazards → the FFZ cells. Returns the full verdict dict (JSON-legal)."""
    M = np.asarray(tree_matrix, dtype=float)
    if M.ndim == 1:
        M = M.reshape(-1, 1)
    n = M.shape[0]
    if n == 0:
        return {"n": 0, "cells": [], "note": "bands-skipped: empty signal"}
    pooled = np.asarray(spine_signal, dtype=float).ravel() if spine_signal is not None else M.mean(axis=1)
    mra = modwt_mra(pooled)
    elbow = wavelet_variance_elbow(mra)
    n_modes = max(2, min(N_BANDS, elbow + 1))
    servo = ewt_servo(pooled, n_modes, prev_boundaries)
    # Cut budget: a generous cap the auto-tune elbow bounds (finer scales earn more cuts).
    max_cuts = max(1, min(n - 1, elbow * 3 + 2))
    tree = changepoint_tree(M, max_cuts=max_cuts, min_size=2)
    order = tree["order"]
    band_counts = allocate_band_cuts(order, mra)
    gate = stability_gate(M, order, n_boot=n_boot, method=gate_method)
    # Per-band BOCPD hazards from the band's own wavelet variance (coarse band → long λ).
    energy = mra.get("energy", [])
    bocpd = {}
    for j, band_name in enumerate(BANDS_FINE_TO_COARSE[: mra.get("levels", 0)]):
        band_sig = np.asarray(mra["bands"][j], dtype=float)
        var = float(energy[j]) if j < len(energy) else 1.0
        hazard = max(4.0, 1.0 / (var + _EPS) ** 0.5)  # low-variance (coarse) → long expected segment
        bocpd[band_name] = bocpd_changepoints(band_sig, hazard)
    # Per-chunk repro-grade via chunk_grades: each chunk inherits the WEAKEST grade of its
    # BOUNDING cuts (nearest ≤ i, nearest > i), NOT the whole prefix — so a reproduced late
    # region reads reproduced even after an earlier fragile cut, and an un-witnessed cut fails
    # CLOSED (fragile). QA-fix (absorb→bound + fail-open→fail-closed).
    chunk_grade = chunk_grades(order, gate["grade_of_cut"], n)
    cells = ffz_cells(order, band_counts, n, grades=chunk_grade)
    return {
        "n": n,
        "planes": M.shape[1],
        "spine": {
            "levels": mra.get("levels", 0),
            "energy_fractions": band_energy_fractions(mra),
            "band_names_fine_to_coarse": BANDS_FINE_TO_COARSE[: mra.get("levels", 0)],
        },
        "servo": {"boundaries": servo["boundaries"], "moved": servo["moved"], "n_modes": n_modes, "ridges": servo["ridges"]},
        "slaving": slaving_leg(mra),
        "tree": {"engine": tree["engine"], "n_cuts": len(order), "order": order, "band_counts": band_counts},
        "gate": {"consensus": gate["consensus"], "cut_support": gate["cut_support"], "method": gate_method,
                 "reproduced_cuts": sum(1 for r in gate["grade_of_cut"].values() if r == "reproduced"),
                 "fragile_cuts": sum(1 for r in gate["grade_of_cut"].values() if r == "fragile")},
        "bocpd": bocpd,
        "noise_floor": wavelet_threshold_floor(mra),
        "cells": cells,
        "r_available": _r_available(),
    }


# ── the palace readback — the content(+form) embeddings feed (chroma) ─────────────────────


def _read_sensorium_planes(sensorium: str, *, require_one_source: bool = False) -> tuple[list[np.ndarray], list[str], str]:
    """Read content embeddings from a rooted sensorium in declared source order.
    Returns (planes, ids, note).
    NEVER re-embeds — reads the STORED nomic vectors (the readback discipline of loci_io's
    cmd_embeddings). Graceful: no chroma / mempalace / no vectors ⇒ ([], [], note)."""
    from order_vectors import source_ordered_vectors
    ids_sorted, content, note = source_ordered_vectors(sensorium, require_one_source=require_one_source)
    if not ids_sorted:
        return [], [], note
    planes = [content]
    # The structure plane (S2), keyed by verbatim_sha, when a structure sub-palace stands —
    # joined by order-position is unsound, so we feed CONTENT alone unless a form store aligns.
    # (Form/structure multivariate fusion rides the same run_stack; wired when the join lands.)
    return planes, ids_sorted, note


# ── the CLI faces ─────────────────────────────────────────────────────────────────────────


def _load_signal(path: str) -> np.ndarray:
    """Load a signal matrix from an NDJSON file/stdin. Each line is either a bare number, a
    list (a multivariate row), or {"vector":[...]} / {"value":x}. Returns an N×P matrix."""
    rows = []
    src = sys.stdin if path == "-" else open(path)
    try:
        for line in src:
            line = line.strip()
            if not line:
                continue
            v = json.loads(line)
            if isinstance(v, (int, float)):
                rows.append([float(v)])
            elif isinstance(v, list):
                rows.append([float(x) for x in v])
            elif isinstance(v, dict):
                if "vector" in v:
                    rows.append([float(x) for x in v["vector"]])
                elif "value" in v:
                    rows.append([float(v["value"])])
    finally:
        if src is not sys.stdin:
            src.close()
    return np.asarray(rows, dtype=float) if rows else np.zeros((0, 0))


def cmd_decompose(args) -> None:
    """Run the full stack over a raw signal matrix (NDJSON) → one JSON summary on stdout.
    The chroma-free VERIFY face: a synthetic multi-scale signal in, the bands verdict out."""
    M = _load_signal(args.signal)
    if args.planes and args.planes > 1 and M.shape[1] == 1:
        M = np.tile(M, (1, args.planes))
    out = run_stack(M, n_boot=args.boot, gate_method=args.gate)
    # Trim the per-chunk cells for the summary face (decompose is a probe, not the emitter).
    summary = {k: v for k, v in out.items() if k != "cells"}
    summary["cells"] = len(out.get("cells", []))
    sys.stdout.write(json.dumps(summary) + "\n")


def analyze_ordered_vectors(ids: list[str], vectors, *, note: str, boot: int = 40,
                           gate: str = "bootstrap") -> tuple[list[dict], dict]:
    """Derive FFZ cells from vectors already ordered by an evidence-preserving projector."""
    planes = [np.asarray(vectors, dtype=float)]
    if not planes or planes[0].shape[0] < 2:
        return [], {"note": note, "cells": 0, "bands": 0}
    m = min(p.shape[0] for p in planes)
    tree_matrix = np.hstack([p[:m] for p in planes])
    cohesion = cohesion_signal(planes)
    spine_signal = cohesion.mean(axis=1) if cohesion.size else None
    if tree_matrix.shape[0] < 2:
        return [], {"note": f"bands-skipped: flat signal ({note})", "cells": 0, "bands": 0}
    out = run_stack(tree_matrix, spine_signal=spine_signal, n_boot=boot, gate_method=gate)
    cells = []
    for row in out["cells"]:
        rec = {"lar_ffz": row["lar_ffz"], "repro_grade": row["repro_grade"], "cells": row["cells"]}
        if row["index"] < len(ids):
            rec["id"] = ids[row["index"]]
        cells.append(rec)
    return cells, {
        "note": f"bands: {out['tree']['n_cuts']} cuts · {out['gate']['reproduced_cuts']} reproduced / {out['gate']['fragile_cuts']} fragile · engine {out['tree']['engine']} · {note}",
        "cells": len(cells), "bands": out["spine"]["levels"], "consensus": out["gate"]["consensus"],
        "engine": out["tree"]["engine"], "r_available": out["r_available"],
    }


def analyze_sensorium(sensorium: str, *, boot: int = 40, gate: str = "bootstrap",
                     require_one_source: bool = False) -> tuple[list[dict], dict]:
    """Adapt declared source order into the neutral bands kernel.

    A stream projector may require one source because a causal island does not
    grant an order between independent connections.
    """
    planes, ids, note = _read_sensorium_planes(sensorium, require_one_source=require_one_source)
    vectors = planes[0] if planes else []
    return analyze_ordered_vectors(ids, vectors, note=note, boot=boot, gate=gate)


def cmd_analyze(args) -> None:
    """Read corpus embeddings from a sensorium (or --signal), then emit FFZ NDJSON."""
    if args.signal:
        planes, ids, note = [_load_signal(args.signal)], None, "signal-file"
        planes = [p for p in planes if p.size]
    else:
        cells, summary = analyze_sensorium(args.sensorium, boot=args.boot, gate=args.gate)
        for cell in cells:
            sys.stdout.write(json.dumps(cell) + "\n")
        sys.stdout.write(json.dumps(summary) + "\n")
        return
    if not planes or planes[0].shape[0] < 2:
        sys.stdout.write(json.dumps({"note": note, "cells": 0, "bands": 0}) + "\n")
        return
    # Align every plane to the common chunk count, then feed the RAW multivariate embeddings
    # to the TREE (e.divisive sees distribution shifts) and the pooled COHESION drift to the
    # SPINE/SERVO (the wavelet-over-cohesion signal).
    m = min(p.shape[0] for p in planes)
    tree_matrix = np.hstack([p[:m] for p in planes])
    cohesion = cohesion_signal(planes)
    spine_signal = cohesion.mean(axis=1) if cohesion.size else None
    if tree_matrix.shape[0] < 2:
        sys.stdout.write(json.dumps({"note": f"bands-skipped: flat signal ({note})", "cells": 0, "bands": 0}) + "\n")
        return
    out = run_stack(tree_matrix, spine_signal=spine_signal, n_boot=args.boot, gate_method=args.gate)
    # Emit one NDJSON cell per chunk (keyed to the block id when the palace supplied ids).
    for row in out["cells"]:
        rec = {"lar_ffz": row["lar_ffz"], "repro_grade": row["repro_grade"], "cells": row["cells"]}
        if ids is not None and row["index"] < len(ids):
            rec["id"] = ids[row["index"]]
        sys.stdout.write(json.dumps(rec) + "\n")
    # The authoritative final summary line (the TS caller parses the LAST JSON object).
    summary = {
        "note": f"bands: {out['tree']['n_cuts']} cuts · {out['gate']['reproduced_cuts']} reproduced / {out['gate']['fragile_cuts']} fragile · engine {out['tree']['engine']} · {note}",
        "cells": len(out["cells"]),
        "bands": out["spine"]["levels"],
        "consensus": out["gate"]["consensus"],
        "engine": out["tree"]["engine"],
        "r_available": out["r_available"],
    }
    sys.stdout.write(json.dumps(summary) + "\n")


def cmd_couple(args) -> None:
    """Run the cross-stream COUPLING plane over an N-signal matrix (NDJSON, rows=time,
    cols=signals) → one JSON verdict on stdout: the directional ete/p matrices + the
    who-leads-whom edge list. The R-plane VERIFY face (RTransferEntropy::calc_ete); a
    graceful `coupling-skipped` note when R is absent (TE has no python fallback)."""
    M = _load_signal(args.signal)
    names = args.names.split(",") if args.names else None
    out = couple_streams(M, lx=args.lx, ly=args.ly, shuffles=args.shuffles,
                         nboot=args.nboot, seed=args.seed, names=names, alpha=args.alpha)
    sys.stdout.write(json.dumps(out) + "\n")


def cmd_forecast(args) -> None:
    """Run the PREDICTIVE bands leg (early-warning signals) over an NDJSON signal → one JSON
    verdict: the critical-slowing-down forecast (fired / WATCH / QUIET), the AC1 + variance
    Kendall-τ with AR(1)-surrogate p-values, and the multi-band agreement. Forecasts the
    approaching regime-shift BEFORE `analyze`'s ecp changepoint commits."""
    M = _load_signal(args.signal)
    out = forecast_ews(M, window=args.window, n_surr=args.nsurr, alpha=args.alpha,
                       min_bands=args.minbands, seed=args.seed)
    sys.stdout.write(json.dumps(out) + "\n")


def cmd_criticality(args) -> None:
    """Run the TWO-POINT-MI criticality signature (Lin–Tegmark, NOT Zipf) over an NDJSON
    signal → one JSON verdict: critical (power-law MI decay, long memory) vs markov
    (exponential decay, finite correlation length) vs shuffled (MI at the null floor), with the
    log-log/log-linear fit R², the decades of support, and the DFA Hurst corroborator."""
    M = _load_signal(args.signal)
    x = M.mean(axis=1) if M.ndim == 2 and M.shape[1] > 1 else M.ravel()
    out = criticality_signature(x, n_bins=args.bins, n_shuffle=args.shuffle, seed=args.seed)
    sys.stdout.write(json.dumps(out) + "\n")


def cmd_slaving(args) -> None:
    """Run the ORDER-PARAMETER / SLAVING leg (Haken synergetics) over an NDJSON signal → one
    JSON verdict: per adjacent-band circular-causality pair, the top-down slaving gain (the
    coarse order-parameter's prior scoring the fine band, read as a confidence) and the
    bottom-up emergence correlation. The aperture ladder read as an order-parameter hierarchy."""
    M = _load_signal(args.signal)
    x = M.mean(axis=1) if M.ndim == 2 and M.shape[1] > 1 else M.ravel()
    out = slaving_leg(modwt_mra(x))
    sys.stdout.write(json.dumps(out) + "\n")


def cmd_selftest(args) -> None:
    """A synthetic-signal self-check (no chroma, no fixture file): a fast+slow signal → the
    SPINE separates the scales; a clean vs noisy fixture → the GATE locks vs holds; the
    two-point-MI leg tells a critical (pink) from a markov (AR1) signal; the slaving leg reads
    a modulated (order-parameter) pair above an additive control."""
    n = 256
    t = np.arange(n)
    fast = np.sin(2 * np.pi * t / 4.0)
    slow = np.sin(2 * np.pi * t / 64.0)
    mra = modwt_mra(fast + slow)
    frac = band_energy_fractions(mra)
    fine_energy = sum(frac[:2])
    coarse_energy = sum(frac[3:])

    # CRITICALITY leg — pink (critical) vs AR(1) (markov) two-point-MI separation.
    rng = np.random.default_rng(0)
    freq = np.fft.rfftfreq(4000)
    freq[0] = freq[1]
    ph = rng.uniform(0, 2 * np.pi, freq.size)
    ph[0] = 0.0
    ph[-1] = 0.0
    pink = np.fft.irfft(freq ** (-0.7) * np.exp(1j * ph), n=4000)
    ar = np.zeros(4000)
    for tt in range(1, 4000):
        ar[tt] = 0.7 * ar[tt - 1] + rng.normal(0, 1)
    crit = criticality_signature(pink, seed=1)
    mark = criticality_signature(ar, seed=1)

    # SLAVING leg — a slow order-parameter enslaving a fast carrier vs an additive control.
    # A little observation noise breaks the noiseless-tone degeneracy (a pure tone's envelope
    # is flat, so a noiseless regression residual collapses to ~0 and gains blow up); real
    # cohesion signals carry noise, and the modulated pair then reads ABOVE the additive one.
    tt = np.arange(1024)
    modulated = (1.0 + 0.9 * np.sin(2 * np.pi * tt / 256.0)) * np.sin(2 * np.pi * tt / 8.0) \
        + rng.normal(0, 0.05, 1024)
    additive = np.sin(2 * np.pi * tt / 256.0) + np.sin(2 * np.pi * tt / 8.0) \
        + rng.normal(0, 0.05, 1024)
    sl_mod = max(p["topdown_gain"] for p in slaving_leg(modwt_mra(modulated))["pairs"])
    sl_add = max(p["topdown_gain"] for p in slaving_leg(modwt_mra(additive))["pairs"])

    report = {
        "spine_levels": mra["levels"],
        "energy_fractions": frac,
        "fine_holds_fast": fine_energy > 0.2,
        "coarse_holds_slow": coarse_energy > 0.05,
        "criticality_pink": crit["verdict"],
        "criticality_ar1": mark["verdict"],
        "criticality_separates": crit["verdict"] == "critical" and mark["verdict"] == "markov",
        "slaving_gain_modulated": sl_mod,
        "slaving_gain_additive": sl_add,
        "slaving_reads_order_parameter": sl_mod > sl_add,
    }
    sys.stdout.write(json.dumps(report) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="bands — the multi-scale FFZ sensorium capability")
    sub = ap.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("decompose", help="full stack over a raw signal matrix (NDJSON) → JSON summary")
    d.add_argument("--signal", required=True, help="NDJSON signal file, or - for stdin")
    d.add_argument("--planes", type=int, default=0, help="tile a 1-D signal to N planes (test)")
    d.add_argument("--boot", type=int, default=40, help="resampling-gate replicate count")
    d.add_argument("--gate", default="bootstrap", choices=["bootstrap", "jackknife"])
    d.set_defaults(fn=cmd_decompose)

    a = sub.add_parser("analyze", help="corpus sensorium (or --signal) → NDJSON lar_ffz cells + summary")
    a.add_argument("--sensorium", default="", help="the corpus sensorium root (content readback)")
    a.add_argument("--signal", default="", help="bypass chroma: read the signal from this NDJSON file")
    a.add_argument("--boot", type=int, default=40)
    a.add_argument("--gate", default="bootstrap", choices=["bootstrap", "jackknife"])
    a.set_defaults(fn=cmd_analyze)

    c = sub.add_parser("couple", help="N-signal matrix (NDJSON) → directional transfer-entropy lead-lag + p-values")
    c.add_argument("--signal", required=True, help="NDJSON N-signal matrix (rows=time, cols=signals), or - for stdin")
    c.add_argument("--lx", type=int, default=1, help="source (x) Markov order")
    c.add_argument("--ly", type=int, default=1, help="target (y) Markov order")
    c.add_argument("--shuffles", type=int, default=100, help="calc_ete bias-correction shuffles")
    c.add_argument("--nboot", type=int, default=100, help="source-permutation p-value replicates")
    c.add_argument("--seed", type=int, default=1)
    c.add_argument("--alpha", type=float, default=0.05, help="significance gate for the edge list")
    c.add_argument("--names", default="", help="comma-separated signal names (else s0,s1,…)")
    c.set_defaults(fn=cmd_couple)

    f = sub.add_parser("forecast", help="early-warning signals → forecast an approaching bifurcation (critical slowing down)")
    f.add_argument("--signal", required=True, help="NDJSON signal (rows=time), or - for stdin")
    f.add_argument("--window", type=int, default=50, help="rolling-indicator window")
    f.add_argument("--nsurr", type=int, default=200, help="AR(1)-surrogate ensemble size")
    f.add_argument("--alpha", type=float, default=0.05, help="surrogate-significance gate")
    f.add_argument("--minbands", type=int, default=2, help="min MODWT bands trending up to fire")
    f.add_argument("--seed", type=int, default=1)
    f.set_defaults(fn=cmd_forecast)

    cr = sub.add_parser("criticality", help="two-point-MI criticality signature (power-law=critical vs exponential=markov, NOT Zipf)")
    cr.add_argument("--signal", required=True, help="NDJSON signal (rows=time), or - for stdin")
    cr.add_argument("--bins", type=int, default=4, help="symbolization quantile-bin count")
    cr.add_argument("--shuffle", type=int, default=20, help="shuffle-null replicate count (the MI floor)")
    cr.add_argument("--seed", type=int, default=1)
    cr.set_defaults(fn=cmd_criticality)

    sl = sub.add_parser("slaving", help="order-parameter / slaving leg — top-down band-pair prediction (Haken)")
    sl.add_argument("--signal", required=True, help="NDJSON signal (rows=time), or - for stdin")
    sl.set_defaults(fn=cmd_slaving)

    s = sub.add_parser("selftest", help="synthetic multi-scale self-check (no chroma)")
    s.set_defaults(fn=cmd_selftest)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
