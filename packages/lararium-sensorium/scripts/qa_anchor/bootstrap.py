#!/usr/bin/env python3
"""bootstrap — the nonparametric resampling engine, shared by d' and by alpha.

ONE engine, two consumers. The gold-anchor rig needs a confidence interval on
two statistics that have no clean closed-form small-sample variance: Signal-
Detection d' (a nonlinear function of two proportions) and Krippendorff's alpha
(a coincidence-matrix ratio). The percentile bootstrap over ITEMS handles both:
resample the labeled units WITH REPLACEMENT, recompute the statistic on each
resample, and read the empirical 2.5 / 97.5 percentiles of the replicate cloud.

  Efron, B., & Tibshirani, R. J. (1993). An Introduction to the Bootstrap.
  Davison, A. C., & Hinkley, D. V. (1997). Bootstrap Methods and Their
  Application. (percentile interval; resample the natural sampling unit — here
  the labeled span / coding unit, NOT the cells of a fixed table).

The engine is deterministic given a seed (numpy default_rng), so every CI in the
test suite is reproducible. Replicates that come back non-finite (a degenerate
resample — e.g. an alpha resample with no within-unit coincidence) are dropped
from the percentile read and counted, never silently folded in.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Sequence

import numpy as np

from . import dprime as _dp

# A statistic maps a resampled item-block (rows = items) to one scalar.
Statistic = Callable[[np.ndarray], float]


@dataclass(frozen=True)
class BootstrapResult:
    """A point estimate plus a percentile confidence interval."""

    point: float
    lower: float
    upper: float
    ci_level: float
    n_resamples: int
    n_valid: int  # finite replicates that fed the percentile read
    replicates: np.ndarray

    @property
    def std_error(self) -> float:
        """The bootstrap standard error — the spread of the replicate cloud."""
        finite = self.replicates[np.isfinite(self.replicates)]
        return float(np.std(finite, ddof=1)) if finite.size > 1 else float("nan")

    def as_dict(self) -> dict:
        return {
            "point": self.point,
            "lower": self.lower,
            "upper": self.upper,
            "ci_level": self.ci_level,
            "n_resamples": self.n_resamples,
            "n_valid": self.n_valid,
            "std_error": self.std_error,
        }


def bootstrap_ci(
    data: np.ndarray,
    statistic: Statistic,
    *,
    n_resamples: int = 2000,
    ci_level: float = 0.95,
    seed: int | None = None,
) -> BootstrapResult:
    """Percentile bootstrap of `statistic` over the rows (items) of `data`.

    `data` is resampled along axis 0 with replacement; `statistic` receives each
    resampled block and returns a scalar. The point estimate is the statistic on
    the full sample. Non-finite replicates are dropped from the percentile read.
    """
    if not 0.0 < ci_level < 1.0:
        raise ValueError(f"ci_level must lie in (0, 1), got {ci_level}")
    data = np.asarray(data)
    n = data.shape[0]
    if n == 0:
        raise ValueError("cannot bootstrap an empty sample")

    point = float(statistic(data))

    rng = np.random.default_rng(seed)
    reps = np.empty(n_resamples, dtype=float)
    for b in range(n_resamples):
        idx = rng.integers(0, n, size=n)
        reps[b] = float(statistic(data[idx]))

    finite = reps[np.isfinite(reps)]
    alpha = 1.0 - ci_level
    if finite.size == 0:
        lower = upper = float("nan")
    else:
        lower, upper = np.percentile(finite, [100 * alpha / 2, 100 * (1 - alpha / 2)])

    return BootstrapResult(
        point=point,
        lower=float(lower),
        upper=float(upper),
        ci_level=ci_level,
        n_resamples=n_resamples,
        n_valid=int(finite.size),
        replicates=reps,
    )


def bootstrap_dprime(
    fired: Sequence[bool],
    present: Sequence[bool],
    *,
    correction: str = "loglinear",
    n_resamples: int = 2000,
    ci_level: float = 0.95,
    seed: int | None = None,
) -> BootstrapResult:
    """Bootstrap CI for d' by resampling the labeled SPANS (the sampling unit).

    Each item is one labeled span: (fired?, present?). The Hautus loglinear
    correction keeps d' finite on every resample even when a class momentarily
    empties — which is exactly why the rig corrects unconditionally.
    """
    items = np.column_stack([np.asarray(fired, dtype=int), np.asarray(present, dtype=int)])

    def _stat(block: np.ndarray) -> float:
        cm = _dp.confusion_from_labels(block[:, 0].astype(bool), block[:, 1].astype(bool))
        return _dp.compute_sdt(cm, correction=correction).d_prime

    return bootstrap_ci(items, _stat, n_resamples=n_resamples, ci_level=ci_level, seed=seed)
