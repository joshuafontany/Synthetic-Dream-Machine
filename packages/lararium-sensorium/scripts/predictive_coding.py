#!/usr/bin/env python3
"""predictive_coding — the sensorium's per-plane PREDICT → ERROR → PRECISION → UPDATE loop
and the variational free-energy objective F = Σ π·ε² + complexity(model).

sensorium-machina.md #the-py-r-web. The single most-adoptable cross-domain
finding: DO NOT measure the stream as it is — measure it against what you PREDICTED. This
module turns every plane from a feedforward DESCRIBER into a predictive-coding LOOP: a
lightweight generative model `g_i` emits a top-down PREDICTION of the next frame's
features; the residual `ε_i = obs_i − g_i(pred)` becomes the plane's output, weighted by a
precision GAIN `π_i`; a DETECTION becomes surprise `π_i·ε_i²` — what the model FAILED to
predict, not what arrived.

THE ONE OBJECTIVE (sensorium-machina.md #the-one-objective)
=========================================================
All five planes estimate facets of ONE quantity — excess-entropy / predictive-information
(Bialek-Tishby) = free-energy accuracy−complexity (Friston). The per-frame objective is the
variational free energy:

    F = Σ_i π_i · ε_i²  +  complexity(model)
        └── accuracy ──┘   └── the MDL term ──┘

The accuracy term is the precision-weighted prediction-error energy summed over the planes;
the complexity term is the model's description length (the SAME two-part MDL code the FORM
plane already computes in form_induction.description_length — reused here, generalized to
every plane's generative model). Minimizing F IS maximizing the predictive information the
sensorium was always estimating.

PRECISION = CONFIDENCE-AS-GAIN (the load-bearing mapping)
=========================================================
sensorium-machina.md #grounds (neuroscience): *precision-weighting — how strongly
the brain trusts a given prediction-error — reads as a near-exact rhyme with the house's
confidence sigil.* The precision `π` that weights `ε²` IS the confidence register (0–20)
read as a GAIN. The map runs both ways (predictive coding learns precision bottom-up AND
sets it top-down by attention):

  · BOTTOM-UP (estimate) — from the errors: a relative precision `π = var(baseline) /
    var(model)` (how much the model beat a trivial predict-previous baseline), expressed as
    a confidence band via `conf = 20·π/(1+π)` (π=1 ⇒ neutral 10/20; π→∞ ⇒ 20/20).
  · TOP-DOWN (vow) — a supplied `confidence N/20` SETS the gain: `π = N/(20−N)` (the odds
    form; 10/20 ⇒ gain 1, 15/20 ⇒ gain 3, →20 ⇒ →∞). An attention/confidence vow thus
    modulates how hard a plane's error pushes on F.

The residual is STANDARDIZED (`z = ε/σ_obs`) before weighting, so `π·z²` is dimensionless
and the planes' surprises sum into one comparable F across content · structure · bands ·
form · coupling.

Faces (loci_io-style NDJSON over stdio, the established sidecar contract):
  * the library: ewma_predict · ar1_fit_predict · plane_pc · free_energy · the π↔confidence
    map (pure, dependency-light — numpy only; the VERIFY surface)
  * `pc       --signal <file|-> [--model ewma|ar1] [--confidence N]` → one plane's loop:
    the prediction-error surprise Σπz² + the model complexity, one JSON summary
  * `objective --signal name=<file> [--signal name=<file> …] [--model …]` → the multi-plane
    F = Σ π·ε² + complexity, one JSON verdict (the sensorium's per-frame objective)
  * `selftest` → a synthetic predictable-vs-noise check (no fixture file)

Run under the mempalace venv (numpy only; the FORM-plane MDL reuse imports form_induction
when present, degrading to a native BIC-style param cost otherwise):
  ~/.venv/bin/python3 predictive_coding.py pc --signal fixture.ndjson --model ewma
  ~/.venv/bin/python3 predictive_coding.py objective --signal content=c.ndjson --signal bands=b.ndjson

Meme: lar:///ha.ka.ba/lares/api/pono/sensorium-machina#the-py-r-web
"""
from __future__ import annotations

import argparse
import json
import math
import sys

import numpy as np

_EPS = 1e-9
_CONF_MAX = 20.0  # the confidence register ceiling (0..20; noosphere-boot #law-of-5s)


