#!/usr/bin/env python3
"""dprime — the Signal-Detection-Theory (SDT) core of the gold-anchor rig (KUE-1).

THE DESIGN-STABLE STATISTICAL CORE. This module depends on NOTHING in the rig
except the standard library + numpy — no palace, no detector, no sampler, no
human. It turns a per-detector 2x2 confusion matrix (the detector's fires scored
against a human's ground-truth label) into a sensitivity / criterion pair, then
into the KUE-1 verdict that the whole rig exists to deliver.

WHY THE ANCHOR EXISTS
=====================
A low marker-rate is UNDER-DETERMINED. "The detector rarely fires" admits two
incompatible stories that a raw rate cannot separate:

  - SENSITIVITY story: the detector cannot tell present from absent at all
    (low d'). The rarity is blindness.
  - CRITERION story: the detector discriminates well (high d') but sits behind
    a conservative threshold (high c) — it only fires when very sure. The rarity
    is caution, not blindness.

Only a human ground-truth pair recovers d' and c, and only d' and c separate the
two stories. This is the disambiguation of the paper's "absence != absence".

THE MATH (right-tail / yes-no convention)
=========================================
Per detector, vs the human label as truth:

    Hit  = fires AND present        Miss = (not fires) AND present
    FA   = fires AND absent         CR   = (not fires) AND absent
    n_signal = Hit + Miss           n_noise = FA + CR

    H  = hit rate          FA = false-alarm rate
    d' = z(H) - z(FA)                          (sensitivity; 0 = at chance)
    c  = -0.5 * ( z(H) + z(FA) )               (criterion; >0 = conservative)

  where z = the inverse standard-normal CDF (the probit / quantile).
  Green & Swets (1966); Macmillan & Creelman (2005), ch. 1-2.

ZERO-CELL (the loglinear correction, applied UNCONDITIONALLY)
=============================================================
At small n a rate of 0 or 1 sends z to +/-inf and d' blows up. The loglinear
correction adds 0.5 to each frequency and 1 to each total, ALWAYS (not only when
a cell is empty) so the estimator stays smooth and unbiased across the range:

    H  = (hits + 0.5) / (n_signal + 1)
    FA = (fa   + 0.5) / (n_noise  + 1)

  Hautus, M. J. (1995). Corrections for extreme proportions and their biasing
  effects on estimated values of d'. Behavior Research Methods, Instruments, &
  Computers, 27(1), 46-51.

z / Phi come from the standard library (statistics.NormalDist) so the kernel
carries no scipy dependency — numpy is present in the holder venv, scipy is not.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from statistics import NormalDist
from typing import Sequence

# The standard-normal distribution: .inv_cdf == z (probit), .cdf == Phi.
_STD_NORMAL = NormalDist(0.0, 1.0)


def z(p: float) -> float:
    """The probit: inverse standard-normal CDF. z(0.5) == 0, z(0.975) ~ 1.96."""
    return _STD_NORMAL.inv_cdf(p)


def phi(x: float) -> float:
    """The standard-normal CDF (the area, right-tail convention's complement)."""
    return _STD_NORMAL.cdf(x)


# ---------------------------------------------------------------------------
# the 2x2 confusion matrix — a detector's fires scored against a human's truth
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ConfusionMatrix:
    """A per-detector 2x2 table: the detector fires (yes/no) x the human label
    (present/absent). The four cells are the SDT outcomes."""

    hits: int  # fires AND present
    misses: int  # (not fires) AND present
    false_alarms: int  # fires AND absent
    correct_rejections: int  # (not fires) AND absent

    def __post_init__(self) -> None:
        for name in ("hits", "misses", "false_alarms", "correct_rejections"):
            v = getattr(self, name)
            if not isinstance(v, int) or v < 0:
                raise ValueError(f"{name} must be a non-negative int, got {v!r}")

    @property
    def n_signal(self) -> int:
        """Present trials = the signal class (Hit + Miss)."""
        return self.hits + self.misses

    @property
    def n_noise(self) -> int:
        """Absent trials = the noise class (FA + CR)."""
        return self.false_alarms + self.correct_rejections

    @property
    def n_total(self) -> int:
        return self.n_signal + self.n_noise

    @property
    def fire_rate(self) -> float:
        """The detector's overall positive rate (hits + FA) / total — the raw
        'marker rate' the KUE-1 anchor exists to disambiguate."""
        total = self.n_total
        if total == 0:
            return float("nan")
        return (self.hits + self.false_alarms) / total

    def as_dict(self) -> dict:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "false_alarms": self.false_alarms,
            "correct_rejections": self.correct_rejections,
        }


