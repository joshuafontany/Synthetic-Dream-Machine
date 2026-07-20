"""Tests for predictive_coding — the sensorium's per-plane predict→error→precision→update
loop + the free-energy objective F = Σ π·ε² + complexity (sensorium-machina.md
#the-py-r-web).

The load-bearing properties, all chroma-free (pure signal in, surprise/F out):
  1. the LOOP emits prediction-ERROR SURPRISE, not raw features — a forecastable stream
     carries less surprise than noise (a detection = what the model failed to predict).
  2. PRECISION = CONFIDENCE-AS-GAIN is wired both ways — a variance-explained bottom-up
     estimate maps to a confidence band, and a top-down confidence VOW sets the gain that
     weights ε² (the π↔confidence map is an exact bijection).
  3. F = Σ π·ε² + complexity is COMPUTED and EXPOSED, carrying a non-zero MDL complexity term.
  4. the FORM plane's complexity REUSES form_induction.description_length verbatim.
  5. graceful on empty / single-frame planes.

Run under the mempalace venv:
    ~/.venv/bin/python -m pytest \
        packages/lararium-sensorium/scripts/test_predictive_coding.py -q
"""
import json
import subprocess
import sys

import numpy as np
import pytest

import predictive_coding as pc


# ── the π ↔ confidence map — precision IS confidence-as-gain ────────────────────────────────


def test_precision_confidence_bijection():
    """`conf → π → conf` round-trips; the anchor points hold (10/20 ⇒ neutral gain 1)."""
    for conf in (0.0, 5.0, 10.0, 15.0, 19.0):
        pi = pc.confidence_to_precision(conf)
        back = pc.precision_to_confidence(pi)
        assert back == pytest.approx(conf, abs=1e-6)
    assert pc.confidence_to_precision(10.0) == pytest.approx(1.0)   # neutral vow ⇒ gain 1
    assert pc.precision_to_confidence(1.0) == pytest.approx(10.0)   # gain 1 ⇒ neutral confidence
    # monotone: a higher confidence vow buys a higher gain
    assert pc.confidence_to_precision(15.0) > pc.confidence_to_precision(10.0)


# ── the generative models `g_i` ─────────────────────────────────────────────────────────────


def test_ewma_predict_is_causal_and_updates():
    """EWMA predicts the next frame from state BEFORE seeing it (causal), opening at x[0]."""
    x = np.array([1.0, 1.0, 1.0, 5.0, 5.0])
    pred = pc.ewma_predict(x, alpha=0.5).ravel()
    assert pred[0] == 1.0                       # opens at x[0] (no surprise on frame 0)
    assert pred[3] == pytest.approx(1.0)        # the jump to 5 was NOT yet seen when predicting frame 3
    assert pred[4] > pred[3]                    # the model UPDATED toward the jump after seeing it


def test_ar1_recovers_autoregressive_structure():
    """AR(1) predicts a genuinely autoregressive stream far better than a noise stream."""
    rng = np.random.default_rng(0)
    n = 300
    ar = np.zeros(n)
    for t in range(1, n):
        ar[t] = 0.9 * ar[t - 1] + rng.normal(0, 0.3)
    pred, k = pc.ar1_fit_predict(ar)
    assert k == 2                                # a, b fitted for the single column
    resid_var = float(np.var((ar - pred.ravel())[1:]))
    assert resid_var < float(np.var(ar))         # the model explains real variance


# ── the LOOP emits SURPRISE, not raw features ───────────────────────────────────────────────


def test_loop_emits_surprise_predictable_below_noise():
    """A forecastable stream (a smooth sine+ramp) carries LESS prediction-error surprise than
    white noise — the plane reports what the model FAILED to predict, not the raw feature."""
    t = np.arange(200)
    predictable = np.sin(2 * np.pi * t / 40.0) + t * 0.01
    noise = np.random.default_rng(1).normal(0, 1, 200)
    rp = pc.plane_pc(predictable, model="ar1")
    rn = pc.plane_pc(noise, model="ar1")
    assert rp["surprise"] < rn["surprise"]
    # the OUTPUT is the precision-weighted RESIDUAL, not the observation
    assert len(rp["output"]) == 200
    assert not np.allclose(np.asarray(rp["output"]).ravel(), predictable)


def test_est_confidence_tracks_predictability():
    """The bottom-up (variance-explained) confidence is HIGH on a forecastable stream and
    ~neutral (≈10/20) on noise — the plane's honest self-report."""
    t = np.arange(200)
    predictable = np.sin(2 * np.pi * t / 40.0) + t * 0.01
    noise = np.random.default_rng(2).normal(0, 1, 200)
    cp = pc.plane_pc(predictable, model="ar1")["est_confidence"]
    cn = pc.plane_pc(noise, model="ar1")["est_confidence"]
    assert cp > 15.0
    assert 8.0 < cn < 12.0
    assert cp > cn


