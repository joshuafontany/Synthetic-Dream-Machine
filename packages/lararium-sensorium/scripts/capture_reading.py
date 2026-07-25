#!/usr/bin/env python3
"""capture_reading — the py twin of the WHO-plane capture posture (mesh capture-reading.ts).

Reads WHERE a place's power-concentration sits on the 1Hive convex curve toward the
operator's ceiling beta — and never RULES a place captured: which-fork-is-real stays
non-computable, the operator reads, the members decide (the-veil-ladder#the-bounds).
The reading stays VERDICT-FREE on both sides of the causal-island; this twin exists so
mesh-telemetry analyses run where all machine-code runs — py — with the TS as canon.

Parity: packages/lararium-mesh/scripts/capture_reading_fixture.ts generates the fixture;
test_capture_reading.py consumes it as plain data and asserts agreement.

Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
"""
from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class CaptureDials:
    """The operator's capture dials — beta the named ceiling, the rest the curve's shape."""

    #: the "this-is-capture" ceiling — a share in (0,1); the convex wall blows up as r nears it
    beta: float
    rho: float
    supply: float
    #: the decay rate (alpha = alphaFromHalfLife(h)); feeds the curve's 1/(1-alpha) factor
    alpha: float


@dataclass(frozen=True)
class CaptureReading:
    """A verdict-FREE capture posture — numbers for the operator to read, never a ruling."""

    #: r — the leading maintainer's share of total maintenance in [0,1); 1 = one hand holds it all
    concentration: float
    #: beta — the operator's named capture ceiling
    ceiling: float
    #: beta - r — headroom before the ceiling (<= 0 means concentration sits at/over beta)
    headroom: float
    #: the 1Hive convex resistance bar at this concentration (inf as r nears beta)
    curve_bar: float
    #: r >= beta — the place sits AT/over the ceiling. A reading, NOT a verdict of capture.
    at_ceiling: bool


def concentration(maintainer_epochs: "list[float]") -> float:
    """r — the leading maintainer's share of total maintenance-epochs. All maintenance in
    one hand → r near 1 (the visible capture shape); broadly co-maintained → r low.
    An unfed place reads 0."""
    total = 0.0
    leader = 0.0
    for epoch in maintainer_epochs:
        total += epoch
        if epoch > leader:
            leader = epoch
    return leader / total if total > 0 else 0.0


def capture_threshold(
    r: float, beta: float, rho: float, supply: float, alpha: float
) -> float:
    """The 1Hive convex resistance bar — rho*supply / (1-alpha) / (beta-r)^2, blowing up
    to inf at the ceiling. Refuses an alpha outside [0,1): the curve's 1/(1-alpha)
    factor stops meaning anything there."""
    if not (0 <= alpha < 1):
        raise ValueError(f"capture_threshold: alpha must be in [0,1), got {alpha}")
    if r >= beta:
        return math.inf
    return (rho * supply) / (1 - alpha) / ((beta - r) ** 2)


def capture_reading(
    maintainer_epochs: "list[float]", dials: CaptureDials
) -> CaptureReading:
    """The capture posture — the clock's concentration composed with the dial's convex
    curve. VERDICT-FREE: the operator sets beta and reads where the place sits."""
    r = concentration(maintainer_epochs)
    return CaptureReading(
        concentration=r,
        ceiling=dials.beta,
        headroom=dials.beta - r,
        curve_bar=capture_threshold(r, dials.beta, dials.rho, dials.supply, dials.alpha),
        at_ceiling=r >= dials.beta,
    )
