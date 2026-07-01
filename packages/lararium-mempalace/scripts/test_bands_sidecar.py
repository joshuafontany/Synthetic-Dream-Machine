"""Tests for bands_sidecar — the multi-scale FFZ bands cap (corpus.md #the-bands).

Four faces proven, all chroma-free (pure signal in, bands verdict out):
  1. the SPINE — MODWT-MRA decomposes a synthetic fast+slow signal into the 5 bands that
     SEPARATE the two scales (fast → the fine details D1/D2, slow → the coarse D5).
  2. the SERVO — EWT spectral-boundary detection + EWMA-hysteresis nudges band boundaries
     (a boundary moves toward fresh spectral evidence, damped; no evidence → it holds).
  3. the TREE — the multivariate divisive changepoint tree yields NESTED cuts over a
     multivariate block fixture (the R ecp path, or the ruptures fallback when R is absent).
  4. the GATE — the resampling-consensus register locks a STABLE boundary Canon and holds a
     noise-only one Provisional (the confidence register made statistical).

Run under the mempalace venv:
    ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_bands_sidecar.py -q
"""
import json
import shutil
import subprocess
import sys

import numpy as np
import pytest

import bands_sidecar as bs


# ── SPINE ─────────────────────────────────────────────────────────────────────────────────


def test_modwt_spine_separates_fast_and_slow():
    """A fast (period 4) + slow (period 64) signal decomposes so the fast energy lands in the
    FINE details (D1/D2 = Pulse/Beat) and the slow in the COARSE (D5 = Theme) — the aperture
    ladder IS the wavelet MRA."""
    t = np.arange(256)
    fast = np.sin(2 * np.pi * t / 4.0)
    slow = np.sin(2 * np.pi * t / 64.0)
    mra = bs.modwt_mra(fast + slow, levels=5)
    assert mra["levels"] == 5
    frac = bs.band_energy_fractions(mra)
    # D1/D2 (fine, fast) hold a large share; D5 (coarse, slow) holds a distinct share.
    fine = frac[0] + frac[1]
    coarse = frac[4]
    assert fine > 0.4, f"fast should concentrate in fine bands, got {frac}"
    assert coarse > 0.1, f"slow should show in the coarse band, got {frac}"
    # The two scales are SEPARATED: the mid band (D3) carries little of either.
    assert frac[2] < fine and frac[2] < coarse


def test_spine_short_signal_reduces_levels():
    """A corpus too short for 5 octaves transparently decomposes at fewer levels (never crashes)."""
    mra = bs.modwt_mra(np.sin(np.arange(20) / 2.0), levels=5)
    assert 0 < mra["levels"] <= 5
    assert mra["n"] == 20


def test_spine_pulse_maps_D1():
    """The band-name map holds: fine→coarse = Pulse..Theme (the D1..D5 one-to-one)."""
    assert bs.BANDS_FINE_TO_COARSE == ["Pulse", "Beat", "Measure", "Arc", "Theme"]
    assert bs.FFZ_ADDRESS_ORDER == ["Theme", "Arc", "Measure", "Beat", "Pulse"]


# ── SERVO ─────────────────────────────────────────────────────────────────────────────────


def test_ewt_servo_nudges_boundaries_damped():
    """The servo adopts fresh EWT boundaries on first sight, then NUDGES them toward new
    spectral evidence by a damped EWMA step (never a full jump when it already holds a prior)."""
    t = np.arange(256)
    sig = np.sin(2 * np.pi * t / 8.0) + 0.5 * np.sin(2 * np.pi * t / 32.0)
    first = bs.ewt_servo(sig, n_modes=3, prev_boundaries=None)
    assert first["boundaries"], "EWT should find spectral boundaries on a two-tone signal"
    # A shifted signal → fresh boundaries; the servo moves the held ones only partway (damped).
    prev = [b + 0.3 for b in first["boundaries"]]
    nudged = bs.ewt_servo(sig, n_modes=3, prev_boundaries=prev, alpha=0.3)
    for p, nb, tgt in zip(prev, nudged["boundaries"], first["boundaries"]):
        # nudged sits BETWEEN the held prior and the fresh target (damped, not a full jump).
        lo, hi = sorted((p, tgt))
        assert lo - 1e-6 <= nb <= hi + 1e-6


def test_ewma_hysteresis_holds_below_threshold():
    """No boundary moves when the spectral evidence doesn't clear the damped threshold."""
    held = bs.ewma_hysteresis(prev=1.0, target=2.0, evidence=0.1, threshold=0.5, alpha=0.5)
    assert held == 1.0  # evidence < threshold → HOLD
    moved = bs.ewma_hysteresis(prev=1.0, target=2.0, evidence=0.9, threshold=0.5, alpha=0.5)
    assert moved == pytest.approx(1.5)  # evidence > threshold → damped step


# ── TREE ──────────────────────────────────────────────────────────────────────────────────


def _blocks(seed=0, noise=0.02):
    rng = np.random.default_rng(seed)
    seg = [np.tile([1.0, 0, 0], (30, 1)), np.tile([0, 1.0, 0], (30, 1)), np.tile([0, 0, 1.0], (30, 1))]
    return np.vstack(seg) + rng.normal(0, noise, (90, 3))


def test_changepoint_tree_finds_block_boundaries():
    """The multivariate divisive tree recovers the true block boundaries (near 30 and 60) as
    its FIRST (coarsest) cuts — ecp::e.divisive when R stands, else the ruptures fallback."""
    E = _blocks()
    tree = bs.changepoint_tree(E, max_cuts=6, min_size=2)
    order = tree["order"]
    assert len(order) >= 2
    # the two strongest boundaries lead the divisive order → within tolerance of 30 and 60
    lead = order[:2]
    assert any(abs(c - 30) <= 3 for c in lead), f"cut near 30 expected, got {order}"
    assert any(abs(c - 60) <= 3 for c in lead), f"cut near 60 expected, got {order}"
    assert tree["engine"] in ("ecp-e.divisive", "ruptures-binseg-rbf", "variance-split")