# ── PRECISION = CONFIDENCE-AS-GAIN is wired (top-down vow) ───────────────────────────────────


def test_confidence_vow_sets_the_gain():
    """A top-down confidence VOW SETS the precision gain that weights ε² — an 18/20 vow pushes
    the plane's error HARDER on F than the neutral default (π=1)."""
    noise = np.random.default_rng(3).normal(0, 1, 200)
    neutral = pc.plane_pc(noise, model="ewma")                       # gain 1
    vowed = pc.plane_pc(noise, model="ewma", confidence=18.0)        # gain = 18/(20−18) = 9
    assert vowed["confidence_source"] == "vow"
    assert vowed["precision"] == pytest.approx(pc.confidence_to_precision(18.0))
    assert vowed["surprise"] > neutral["surprise"]                   # π = confidence WIRED
    # a LOW vow discounts the error
    low = pc.plane_pc(noise, model="ewma", confidence=2.0)
    assert low["surprise"] < neutral["surprise"]


# ── F = Σ π·ε² + complexity is COMPUTED and EXPOSED ──────────────────────────────────────────


def test_free_energy_sums_planes_and_carries_complexity():
    """F = accuracy (Σ π·ε²) + complexity (Σ MDL bits), exposed per-plane and in total."""
    t = np.arange(200)
    planes = {
        "content": np.sin(2 * np.pi * t / 40.0) + t * 0.01,
        "bands": np.random.default_rng(4).normal(0, 1, 200),
    }
    fe = pc.free_energy(planes, model="ar1")
    assert set(fe["per_plane"]) == {"content", "bands"}
    assert fe["F"] == pytest.approx(fe["accuracy"] + fe["complexity"])
    assert fe["complexity"] > 0.0                                    # the MDL term is present
    # the noisier plane contributes more surprise to the accuracy term
    assert fe["per_plane"]["bands"]["surprise"] > fe["per_plane"]["content"]["surprise"]


def test_free_energy_form_plane_reuses_description_length():
    """The FORM plane's complexity term REUSES form_induction.description_length verbatim —
    the SAME two-part MDL code the induction ledger prices a grammar with."""
    from form_induction import description_length
    streams = [["a", "b", "c", "a", "b"], ["a", "b", "c", "d"], ["a", "b", "c", "a", "b"]]
    dictionary = [{"seq": ["a", "b", "c"]}]
    alphabet = len({x for s in streams for x in s})
    expected = description_length(streams, dictionary, alphabet)
    fe = pc.free_energy(
        {"content": np.random.default_rng(5).normal(0, 1, 50)},
        form_dictionary=dictionary, form_streams=streams, form_alphabet=alphabet,
    )
    assert fe["per_plane"]["form"]["complexity"] == pytest.approx(expected)
    assert fe["per_plane"]["form"]["mdl_source"] == "form_induction.description_length"
    # F includes BOTH the content plane's surprise and the form plane's grammar cost
    assert fe["F"] == pytest.approx(fe["accuracy"] + fe["complexity"])


# ── graceful degradation ────────────────────────────────────────────────────────────────────


def test_graceful_on_empty_and_single_frame():
    """An empty or single-frame plane carries zero surprise, never a fault."""
    assert pc.plane_pc(np.zeros((0, 0)))["surprise"] == 0.0
    r1 = pc.plane_pc(np.array([[3.0]]))
    assert r1["surprise"] == 0.0 and r1["n"] == 1


# ── the CLI faces ─────────────────────────────────────────────────────────────────────────


def _run_cli(args, stdin=None):
    return subprocess.run(
        [sys.executable, "predictive_coding.py", *args],
        input=stdin, capture_output=True, text=True,
        cwd=__import__("os").path.dirname(__import__("os").path.abspath(__file__)),
    )


def test_cli_selftest():
    r = _run_cli(["selftest"])
    assert r.returncode == 0, r.stderr
    rep = json.loads(r.stdout.strip().splitlines()[-1])
    assert rep["predictable_lower_surprise"] is True
    assert rep["predictable_higher_est_confidence"] is True
    assert rep["vow_raises_surprise"] is True
    assert rep["F_has_complexity_term"] is True


def test_cli_pc_stdin():
    t = np.arange(120)
    lines = "\n".join(json.dumps(float(v)) for v in np.sin(2 * np.pi * t / 8.0))
    r = _run_cli(["pc", "--signal", "-", "--model", "ar1"], stdin=lines)
    assert r.returncode == 0, r.stderr
    summary = json.loads(r.stdout.strip().splitlines()[-1])
    assert summary["n"] == 120
    assert "surprise" in summary and "complexity" in summary
    assert "error" not in summary  # pc is a probe — the per-frame arrays are trimmed
