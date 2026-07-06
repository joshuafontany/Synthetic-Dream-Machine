#!/usr/bin/env python3
"""sensorium_efe — the py twin of the mesh EFE keystone (RUN-ARC.md #3, owed-py-twin paid).

Ports the CONTRACT of packages/lararium-mesh/src/sensorium-efe.ts — the expected-free-
energy organ the H1 gate keys:

  B-1  the verb-conditioned forward model: an autonomous AR(1) one-step forecast per
       plane, BENT by a verb's affine delta (scale/shift the mean, gain the precision);
  B-2  the scorer: EFE = pragmatic (Gaussian KL to the C set-point) + gamma*epistemic
       (-0.5 ln pi_after) + gamma*optionLoss, where
       optionLoss = sum(ln pi_after - ln pi_baseline) — the reachable-future-entropy the
       verb spends (the empowerment term); REVERSIBILITY derives as sign(optionLoss),
       never a declared boolean grid;
  B-3  selection: efe_select argmin, ranked ascending, top-two margin, the tau review
       seam (never the py VERB_SEATS HITL gate).

THE KEYSTONE GATE (BxC): efe_gate reads H1 FIRST (sensorium_fusion), then forks —
H1 = 0 -> efe_select (a global EFE stands well-posed) · H1 != 0 -> surface_disagreement
carrying R*_sem = log2(dim H1) (a SURFACING move, never a reconcile).

Seams held open exactly as the TS holds them: gamma defaults 1 (the C-only floor; a later
ARL0->beta dials it) · tau defaults 1 (a selection-margin flag, gating nothing).

Arithmetic runs PURE python float64 in the TS statement order (the sensorium-pc AR(1)
closed form, the EPS_REL machine-epsilon precision floor, the 1e-6..1e6 precision clamps),
so the committed parity fixture binds the two bodies at 1e-5.

The `fixture` face regenerates the committed TS<->py parity fixture:
  ~/.venv/bin/python3 sensorium_efe.py fixture
  -> packages/lararium-mesh/tests/fixtures/sensorium-efe-parity.json

Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

from sensorium_fusion import cohomology_obstruction, reconciliation_cost

_EPS = 1e-9                       # the sensorium-pc scale floor
_EPS_REL = sys.float_info.epsilon  # the RELATIVE precision floor (machine epsilon)
_PREC_FLOOR = 1e-6                # an expanding verb rests here, never at -inf ln-precision
_PREC_CEIL = 1e6                  # a collapsing verb caps here — finite yet dominating


def _clamp_precision(p: float) -> float:
    if not math.isfinite(p):
        return _PREC_CEIL
    return min(_PREC_CEIL, max(_PREC_FLOOR, p))


def _ln_precision(p: float) -> float:
    """The log-precision the option-loss and ambiguity terms both read."""
    return math.log(_clamp_precision(p))


# ── the pc primitives the forward model rides (sensorium-pc.ts, ported line-for-line) ─────


def _ar1_fit_predict(x: list) -> list:
    """AR(1) one-step prediction (the sensorium-pc closed form): fit x[t] ~ a*x[t-1] + b
    by least squares, then predict. A short series (< 3) falls back to predict-previous."""
    n = len(x)
    pred = [0.0] * n
    if n < 3:
        for t in range(1, n):
            pred[t] = x[t - 1]
        pred[0] = x[0] if n else 0.0
        return pred
    x0 = x[:-1]
    x1 = x[1:]
    m = len(x0)
    mx = sum(x0) / m
    my = sum(x1) / m
    sxx = sxy = 0.0
    for i in range(m):
        sxx += (x0[i] - mx) * (x0[i] - mx)
        sxy += (x0[i] - mx) * (x1[i] - my)
    a = sxy / sxx if sxx > _EPS else 1.0
    b = my - a * mx
    pred[0] = x[0]
    for t in range(1, n):
        pred[t] = a * x[t - 1] + b
    return pred


def optimal_precision(mean_sq_err: float) -> float:
    """The interior optimum pi* = 1/(mean_sq_err + EPS_REL) — the relative floor caps a
    near-noiseless plane at 1/EPS_REL instead of blowing up (the crucible fix)."""
    return 1.0 / (max(0.0, mean_sq_err) + _EPS_REL)


def gaussian_kl(mu_q: float, var_q: float, mu_p: float, var_p: float) -> float:
    """KL[N(mu_q, var_q) || N(mu_p, var_p)] in nats — the pragmatic-risk currency."""
    vq = max(_EPS, var_q)
    vp = max(_EPS, var_p)
    return 0.5 * math.log(vp / vq) + (vq + (mu_q - mu_p) * (mu_q - mu_p)) / (2.0 * vp) - 0.5


# ── B-1: the verb-conditioned forward model ───────────────────────────────────────────────


def _autonomous_forecast(series: list) -> tuple:
    """The autonomous one-step forecast of a plane's NEXT frame + a bottom-up precision
    (the TS autonomousForecast, statement for statement): the mean INVERTS the affine map
    the AR(1) fit carries (widest-spread lag pair recovers a,b — no re-fit); the precision
    reads the standardized residual scale through the interior optimum pi* = 1/eps^2."""
    n = len(series)
    if n == 0:
        return 0.0, 1.0
    if n == 1:
        return series[0], 1.0

    pred = _ar1_fit_predict(series)

    mean = sum(series) / n
    varc = sum((v - mean) * (v - mean) for v in series) / n
    sd = math.sqrt(varc)
    sigma = 1.0 if sd < _EPS else sd
    sum_sq = 0.0
    count = 0
    for t in range(1, n):
        z = (series[t] - pred[t]) / sigma
        sum_sq += z * z
        count += 1
    mean_sq_z = sum_sq / count if count > 0 else 0.0
    precision = optimal_precision(mean_sq_z)

    lo_i = hi_i = 0
    for t in range(n - 1):
        if series[t] < series[lo_i]:
            lo_i = t
        if series[t] > series[hi_i]:
            hi_i = t
    lag_lo, pred_lo = series[lo_i], pred[lo_i + 1]
    lag_hi, pred_hi = series[hi_i], pred[hi_i + 1]
    if abs(lag_hi - lag_lo) > _EPS:
        a = (pred_hi - pred_lo) / (lag_hi - lag_lo)
        b = pred_lo - a * lag_lo
        mu = a * series[n - 1] + b
    else:
        mu = pred[n - 1]   # a constant series carries no lag spread — the latest one-step stands
    return mu, precision


def _verb_action_on(verb: dict, plane: str) -> tuple:
    """A verb's effective (scale, shift, gain) on a NAMED plane — per-plane override or
    the verb default."""
    o = (verb.get("perPlane") or {}).get(plane) or {}
    scale = o.get("scale", verb.get("scale", 1.0))
    shift = o.get("shift", verb.get("shift", 0.0))
    gain = o.get("precisionGain", verb.get("precisionGain", 1.0))
    return float(scale), float(shift), float(gain)


def predict_next(plane_reads: dict, verb: dict) -> dict:
    """B-1 — run the autonomous forecast per plane, then BEND it by the verb's affine
    delta: mu_after = a*mu + s, pi_after = clamp(g*pi). Returns after- and baseline-
    means + precisions (the option-loss needs the pair)."""
    planes = list(plane_reads.keys())
    mu, precision, mu_base, prec_base = [], [], [], []
    for plane in planes:
        m, p = _autonomous_forecast(list(plane_reads[plane]))
        scale, shift, gain = _verb_action_on(verb, plane)
        mu_base.append(m)
        prec_base.append(_clamp_precision(p))
        mu.append(scale * m + shift)
        precision.append(_clamp_precision(gain * p))
    return {"planes": planes, "mu": mu, "precision": precision,
            "muBaseline": mu_base, "precisionBaseline": prec_base}


# ── B-2: the scorer ───────────────────────────────────────────────────────────────────────


def score_efe(plane_reads: dict, verb: dict, c: dict, *, gamma: float = 1.0,
              preference_variance: float = 1.0) -> dict:
    """B-2 — score ONE verb: pragmatic risk (KL to the C set-point) + gamma*ambiguity
    (-0.5 ln pi_after) + gamma*optionLoss (ln pi_after - ln pi_baseline, the reachable-
    future-entropy spent). Reversibility FALLS OUT of sign(optionLoss)."""
    fwd = predict_next(plane_reads, verb)
    pragmatic = epistemic = option_loss = 0.0
    for i, plane in enumerate(fwd["planes"]):
        pi_after = fwd["precision"][i]
        pi_base = fwd["precisionBaseline"][i]
        var_after = 1.0 / pi_after
        c_mu = float((c.get("mu") or {}).get(plane, 0.0))
        c_var = float((c.get("variance") or {}).get(plane, preference_variance))
        pragmatic += gaussian_kl(fwd["mu"][i], var_after, c_mu, c_var)
        epistemic += -0.5 * _ln_precision(pi_after)
        option_loss += _ln_precision(pi_after) - _ln_precision(pi_base)
    efe = pragmatic + gamma * epistemic + gamma * option_loss
    return {"verb": verb["verb"], "efe": efe, "pragmatic": pragmatic,
            "epistemic": epistemic, "optionLoss": option_loss,
            "reversible": option_loss <= 1e-9}


# ── B-3: selection ────────────────────────────────────────────────────────────────────────


def efe_select(plane_reads: dict, verbs: list, c: dict, *, gamma: float = 1.0,
               preference_variance: float = 1.0, tau: float = 1.0) -> dict:
    """B-3 — argmin over the verbs' EFE scores; ranked ascending; the top-two margin
    flags a close call for review (the tau seam steers no selection)."""
    if not verbs:
        raise ValueError("sensorium_efe: efe_select needs at least one verb to score.")
    ranked = sorted((score_efe(plane_reads, v, c, gamma=gamma,
                               preference_variance=preference_variance) for v in verbs),
                    key=lambda s: s["efe"])
    chosen = ranked[0]
    margin = ranked[1]["efe"] - chosen["efe"] if len(ranked) > 1 else math.inf
    return {"chosen": chosen, "ranked": ranked, "margin": margin,
            "needsReview": margin < tau}


# ── the keystone gate (BxC) ───────────────────────────────────────────────────────────────


def surface_disagreement(obs: dict) -> dict:
    """SURFACE an ontological obstruction — carries the cost R*_sem = log2(dim H1) and
    names the move a SURFACING (route to Talk-Story), never a reconcile."""
    dim_h1 = obs["dimH1"]
    cost = reconciliation_cost(dim_h1)
    return {"dimH1": dim_h1, "cost": cost,
            "message": (f"ontological no-global-now: {dim_h1} obstruction generator(s), "
                        f"R*_sem={cost:.3f} bits — SURFACE the disagreement (route to "
                        f"Talk-Story); a global EFE argmin would average away a real cocycle.")}


def efe_gate(assignment: dict, plane_reads: dict, verbs: list, c: dict, *,
             gamma: float = 1.0, preference_variance: float = 1.0, tau: float = 1.0,
             agreement_tolerance: float = 1e-9) -> dict:
    """THE KEYSTONE GATE (BxC). Read H1 FIRST over the li-assignment, then fork:
      H1 = 0 -> {"verdict": "select", "selection": ...} — a global EFE stands well-posed;
      H1 > 0 -> {"verdict": "surface-disagreement", "disagreement": ...} — no global
                section; the argmin would average away a real cocycle.
    Raises (via cohomology_obstruction) on a cosheaf plane."""
    obs = cohomology_obstruction(assignment, agreement_tolerance=agreement_tolerance)
    if obs["dimH1"] > 0:
        return {"verdict": "surface-disagreement", "selection": None,
                "disagreement": surface_disagreement(obs)}
    return {"verdict": "select", "disagreement": None,
            "selection": efe_select(plane_reads, verbs, c, gamma=gamma,
                                    preference_variance=preference_variance, tau=tau)}


# ── the fixture face ──────────────────────────────────────────────────────────────────────

# The bench's fixed verb-set — exercises both reversibility signs (bifurcation-bench.ts).
_FIXTURE_VERBS = [
    {"verb": "hold", "scale": 1, "shift": 0, "precisionGain": 1},
    {"verb": "align", "scale": 0, "shift": 0, "precisionGain": 1},
    {"verb": "collapse", "scale": 1, "shift": 0, "precisionGain": 1e4},
    {"verb": "expand", "scale": 1, "shift": 0, "precisionGain": 1e-3},
]


def _mulberry32(seed: int):
    a = seed & 0xFFFFFFFF

    def rand() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rand


def _seeded_series(n: int, phi: float, seed: int) -> list:
    """A seeded AR(1)-shaped series (Box-Muller off mulberry32) — deterministic fixture
    input, values rounded to 6 places so the JSON round-trips bit-clean."""
    rng = _mulberry32(seed)

    def normal() -> float:
        u = max(rng(), 1e-12)
        v = rng()
        return math.sqrt(-2.0 * math.log(u)) * math.cos(2.0 * math.pi * v)

    x = [0.0] * n
    x[0] = normal()
    sigma = math.sqrt(max(1e-6, 1.0 - phi * phi))
    for t in range(1, n):
        x[t] = phi * x[t - 1] + sigma * normal()
    return [round(v, 6) for v in x]


def _sheaf(plane: str, value: dict) -> dict:
    return {"plane": plane, "variance": "sheaf", "value": value}


def _hollow_triangle(base: float, gap: float) -> dict:
    return {
        "restrictions": [
            _sheaf("content", {"a": base, "b": base}),
            _sheaf("structure", {"b": base + gap, "c": base}),
            _sheaf("form", {"c": base + gap, "a": base + gap}),
        ],
        "stalk": {"units": ["a", "b", "c"]},
    }


def _fixture_cases() -> dict:
    plane_reads = {
        "content": _seeded_series(24, 0.9, 0x0EFE1),
        "structure": _seeded_series(24, 0.6, 0x0EFE2),
        "form": _seeded_series(24, 0.3, 0x0EFE3),
    }
    c_vec = {"mu": {"content": 0, "structure": 0, "form": 0}}

    score_cases = []
    for verb in _FIXTURE_VERBS:
        s = score_efe(plane_reads, verb, c_vec)
        score_cases.append({"verb": verb, "expected": s})
    # a per-plane override + a non-default gamma / preference variance exercise the seams
    uneven = {"verb": "uneven", "scale": 1, "shift": 0.5,
              "perPlane": {"structure": {"precisionGain": 4.0, "shift": -0.25}}}
    score_cases.append({"verb": uneven, "gamma": 0.5, "preferenceVariance": 2.0,
                        "expected": score_efe(plane_reads, uneven, c_vec, gamma=0.5,
                                              preference_variance=2.0)})

    selection = efe_select(plane_reads, _FIXTURE_VERBS, c_vec)
    select_case = {
        "verbs": _FIXTURE_VERBS,
        "expected": {
            "chosen": selection["chosen"]["verb"],
            "margin": selection["margin"],
            "ranked": [s["verb"] for s in selection["ranked"]],
            "needsReview": selection["needsReview"],
        },
    }

    hollow = _hollow_triangle(0.5, 0.2)
    gate_cases = []
    for tol in (0.05, 0.3):
        g = efe_gate(hollow, plane_reads, _FIXTURE_VERBS, c_vec, agreement_tolerance=tol)
        exp = {"verdict": g["verdict"]}
        if g["verdict"] == "select":
            exp["chosen"] = g["selection"]["chosen"]["verb"]
        else:
            exp["dimH1"] = g["disagreement"]["dimH1"]
            exp["cost"] = g["disagreement"]["cost"]
        gate_cases.append({"assignment": hollow, "agreementTolerance": tol, "expected": exp})

    return {"planeReads": plane_reads, "c": c_vec, "scoreCases": score_cases,
            "selectCase": select_case, "gateCases": gate_cases}


def _fixture_path() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(
        here, "..", "..", "lararium-mesh", "tests", "fixtures",
        "sensorium-efe-parity.json"))


def cmd_fixture(args) -> None:
    """Regenerate the committed parity fixture — py computes, TS re-computes and asserts."""
    out = {"oracle": "sensorium_efe.py (py twin; TS re-computes and asserts)",
           **_fixture_cases()}
    path = args.out or _fixture_path()
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    sys.stdout.write(f"wrote {path} — {len(out['scoreCases'])} score cases\n")


def cmd_selftest(args) -> None:
    """A no-fixture check: align wins, collapse reads irreversible and sinks, expand reads
    reversible, and the gate forks on tolerance."""
    fx = _fixture_cases()
    sel = efe_select(fx["planeReads"], _FIXTURE_VERBS, fx["c"])
    by_verb = {s["verb"]: s for s in sel["ranked"]}
    strict = efe_gate(_hollow_triangle(0.5, 0.2), fx["planeReads"], _FIXTURE_VERBS,
                      fx["c"], agreement_tolerance=0.05)
    loose = efe_gate(_hollow_triangle(0.5, 0.2), fx["planeReads"], _FIXTURE_VERBS,
                     fx["c"], agreement_tolerance=0.3)
    report = {
        "chosen": sel["chosen"]["verb"],
        "collapse_irreversible": not by_verb["collapse"]["reversible"],
        "collapse_sinks": by_verb["collapse"]["efe"] > sel["chosen"]["efe"],
        "expand_reversible": by_verb["expand"]["reversible"],
        "strict_selects": strict["verdict"] == "select",
        "loose_surfaces": loose["verdict"] == "surface-disagreement",
    }
    sys.stdout.write(json.dumps(report) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="sensorium_efe — the py EFE keystone twin")
    sub = ap.add_subparsers(dest="cmd", required=True)
    fx = sub.add_parser("fixture", help="regenerate the committed TS<->py parity fixture")
    fx.add_argument("--out", default=None)
    fx.set_defaults(fn=cmd_fixture)
    st = sub.add_parser("selftest", help="no-fixture behavior check")
    st.set_defaults(fn=cmd_selftest)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()