def test_band_cuts_nest_prefix_truncatable():
    """The per-band cut counts are NONDECREASING Theme→Beat, so a coarser band's cuts are a
    PREFIX of a finer band's — the lar_ffz address stays prefix-truncatable (ultrametric)."""
    E = _blocks()
    tree = bs.changepoint_tree(E, max_cuts=8, min_size=2)
    mra = bs.modwt_mra(bs.cohesion_signal([E]).mean(axis=1))
    counts = bs.allocate_band_cuts(tree["order"], mra)  # [Theme, Arc, Measure, Beat]
    assert counts == sorted(counts), f"band cut counts must be nondecreasing, got {counts}"
    # nesting: Theme labels coarsen Beat labels (a Theme boundary is also a Beat boundary)
    cells = bs.ffz_cells(tree["order"], counts, 90)
    theme = [c["cells"]["Theme"] for c in cells]
    beat = [c["cells"]["Beat"] for c in cells]
    # wherever Theme increments, Beat also increments (coarse ⊂ fine)
    for i in range(1, 90):
        if theme[i] != theme[i - 1]:
            assert beat[i] != beat[i - 1]


# ── GATE ──────────────────────────────────────────────────────────────────────────────────


def test_stability_gate_locks_stable_holds_noise():
    """The resampling-consensus gate: a STRONG block boundary reproduces under noise-floor
    jitter (LOCKS Canon); a noise-only fixture yields lower consensus with Provisional cuts."""
    E = _blocks(noise=0.02)
    order = bs.changepoint_tree(E, max_cuts=8, min_size=2)["order"]
    gate = bs.stability_gate(E, order, n_boot=50, seed=7)
    # the true boundaries (30, 60) lock Canon
    for true_cut in (30, 60):
        near = [c for c in order if abs(c - true_cut) <= 2]
        assert near, f"tree missed the true cut near {true_cut}"
        assert any(gate["register_of_cut"][int(c)] == "Canon" for c in near)
        assert max(gate["cut_support"][int(c)] for c in near) >= 0.7

    # a pure-noise fixture — no true structure → the gate refuses to canonize noise. Two
    # engines, two shapes of refusal, BOTH honored: the ruptures fallback always returns
    # cuts, so the resampling register HOLDS at least one Provisional (a low-consensus,
    # un-witnessed cut); the R `ecp::e.divisive` permutation test refuses the cut at source,
    # so `order` comes back EMPTY (a stronger refusal — nothing even reaches the register).
    noise = np.random.default_rng(11).normal(0, 1, (90, 3))
    norder = bs.changepoint_tree(noise, max_cuts=8, min_size=2)["order"]
    ngate = bs.stability_gate(noise, norder, n_boot=50, seed=7)
    assert ngate["consensus"] < gate["consensus"], "noise must witness weaker than clean blocks"
    reg = ngate["register_of_cut"]
    assert (not reg) or any(r == "Provisional" for r in reg.values()), (
        "noise must not canonize: either no significant cut (ecp) or a Provisional one (ruptures)"
    )


def test_jackknife_gate_runs_index_shift_aware():
    """The jackknife method (leave-a-block-out, index-shift-aware) also witnesses the true
    block boundaries (a distinct resampling engine, same verdict shape)."""
    E = _blocks(noise=0.02)
    order = bs.changepoint_tree(E, max_cuts=6, min_size=2)["order"]
    gate = bs.stability_gate(E, order, n_boot=40, seed=3, method="jackknife")
    assert gate["method"] == "jackknife"
    near30 = [c for c in order if abs(c - 30) <= 2]
    assert near30 and max(gate["cut_support"][int(c)] for c in near30) >= 0.5


# ── the composed stack + the FFZ cells ──────────────────────────────────────────────────────


def test_run_stack_emits_five_band_cells():
    """The full stack over the block fixture emits one lar_ffz address per chunk, five bands
    coarse→fine, each chunk carrying a Canon/Provisional register."""
    E = _blocks()
    coh = bs.cohesion_signal([E])
    out = bs.run_stack(E, spine_signal=coh.mean(axis=1), n_boot=30)
    assert out["n"] == 90
    assert len(out["cells"]) == 90
    row = out["cells"][45]
    assert set(row["cells"]) == set(bs.FFZ_ADDRESS_ORDER)
    assert row["lar_ffz"].startswith("corpus/")
    assert row["register"] in ("Canon", "Provisional")
    # the finest band (Pulse) is the chunk index itself
    assert out["cells"][45]["cells"]["Pulse"] == 45
    assert out["spine"]["levels"] >= 1
    assert out["tree"]["n_cuts"] >= 1


def test_cohesion_signal_drift():
    """The cohesion signal is `1 − cosine` against the PRIOR chunk — 0 within a coherent run,
    spiking at a block boundary (the wavelet-over-cohesion input)."""
    E = _blocks(noise=0.0)
    sig = bs.cohesion_signal([E])
    assert sig.shape == (90, 1)
    # near-zero drift inside a block, a spike at the 30/60 boundaries
    assert sig[15, 0] < 0.01
    assert sig[30, 0] > 0.5 and sig[60, 0] > 0.5


# ── COUPLE — the cross-stream transfer-entropy lead-lag plane (R sidecar coupling.R) ────────


