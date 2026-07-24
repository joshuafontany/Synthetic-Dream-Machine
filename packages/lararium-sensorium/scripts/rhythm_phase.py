#!/usr/bin/env python3
"""rhythm_phase — turn a DETECTED rhythm into a PER-POSITION feature.

THE MOVE. ffz_continuous_pour decouples the character stream into dyadic MODWT detail bands
and reads the FFZ lock PER BAND, but it only SEGMENTS — it crests each band into scale-
entities at phase-boundaries and never writes each position's phase back. This plane closes
that gap: for each MODWT detail band it takes the ANALYTIC (Hilbert) transform → the
INSTANTANEOUS PHASE per position and the ENVELOPE amplitude per position, plus a per-position
LOCK reading the local steadiness of the instantaneous frequency. Stack the bands and every
stream position carries a vector `[(phase, amplitude) per scale]` — a rhythmic POSITIONAL
ENCODING the data's own rhythm derives, never an imposed sinusoid basis.

WHY THE ANALYTIC SIGNAL. A bandpass detail rings at its own scale; its analytic signal
z = d + i·H(d) rotates once per local period. `angle(z)` reads WHERE in the cycle a position
sits (the phase), `|z|` reads HOW STRONGLY the band carries it there (the envelope). A planted
sinusoid advances phase LINEARLY and holds the envelope steady; a narrowband slice of white
noise wanders its phase and jitters its envelope — so the LOCK (the local concentration of the
instantaneous frequency) separates a real rhythm from a band-ringing artifact WITHOUT a
hand-set threshold: a steady beat concentrates the IF phasor toward 1, a wandering one spreads
it toward 0.

THE TUNABLE LENS. A coordinate already rides the poured content — the block's `lar_speaker`
(operator | agent), its `source_file` (the work/stream), its `lar_turn_key` (the turn). The
lens = a GROUPBY that coordinate, supplied by the caller as a per-position label array (a #has
cap — `tick_coordinate` reads it off the block metadata; the plane never presupposes which key
carries meaning). Two shapes, one mechanism:
  · lens_from_coord — ONE interleaved stream split by a per-position coordinate into DISJOINT
    strata (operator's ticks, agent's ticks), each decoupled to its OWN rhythm. The role lens
    is one instance (coordinate ∈ {operator, agent}).
  · lens_from_streams — SEVERAL streams sharing a common position axis (two source_files as
    parallel channels), each decoupled AND the CROSS-STRATUM phase-lead read pairwise: does
    stratum A's phase lead stratum B's, per scale, and by how many ticks? A two-stream
    comparison is another instance (coordinate = stream-id).

The cross-stratum lead reads the amplitude-weighted circular mean of the per-band phase
difference and divides by the band's own angular frequency → a LAG in original ticks, signed
(positive = A leads B). B = A delayed by a fixed lag recovers that lag, sign and magnitude.

Reuses the MODWT machinery in ffz_continuous_pour (`_mra_details`) — the wavelet never
re-rolls here. Pure numeric (numpy + an analytic transform, scipy when it stands, an FFT
fallback when it sits absent), behind the causal-island boundary.

Meme: lar:///ha.ka.ba/lararium/sensorium/rhythm-phase
"""
from __future__ import annotations

import os

import numpy as np

from ffz_continuous_pour import _mra_details

#: Default detail-level count — how many dyadic octaves the plane asks a signal to carry.
#: `_mra_details` clamps this to floor(log2(n)), so a short signal simply resolves fewer.
DEFAULT_LEVELS = 8

_EPS = 1e-12


# ── the analytic transform — scipy when present, an FFT fallback when absent ───────────────