# ── the π ↔ confidence map — precision IS confidence-as-gain (the load-bearing mapping) ────


def confidence_to_precision(confidence: float) -> float:
    """A top-down confidence VOW (0..20) SETS the precision gain: `π = N/(20−N)` (odds form).
    A neutral 10/20 ⇒ gain 1 (error weighted as-is); 15/20 ⇒ 3; 19/20 ⇒ 19; 0 ⇒ 0 (the
    error is discounted entirely). Clamped just below the ceiling so the gain stays finite."""
    c = float(np.clip(confidence, 0.0, _CONF_MAX - 1e-6))
    return c / (_CONF_MAX - c)


def precision_to_confidence(precision: float) -> float:
    """A bottom-up precision ESTIMATE (≥0) expressed as a confidence band (0..20):
    `conf = 20·π/(1+π)`. The exact inverse of {@link confidence_to_precision}; π=1 ⇒ 10/20
    (neutral), π→∞ ⇒ 20/20. This is how a plane REPORTS trust in its own prediction."""
    p = max(0.0, float(precision))
    return _CONF_MAX * p / (1.0 + p)


# ── the generative models `g_i` — lightweight one-step predictors (AR/EWMA baseline) ──────


def ewma_predict(x: np.ndarray, alpha: float = 0.3) -> np.ndarray:
    """EWMA one-step-ahead prediction: `pred[t]` = the exponentially-weighted mean of
    `x[:t]` (the running generative model's forecast of the next frame BEFORE it arrives).
    `pred[0]` opens at `x[0]` (no history → no surprise on the first frame). The state
    UPDATES online each step (`s ← (1−α)s + α·x[t]`), so this IS the predict→update loop's
    generative model. Column-wise for a multivariate plane."""
    X = np.asarray(x, dtype=float)
    if X.ndim == 1:
        X = X.reshape(-1, 1)
    n = X.shape[0]
    pred = np.zeros_like(X)
    if n == 0:
        return pred
    s = X[0].copy()
    pred[0] = s
    for t in range(1, n):
        pred[t] = s  # predict the next frame from the state BEFORE seeing it
        s = (1.0 - alpha) * s + alpha * X[t]  # UPDATE the generative model with the observation
    return pred


def ar1_fit_predict(x: np.ndarray) -> tuple[np.ndarray, int]:
    """AR(1) one-step prediction: fit `x[t] ≈ a·x[t-1] + b` by least squares per column, then
    predict. Returns (predictions, n_params). A short/degenerate column falls back to the
    predict-previous baseline (a=1, b=0). n_params counts the fitted coefficients (2 per
    column) — the model-complexity term reads it."""
    X = np.asarray(x, dtype=float)
    if X.ndim == 1:
        X = X.reshape(-1, 1)
    n, p = X.shape
    pred = np.zeros_like(X)
    n_params = 0
    if n < 3:
        # too short to fit — predict-previous baseline
        pred[1:] = X[:-1]
        pred[0] = X[0] if n else 0.0
        return pred, 0
    for j in range(p):
        col = X[:, j]
        x0, x1 = col[:-1], col[1:]
        A = np.column_stack([x0, np.ones_like(x0)])
        try:
            coef, *_ = np.linalg.lstsq(A, x1, rcond=None)
            a, b = float(coef[0]), float(coef[1])
            n_params += 2
        except Exception:  # noqa: BLE001 — degenerate column → predict-previous
            a, b = 1.0, 0.0
        pred[0, j] = col[0]
        pred[1:, j] = a * col[:-1] + b
    return pred, n_params


# ── the model-complexity term — the MDL bits (reuses the FORM plane's ledger when present) ─


def model_complexity(n_params: int, n_obs: int) -> float:
    """The complexity term of F, in BITS — a two-part-code param cost `½·k·log2(n)` (the BIC
    /MDL penalty: each free parameter costs half a log-of-the-data-length to describe). This
    is the SAME MDL spirit form_induction.description_length prices a grammar with, lifted to
    a generative model's parameter count. `objective` reuses the FORM plane's OWN
    description_length directly when a form dictionary is supplied (see {@link free_energy})."""
    if n_params <= 0 or n_obs <= 1:
        return 0.0
    return 0.5 * n_params * math.log2(max(2, n_obs))