def _lead_lag_fixture(seed=1, n=600, noise=0.2):
    """Signal A → B: B is a one-step-lagged copy of A (+ noise). A is a KNOWN lead of B, so a
    directional measure MUST score A→B ≫ B→A. Returns an N×2 matrix (cols = [A, B])."""
    rng = np.random.default_rng(seed)
    A = rng.normal(0, 1, n)
    B = np.concatenate([[0.0], A[:-1]]) + rng.normal(0, noise, n)
    return np.column_stack([A, B])


def test_couple_streams_directional_lead_lag():
    """`RTransferEntropy::calc_ete` over a KNOWN A-leads-B fixture scores A→B strictly above
    B→A and flags the A→B edge significant (the who-leads-whom read). When R is absent the
    verb degrades to a graceful `coupling-skipped` note (TE is the R plane, no python fallback)."""
    M = _lead_lag_fixture()
    out = bs.couple_streams(M, nboot=80, shuffles=50, seed=1, names=["A", "B"])
    if not bs._r_available():
        assert out["edges"] == 0 and out["note"].startswith("coupling-skipped")
        return
    assert out["engine"] == "RTransferEntropy-calc_ete"
    ete = out["ete"]
    # A→B (row 0, col 1) ≫ B→A (row 1, col 0): the lead direction dominates.
    assert ete[0][1] > ete[1][0], f"A must lead B, got ete={ete}"
    assert out["lead_lag"][0][1] > 0 and out["lead_lag"][1][0] < 0
    # the significant edge list carries A→B (p ≤ alpha), not the reverse.
    froms = {(e["from"], e["to"]) for e in out["edges"]}
    assert ("A", "B") in froms, f"A→B should be a significant edge, edges={out['edges']}"
    assert ("B", "A") not in froms, f"B→A must NOT be significant, edges={out['edges']}"


def test_couple_streams_graceful_on_single_signal():
    """A single-signal matrix can carry no coupling — the verb returns a graceful skip note,
    never a fault (mirrors the bands `analyze` no-chroma degrade)."""
    out = bs.couple_streams(np.random.default_rng(0).normal(0, 1, (100, 1)))
    assert out["edges"] == 0
    assert out["note"].startswith("coupling-skipped")


# ── the CLI faces ───────────────────────────────────────────────────────────────────────────


def _run_cli(args, stdin=None):
    return subprocess.run(
        [sys.executable, "bands_sidecar.py", *args],
        input=stdin, capture_output=True, text=True,
        cwd=__import__("os").path.dirname(__import__("os").path.abspath(__file__)),
    )


def test_cli_selftest():
    """`selftest` reports the spine separating the synthetic fast+slow scales."""
    r = _run_cli(["selftest"])
    assert r.returncode == 0
    rep = json.loads(r.stdout.strip().splitlines()[-1])
    assert rep["fine_holds_fast"] is True
    assert rep["coarse_holds_slow"] is True


def test_cli_decompose_stdin():
    """`decompose --signal -` runs the whole stack over an NDJSON signal on stdin."""
    t = np.arange(128)
    lines = "\n".join(json.dumps(float(v)) for v in np.sin(2 * np.pi * t / 8.0))
    r = _run_cli(["decompose", "--signal", "-", "--boot", "10"], stdin=lines)
    assert r.returncode == 0, r.stderr
    summary = json.loads(r.stdout.strip().splitlines()[-1])
    assert summary["spine"]["levels"] >= 1
    assert summary["cells"] >= 1  # decompose reports the CELL COUNT, not the rows


def test_cli_analyze_signal_emits_cells():
    """`analyze --signal` (chroma-bypass) emits NDJSON lar_ffz cells + a final summary."""
    E = _blocks()
    lines = "\n".join(json.dumps(row.tolist()) for row in E)
    r = _run_cli(["analyze", "--signal", "-", "--boot", "10"], stdin=lines)
    assert r.returncode == 0, r.stderr
    out_lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    summary = json.loads(out_lines[-1])
    assert summary["cells"] == 90
    cells = [json.loads(l) for l in out_lines[:-1]]
    assert len(cells) == 90
    assert all("lar_ffz" in c and "register" in c for c in cells)


def test_cli_couple_stdin():
    """`couple --signal -` runs the transfer-entropy plane over an NDJSON N-signal matrix and
    emits one JSON verdict. R present ⇒ the A→B edge leads; R absent ⇒ a graceful skip note."""
    M = _lead_lag_fixture(n=400)
    lines = "\n".join(json.dumps(row.tolist()) for row in M)
    r = _run_cli(["couple", "--signal", "-", "--nboot", "40", "--shuffles", "40",
                  "--names", "A,B"], stdin=lines)
    assert r.returncode == 0, r.stderr
    verdict = json.loads(r.stdout.strip().splitlines()[-1])
    if not bs._r_available():
        assert verdict["note"].startswith("coupling-skipped")
        return
    assert verdict["engine"] == "RTransferEntropy-calc_ete"
    assert verdict["ete"][0][1] > verdict["ete"][1][0]


def test_r_availability_flag():
    """The stack reports whether the R ecp sidecar is reachable (Rscript on PATH) — the
    degrade-to-ruptures signal the coordinator flags."""
    E = _blocks()
    out = bs.run_stack(E, n_boot=10)
    assert out["r_available"] == (shutil.which("Rscript") is not None)
    if not out["r_available"]:
        assert out["tree"]["engine"] in ("ruptures-binseg-rbf", "variance-split")


# ── EWS — the PREDICTIVE bands leg (critical-slowing-down forecast) ──────────────────────────


