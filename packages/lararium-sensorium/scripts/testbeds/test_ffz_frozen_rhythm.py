"""Tests — the frozen-rhythm probe: the cohesion signal reads cross-line recurrence, a
genuinely periodic text stream LOCKS through the unmodified machinery, an aperiodic
babble-like stream refuses (the anti-fabrication null), and every read runs deterministic
(pure sequence-time, no RNG anywhere on the path)."""
from __future__ import annotations

import random

from ffz_frozen_rhythm import cohesion_signal, stream_lock

# A couplet chant with UNIQUE names per couplet: the mate line shares its couplet's
# names (cohesion high), the next couplet opens fresh (cohesion zero) — the signal
# alternates exactly at period 2, with no longer name-cycle to out-compete it.
_NAMES = ["akua", "moana", "pouli", "lani", "honua", "makani", "ahi", "wai",
          "pua", "manu", "hoku", "ao", "kane", "wahine", "mauka", "makai"]


def _chant(n_couplets: int = 240) -> str:
    lines = []
    for i in range(n_couplets):
        lines.append(f"kupua{i}a kupua{i}b kupua{i}c")
        lines.append(f"kupua{i}a kupua{i}b hanau{i}")  # the mate shares two of four
    return "\n".join(lines)


def _babble(n_lines: int = 480, seed: int = 9) -> str:
    # Same lexicon and line shapes, recurrence destroyed — the placebo's shape in miniature.
    rng = random.Random(seed)
    vocab = _NAMES + ["hanau", "ka", "o", "po", "kane"]
    return "\n".join(" ".join(rng.choice(vocab) for _ in range(6)) for _ in range(n_lines))


# ── the signal ────────────────────────────────────────────────────────────────────────────


def test_cohesion_signal_one_event_per_nonblank_line():
    sig = cohesion_signal(["alpha beta\n\ngamma\n", "alpha beta\n"])
    assert len(sig) == 3
    assert sig[0] == 0.0                        # no predecessor
    assert sig[1] == 0.0                        # disjoint token sets
    assert sig[2] == 0.0                        # gamma vs alpha-beta stays disjoint


def test_cohesion_signal_reads_refrain_overlap():
    sig = cohesion_signal(["hanau ka po\nhanau ka ao\nokina wale\n"])
    assert sig[1] > 0.4                         # the refrain shares hanau-ka
    assert sig[2] == 0.0


def test_cohesion_signal_crosses_record_boundaries():
    joined = cohesion_signal(["line one alpha", "line one alpha"])
    assert joined[1] == 1.0                     # the boundary carries cohesion through


# ── the lock and its null ─────────────────────────────────────────────────────────────────


def test_periodic_chant_locks_at_the_couplet_period():
    out = stream_lock(cohesion_signal([_chant()]))
    assert out["full_signal"]["locked"]
    assert out["full_signal"]["beat"] == 2      # the couplet period
    assert out["stream"]["locked_frac"] > 0.5
    assert out["stream"]["final_state"] == "locked"


def test_aperiodic_babble_refuses_to_lock():
    out = stream_lock(cohesion_signal([_babble()]))
    assert not out["full_signal"]["locked"]
    assert out["full_signal"]["holdover"]
    assert out["stream"]["locked_frac"] < 0.1   # the guard: no fabricated beat


def test_flat_signal_stays_unlocked():
    out = stream_lock([0.0] * 400)
    assert out["stream"]["locked_steps"] == 0
    assert out["full_signal"]["beat"] == 0


def test_probe_runs_deterministic():
    texts = [_chant(60), _babble(120)]
    a = stream_lock(cohesion_signal(texts))
    b = stream_lock(cohesion_signal(texts))
    assert a == b
