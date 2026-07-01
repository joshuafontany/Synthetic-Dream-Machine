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

    # a pure-noise fixture — no true structure → the register HOLDS Provisional (lower
    # consensus, at least one un-witnessed cut) — the gate refuses to canonize noise.
    noise = np.random.default_rng(11).normal(0, 1, (90, 3))
    norder = bs.changepoint_tree(noise, max_cuts=8, min_size=2)["order"]
    ngate = bs.stability_gate(noise, norder, n_boot=50, seed=7)
    assert ngate["consensus"] < gate["consensus"], "noise must witness weaker than clean blocks"
    assert any(r == "Provisional" for r in ngate["register_of_cut"].values())


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


def test_r_availability_flag():
    """The stack reports whether the R ecp sidecar is reachable (Rscript on PATH) — the
    degrade-to-ruptures signal the coordinator flags."""
    E = _blocks()
    out = bs.run_stack(E, n_boot=10)
    assert out["r_available"] == (shutil.which("Rscript") is not None)
    if not out["r_available"]:
        assert out["tree"]["engine"] in ("ruptures-binseg-rbf", "variance-split")