def confusion_from_labels(fired: Sequence[bool], present: Sequence[bool]) -> ConfusionMatrix:
    """Build the 2x2 from two aligned boolean sequences: per labeled span, did
    the detector fire, and was the marker truly present (human ground truth)."""
    if len(fired) != len(present):
        raise ValueError(f"fired ({len(fired)}) and present ({len(present)}) must align")
    hits = misses = fa = cr = 0
    for f, p in zip(fired, present):
        if p:
            if f:
                hits += 1
            else:
                misses += 1
        else:
            if f:
                fa += 1
            else:
                cr += 1
    return ConfusionMatrix(hits=hits, misses=misses, false_alarms=fa, correct_rejections=cr)


# ---------------------------------------------------------------------------
# the SDT estimate — corrected rates, d', and criterion
# ---------------------------------------------------------------------------

Correction = str  # "loglinear" (default, unconditional) | "none" (test-only)


def loglinear_rates(cm: ConfusionMatrix) -> tuple[float, float]:
    """The Hautus (1995) loglinear hit / false-alarm rates, applied
    UNCONDITIONALLY: +0.5 to each frequency, +1 to each total. Keeps z finite at
    small n and at extreme (0 or 1) raw proportions."""
    h = (cm.hits + 0.5) / (cm.n_signal + 1.0)
    fa = (cm.false_alarms + 0.5) / (cm.n_noise + 1.0)
    return h, fa


def raw_rates(cm: ConfusionMatrix) -> tuple[float, float]:
    """Uncorrected rates. Test/diagnostic use only — can be 0 or 1 and so can
    send d' to infinity. The rig always reports loglinear (Hautus 1995)."""
    if cm.n_signal == 0 or cm.n_noise == 0:
        raise ValueError("raw_rates undefined when a class has no trials")
    return cm.hits / cm.n_signal, cm.false_alarms / cm.n_noise


@dataclass(frozen=True)
class SdtEstimate:
    """The recovered Signal-Detection-Theory estimate for one detector."""

    d_prime: float
    criterion: float
    hit_rate: float  # corrected H used for z(H)
    false_alarm_rate: float  # corrected FA used for z(FA)
    fire_rate: float  # raw overall positive rate (carried for the verdict)
    n_signal: int
    n_noise: int
    correction: Correction

    def as_dict(self) -> dict:
        return {
            "d_prime": self.d_prime,
            "criterion": self.criterion,
            "hit_rate": self.hit_rate,
            "false_alarm_rate": self.false_alarm_rate,
            "fire_rate": self.fire_rate,
            "n_signal": self.n_signal,
            "n_noise": self.n_noise,
            "correction": self.correction,
        }


def sdt_rates(cm: ConfusionMatrix, *, correction: Correction = "loglinear") -> tuple[float, float]:
    """The (H, FA) pair fed to z(). Default loglinear (Hautus 1995), applied
    unconditionally; 'none' returns raw rates (test-only)."""
    if correction == "loglinear":
        return loglinear_rates(cm)
    if correction == "none":
        return raw_rates(cm)
    raise ValueError(f"unknown correction {correction!r}")


def compute_sdt(cm: ConfusionMatrix, *, correction: Correction = "loglinear") -> SdtEstimate:
    """The core estimator: confusion matrix -> (d', c).

    d' = z(H) - z(FA);  c = -0.5 * (z(H) + z(FA)).
    Green & Swets (1966); Macmillan & Creelman (2005), ch. 1-2.
    """
    h, fa = sdt_rates(cm, correction=correction)
    zh, zfa = z(h), z(fa)
    d_prime = zh - zfa
    criterion = -0.5 * (zh + zfa)
    return SdtEstimate(
        d_prime=d_prime,
        criterion=criterion,
        hit_rate=h,
        false_alarm_rate=fa,
        fire_rate=cm.fire_rate,
        n_signal=cm.n_signal,
        n_noise=cm.n_noise,
        correction=correction,
    )


# ---------------------------------------------------------------------------
# the KUE-1 inference — (d', c) + fire-rate -> the verdict
# ---------------------------------------------------------------------------


