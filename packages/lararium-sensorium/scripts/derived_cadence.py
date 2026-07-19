#!/usr/bin/env python3
"""derived_cadence — the BACKPRESSURE-TRIGGERED cadence for a content-DERIVED enrichment. A derived
enrichment (the rejim rhythm DETECTION → geology.json · the worldline membership-slot ASSIGNMENT → content
metadata) re-derives from the whole content ground, so it must not run per-capture nor on a fixed timer.
Instead the nalu-gate's COALESCE family + the drain-ledger's backlog drive it: each capture-land MARKS the
gate (the ground moved); the re-derivation fires ONCE per SETTLED batch — when the backlog drains
(backpressure clears) AND the coalesce window crests. Newest-wins, intermediates fade: a burst of captures
collapses to one re-derivation of the freshest settled ground, never one per intermediate.

The work DIFFERS across enrichments (rejim DISCOVERS the nameless from the whole stream; worldline ASSIGNS
prenamed slots per node from the DAG) — but the DRIVE is one and the same, so one cadence serves them all.
The physics lives here (Python); the holder DRIVES it — marks on each capture, ticks an ordinal clock, reads
the drain-ledger backlog, and on a due revision fires the enrichment's derive. Clock-pure: the cadence reads
no wall-time; `now` rides whatever ordinal the caller drives (a tick counter, the recovered beat). Two
regulators compose: the BACKLOG gates (hold while capture is unsettled), and the adapt-window servo PACES it
(grow the window when the derive runs slow → fewer, fresher re-derivations; shrink on headroom → responsive).

Meme: lar:///ha.ka.ba/lararium/sensorium/derived-cadence
"""
from __future__ import annotations

from dataclasses import replace

from nalu_gate import CoalesceGate, WindowServo, adapt_window

#: The coalesce window seeds in ORDINAL idle beats (the holder ticks the cadence ~once/sec on the serve loop's
#: idle select). 64 beats ≈ a minute of quiet ground before a settled batch fires one re-derivation — long
#: enough to coalesce a capture burst, short enough to keep a derived plane fresh. The servo then PACES this
#: from real cost, so the seed only opens the loop; it never freezes the window.
DEFAULT_COALESCE_WINDOW = 64.0


def seeded_servo(window: float) -> WindowServo:
    """Hand back a cost-seeding window servo for a derived cadence. The window bounds DERIVE from the seeded
    window — a quarter to quadruple it, in beats — so no absolute floor/ceiling gets guessed; and the target
    stays 0 to mark SEED-ME, so the cadence adopts the FIRST measured repour cost as the set-point and paces
    the window around what a repour actually costs on this deployment. AIMD does the rest."""
    return WindowServo(target_ms=0.0, min_ms=max(1.0, window / 4.0), max_ms=window * 4.0)


class DerivedCadence:
    """Decide WHEN a heavy content-derived re-derivation is due, riding the pressure machinery we already
    have. `mark(now)` on each capture-land; `due(now, backlog)` returns a coalesce revision to derive at
    (else None), holding under backpressure; `observe_repour(cost)` folds the derive's true cost into the
    window servo. Enrichment-agnostic — the same cadence drives rejim detection or worldline assignment."""

    def __init__(self, *, window: float = DEFAULT_COALESCE_WINDOW, servo: "WindowServo | None" = None,
                 settled_backlog: int = 0) -> None:
        self._gate = CoalesceGate(window)
        self._servo = servo
        # the backlog at/under which capture reads SETTLED (backpressure cleared) — a re-derivation may fire.
        self._settled = int(settled_backlog)

    @property
    def window(self) -> float:
        return self._gate._window   # noqa: SLF001 — the cadence owns the gate; the window is its own knob

    def mark(self, now: float) -> None:
        """A capture landed — the ground moved. Arm the coalesce window (a burst arms ONE deferred flush)."""
        self._gate.mark(now)

    def due(self, now: float, backlog: int) -> "int | None":
        """Is a re-derivation DUE? Fire ONCE per SETTLED batch. Under backpressure (backlog > settled) HOLD —
        keep the window armed and let capture settle, so the derive runs on fresher, quieter ground (the
        heavy recompute never piles behind a live capture storm). When the backlog clears AND the coalesce
        window has closed over a dirty gate, return the flush revision; else None."""
        if backlog > self._settled:
            return None                       # backpressure: hold the re-derivation (do not crest yet)
        return self._gate.tick(now)           # settled → fire when the window closes over marked ground

    def observe_repour(self, cost: float) -> None:
        """Fold the derive's true cost into the coalesce window — grow it when the derive runs slow (fewer,
        fresher re-derivations on quieter ground) and shrink on headroom (stay responsive). AIMD, the
        coalesce homeostat; holds the window fixed only when no servo rides along. A seed-mode servo
        (target_ms ≤ 0) ADOPTS the first real cost as its set-point, so the window paces around measured
        cost, never a guessed budget."""
        if self._servo is None:
            return
        if self._servo.target_ms <= 0.0 and cost > 0.0:
            self._servo = replace(self._servo, target_ms=cost)   # seed the set-point from the first repour
        self._gate._window = adapt_window(self._gate._window, cost, self._servo)  # noqa: SLF001