def _csd_approach_then_commit(seed=5, T=300, tail=120, jump=6.0):
    """A fixture that APPROACHES a bifurcation then COMMITS: over [0,T) the AR coefficient ramps
    0.3→0.97 (critical slowing down — rising lag-1-AC), then at T a mean-shift regime change
    commits (the jump ecp fires on). Returns (series, T)."""
    rng = np.random.default_rng(seed)
    a = np.concatenate([np.linspace(0.3, 0.97, T), np.full(tail, 0.4)])
    mu = np.concatenate([np.zeros(T), np.full(tail, jump)])
    x = np.zeros(T + tail)
    for t in range(1, T + tail):
        x[t] = mu[t] + a[t] * (x[t - 1] - mu[t - 1]) + rng.normal(0, 0.5)
    return x, T


def test_kendall_tau_trend_direction():
    """Kendall τ reads a rising series positive, a falling one negative, a flat one ≈ 0."""
    assert bs.kendall_tau(np.arange(20.0)) == pytest.approx(1.0)
    assert bs.kendall_tau(-np.arange(20.0)) == pytest.approx(-1.0)
    assert abs(bs.kendall_tau(np.ones(20))) < 1e-9


def test_generic_ews_rising_ac1_on_approach():
    """The rolling lag-1-AC TRENDS UP as the system approaches the bifurcation (critical
    slowing down); a stationary AR series shows no such trend."""
    x, T = _csd_approach_then_commit()
    g = bs.generic_ews(x[:T], window=50)
    assert g["ar1_tau"] > 0.3, f"AC1 should rise on the approach, got {g['ar1_tau']}"
    # a properly-burned-in stationary control does NOT trend up
    rng = np.random.default_rng(11)
    z = np.zeros(700)
    for t in range(1, 700):
        z[t] = 0.5 * z[t - 1] + rng.normal(0, 0.5)
    gz = bs.generic_ews(z[300:], window=50)
    assert gz["ar1_tau"] < 0.3


def test_forecast_fires_before_ecp_commits():
    """THE LOAD-BEARING VERIFY: the EWS leg forecasts the approaching bifurcation from the
    PRE-transition window (rising lag-1-AC + a SURROGATE-significant Kendall-τ + multi-band
    agreement) — fired using data BEFORE the transition, while ecp's coarsest committed cut
    lands AT the transition T. The forecast LEADS the changepoint."""
    x, T = _csd_approach_then_commit()
    fc = bs.forecast_ews(x[:T], window=50, n_surr=300, alpha=0.05, min_bands=2, seed=1)
    assert fc["fired"] is True, f"forecast should fire on the approach, got {fc['note']}"
    assert fc["ar1_tau"] > 0.0                    # rising lag-1 autocorrelation
    assert fc["ar1_p"] <= 0.05                    # surrogate-significant (the R keel)
    assert fc["multi_band_agreement"] is True     # ≥ min_bands MODWT bands trending up
    # ecp's COMMITTED cut lands at the transition — the forecast (pre-T data) preceded it.
    full = bs.changepoint_tree(x.reshape(-1, 1), max_cuts=6, min_size=10)
    assert full["order"], "ecp should find the committed regime shift on the full series"
    assert abs(full["order"][0] - T) <= 15, f"ecp's coarsest cut should sit at T={T}, got {full['order'][:3]}"


def test_forecast_quiet_on_stationary_and_burnin():
    """The surrogate + multi-band guard refuses to FIRE on a stationary series — AND on a
    from-equilibrium burn-in transient (the surrogate matches the observed initial condition,
    so a burn-in-driven rising trend appears in the null too). The anti-apophenia keel."""
    # proper-stationary AR(0.5)
    rng = np.random.default_rng(11)
    z = np.zeros(700)
    for t in range(1, 700):
        z[t] = 0.5 * z[t - 1] + rng.normal(0, 0.5)
    fcz = bs.forecast_ews(z[300:], window=50, n_surr=300, alpha=0.05, seed=1)
    assert fcz["fired"] is False
    # a from-zero burn-in transient must NOT fire (the null carries the same transient)
    rng = np.random.default_rng(7)
    y = np.zeros(400)
    for t in range(1, 400):
        y[t] = 0.3 * y[t - 1] + rng.normal(0, 0.5)
    fcy = bs.forecast_ews(y, window=50, n_surr=300, alpha=0.05, seed=1)
    assert fcy["fired"] is False


def test_forecast_graceful_and_engine():
    """Graceful on too-few samples; the native estimators run when earlywarnings-R is absent
    (the R route is used only when installed — mirrors ecp → ruptures)."""
    short = bs.forecast_ews(np.arange(6.0), window=50)
    assert short["fired"] is False and "ews-skipped" in short["note"]
    x, T = _csd_approach_then_commit()
    fc = bs.forecast_ews(x[:T], window=50, n_surr=50, seed=1)
    assert fc["engine"] in ("native-ews", "earlywarnings-R")
    assert fc["r_available"] == (shutil.which("Rscript") is not None)


def test_cli_forecast_stdin():
    """`forecast --signal -` runs the EWS leg over an NDJSON signal → one JSON verdict."""
    x, T = _csd_approach_then_commit()
    lines = "\n".join(json.dumps(float(v)) for v in x[:T])
    r = _run_cli(["forecast", "--signal", "-", "--window", "50", "--nsurr", "100"], stdin=lines)
    assert r.returncode == 0, r.stderr
    verdict = json.loads(r.stdout.strip().splitlines()[-1])
    assert verdict["fired"] is True
    assert "ar1_tau" in verdict and "band_taus" in verdict


# ── TWO-POINT-MI CRITICALITY — the Lin–Tegmark signature (power-law MI = critical, NOT Zipf) ──


