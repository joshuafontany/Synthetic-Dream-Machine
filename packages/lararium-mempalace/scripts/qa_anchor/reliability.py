#!/usr/bin/env python3
"""reliability — inter-rater and intra-rater agreement for the human kumu labels.

The gold-anchor's d' is only as trustworthy as the human ground truth it scores
against. This module measures how reproducible that ground truth is.

KRIPPENDORFF'S ALPHA (the inter-rater workhorse)
================================================
Alpha tolerates ANY number of raters, ANY measurement level (nominal / ordinal /
interval / ratio), and MISSING data — exactly the shape a kumu panel produces
(raters skip spans, panels vary in size). It is a chance-corrected agreement:

    alpha = 1 - D_o / D_e

  D_o = observed disagreement (from the value coincidence matrix),
  D_e = disagreement expected by chance (from the marginals),
  via a difference function delta^2 chosen by measurement level.

  Krippendorff, K. (2004). Content Analysis: An Introduction to Its Methodology
  (2nd ed.), ch. 11. Sage.
  Krippendorff, K. (2011). Computing Krippendorff's Alpha-Reliability.
  https://repository.upenn.edu/asc_papers/43

Interpretation bands (Krippendorff 2004, p. 241):
  alpha >= 0.80  satisfactory; 0.667 <= alpha < 0.80 tentative (draw only
  tentative conclusions); below 0.667 unreliable.

INTRA-RATER TEST-RETEST (the single-kumu fallback)
==================================================
When only one kumu is available, re-judge a fold of spans after a delay and
measure self-consistency:
  - Cohen's kappa for categorical re-judgements.
      Cohen, J. (1960). A coefficient of agreement for nominal scales.
      Educational and Psychological Measurement, 20(1), 37-46.
  - Intraclass correlation (ICC) for continuous / graded re-judgements.
      Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: uses in
      assessing rater reliability. Psychological Bulletin, 86(2), 420-428.
      McGraw, K. O., & Wong, S. P. (1996). Forming inferences about some
      intraclass correlation coefficients. Psychological Methods, 1(1), 30-46.

stdlib + numpy only (no scipy in the sidecar venv).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

import numpy as np

# Krippendorff (2004) reliability bands.
ALPHA_SATISFACTORY = 0.80
ALPHA_TENTATIVE_FLOOR = 0.667


class Level(str, Enum):
    """The measurement level — selects the difference function delta^2."""

    NOMINAL = "nominal"
    ORDINAL = "ordinal"
    INTERVAL = "interval"
    RATIO = "ratio"


# ---------------------------------------------------------------------------
# Krippendorff's alpha
# ---------------------------------------------------------------------------


def _coincidence_matrix(reliability_data: np.ndarray, values: np.ndarray) -> np.ndarray:
    """Build the value-by-value coincidence matrix o[v, v'].

    reliability_data: units x raters, np.nan for missing. Each unit with m >= 2
    ratings contributes every ORDERED within-unit value pair, weighted 1/(m-1)
    (Krippendorff 2011, eq. for the coincidence matrix)."""
    n_vals = values.size
    index = {v: i for i, v in enumerate(values)}
    o = np.zeros((n_vals, n_vals), dtype=float)
    for unit in reliability_data:
        present = unit[~np.isnan(unit)]
        m = present.size
        if m < 2:
            continue  # a single rating pairs with nothing
        # per-value counts within this unit
        counts = np.zeros(n_vals, dtype=float)
        for v in present:
            counts[index[v]] += 1.0
        for c in range(n_vals):
            if counts[c] == 0:
                continue
            for k in range(n_vals):
                # ordered pairs (c, k); subtract the self-pair on the diagonal
                pairs = counts[c] * (counts[k] - (1.0 if c == k else 0.0))
                o[c, k] += pairs / (m - 1.0)
    return o


def _delta_squared(values: np.ndarray, marginals: np.ndarray, level: Level) -> np.ndarray:
    """The squared difference function delta^2(c, k) per measurement level.

    Krippendorff (2004, 2011): nominal is 0/1; interval is (c-k)^2; ratio is
    ((c-k)/(c+k))^2; ordinal accumulates the marginal mass between the two ranks.
    """
    n = values.size
    d2 = np.zeros((n, n), dtype=float)
    if level is Level.NOMINAL:
        for c in range(n):
            for k in range(n):
                d2[c, k] = 0.0 if c == k else 1.0
    elif level is Level.INTERVAL:
        for c in range(n):
            for k in range(n):
                d2[c, k] = (values[c] - values[k]) ** 2
    elif level is Level.RATIO:
        for c in range(n):
            for k in range(n):
                denom = values[c] + values[k]
                d2[c, k] = 0.0 if denom == 0 else ((values[c] - values[k]) / denom) ** 2
    elif level is Level.ORDINAL:
        # values must be sorted ascending; the ordinal metric sums marginal mass
        # of the ranks lying between c and k, half-weighting the endpoints.
        order = np.argsort(values)
        sorted_marg = marginals[order]
        cum = np.cumsum(sorted_marg)
        inv = np.empty(n, dtype=int)
        inv[order] = np.arange(n)
        for c in range(n):
            for k in range(n):
                ic, ik = inv[c], inv[k]
                lo, hi = (ic, ik) if ic <= ik else (ik, ic)
                between = cum[hi] - cum[lo] + sorted_marg[lo]  # inclusive span
                d2[c, k] = (between - (sorted_marg[lo] + sorted_marg[hi]) / 2.0) ** 2
    else:  # pragma: no cover - exhaustive enum
        raise ValueError(f"unknown level {level!r}")
    return d2


def krippendorff_alpha(
    reliability_data: np.ndarray, *, level: Level | str = Level.NOMINAL
) -> float:
    """Krippendorff's alpha for a units x raters matrix (np.nan == missing).

    Returns alpha in (-inf, 1]. NaN when there is no pairable data or no
    expected disagreement (e.g. every rating identical -> D_e == 0).
    """
    if isinstance(level, str):
        level = Level(level)
    data = np.asarray(reliability_data, dtype=float)
    if data.ndim != 2:
        raise ValueError("reliability_data must be 2-D (units x raters)")

    values = np.unique(data[~np.isnan(data)])
    if values.size == 0:
        return float("nan")
    if values.size == 1:
        # one value across all ratings: perfect agreement, no variance to correct.
        return 1.0

    o = _coincidence_matrix(data, values)
    marginals = o.sum(axis=1)
    n = marginals.sum()
    if n < 2:
        return float("nan")  # nothing pairable

    d2 = _delta_squared(values, marginals, level)

    observed = float(np.sum(o * d2))
    # expected: ordered marginal products n_c * n_k over the off-diagonal mass
    expected = float(np.sum(np.outer(marginals, marginals) * d2)) / (n - 1.0)
    if expected == 0:
        return float("nan")  # no expected disagreement -> alpha undefined
    return 1.0 - observed / expected


@dataclass(frozen=True)
class AlphaBand:
    """A reading of an alpha value against the Krippendorff (2004) bands."""

    alpha: float
    label: str  # "satisfactory" | "tentative" | "unreliable" | "undefined"
    satisfactory: bool


def classify_alpha(alpha: float) -> AlphaBand:
    """Map an alpha to the Krippendorff (2004) reliability bands."""
    if not np.isfinite(alpha):
        return AlphaBand(alpha=alpha, label="undefined", satisfactory=False)
    if alpha >= ALPHA_SATISFACTORY:
        return AlphaBand(alpha=alpha, label="satisfactory", satisfactory=True)
    if alpha >= ALPHA_TENTATIVE_FLOOR:
        return AlphaBand(alpha=alpha, label="tentative", satisfactory=False)
    return AlphaBand(alpha=alpha, label="unreliable", satisfactory=False)


def bootstrap_alpha(
    reliability_data: np.ndarray,
    *,
    level: Level | str = Level.NOMINAL,
    n_resamples: int = 2000,
    ci_level: float = 0.95,
    seed: int | None = None,
):
    """Bootstrap CI for alpha by resampling UNITS (rows) — the same percentile
    engine the d' CI uses, so the rig reports both intervals identically.

    Returns a bootstrap.BootstrapResult (point = alpha on the full matrix).
    """
    from .bootstrap import bootstrap_ci  # local import: shared engine

    data = np.asarray(reliability_data, dtype=float)
    lvl = Level(level) if isinstance(level, str) else level

    def _stat(block: np.ndarray) -> float:
        return krippendorff_alpha(block, level=lvl)

    return bootstrap_ci(data, _stat, n_resamples=n_resamples, ci_level=ci_level, seed=seed)


# ---------------------------------------------------------------------------
# intra-rater test-retest — Cohen's kappa (categorical)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class KappaResult:
    kappa: float
    observed_agreement: float
    expected_agreement: float
    n: int

    def as_dict(self) -> dict:
        return {
            "kappa": self.kappa,
            "observed_agreement": self.observed_agreement,
            "expected_agreement": self.expected_agreement,
            "n": self.n,
        }


def cohens_kappa(rating_a, rating_b) -> KappaResult:
    """Cohen's kappa between two aligned categorical ratings (a single kumu's
    first vs second pass). kappa = (p_o - p_e) / (1 - p_e).

    Cohen (1960). Returns kappa == 1.0 when both passes agree perfectly even if
    every label is identical (p_e == 1 handled as the degenerate perfect case).
    """
    a = list(rating_a)
    b = list(rating_b)
    if len(a) != len(b):
        raise ValueError("rating_a and rating_b must align")
    n = len(a)
    if n == 0:
        raise ValueError("no ratings")

    categories = sorted(set(a) | set(b))
    idx = {c: i for i, c in enumerate(categories)}
    k = len(categories)
    table = np.zeros((k, k), dtype=float)
    for x, y in zip(a, b):
        table[idx[x], idx[y]] += 1.0

    p_o = np.trace(table) / n
    row = table.sum(axis=1) / n
    col = table.sum(axis=0) / n
    p_e = float(np.sum(row * col))

    if p_e == 1.0:
        # both raters used a single (identical) category -> agreement is trivial.
        return KappaResult(kappa=1.0, observed_agreement=p_o, expected_agreement=p_e, n=n)
    kappa = (p_o - p_e) / (1.0 - p_e)
    return KappaResult(kappa=kappa, observed_agreement=p_o, expected_agreement=p_e, n=n)


# ---------------------------------------------------------------------------
# intra-rater test-retest — Intraclass Correlation (continuous)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class IccResult:
    icc: float
    form: str  # "ICC(2,1)" | "ICC(3,1)"
    n_subjects: int
    n_raters: int

    def as_dict(self) -> dict:
        return {
            "icc": self.icc,
            "form": self.form,
            "n_subjects": self.n_subjects,
            "n_raters": self.n_raters,
        }


def _icc_mean_squares(ratings: np.ndarray):
    """Two-way ANOVA mean squares for an n_subjects x n_raters matrix."""
    n, k = ratings.shape
    grand = ratings.mean()
    row_means = ratings.mean(axis=1)
    col_means = ratings.mean(axis=0)

    ss_rows = k * np.sum((row_means - grand) ** 2)
    ss_cols = n * np.sum((col_means - grand) ** 2)
    ss_total = np.sum((ratings - grand) ** 2)
    ss_error = ss_total - ss_rows - ss_cols

    ms_rows = ss_rows / (n - 1)
    ms_cols = ss_cols / (k - 1)
    ms_error = ss_error / ((n - 1) * (k - 1))
    return ms_rows, ms_cols, ms_error


def intraclass_correlation(ratings: np.ndarray, *, form: str = "ICC(2,1)") -> IccResult:
    """Single-measure ICC for an n_subjects x n_raters matrix.

    ICC(2,1): two-way random, absolute agreement, single rater.
    ICC(3,1): two-way mixed, consistency, single rater.
    Shrout & Fleiss (1979); McGraw & Wong (1996). For test-retest the two
    "raters" are the two sessions of the same kumu.
    """
    data = np.asarray(ratings, dtype=float)
    if data.ndim != 2:
        raise ValueError("ratings must be 2-D (subjects x raters)")
    n, k = data.shape
    if n < 2 or k < 2:
        raise ValueError("need >= 2 subjects and >= 2 raters")

    msr, msc, mse = _icc_mean_squares(data)

    if form == "ICC(3,1)":
        denom = msr + (k - 1) * mse
        icc = 0.0 if denom == 0 else (msr - mse) / denom
    elif form == "ICC(2,1)":
        denom = msr + (k - 1) * mse + k * (msc - mse) / n
        icc = 0.0 if denom == 0 else (msr - mse) / denom
    else:
        raise ValueError(f"unsupported ICC form {form!r}")
    return IccResult(icc=float(icc), form=form, n_subjects=n, n_raters=k)