def analytic_signal(x: np.ndarray) -> np.ndarray:
    """The analytic signal z = x + i·H(x) (H the Hilbert transform). `scipy.signal.hilbert`
    carries it when scipy stands; otherwise the FFT construction (Marple): zero the negative
    frequencies, double the positive ones, keep DC and Nyquist. Both agree to machine noise —
    the fallback keeps the plane running where scipy sits absent (the graceful degrade the
    sensorium scripts already speak)."""
    x = np.asarray(x, dtype=float).ravel()
    n = x.size
    if n == 0:
        return np.zeros(0, dtype=complex)
    try:
        from scipy.signal import hilbert

        return np.asarray(hilbert(x), dtype=complex)
    except Exception:  # noqa: BLE001 — scipy absent / an edge → the FFT analytic construction
        X = np.fft.fft(x)
        h = np.zeros(n, dtype=float)
        if n % 2 == 0:
            h[0] = h[n // 2] = 1.0
            h[1:n // 2] = 2.0
        else:
            h[0] = 1.0
            h[1:(n + 1) // 2] = 2.0
        return np.fft.ifft(X * h)


def _odd(w: int, n: int) -> int:
    """Clamp a window odd, ≥ 5, ≤ n (or n itself when the signal runs shorter than 5)."""
    if n < 5:
        return max(1, n)
    w = int(max(5, min(int(w), n)))
    if w % 2 == 0:
        w -= 1
    return max(5, w)


def _if_window(scale: int, n: int) -> int:
    """The window the IF concentration reads over — about two of the band's own periods, the
    span across which a steady beat holds its frequency while a wandering one drifts."""
    return _odd(2 * int(scale), n)


def _env_window(scale: int, n: int) -> int:
    """The window the envelope flatness reads over — about ONE of the band's periods, the span
    a narrowband-noise ring breathes across (its envelope decorrelates near the period), so the
    Rayleigh breathing registers rather than smoothing away under a longer average."""
    return _odd(int(scale), n)


def band_instantaneous(band: np.ndarray, scale: int) -> dict:
    """Read ONE detail band's per-position rhythm from its analytic signal:
      · phase[t]     = angle(z[t])            — where in the cycle the position sits
      · amplitude[t] = |z[t]|                 — the band's local envelope strength there
      · inst_freq[t] = d(unwrap phase)/dt     — the local angular frequency (rhythm rate)
      · lock[t]      = IF-concentration × envelope-flatness — a locked rhythm holds BOTH a
                       steady frequency AND a steady amplitude. The IF concentration alone
                       never separates a real beat from a band-ringing artifact: a narrowband
                       filter imposes its OWN centre frequency, so a white-noise slice rings at
                       a near-steady IF (concentration → 1) exactly as a planted tone does
                       (the ffz_continuous_pour per-band lock names the same saturation). The
                       ENVELOPE tells them apart — a pure tone traces a constant-radius circle
                       (local amplitude CV → 0), a narrowband-noise ring breathes (Rayleigh
                       envelope, CV ≈ 0.52) — so the lock multiplies the IF concentration by the
                       local envelope flatness (1 − local amplitude CV): a beat locks toward 1,
                       a ring spreads toward ~0.5.

    Returns the four per-position series plus the band's summary reads (median angular
    frequency over the STRONG region — amplitude above its median — and the strong-region mean
    lock / envelope coefficient-of-variation, the steadiness the witness leans on)."""
    d = np.asarray(band, dtype=float).ravel()
    n = d.size
    if n < 4:
        return {"scale": int(scale), "n": n, "phase": np.zeros(n), "amplitude": np.zeros(n),
                "inst_freq": np.zeros(n), "lock": np.zeros(n), "omega": 0.0,
                "mean_lock": 0.0, "mean_amplitude": 0.0, "amp_cv": 0.0}
    z = analytic_signal(d)
    phase = np.angle(z)
    amp = np.abs(z)
    uphase = np.unwrap(phase)
    inst = np.zeros(n, dtype=float)
    inst[1:] = np.diff(uphase)
    inst[0] = inst[1]
    # The per-position lock = local IF concentration × local envelope flatness (a boxcar
    # window carries both). IF concentration = |windowed mean of exp(i·IF)| — a steady beat
    # holds one phasor → 1, a wandering ring spreads it. Envelope flatness = 1 − local
    # amplitude CV — a constant-radius tone → 1, a breathing Rayleigh ring → ~0.5. The product
    # separates a real rhythm from the band's own ringing, which the IF concentration alone
    # never could.
    wf = _if_window(scale, n)
    we = _env_window(scale, n)
    kf = np.ones(wf, dtype=float) / float(wf)
    ke = np.ones(we, dtype=float) / float(we)
    if_conc = np.abs(np.convolve(np.exp(1j * inst), kf, mode="same"))
    amp_mean = np.convolve(amp, ke, mode="same")
    amp_msq = np.convolve(amp * amp, ke, mode="same")
    amp_var = np.maximum(amp_msq - amp_mean * amp_mean, 0.0)
    amp_cv_local = np.sqrt(amp_var) / (amp_mean + _EPS)
    env_flat = np.clip(1.0 - amp_cv_local, 0.0, 1.0)
    # A GLOBAL steadiness gate rides beneath the local read: a band whose envelope breathes
    # ACROSS THE WHOLE POUR (a high global amplitude CV) carries a less trustworthy rhythm at
    # every position, since a db4 detail's envelope decorrelates over more than one period and
    # the local window alone cannot see the slow breath. A constant-radius tone → gate 1, a
    # Rayleigh ring (CV ≈ 0.5) → gate ≈ 0.65.
    amp_cv_global = float(np.std(amp) / (np.mean(amp) + _EPS))
    global_flat = 1.0 / (1.0 + amp_cv_global)
    lock = if_conc * env_flat * global_flat
    # The STRONG region — positions the band actually carries — sets the summary reads, so a
    # low-envelope edge never dilutes the rhythm gauge.
    strong = amp >= max(float(np.median(amp)), _EPS)
    strong_inst = inst[strong]
    omega = float(np.median(strong_inst)) if strong_inst.size else 0.0
    strong_amp = amp[strong]
    return {
        "scale": int(scale), "n": n,
        "phase": phase, "amplitude": amp, "inst_freq": inst, "lock": lock,
        "omega": omega,
        # The lock averages over ALL positions, never the strong region: a tone locks
        # everywhere, while a noise ring's TROUGHS (where the envelope climbs from near zero)
        # break its lock — gating to strong positions would read only the ring's flat peaks and
        # hide the breathing that separates it from a beat.
        "mean_lock": float(np.mean(lock)),
        "mean_amplitude": float(np.mean(strong_amp)) if strong_amp.size else float(np.mean(amp)),
        # The GLOBAL envelope coefficient-of-variation — the sharpest 'does this band breathe'
        # read (a constant-radius tone → 0, a Rayleigh ring → ≈ 0.52), the same measure the
        # lock's global steadiness gate rides.
        "amp_cv": amp_cv_global,
    }


# ── the per-position encoding — stack the bands into a rhythmic positional vector ──────────


def phase_encode(signal: np.ndarray, levels: int = DEFAULT_LEVELS) -> dict:
    """THE PLANE. Decouple `signal` into MODWT detail bands (fine→coarse, reusing
    `_mra_details`), read each band's per-position phase/amplitude/lock, and STACK them:
    `encoding[t]` carries the vector `[(phase, amplitude) per scale]` — the rhythmic positional
    encoding, derived from the data's own bands, never an imposed basis.

    Returns {"n", "scales" (2^j per band, fine→coarse), "bands" (the per-band series + summary
    reads), "encoding" (an n × n_bands × 2 array — [phase, amplitude] per scale),
    "dominant" (the band with the strongest amplitude·lock — the rhythm the signal most
    carries)}. A signal too short to decouple returns an empty encoding, honestly."""
    x = np.asarray(signal, dtype=float).ravel()
    n = x.size
    details = _mra_details(x, levels)
    if not details:
        return {"n": n, "scales": [], "bands": [], "encoding": np.zeros((n, 0, 2)),
                "dominant": None, "note": "signal-too-short-to-decouple"}
    bands = []
    scales = []
    enc = np.zeros((n, len(details), 2), dtype=float)
    for j, d in enumerate(details, start=1):
        scale = 1 << j
        inst = band_instantaneous(d, scale)
        enc[:, j - 1, 0] = inst["phase"]
        enc[:, j - 1, 1] = inst["amplitude"]
        bands.append(inst)
        scales.append(scale)
    # The dominant band — the strongest steady carrier (mean amplitude × mean lock).
    strengths = [b["mean_amplitude"] * b["mean_lock"] for b in bands]
    di = int(np.argmax(strengths)) if strengths else 0
    dom = {"scale": bands[di]["scale"], "index": di, "mean_lock": bands[di]["mean_lock"],
           "mean_amplitude": bands[di]["mean_amplitude"], "omega": bands[di]["omega"],
           "amp_cv": bands[di]["amp_cv"]} if bands else None
    return {"n": n, "scales": scales, "bands": bands, "encoding": enc, "dominant": dom}


def phase_linearity(band: dict) -> float:
    """How LINEARLY the band's phase advances over its strong region — the correlation of the
    unwrapped phase against the position index (1.0 = a perfectly steady beat). A planted
    sinusoid rides near 1; a wandering ring falls away. A read the witness leans on for the
    'phase advances ~linearly within each period' claim."""
    amp = np.asarray(band["amplitude"], dtype=float)
    ph = np.unwrap(np.asarray(band["phase"], dtype=float))
    if ph.size < 3:
        return 0.0
    strong = amp >= max(float(np.median(amp)), _EPS)
    idx = np.where(strong)[0]
    if idx.size < 3:
        idx = np.arange(ph.size)
    t = idx.astype(float)
    y = ph[idx]
    if float(np.std(t)) < _EPS or float(np.std(y)) < _EPS:
        return 0.0
    return float(abs(np.corrcoef(t, y)[0, 1]))


# ── the cross-stratum phase-lead — recover a lag between two aligned strata ────────────────


def cross_stratum_lead(signal_a: np.ndarray, signal_b: np.ndarray,
                       levels: int = DEFAULT_LEVELS) -> dict:
    """The CROSS-STRATUM read: does stratum A's phase LEAD stratum B's, per scale, and by how
    many ticks? Both signals share a common position axis (two parallel streams, or two role
    channels aligned tick-for-tick); the shorter truncates the pair. Per band:

      · Δφ̄  = the amplitude-weighted circular mean of the per-position phase difference
              angle(z_A) − angle(z_B) — where BOTH bands carry strength, the phase relation
              speaks; where neither does, it stays quiet.
      · coherence = |the weighted mean phasor| — how CONSISTENTLY A holds that phase relation
              to B (a cross phase-locking value; near 1 a stable lead, near 0 no relation).
      · ω̄  = the band's own angular frequency (median strong-region IF).
      · lag = Δφ̄ / ω̄ in ORIGINAL ticks, SIGNED: positive → A leads B (B lags A). B = A
              delayed by a fixed lag recovers +lag; the reverse recovers −lag. Recoverable
              unambiguously for a lag under half the band's period.

    Returns {"scales", "per_scale" (Δφ̄ / coherence / ω̄ / lag_ticks per band),
    "dominant" (the highest-coherence band — the lag the two strata most agree on)}."""
    a = np.asarray(signal_a, dtype=float).ravel()
    b = np.asarray(signal_b, dtype=float).ravel()
    m = min(a.size, b.size)
    a, b = a[:m], b[:m]
    da = _mra_details(a, levels)
    db = _mra_details(b, levels)
    rows = []
    for j in range(1, min(len(da), len(db)) + 1):
        scale = 1 << j
        za = analytic_signal(da[j - 1])
        zb = analytic_signal(db[j - 1])
        weight = np.abs(za) * np.abs(zb)
        dphi = np.angle(za) - np.angle(zb)
        phasor = np.sum(weight * np.exp(1j * dphi)) / (float(np.sum(weight)) + _EPS)
        dphi_bar = float(np.angle(phasor))
        coherence = float(np.abs(phasor))
        # The band angular frequency from A's strong-region IF (B rings at the same scale).
        ampa = np.abs(za)
        ua = np.unwrap(np.angle(za))
        inst = np.diff(ua) if ua.size > 1 else np.zeros(0)
        strong = ampa[1:] >= max(float(np.median(ampa)), _EPS) if inst.size else np.zeros(0, bool)
        omega = float(np.median(inst[strong])) if inst.size and strong.any() else (
            float(np.median(inst)) if inst.size else 0.0)
        lag = dphi_bar / omega if abs(omega) > _EPS else 0.0
        rows.append({"scale": scale, "phase_lead": dphi_bar, "coherence": coherence,
                     "omega": omega, "lag_ticks": lag})
    dom = max(rows, key=lambda r: r["coherence"]) if rows else None
    return {"scales": [r["scale"] for r in rows], "per_scale": rows, "dominant": dom}


# ── the lens — a groupby a coordinate the poured content already carries ────────────────────


def _distinct_in_order(coord: np.ndarray) -> list:
    """The distinct labels in first-appearance order (deterministic, no sort surprise on mixed
    label types)."""
    seen = []
    for v in coord:
        if v not in seen:
            seen.append(v)
    return seen


def lens_from_coord(signal: np.ndarray, coord, levels: int = DEFAULT_LEVELS) -> dict:
    """THE LENS over ONE interleaved stream. `coord` (a #has cap — a per-position label array,
    read off the block metadata by `tick_coordinate`) partitions the positions into DISJOINT
    strata; each stratum's positions extract IN ORDER into its own sub-signal and decouple to
    its OWN rhythm (`phase_encode`). The operator|agent role lens rides here (coordinate ∈
    {operator, agent}); a per-work or per-turn coordinate rides it identically — the plane
    never presupposes which key names a stratum.

    Disjoint strata share no common position axis, so this face reports each stratum's
    intrinsic rhythm and its position map back onto the stream; the CROSS-stratum phase-lead
    (which needs an aligned axis) rides `lens_from_streams` / `cross_stratum_lead` instead.
    Returns {"strata": {label: encoding + "positions"}}."""
    x = np.asarray(signal, dtype=float).ravel()
    coord = np.asarray(list(coord), dtype=object)
    m = min(x.size, coord.size)
    x, coord = x[:m], coord[:m]
    strata = {}
    for lab in _distinct_in_order(coord):
        idx = np.where(coord == lab)[0]
        sub = x[idx]
        if sub.size < 8:
            strata[str(lab)] = {"note": "stratum-too-short-to-decouple", "n": int(sub.size),
                                "positions": idx}
            continue
        enc = phase_encode(sub, levels)
        enc["positions"] = idx
        strata[str(lab)] = enc
    return {"strata": strata, "axis": "stratum-local (disjoint positions)"}


def lens_from_streams(signals_by_stratum: dict, levels: int = DEFAULT_LEVELS) -> dict:
    """THE LENS over SEVERAL streams sharing a common position axis. `signals_by_stratum`
    (a #has cap — {label: signal array}, the caller building one array per stratum, e.g. two
    `source_file` channels sampled on one timeline) decouples each stratum to its own rhythm
    AND reads the CROSS-stratum phase-lead pairwise. A stream-id coordinate rides here; the
    caller chooses which coordinate names a stream.

    Returns {"strata": {label: encoding}, "cross_lead": {"A->B": cross_stratum_lead(A, B)}}.
    Pairs read in label order, so the sign of a lead stays legible (A→B positive = A leads
    B)."""
    strata = {}
    for lab, sig in signals_by_stratum.items():
        s = np.asarray(sig, dtype=float).ravel()
        strata[str(lab)] = (phase_encode(s, levels) if s.size >= 8
                            else {"note": "stratum-too-short-to-decouple", "n": int(s.size)})
    leads = {}
    labels = list(signals_by_stratum.keys())
    for i in range(len(labels)):
        for k in range(i + 1, len(labels)):
            a, b = labels[i], labels[k]
            leads[f"{a}->{b}"] = cross_stratum_lead(
                signals_by_stratum[a], signals_by_stratum[b], levels)
    return {"strata": strata, "cross_lead": leads}


# ── the coordinate provenance — read the lens #has cap off the poured content ──────────────


def frames_with_meta(root: str):
    """Yield the bed's records in the SAME chant order `frames_from_bed` pours (source_file,
    then chunk_index), each carrying its FULL block metadata — the provenance the lens reads a
    coordinate off. Reads the durable content store only."""
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
    for r in records:
        yield {"text": r.get("document") or "", "metadata": r.get("metadata") or {}}


def tick_coordinate(frames, key: str, *, missing: str = "_") -> np.ndarray:
    """Build the lens #has cap — a PER-TICK label array read off a chosen block metadata `key`
    (e.g. `lar_speaker`, `source_file`, `lar_turn_key`). Walks the frames char-by-char in the
    SAME order `pour_ticks` counts ticks, so the returned array aligns position-for-position
    with the pour's signals. A block missing the key reads `missing` — the plane never
    presupposes every block carries every coordinate."""
    labels: list = []
    for f in frames:
        v = (f.get("metadata") or {}).get(key)
        lab = v if v is not None else missing
        labels.extend([lab] * len(f.get("text") or ""))
    return np.asarray(labels, dtype=object)