def _pink_noise(n=4000, beta=1.2, seed=0):
    """A long-range-correlated (critical) signal via 1/f^β spectral synthesis — MI(d) decays as
    a POWER LAW over decades (no finite correlation length)."""
    rng = np.random.default_rng(seed)
    f = np.fft.rfftfreq(n)
    f[0] = f[1] if f.size > 1 else 1.0
    ph = rng.uniform(0, 2 * np.pi, f.size)
    ph[0] = 0.0
    if n % 2 == 0:
        ph[-1] = 0.0
    s = np.fft.irfft(f ** (-beta / 2.0) * np.exp(1j * ph), n=n)
    return (s - s.mean()) / (s.std() + 1e-9)


def _markov_chain(n=4000, flip=0.15, seed=3):
    """A 2-state Markov chain — MI(d) decays EXPONENTIALLY (a finite correlation length)."""
    rng = np.random.default_rng(seed)
    x = np.zeros(n, dtype=int)
    for t in range(1, n):
        x[t] = x[t - 1] if rng.random() > flip else 1 - x[t - 1]
    return x.astype(float)


def test_two_point_mi_critical_vs_markov_vs_shuffled():
    """THE LOAD-BEARING VERIFY (leg 1): the two-point-MI estimator distinguishes a CRITICAL
    corpus (power-law MI decay, long memory) from a MARKOV one (exponential decay, finite
    correlation length) and from a SHUFFLED one (MI at the null floor). NOT Zipf — the
    signature is the DECAY of MI between tokens at distance d, not the marginal frequency."""
    crit = bs.criticality_signature(_pink_noise(beta=1.2), seed=1)
    mark = bs.criticality_signature(_markov_chain(), n_bins=2, seed=1)
    shuf = _pink_noise(beta=1.2)
    np.random.default_rng(0).shuffle(shuf)
    sh = bs.criticality_signature(shuf, seed=1)

    assert crit["verdict"] == "critical", crit["note"]
    assert crit["r2_power"] >= crit["r2_exp"]         # power law fits at least as well
    assert crit["decades"] >= 1.0                     # persists over ≥ 1 decade (no cutoff)
    assert mark["verdict"] == "markov", mark["note"]  # finite correlation length
    assert sh["verdict"] == "shuffled", sh["note"]    # MI never clears the shuffle floor


def test_two_point_mi_estimator_and_hurst():
    """The MI estimator reads a dependent pair above an independent one; DFA-Hurst separates a
    persistent long-range signal (H>0.5) from white noise (H≈0.5)."""
    # a period-2 alternating sequence carries MI at even lags, none at the shuffle floor
    seq = np.tile([0, 1, 2, 3], 500)
    sym, k = bs._symbolize(seq, n_bins=4)
    assert bs.two_point_mi(sym, 4, k) > bs.two_point_mi(sym, 1, k)  # aligned lag carries more
    assert bs.two_point_mi(sym, 0, k) == 0.0                        # degenerate d → 0
    assert bs.dfa_hurst(_pink_noise(beta=1.6)) > 0.6               # persistent long-range
    assert abs(bs.dfa_hurst(np.random.default_rng(0).normal(0, 1, 4000)) - 0.5) < 0.15  # white


def test_criticality_graceful_short():
    """The criticality leg degrades gracefully on a too-short signal (never a fault)."""
    out = bs.criticality_signature(np.arange(20.0))
    assert out["verdict"] == "undetermined" and "criticality-skipped" in out["note"]


def test_cli_criticality_stdin():
    """`criticality --signal -` runs the two-point-MI leg → one JSON verdict."""
    lines = "\n".join(json.dumps(float(v)) for v in _pink_noise(beta=1.3))
    r = _run_cli(["criticality", "--signal", "-"], stdin=lines)
    assert r.returncode == 0, r.stderr
    verdict = json.loads(r.stdout.strip().splitlines()[-1])
    assert verdict["verdict"] == "critical"
    assert "hurst" in verdict and "r2_power" in verdict


# ── COLORED SURROGATE + VARIANCE/AC1 SEPARATION — the hardened false-discovery ward (leg 2) ───


def _noise_inflation(seed=2, n=400):
    """A NOISE-AMPLITUDE-INFLATION fixture: the AR coefficient is FIXED (no critical slowing),
    only the noise σ ramps up. Variance RISES, lag-1-AC does NOT — the classic EWS false
    positive a white-shuffle null lets through, the colored teeth must catch."""
    rng = np.random.default_rng(seed)
    sd = np.linspace(0.3, 3.0, n)
    x = np.zeros(n)
    for t in range(1, n):
        x[t] = 0.4 * x[t - 1] + rng.normal(0, sd[t])
    return x


def test_phase_randomized_surrogate_preserves_spectrum():
    """The phase-randomized (colored) surrogate keeps the FULL power spectrum (the color /
    autocorrelation) and the mean, randomizing only the phases — the proper colored null."""
    x = _pink_noise(n=1024, beta=1.5, seed=4)
    sur = bs.phase_randomized_surrogate(x, np.random.default_rng(1))
    assert sur.shape == x.shape
    # identical magnitude spectrum (the color preserved), different series (phases scrambled)
    assert np.allclose(np.abs(np.fft.rfft(x)), np.abs(np.fft.rfft(sur)), atol=1e-6)
    assert abs(sur.mean() - x.mean()) < 1e-6
    assert not np.allclose(sur, x)


