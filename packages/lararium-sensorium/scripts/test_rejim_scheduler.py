"""test_rejim_scheduler — the re-regime fires on a SETTLED batch, holds under backpressure, self-paces.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_rejim_scheduler.py -q
"""
from nalu_gate import WindowServo
from rejim_scheduler import RejimScheduler


def test_holds_under_backpressure_fires_once_on_a_settled_batch():
    sched = RejimScheduler(window=10.0, settled_backlog=0)
    sched.mark(0.0)                                  # a capture landed — the ground moved
    sched.mark(1.0)                                  # a burst coalesces to ONE deferred re-regime
    # backpressure (a growing backlog): HOLD even past the window — repour on quieter ground
    assert sched.due(20.0, backlog=5) is None
    assert sched.due(20.0, backlog=1) is None
    # backpressure clears (backlog settled) + the window has crested → the re-regime fires ONCE
    assert sched.due(21.0, backlog=0) == 1
    # fired — intermediates faded; not due again until NEW ground arrives (no repour-per-tick)
    assert sched.due(40.0, backlog=0) is None
    # a fresh capture arms the next batch → the next revision fires when settled
    sched.mark(41.0)
    assert sched.due(60.0, backlog=0) == 2


def test_a_burst_collapses_to_one_reregime():
    # newest-wins: many captures within one window yield ONE repour of the freshest ground, not many.
    sched = RejimScheduler(window=100.0, settled_backlog=0)
    for t in range(50):
        sched.mark(float(t))                         # 50 captures in one window
    assert sched.due(50.0, backlog=0) is None        # window not yet crested (opened at t=0, span 100)
    assert sched.due(101.0, backlog=0) == 1          # ONE flush for the whole burst
    assert sched.due(102.0, backlog=0) is None       # and only one


def test_window_grows_under_load_shrinks_on_headroom():
    servo = WindowServo(target_ms=100.0, min_ms=10.0, max_ms=1000.0, shrink_step_ms=20.0)
    sched = RejimScheduler(window=100.0, servo=servo)
    sched.observe_repour(500.0)                      # the repour ran 5× the set-point → GROW the window
    grown = sched.window
    assert grown > 100.0                             # coalesce more: fewer, fresher repours under load
    sched.observe_repour(10.0)                       # then plenty of headroom → shrink toward responsive
    assert sched.window < grown


def test_no_servo_holds_the_window_fixed():
    sched = RejimScheduler(window=64.0)               # no servo configured
    sched.observe_repour(9999.0)
    assert sched.window == 64.0                       # the window stays put — a fixed cadence, honestly