# ── the per-plane predict → error → precision → update loop ────────────────────────────────


def plane_pc(obs, model: str = "ewma", alpha: float = 0.3,
             confidence: float | None = None, warmup: int = 1) -> dict:
    """ONE plane's predictive-coding loop (sensorium-machina #the-py-r-web).

    PREDICT   a generative model `g` (EWMA or AR(1)) emits the one-step forecast of each
              frame's features BEFORE it arrives.
    ERROR     the residual `ε = obs − pred` — what the model got wrong.
    PRECISION the gain `π`: a supplied `confidence` SETS it top-down (π = confidence/(20−conf));
              else it is ESTIMATED bottom-up as the relative precision π = var(baseline_ε) /
              var(model_ε) (how much `g` beat predict-previous), expressed back as a
              confidence band. The residual is STANDARDIZED (z = ε/σ_obs) so π·z² is
              dimensionless and cross-plane comparable.
    UPDATE    the generative model has already absorbed each observation online (EWMA state /
              the AR fit) — the loop closes.

    A `warmup` count of opening frames is excluded from the surprise (no history to predict
    from). Returns the loop's read: pred, error, precision (gain), confidence (0..20),
    surprise = π·mean(z²), complexity (bits), output = π·z (the precision-weighted residual
    the plane EMITS instead of the raw feature), and n / n_params. Graceful on an empty /
    single-frame plane (surprise 0)."""
    X = np.asarray(obs, dtype=float)
    if X.ndim == 1:
        X = X.reshape(-1, 1)
    n = X.shape[0]
    if n == 0:
        return {"n": 0, "surprise": 0.0, "complexity": 0.0, "precision": 0.0,
                "confidence": 0.0, "error": [], "output": [], "model": model,
                "note": "pc-skipped: empty plane"}

    # PREDICT + implicit UPDATE (the generative model)
    if model == "ar1":
        pred, n_params = ar1_fit_predict(X)
    else:
        pred = ewma_predict(X, alpha=alpha)
        n_params = 1  # the EWMA smoothing coefficient
        model = "ewma"

    # ERROR — the residual the model failed to predict
    err = X - pred

    # standardize by the observation scale so z² is dimensionless (per column, pooled) — this
    # is what makes π·z² comparable across content · structure · bands · form · coupling.
    sigma = np.std(X, axis=0)
    sigma = np.where(sigma < _EPS, 1.0, sigma)
    z = err / sigma
    w = max(0, min(warmup, n))  # exclude the warmup frames (no history to predict)
    z_eff = z[w:] if n > w else z[:0]
    msz = float(np.mean(z_eff ** 2)) if z_eff.size else 0.0

    # BOTTOM-UP self-report: the ESTIMATED precision = variance-explained, `π̂ = 1/mean(z²)`
    # (R²-related: π̂→∞ as the model nears perfect, π̂≈1 when it does no better than the mean,
    # π̂<1 when worse). Expressed as the confidence the plane REPORTS in its own prediction.
    est_precision = 1.0 / (msz + _EPS)
    est_confidence = precision_to_confidence(est_precision)

    # THE GAIN π that weights ε² in F: a top-down confidence VOW SETS it (attention); ABSENT a
    # vow the gain stays NEUTRAL (1) — the error speaks for itself, un-modulated — while the
    # plane still REPORTS its estimated confidence. Both directions ride the one π↔confidence
    # map (precision = confidence-as-gain), so a vow of N/20 pushes the plane's error N-hard on F.
    if confidence is not None:
        gain = confidence_to_precision(confidence)
        conf_out = float(np.clip(confidence, 0.0, _CONF_MAX))
        conf_src = "vow"
    else:
        gain = 1.0
        conf_out = est_confidence
        conf_src = "estimate"

    # SURPRISE = π · mean(z²) — the precision-weighted prediction-error energy (the plane's
    # contribution to F's accuracy term). A DETECTION is what the model failed to predict.
    surprise = float(gain * msz)
    complexity = model_complexity(n_params, n)
    # the plane's OUTPUT becomes the precision-weighted residual, NOT the raw feature.
    output = gain * z

    return {
        "n": n,
        "planes": X.shape[1],
        "model": model,
        "n_params": n_params,
        "precision": gain,               # the gain that weights ε² in F (= confidence-as-gain)
        "confidence": conf_out,          # the confidence the plane carries (vow or estimate)
        "confidence_source": conf_src,
        "est_precision": est_precision,  # the bottom-up variance-explained self-report
        "est_confidence": est_confidence,
        "surprise": surprise,
        "complexity": complexity,
        "mean_sq_z": msz,
        "error": err.tolist(),
        "output": output.tolist(),
    }