def test_noise_inflation_does_not_fire_variance_separated():
    """THE LOAD-BEARING VERIFY (leg 2): a pure noise-amplitude rise (variance UP, lag-1-AC FLAT)
    is caught — it reports NOISE-INFLATION, never FORECAST. The AC1 tooth (beating the colored
    null) separates a real bifurcation from noise inflation; variance alone can never fire."""
    fc = bs.forecast_ews(_noise_inflation(), window=50, n_surr=300, alpha=0.05, seed=1)
    assert fc["fired"] is False
    assert fc["state"] == "NOISE-INFLATION"
    assert fc["var_significant"] is True      # variance genuinely rises (and beats the null)
    assert fc["ac1_significant"] is False     # but the lag-1-AC does NOT — no critical slowing
    assert fc["noise_inflation"] is True


def test_forecast_still_fires_on_true_csd_with_colored_null():
    """The hardened forecast (colored nulls, beat-both) STILL fires on a true critical-slowing
    approach — AC1 rises, beats BOTH the AR(1) and phase-randomized nulls, bands agree."""
    x, T = _csd_approach_then_commit()
    fc = bs.forecast_ews(x[:T], window=50, n_surr=300, alpha=0.05, min_bands=2, seed=1)
    assert fc["fired"] is True and fc["state"] == "FORECAST", fc["note"]
    assert fc["ac1_significant"] is True
    assert fc["ar1_p"] <= 0.05                # the WORSE of the two colored nulls still clears


# ── SLAVING — the aperture ladder as an order-parameter hierarchy (leg 3, Haken synergetics) ──


def test_slaving_reads_order_parameter():
    """THE LOAD-BEARING VERIFY (leg 3): a SLOW order-parameter enslaving a fast carrier
    (amplitude modulation) shows a strong top-down slaving gain AND a bottom-up emergence
    correlation (circular causality closes) — above an ADDITIVE control where the coarse band
    does not score the fine band's amplitude. The higher band's prior scores the lower."""
    t = np.arange(1024)
    rng = np.random.default_rng(1)
    modulated = (1.0 + 0.9 * np.sin(2 * np.pi * t / 256.0)) * np.sin(2 * np.pi * t / 8.0) \
        + rng.normal(0, 0.05, 1024)
    additive = np.sin(2 * np.pi * t / 256.0) + np.sin(2 * np.pi * t / 8.0) \
        + rng.normal(0, 0.05, 1024)
    sm = bs.slaving_leg(bs.modwt_mra(modulated))
    sa = bs.slaving_leg(bs.modwt_mra(additive))
    gain_mod = max(p["topdown_gain"] for p in sm["pairs"])
    gain_add = max(p["topdown_gain"] for p in sa["pairs"])
    assert gain_mod > gain_add                     # the order parameter enslaves more
    # circular causality closes on the modulated signal (top-down AND bottom-up both present)
    strongest = max(sm["pairs"], key=lambda p: p["topdown_gain"])
    assert strongest["topdown_gain"] > 1.5 and abs(strongest["bottomup_r"]) > 0.2
    assert strongest["circular"] is True
    # the gain reads as a confidence (0..20 via the π↔confidence map)
    assert 0.0 <= strongest["topdown_confidence"] <= 20.0


def test_slaving_graceful_single_band():
    """The slaving leg needs ≥ 2 bands — a too-short signal degrades gracefully (no fault)."""
    out = bs.slaving_leg(bs.modwt_mra(np.array([0.1, 0.2, 0.3])))  # n<4 → levels 0
    assert out["pairs"] == [] and out["levels"] < 2
    assert "slaving-skipped" in out["note"]


def test_run_stack_carries_slaving_block():
    """The composed stack surfaces the slaving (order-parameter) block alongside the bands."""
    E = _blocks()
    out = bs.run_stack(E, spine_signal=bs.cohesion_signal([E]).mean(axis=1), n_boot=20)
    assert "slaving" in out and "pairs" in out["slaving"]
    assert "note" in out["slaving"]


def test_cli_slaving_stdin():
    """`slaving --signal -` runs the order-parameter leg → one JSON verdict."""
    t = np.arange(1024)
    mod = (1.0 + 0.9 * np.sin(2 * np.pi * t / 256.0)) * np.sin(2 * np.pi * t / 8.0) \
        + np.random.default_rng(1).normal(0, 0.05, 1024)
    lines = "\n".join(json.dumps(float(v)) for v in mod)
    r = _run_cli(["slaving", "--signal", "-"], stdin=lines)
    assert r.returncode == 0, r.stderr
    verdict = json.loads(r.stdout.strip().splitlines()[-1])
    assert verdict["pairs"] and "order_parameter" in verdict["pairs"][0]


def test_cli_selftest_covers_new_legs():
    """`selftest` now also reports the criticality separation and the slaving read."""
    r = _run_cli(["selftest"])
    assert r.returncode == 0
    rep = json.loads(r.stdout.strip().splitlines()[-1])
    assert rep["criticality_separates"] is True
    assert rep["slaving_reads_order_parameter"] is True


# ── QA: adversarial numerical edges (The-Advocate, tasked QA-spirit) ────────────────────────
#
# The slaving-gain scale-blind ∞-degeneracy. `_slaving_gain` reads
#   gain = var(target) / (var(resid) + _EPS),  _EPS = 1e-9   (bands_sidecar.py)
# The ONLY regularizer on a vanishing residual is the ADDITIVE ABSOLUTE floor `_EPS`. For a
# near-noiseless linearly-slaved band the residual collapses to ~machine-zero, so the gain runs
# to var(target)·1e9 — a 9-order-of-magnitude blowup that (a) is SCALE-DEPENDENT (grows with the
# target's variance, because the floor is absolute not relative) and (b) is SILENT: the downstream
# `topdown_confidence = 20·g/(1+g)` saturates at 20, hiding the absurd raw gain. Observation-noise
# regularization as implemented is NOT enough — even 1e-6 noise leaves the gain > 1e6; a relative /
# SNR floor (resid floored to a fraction of var(target)) would cap it. The boundary a live run
# resolves the hard way: any strongly-cohesive low-noise corpus band reports a meaningless precision.