class Kue1Story(str, Enum):
    """The disambiguation the gold-anchor delivers for a rarely-firing detector."""

    SENSITIVITY = "sensitivity"  # low fire-rate + low d' — cannot discriminate
    CRITERION = "criterion"  # low fire-rate + high d' + high c — catches, conservative
    AMBIGUOUS = "ambiguous"  # low fire-rate + high d' + low c — discriminates, not cautious
    NOT_RARE = "not_rare"  # fire-rate not low — the rarity question does not arise


@dataclass(frozen=True)
class Kue1Thresholds:
    """The bands that turn the continuous (d', c, fire-rate) into a verdict.

    Defaults are conventional SDT reference points, NOT tuned to any corpus —
    the operator owns the final values once real labels arrive:
      d' >= 1.0  is conventionally "good" discrimination (~76% area under ROC).
      c  >= 0.5  is a clearly conservative bias toward 'absent'.
      fire-rate <= 0.20 marks the rare-firing regime the anchor disambiguates.
    """

    fire_rate_low: float = 0.20
    d_prime_high: float = 1.0
    criterion_high: float = 0.5


@dataclass(frozen=True)
class Kue1Verdict:
    """The inference the whole rig exists to deliver, per detector."""

    story: Kue1Story
    rationale: str
    estimate: SdtEstimate
    thresholds: Kue1Thresholds
    d_prime_ci: tuple[float, float] | None = None

    def as_dict(self) -> dict:
        return {
            "story": self.story.value,
            "rationale": self.rationale,
            "estimate": self.estimate.as_dict(),
            "d_prime_ci": list(self.d_prime_ci) if self.d_prime_ci else None,
        }


def kue1_verdict(
    estimate: SdtEstimate,
    *,
    thresholds: Kue1Thresholds | None = None,
    d_prime_ci: tuple[float, float] | None = None,
) -> Kue1Verdict:
    """Read a recovered (d', c, fire-rate) into the KUE-1 story.

    The CI, when supplied, only SHARPENS the rationale (does the interval clear
    or fall below the d' threshold); the story itself reads the point estimate so
    a verdict always exists even before the bootstrap runs.
    """
    th = thresholds or Kue1Thresholds()
    fr, dp, c = estimate.fire_rate, estimate.d_prime, estimate.criterion
    rare = fr <= th.fire_rate_low
    discriminates = dp >= th.d_prime_high
    conservative = c >= th.criterion_high

    if not rare:
        story = Kue1Story.NOT_RARE
        reason = (
            f"fire-rate {fr:.3f} above the rare band ({th.fire_rate_low:.2f}); the "
            f"absence-vs-absence question does not arise — read d'={dp:.2f} directly."
        )
    elif not discriminates:
        story = Kue1Story.SENSITIVITY
        reason = (
            f"rare fires (rate {fr:.3f}) AND low d'={dp:.2f} (< {th.d_prime_high:.2f}): "
            f"the detector cannot tell present from absent — the rarity is blindness, "
            f"not caution."
        )
    elif conservative:
        story = Kue1Story.CRITERION
        reason = (
            f"rare fires (rate {fr:.3f}) BUT high d'={dp:.2f} (>= {th.d_prime_high:.2f}) "
            f"with conservative c={c:.2f} (>= {th.criterion_high:.2f}): the detector "
            f"discriminates well and only fires when sure — the rarity is criterion, "
            f"not blindness."
        )
    else:
        story = Kue1Story.AMBIGUOUS
        reason = (
            f"rare fires (rate {fr:.3f}) with high d'={dp:.2f} but non-conservative "
            f"c={c:.2f} (< {th.criterion_high:.2f}): it discriminates yet is not gated "
            f"by caution — the rarity owes to base-rate or coverage, inspect upstream."
        )

    if d_prime_ci is not None:
        lo, hi = d_prime_ci
        if lo > th.d_prime_high:
            reason += f" CI [{lo:.2f},{hi:.2f}] sits wholly above the d' threshold."
        elif hi < th.d_prime_high:
            reason += f" CI [{lo:.2f},{hi:.2f}] sits wholly below the d' threshold."
        else:
            reason += f" CI [{lo:.2f},{hi:.2f}] straddles the d' threshold (under-determined)."

    return Kue1Verdict(
        story=story,
        rationale=reason,
        estimate=estimate,
        thresholds=th,
        d_prime_ci=d_prime_ci,
    )
