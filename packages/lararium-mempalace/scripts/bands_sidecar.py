#!/usr/bin/env python3
"""bands_sidecar — the multi-scale FFZ bands cap for the lares-corpus (corpus.md #the-bands).

Turns a corpus's per-chunk COHESION signal into the aperture ladder (Pulse · Beat ·
Measure · Arc · Theme) via a wavelet decomposition + adaptive changepoints. This is the
MULTI-SCALE lift of the single-signal Measure servo (mesh/ffz-project.ts measureStep /
quorumStep + BOCPD+MDL+EWMA): where that servo emits ONE Measure label per member, this
sidecar emits a FULL five-band membership address per chunk, over the whole corpus at once.

The stack rides four layers plus a gate (corpus.md #the-bands):

  SIGNAL   — the per-chunk cosine-drift over the content embeddings along the sequence
             (+ form / structure planes when present) → a multivariate drift matrix.
  SPINE    — MODWT-MRA 5-level (PyWavelets `pywt.mra(..., transform='swt')`), detail
             levels D1..D5 mapped ONE-TO-ONE onto the aperture bands. No downsampling
             (one coefficient per chunk) → shift-invariant, never chases a transient.
  SERVO    — EWT (`ewtpy`) spectral-boundary detection + `ssqueezepy` scalogram ridges,
             nudging the band boundaries via EWMA-hysteresis (a boundary only MOVES when
             spectral evidence exceeds the damped threshold — tracks without chasing).
  TREE     — the membership cells: `ecp::e.divisive` (the R sidecar bands_ecp.R —
             nonparametric, MULTIVARIATE, divisive → a nested changepoint tree, coarse
             cuts parent fine cuts). Python fallback: `ruptures` Binseg / KernelCPD-rbf
             when R is unavailable (the incremental-Binseg order IS a divisive hierarchy).
  AUTO-TUNE— scale-count by EWT/ridge vote + a wavelet-variance elbow; penalty by MDL;
             BOCPD-per-band (`bocd`) with a scale-specific hazard from the band's variance.
  GATE     — the confidence register made STATISTICAL: bootstrap/jackknife
             resampling-consensus locks a band/cut as Canon only where a resample
             reproduces it, else holds it Provisional. Per-band wavelet-thresholding sets
             the noise floor.

NOVEL GROUND (corpus.md flag): no prior art runs a wavelet over an embedding-COHESION
signal (wavelets over price/audio/EEG, yes; over a semantic-cohesion time-series, none).
The resampling gate is LOAD-BEARING — an un-witnessed band boundary NEVER locks Canon.

drawer_io-style NDJSON over stdio (the established sidecar contract). Faces:
  * the library: cohesion_signal · modwt_mra · ewt_servo · changepoint_tree ·
    stability_gate · ffz_cells (pure, chroma-free — the VERIFY surface)
  * `decompose --signal <file|-> [--planes N]`  → the full stack over a raw signal
        matrix → one JSON summary (bands · boundaries · cuts · register) on stdout
  * `analyze  --palace <dir> [--signal <file>]` → read the corpus content(+form)
        embeddings back out of the scratch palace, build the cohesion signal, run the
        stack → NDJSON lar_ffz cells + a final JSON summary. GRACEFUL: no chroma /
        mempalace / no vectors ⇒ `{"note":"bands-skipped: …","cells":0}`, the content /
        structure planes UNAFFECTED.

Run under the mempalace venv (PYTHONPATH=<repo>/mempalace only for `analyze`'s chroma
readback; `decompose` needs neither):
  ~/.venv/bin/python3 bands_sidecar.py decompose --signal fixture.ndjson
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 bands_sidecar.py analyze --palace <dir>

Meme: lar:///ha.ka.ba/@lares/api/lares/corpus#the-bands
"""
from __future__ import annotations

import argparse
import json
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

    `pywt.mra(x, wavelet, level, transform='swt')` returns [D1, D2, …, D_level, A_level] —
    the maximal-overlap (undecimated) detail bands + the smooth. MODWT-MRA is:
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
    details = [np.asarray(c, dtype=float)[:n] for c in mra[:-1]]  # D1..D_lvl (fine→coarse)
    smooth = np.asarray(mra[-1], dtype=float)[:n]
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