def test_slaving_gain_noiseless_blowup_is_scale_blind():
    """A noiseless exact-linear order-parameter→target relation drives the gain to var(y)·1e9,
    and the ADDITIVE _EPS floor makes it scale with var(y) — the regularization is scale-blind."""
    t = np.arange(512)
    p = np.sin(2 * np.pi * t / 64.0) + 5.0

    g1, r1 = bs._slaving_gain(p, 3.0 * p + 1.0)          # var(y) ~ O(v)
    g10, r10 = bs._slaving_gain(p, 30.0 * p + 1.0)       # var(y) ~ O(100·v) — 10× amplitude

    # the blowup: a noiseless slaving reports a gain ≥ 1e9 (NOT a sane precision).
    assert g1 > 1e8, f"expected the noiseless-tone blowup, got gain={g1:.3e}"
    assert np.isfinite(g1) and np.isfinite(g10)          # no NaN/Inf leak — bounded by _EPS
    assert abs(r1 - 1.0) < 1e-6                           # perfect correlation

    # SCALE-BLINDNESS: 10× the target amplitude ⇒ ~100× the gain (the floor is absolute, not
    # relative). A relative/SNR floor would leave the gain roughly INVARIANT under this rescale.
    assert g10 / g1 > 50, f"gain should scale ~var(y): g1={g1:.3e} g10={g10:.3e}"


def test_slaving_gain_observation_noise_regularization_insufficient():
    """Adding observation noise is the intended cure for the noiseless degeneracy — but the
    absolute _EPS floor means even 1e-6 noise leaves the gain in the MILLIONS; only ~1e-3 noise
    brings it down to a (still large) 1e6-ish. The 'a little observation noise breaks the
    degeneracy' assumption (selftest comment) under-regularizes for small noise."""
    t = np.arange(512)
    rng = np.random.default_rng(0)
    p = np.sin(2 * np.pi * t / 50.0) + 2.0
    gains = {}
    for noise in (1e-10, 1e-6, 1e-3):
        y = 4.0 * p + rng.normal(0, noise, t.size)
        g, _ = bs._slaving_gain(p, y)
        gains[noise] = g
    # 1e-6 noise is NOT enough — the gain is still astronomically large.
    assert gains[1e-6] > 1e6, f"1e-6 noise should still blow up, got {gains[1e-6]:.3e}"
    # the gain only meaningfully drops once the noise dominates _EPS (monotone in the noise).
    assert gains[1e-3] < gains[1e-6], "more noise must reduce the gain (residual grows)"


def test_slaving_gain_blowup_is_SILENT_at_the_confidence_readout():
    """The load-bearing risk: the blowup does not surface — `topdown_confidence` saturates at ~20
    for ANY gain past ~1e3, so a gain of 1e9 and a gain of 1e3 read IDENTICALLY downstream. The
    raw `topdown_gain` is the only place the instability shows, and it is a garbage magnitude."""
    t = np.arange(512)
    pure = np.sin(2 * np.pi * t / 16.0)          # a near-noiseless tone → near-perfect slaving
    sl = bs.slaving_leg(bs.modwt_mra(pure))
    for pair in sl["pairs"]:
        # confidence is finite and pinned high, regardless of how absurd the raw gain gets.
        assert np.isfinite(pair["topdown_confidence"])
        assert pair["topdown_confidence"] <= 20.0 + 1e-9
        assert np.isfinite(pair["topdown_gain"])


def test_run_stack_never_leaks_nan_inf_on_adversarial_signals():
    """The containment guarantee: no adversarial 1-D signal (all-zero, constant, single-spike,
    huge/tiny scale) leaks a NaN or Inf token into the composed run_stack verdict."""
    t = np.arange(256)
    for sig in (np.zeros(256), np.full(256, 3.14),
                np.concatenate([np.zeros(255), [1.0]]),
                np.sin(t) * 1e12, np.sin(t) * 1e-12):
        out = bs.run_stack(np.asarray(sig, dtype=float).reshape(-1, 1))
        blob = json.dumps(out, default=float).lower()
        assert "nan" not in blob and "infinity" not in blob, f"NaN/Inf leak on {sig[:3]}"


# ══════════════════════════════════════════════════════════════════════════════════════════════
# ADVERSARIAL / PROPERTY-BASED QA (The-Sword, tasked QA-spirit, 2026-07-01) — the CLASSIFIER legs.
#
# Two REAL breaks in the criticality / early-warning verdicts (distinct from The-Advocate's numerical
# edges above). Each INTENDED invariant is xfail(strict=True) so the suite stays GREEN while the bug
# lives and turns RED the moment it is fixed; a paired characterization test pins the current behaviour.
#
#   BUG A — criticality_signature() calls a high-φ AR(1) "critical". An AR(1) is the textbook MARKOV /
#           exponential-decay process (finite correlation length −1/ln φ ≈ 9.5 samples at φ=0.9), yet it
#           reads "critical" (scale-free long memory) 100% of the time, reporting ~2.7 DECADES of power
#           law and corr_len ≈ 500. The power-vs-exp R² discriminator over-calls power law on the
#           geometric-d supported range. (A 2-state Markov chain leaks the same way on most seeds.)
#
#   BUG B — forecast_ews()'s noise-inflation guard LEAKS. The docstring: a pure noise-AMPLITUDE inflation
#           (fixed φ, rising σ, NO critical slowing) "can never fire". But a within-window variance RAMP
#           biases the sample lag-1-AC UPWARD, and neither colored surrogate reproduces that ramp (the
#           AR(1) null fits ONE constant σ; the phase-randomized null is stationary), so the spurious
#           rising AC1 reads surrogate-significant → a FALSE FORECAST (seed 9: fired, ac1_p ≈ 0.03).
# ══════════════════════════════════════════════════════════════════════════════════════════════


