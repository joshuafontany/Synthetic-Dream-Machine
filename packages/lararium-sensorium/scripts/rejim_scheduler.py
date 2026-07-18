#!/usr/bin/env python3
"""rejim_scheduler — the BACKPRESSURE-TRIGGERED re-regime cadence. The rejim repour is heavy (a whole-stream
pour over tens of thousands of ticks), so it must not run per-capture nor on a fixed timer. Instead the
nalu-gate's COALESCE family + the drain-ledger's backlog drive it: each capture-land MARKS the gate (the
ground moved); the re-regime fires ONCE per SETTLED batch — when the backlog drains (backpressure clears)
AND the coalesce window crests. Newest-wins, intermediates fade: a burst of captures collapses to one
repour of the freshest settled ground, never a repour per intermediate.

The physics lives here (Python); the daemon DRIVES it — marks on each capture, ticks an ordinal clock,
reads the drain-ledger backlog, and on a due revision fires the `repour_rejim` serve op. Clock-pure: the
scheduler reads no wall-time; `now` rides whatever ordinal the caller drives (a tick counter, the recovered
beat). Two regulators compose: the BACKLOG gates (hold the re-regime while capture is unsettled), and the
adapt-window servo PACES it (grow the window when the repour runs slow → fewer, fresher repours; shrink on
headroom → stay responsive).

Meme: lar:///ha.ka.ba/lararium/sensorium/rejim-scheduler
"""
from __future__ import annotations

from nalu_gate import CoalesceGate, WindowServo, adapt_window


class RejimScheduler:
    """Decide WHEN a heavy rejim repour is due, riding the pressure machinery we already have. `mark(now)`
    on each capture-land; `due(now, backlog)` returns a coalesce revision to repour at (else None), holding
    under backpressure; `observe_repour(cost)` folds the repour's true cost into the window servo."""

    def __init__(self, *, window: float = 64.0, servo: "WindowServo | None" = None,
                 settled_backlog: int = 0) -> None:
        self._gate = CoalesceGate(window)
        self._servo = servo
        # the backlog at/under which capture reads SETTLED (backpressure cleared) — a re-regime may fire.
        self._settled = int(settled_backlog)

    @property
    def window(self) -> float:
        return self._gate._window   # noqa: SLF001 — the scheduler owns the gate; the window is its own knob

    def mark(self, now: float) -> None:
        """A capture landed — the ground moved. Arm the coalesce window (a burst arms ONE deferred flush)."""
        self._gate.mark(now)

    def due(self, now: float, backlog: int) -> "int | None":
        """Is a re-regime DUE? Fire ONCE per SETTLED batch. Under backpressure (backlog > settled) HOLD —
        keep the window armed and let capture settle, so the repour runs on fresher, quieter ground (the
        heavy recompute never piles behind a live capture storm). When the backlog clears AND the coalesce
        window has closed over a dirty gate, return the flush revision; else None."""
        if backlog > self._settled:
            return None                       # backpressure: hold the re-regime (do not crest yet)
        return self._gate.tick(now)           # settled → fire when the window closes over marked ground

    def observe_repour(self, cost: float) -> None:
        """Fold the repour's true cost into the coalesce window — grow it when the repour runs slow (fewer,
        fresher repours on quieter ground) and shrink on headroom (stay responsive). AIMD, the coalesce
        homeostat; a no-op when no servo is configured (the window then stays fixed)."""
        if self._servo is not None:
            self._gate._window = adapt_window(self._gate._window, cost, self._servo)  # noqa: SLF001