# ── the free-energy objective — F = Σ π·ε² + complexity(model), over the planes ────────────


def free_energy(planes: dict, model: str = "ewma", alpha: float = 0.3,
                confidences: dict | None = None,
                form_dictionary: list | None = None,
                form_streams: list | None = None,
                form_alphabet: int | None = None) -> dict:
    """The sensorium's per-frame OBJECTIVE: `F = Σ_i π_i·ε_i² + complexity(model)` over the
    planes (sensorium-machina #the-one-objective). Each plane runs its own predictive-coding
    loop ({@link plane_pc}); the accuracy term sums their precision-weighted surprises, the
    complexity term sums their model description-lengths.

    The FORM plane's complexity may be supplied DIRECTLY as the induction MDL ledger
    (`form_dictionary` + `form_streams` + `form_alphabet`) — reusing
    form_induction.description_length verbatim (the SAME two-part code), so F's complexity
    term IS the corpus's own grammar cost where a form plane stands. Absent that, every
    plane's complexity is the native BIC-style param cost.

    `planes` maps a plane name → its observation matrix (NDJSON-decoded). `confidences` maps
    a plane name → a top-down confidence vow (0..20) SETTING that plane's precision gain;
    an absent entry ⇒ the plane estimates its own precision. Returns {F, accuracy,
    complexity, per_plane}."""
    confidences = confidences or {}
    per_plane = {}
    accuracy = 0.0
    complexity = 0.0
    for name, obs in planes.items():
        conf = confidences.get(name)
        r = plane_pc(obs, model=model, alpha=alpha, confidence=conf)
        per_plane[name] = {
            "surprise": r["surprise"], "complexity": r["complexity"],
            "precision": r["precision"], "confidence": r["confidence"],
            "confidence_source": r.get("confidence_source"),
            "est_confidence": r.get("est_confidence"), "mean_sq_z": r.get("mean_sq_z"),
            "n": r["n"], "model": r["model"], "n_params": r.get("n_params", 0),
        }
        accuracy += r["surprise"]
        complexity += r["complexity"]

    # FORM-plane MDL reuse: swap the native param-cost for the induction ledger when supplied.
    form_note = None
    if form_dictionary is not None and form_streams is not None:
        try:
            from form_induction import description_length
            asize = int(form_alphabet) if form_alphabet else max(
                1, len({x for s in form_streams for x in s}))
            dl = float(description_length(form_streams, form_dictionary, asize))
            # replace (or add) the form plane's complexity with the true grammar cost (bits).
            prev = per_plane.get("form", {}).get("complexity", 0.0)
            complexity += dl - prev
            per_plane.setdefault("form", {"surprise": 0.0, "n": len(form_streams)})
            per_plane["form"]["complexity"] = dl
            per_plane["form"]["mdl_source"] = "form_induction.description_length"
            form_note = f"form complexity = description_length ({dl:.2f} bits)"
        except Exception as exc:  # noqa: BLE001 — form_induction absent → keep the native cost
            form_note = f"form MDL reuse skipped ({type(exc).__name__})"

    F = accuracy + complexity
    return {
        "F": F, "accuracy": accuracy, "complexity": complexity,
        "per_plane": per_plane, "n_planes": len(planes),
        "note": form_note or "F = Σ π·ε² + complexity(model)",
    }


# ── the CLI faces ─────────────────────────────────────────────────────────────────────────


def _load_signal(path: str) -> np.ndarray:
    """Load an N×P signal matrix from an NDJSON file/stdin (bare number · list · {"vector"} ·
    {"value"} per line) — the same intake as bands_sidecar._load_signal."""
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