def _ar1(n, phi, seed):
    """A pure AR(1) — the textbook Markov / exponential-decay process (finite correlation length
    −1/ln φ). NOT critical: MI(d) decays EXPONENTIALLY, never a scale-free power law."""
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    for t in range(1, n):
        x[t] = phi * x[t - 1] + rng.normal(0, 1)
    return x


def test_ar1_high_phi_reads_critical_BUG():
    """CHARACTERIZATION (passes today, pins BUG A): a φ=0.9 AR(1) — a finite-correlation-length Markov
    process — is classified "critical" by criticality_signature, deterministically across seeds. This
    assertion FLIPS RED when the classifier is corrected."""
    for seed in range(6):
        v = bs.criticality_signature(_ar1(2000, 0.9, seed), n_bins=4, seed=1)
        assert v["verdict"] == "critical", (seed, v["note"])  # the WRONG verdict — documents BUG A
    v0 = bs.criticality_signature(_ar1(2000, 0.9, 0), n_bins=4, seed=1)
    # the smoking gun: multi-decade power law + corr_len ≫ the true ~9.5-sample correlation length
    assert v0["decades"] >= 1.0 and v0["corr_len"] > 100


@pytest.mark.xfail(strict=True, reason="KNOWN BUG A: high-φ AR(1) (exponential decay = Markov, finite "
                   "correlation length) misclassified 'critical' — the power-vs-exp R² discriminator "
                   "over-calls power law on the geometric-d supported range.")
def test_ar1_markov_is_not_critical_INTENDED():
    """THE INVARIANT: an AR(1) (exponential MI decay, finite correlation length) must read markov or
    shuffled — NEVER 'critical'. Currently fails at φ=0.9 (xfail; turns red once fixed)."""
    for seed in range(6):
        v = bs.criticality_signature(_ar1(2000, 0.9, seed), n_bins=4, seed=1)
        assert v["verdict"] != "critical", (seed, v["note"])


def test_noise_inflation_guard_leaks_BUG():
    """CHARACTERIZATION (passes today, pins BUG B): the `_noise_inflation` fixture at seed 9 (fixed
    φ=0.4, σ ramping 0.3→3.0, NO critical slowing) FIRES a false FORECAST — the within-window variance
    ramp inflates the sample lag-1-AC, absent from both colored nulls. Flips red once the guard is fixed."""
    fc = bs.forecast_ews(_noise_inflation(9), window=50, n_surr=120, alpha=0.05, seed=1)
    assert fc["fired"] is True and fc["state"] == "FORECAST", fc["note"]  # a FALSE fire — documents BUG B
    assert fc["ac1_significant"] is True and fc["ar1_p"] <= 0.05  # the guard's AC1 tooth was fooled


@pytest.mark.xfail(strict=True, reason="KNOWN BUG B: a pure noise-AMPLITUDE inflation (fixed φ, rising σ, "
                   "no critical slowing) can produce a surrogate-significant rising lag-1-AC — the "
                   "within-window variance ramp is absent from BOTH colored nulls (AR(1) fits one σ; "
                   "phase-randomized is stationary) — firing a false FORECAST (seed 9).")
def test_noise_inflation_never_fires_INTENDED():
    """THE INVARIANT (leg 2): a pure noise-amplitude inflation NEVER fires FORECAST (reports
    NOISE-INFLATION or WATCH). Currently leaks at seed 9 (xfail)."""
    for s in range(12):
        fc = bs.forecast_ews(_noise_inflation(s), window=50, n_surr=120, alpha=0.05, seed=1)
        assert fc["fired"] is False, (s, fc["note"])


# ── the CLEAN directions still hold under fuzzing (defend the true verdicts) ──────────────────


def test_white_noise_always_reads_shuffled_property():
    """Independent white noise carries NO two-point structure → 'shuffled' every time (MI never
    clears the shuffle floor). Fuzzed across seeds; the null floor holds."""
    for s in range(10):
        v = bs.criticality_signature(np.random.default_rng(s).normal(0, 1, 3000), seed=1)
        assert v["verdict"] == "shuffled", (s, v["note"])


def _pink(n, beta, seed):
    rng = np.random.default_rng(seed)
    f = np.fft.rfftfreq(n)
    f[0] = f[1]
    ph = rng.uniform(0, 2 * np.pi, f.size)
    ph[0] = 0.0
    if n % 2 == 0:
        ph[-1] = 0.0
    s = np.fft.irfft(f ** (-beta / 2.0) * np.exp(1j * ph), n=n)
    return (s - s.mean()) / (s.std() + 1e-9)


def test_pink_noise_reads_critical_property():
    """A 1/f^β long-range signal (β=1.3) genuinely IS critical — power-law MI over decades. Fuzzed
    across seeds it reads 'critical' (the true positive the AR(1) false positive must be told from)."""
    for s in range(10):
        v = bs.criticality_signature(_pink(4000, 1.3, s), seed=1)
        assert v["verdict"] == "critical", (s, v["note"])
    # NOTE: the TRUE-positive CSD fire is stochastic per realization (seed 1 reaches only WATCH);
    # the canonical seed-5 true positive is already defended by test_forecast_fires_before_ecp_commits
    # and test_forecast_still_fires_on_true_csd_with_colored_null — not re-asserted here.