# ── TREE — ecp::e.divisive (R sidecar) → nested changepoint tree; ruptures fallback ───────


def _r_available() -> bool:
    return shutil.which("Rscript") is not None


def _ecp_divisive_R(matrix: np.ndarray, min_size: int, sig_lvl: float) -> list[int] | None:
    """Invoke the thin R sidecar (bands_ecp.R) → `ecp::e.divisive` over the multivariate
    drift matrix. Returns the ORDERED changepoint indices (0-based, coarse→fine — the
    divisive discovery order IS the hierarchy) or None when R / the sidecar / ecp is
    unavailable (⇒ the caller falls to the ruptures path). drawer_io-style: one NDJSON
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
        line = [l for l in proc.stdout.splitlines() if l.strip().startswith("{")]
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


# ── COUPLE — RTransferEntropy::calc_ete (R sidecar) → the cross-stream lead-lag plane ─────


def _couple_ete_R(matrix: np.ndarray, lx: int = 1, ly: int = 1, shuffles: int = 100,
                  nboot: int = 100, seed: int = 1, names: list[str] | None = None,
                  q: float = 0.1, quantiles: tuple[int, int] = (5, 95)) -> dict | None:
    """Invoke the thin R sidecar (coupling.R) → `RTransferEntropy::calc_ete` over the N-signal
    matrix (rows=time, cols=signals) → the pairwise DIRECTIONAL effective-transfer-entropy
    matrix (ete[i][j] = flow i→j) + a source-permutation bootstrap p-value matrix. Returns the
    parsed verdict dict, or None when R / the sidecar / RTransferEntropy is unavailable (⇒ the
    caller degrades to a graceful skip — coupling has NO python fallback, TE is the R plane).
    drawer_io-style: one NDJSON request on stdin, one NDJSON response on stdout."""
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
        line = [l for l in proc.stdout.splitlines() if l.strip().startswith("{")]
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
    entropy matrix + bootstrap p-values (the R sidecar coupling.R). On top of the raw matrices
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


# ── TREE — ecp::e.divisive (R sidecar) → nested changepoint tree; ruptures fallback (cont.) ─


def changepoint_tree(matrix: np.ndarray, max_cuts: int, min_size: int = 2,
                     sig_lvl: float = 0.05) -> dict:
    """The multivariate nested changepoint tree (coarse cuts parent fine cuts). Tries the R
    `ecp::e.divisive` sidecar first (nonparametric, native-divisive), falls to ruptures
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
    (implicit — the finest atom), so only Theme..Beat draw from the shared cut budget."""
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
              registers: dict | None = None) -> list[dict]:
    """Build the per-chunk lar_ffz membership address from the nested cut tree.

    For each aperture band the segmentation uses the first `band_counts[b]` cuts (a PREFIX
    of the finer band's cuts → nesting), so the address is prefix-truncatable exactly like
    mesh/ffz-project.ts ffzMembershipAddress. Pulse = the chunk index (the finest atom).
    Returns one row per chunk: {"index", "cells": {Theme,Arc,Measure,Beat,Pulse},
    "lar_ffz": "<profile>/…", "register": Canon|Provisional}."""
    theme_n, arc_n, measure_n, beat_n = (band_counts + [0, 0, 0, 0])[:4]
    labels = {
        "Theme": _segment_labels(n, order[:theme_n]),
        "Arc": _segment_labels(n, order[:arc_n]),
        "Measure": _segment_labels(n, order[:measure_n]),
        "Beat": _segment_labels(n, order[:beat_n]),
        "Pulse": list(range(n)),
    }
    reg = registers or {}
    rows = []
    for i in range(n):
        cells = {b: labels[b][i] for b in FFZ_ADDRESS_ORDER}
        segs = [str(cells[b]) for b in FFZ_ADDRESS_ORDER]
        rows.append({
            "index": i,
            "cells": cells,
            "lar_ffz": "corpus/" + ".".join(segs),
            "register": reg.get(i, "Canon"),
        })
    return rows


# ── GATE — resampling-consensus: lock Canon only where a bootstrap reproduces the cut ─────


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
    """The confidence register made STATISTICAL (corpus.md #the-convergence-gate). Perturb
    the multivariate signal at its own NOISE FLOOR (index-PRESERVING, so a cut's location
    stays comparable — unlike a sequence-resample, which scrambles where a boundary sits),
    re-detect the changepoint tree on each replicate, and score how often each original cut
    REPRODUCES (a replicate cut lands within `tol` chunks). A cut backed by a shift larger
    than the noise floor survives the jitter (LOCKS Canon, support ≥ ½); a cut resting on
    sub-floor wiggle fragments (HOLDS Provisional). Two methods:
      · "bootstrap"  — additive noise-floor jitter (a wild/residual bootstrap), the default.
      · "jackknife"  — leave-a-contiguous-block-out, with index-shift-aware reproduction
                       (a cut past the dropped block is expected `block` chunks earlier).
    Returns {"cut_support", "register_of_cut", "consensus", "method"}. NEVER lets an
    un-witnessed boundary read Canon."""
    M = np.asarray(matrix, dtype=float)
    if M.ndim == 1:
        M = M.reshape(-1, 1)
    n = M.shape[0]
    if n < 8 or not order:
        return {"cut_support": {}, "register_of_cut": {}, "consensus": 0.0, "method": method}
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
    register = {int(c): ("Canon" if support[int(c)] >= 0.5 else "Provisional") for c in order}
    consensus = float(np.mean(list(support.values()))) if support else 0.0
    return {"cut_support": support, "register_of_cut": register, "consensus": consensus, "method": method}


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
    → TREE (divisive cuts) → allocate cuts across the 5 bands → GATE (resampling register) →
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
    # Per-chunk register: a chunk inherits the WEAKEST register of the cuts bounding its
    # coarsest changed band (a chunk under only Provisional cuts holds Provisional).
    reg_of_cut = gate["register_of_cut"]
    chunk_reg = {}
    for i in range(n):
        bounding = [reg_of_cut.get(int(c), "Canon") for c in order if int(c) <= i]
        chunk_reg[i] = "Provisional" if any(r == "Provisional" for r in bounding) else "Canon"
    cells = ffz_cells(order, band_counts, n, registers=chunk_reg)
    return {
        "n": n,
        "planes": M.shape[1],
        "spine": {
            "levels": mra.get("levels", 0),
            "energy_fractions": band_energy_fractions(mra),
            "band_names_fine_to_coarse": BANDS_FINE_TO_COARSE[: mra.get("levels", 0)],
        },
        "servo": {"boundaries": servo["boundaries"], "moved": servo["moved"], "n_modes": n_modes, "ridges": servo["ridges"]},
        "tree": {"engine": tree["engine"], "n_cuts": len(order), "order": order, "band_counts": band_counts},
        "gate": {"consensus": gate["consensus"], "cut_support": gate["cut_support"], "method": gate_method,
                 "canon_cuts": sum(1 for r in reg_of_cut.values() if r == "Canon"),
                 "provisional_cuts": sum(1 for r in reg_of_cut.values() if r == "Provisional")},
        "bocpd": bocpd,
        "noise_floor": wavelet_threshold_floor(mra),
        "cells": cells,
        "r_available": _r_available(),
    }


# ── the palace readback — the content(+form) embeddings feed (chroma) ─────────────────────


def _read_palace_planes(palace_dir: str) -> tuple[list[np.ndarray], list[str], str]:
    """Read the corpus content (+ form/structure when present) embeddings back out of the
    scratch mempalace at `palace_dir`, IN corpus sequence order. Returns (planes, ids, note).
    NEVER re-embeds — reads the STORED nomic vectors (the readback discipline of drawer_io's
    cmd_embeddings). Graceful: no chroma / mempalace / no vectors ⇒ ([], [], note)."""
    try:
        from mempalace.palace import get_collection
    except Exception as exc:  # noqa: BLE001 — no mempalace/chroma → bands-skipped
        return [], [], f"bands-skipped: no mempalace ({type(exc).__name__})"
    try:
        col = get_collection(palace_dir, _skip_identity_check=True)
    except Exception as exc:  # noqa: BLE001
        return [], [], f"bands-skipped: no content store ({type(exc).__name__})"
    try:
        got = col.get(include=["embeddings", "metadatas"])
    except Exception as exc:  # noqa: BLE001
        return [], [], f"bands-skipped: content readback fault ({type(exc).__name__})"
    ids, embs, metas = got.get("ids", []), got.get("embeddings", []), got.get("metadatas", [])
    rows = []
    for i, e, m in zip(ids, embs, metas):
        if e is None:
            continue
        m = m or {}
        rows.append((m.get("source_file", ""), m.get("chunk_index", 1 << 30), i, np.asarray(e, dtype=float)))
    if len(rows) < 2:
        return [], [], f"bands-skipped: too few vectors ({len(rows)})"
    rows.sort(key=lambda r: (r[0], r[1] if r[1] is not None else 1 << 30, r[2]))
    content = np.vstack([r[3] for r in rows])
    ids_sorted = [r[2] for r in rows]
    planes = [content]
    # The structure plane (S2), keyed by verbatim_sha, when a structure sub-palace stands —
    # joined by order-position is unsound, so we feed CONTENT alone unless a form store aligns.
    # (Form/structure multivariate fusion rides the same run_stack; wired when the join lands.)
    return planes, ids_sorted, f"content: {len(ids_sorted)} vectors"


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


def cmd_analyze(args) -> None:
    """Read the corpus embeddings from the scratch palace (or --signal), run the stack, and
    emit NDJSON lar_ffz cells + a final JSON summary. GRACEFUL: no chroma / no vectors ⇒ a
    single `{"note":"bands-skipped: …","cells":0}` summary (the content plane stands)."""
    if args.signal:
        planes, ids, note = [_load_signal(args.signal)], None, "signal-file"
        planes = [p for p in planes if p.size]
    else:
        planes, ids, note = _read_palace_planes(args.palace)
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
    # Emit one NDJSON cell per chunk (keyed to the drawer id when the palace supplied ids).
    for row in out["cells"]:
        rec = {"lar_ffz": row["lar_ffz"], "register": row["register"], "cells": row["cells"]}
        if ids is not None and row["index"] < len(ids):
            rec["id"] = ids[row["index"]]
        sys.stdout.write(json.dumps(rec) + "\n")
    # The authoritative final summary line (the TS caller parses the LAST JSON object).
    summary = {
        "note": f"bands: {out['tree']['n_cuts']} cuts · {out['gate']['canon_cuts']} Canon / {out['gate']['provisional_cuts']} Provisional · engine {out['tree']['engine']} · {note}",
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


def cmd_selftest(args) -> None:
    """A synthetic-signal self-check (no chroma, no fixture file): a fast+slow signal → the
    SPINE separates the scales; a clean vs noisy fixture → the GATE locks vs holds."""
    n = 256
    t = np.arange(n)
    fast = np.sin(2 * np.pi * t / 4.0)
    slow = np.sin(2 * np.pi * t / 64.0)
    mra = modwt_mra(fast + slow)
    frac = band_energy_fractions(mra)
    fine_energy = sum(frac[:2])
    coarse_energy = sum(frac[3:])
    report = {
        "spine_levels": mra["levels"],
        "energy_fractions": frac,
        "fine_holds_fast": fine_energy > 0.2,
        "coarse_holds_slow": coarse_energy > 0.05,
    }
    sys.stdout.write(json.dumps(report) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="bands_sidecar — the multi-scale FFZ bands cap")
    sub = ap.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("decompose", help="full stack over a raw signal matrix (NDJSON) → JSON summary")
    d.add_argument("--signal", required=True, help="NDJSON signal file, or - for stdin")
    d.add_argument("--planes", type=int, default=0, help="tile a 1-D signal to N planes (test)")
    d.add_argument("--boot", type=int, default=40, help="resampling-gate replicate count")
    d.add_argument("--gate", default="bootstrap", choices=["bootstrap", "jackknife"])
    d.set_defaults(fn=cmd_decompose)

    a = sub.add_parser("analyze", help="corpus palace (or --signal) → NDJSON lar_ffz cells + summary")
    a.add_argument("--palace", default="", help="the corpus scratch palace dir (content readback)")
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

    s = sub.add_parser("selftest", help="synthetic multi-scale self-check (no chroma)")
    s.set_defaults(fn=cmd_selftest)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