def cmd_pc(args) -> None:
    """One plane's predictive-coding loop over an NDJSON signal → a JSON summary (the surprise
    Σπz² + the model complexity). The chroma-free VERIFY face."""
    X = _load_signal(args.signal)
    conf = args.confidence if args.confidence is not None and args.confidence >= 0 else None
    r = plane_pc(X, model=args.model, alpha=args.alpha, confidence=conf)
    # trim the per-frame error/output arrays for the summary face (pc is a probe).
    summary = {k: v for k, v in r.items() if k not in ("error", "output")}
    summary["output_len"] = len(r.get("output", []))
    sys.stdout.write(json.dumps(summary) + "\n")


def cmd_objective(args) -> None:
    """The multi-plane free-energy objective F = Σ π·ε² + complexity, over name=file plane
    signals → one JSON verdict. Each `--signal name=path`; optional `--confidence name=N`
    SETS that plane's precision gain (a top-down vow)."""
    planes = {}
    for spec in args.signal:
        if "=" not in spec:
            sys.stderr.write(f"bad --signal (need name=path): {spec}\n")
            continue
        name, path = spec.split("=", 1)
        planes[name] = _load_signal(path)
    confidences = {}
    for spec in (args.confidence or []):
        if "=" in spec:
            name, val = spec.split("=", 1)
            try:
                confidences[name] = float(val)
            except ValueError:
                pass
    out = free_energy(planes, model=args.model, alpha=args.alpha, confidences=confidences)
    sys.stdout.write(json.dumps(out) + "\n")


def cmd_selftest(args) -> None:
    """A synthetic check (no fixture): a PREDICTABLE signal (a smooth ramp+sine) earns high
    precision / low surprise; NOISE earns ~neutral precision / high surprise. Confirms the
    loop emits surprise (prediction-error), not raw features, and F combines both terms."""
    n = 200
    t = np.arange(n)
    predictable = np.sin(2 * np.pi * t / 40.0) + t * 0.01  # a smooth, forecastable stream
    noise = np.random.default_rng(0).normal(0, 1, n)
    rp = plane_pc(predictable, model="ar1")
    rn = plane_pc(noise, model="ar1")
    vow = plane_pc(noise, model="ar1", confidence=18.0)  # a top-down high-confidence vow
    fe = free_energy({"predictable": predictable, "noise": noise})
    report = {
        "predictable_est_confidence": rp["est_confidence"],
        "noise_est_confidence": rn["est_confidence"],
        # the loop EMITS prediction-error surprise (not raw features): predictable < noise
        "predictable_lower_surprise": rp["surprise"] < rn["surprise"],
        # variance-explained self-report is higher on the forecastable stream
        "predictable_higher_est_confidence": rp["est_confidence"] > rn["est_confidence"],
        # π = confidence-as-gain WIRED: an 18/20 vow pushes the plane's error harder on F
        "vow_raises_surprise": vow["surprise"] > rn["surprise"],
        "vow_precision_is_gain": abs(vow["precision"] - confidence_to_precision(18.0)) < 1e-9,
        "F": fe["F"], "accuracy": fe["accuracy"], "complexity": fe["complexity"],
        "F_has_complexity_term": fe["complexity"] > 0.0,
    }
    sys.stdout.write(json.dumps(report) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="predictive_coding — per-plane predict→error→precision→update + F")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("pc", help="one plane's predictive-coding loop over an NDJSON signal → JSON summary")
    p.add_argument("--signal", required=True, help="NDJSON signal file, or - for stdin")
    p.add_argument("--model", default="ewma", choices=["ewma", "ar1"])
    p.add_argument("--alpha", type=float, default=0.3, help="EWMA smoothing coefficient")
    p.add_argument("--confidence", type=float, default=None, help="top-down confidence vow 0..20 (sets π)")
    p.set_defaults(fn=cmd_pc)

    o = sub.add_parser("objective", help="multi-plane F = Σπε² + complexity over name=file signals → JSON verdict")
    o.add_argument("--signal", action="append", default=[], help="name=path (repeatable, one per plane)")
    o.add_argument("--confidence", action="append", default=[], help="name=N top-down vow (repeatable)")
    o.add_argument("--model", default="ewma", choices=["ewma", "ar1"])
    o.add_argument("--alpha", type=float, default=0.3)
    o.set_defaults(fn=cmd_objective)

    s = sub.add_parser("selftest", help="synthetic predictable-vs-noise check (no fixture)")
    s.set_defaults(fn=cmd_selftest)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
