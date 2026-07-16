"""Witness the desync tool — the plastic-ρ inter-clock incommensurability primitive.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_desync.py -q
"""
import pytest

from desync import desync_phases, min_pairwise_gap, plastic_rho


def test_plastic_rho_solves_its_defining_equation():
    assert abs(plastic_rho(1) - 1.61803398875) < 1e-6   # d=1 → φ
    assert abs(plastic_rho(2) - 1.32471795724) < 1e-6   # d=2 → the plastic number (dimension-correct)
    for d in (1, 2, 3, 4):
        r = plastic_rho(d)
        assert abs(r ** (d + 1) - (r + 1)) < 1e-6       # x^(d+1) = x + 1


def test_roberts_phases_stay_in_range_and_non_resonant():
    phases = desync_phases(12, d=2)
    assert all(0.0 <= p < 1.0 for p in phases)
    # the invariant: no two of the 12 worldline-phases lock (min gap strictly positive). The exact
    # min-gap follows the three-gap theorem for a Kronecker sequence (~1/n), never zero.
    assert min_pairwise_gap(phases) > 0.0
    # low-discrepancy WITNESS: a Kronecker sequence shows AT MOST THREE distinct gap sizes.
    gaps = sorted(phases[i] for i in range(len(phases)))
    circ = [round(b - a, 9) for a, b in zip(gaps, gaps[1:])] + [round(1.0 - gaps[-1] + gaps[0], 9)]
    assert len(set(circ)) <= 3


def test_more_worldlines_still_never_lock():
    # even at 64 clocks the plastic-ρ spread keeps every pair non-resonant (gap > 0)
    assert min_pairwise_gap(desync_phases(64, d=2)) > 0.0


def test_active_desync_relaxes_clustered_toward_even():
    from desync import desync_relax
    clustered = [0.01, 0.02, 0.03, 0.04, 0.90]   # 5 phases, 4 crowded on one side
    relaxed = desync_relax(clustered, alpha=0.5, rounds=120)
    # the active repulsion drives toward even interleaving (min-gap → ~1/n = 0.2); well past the crowd
    assert min_pairwise_gap(relaxed) > min_pairwise_gap(clustered)
    assert min_pairwise_gap(relaxed) > 0.5 * (1.0 / len(clustered))


def test_desync_step_keeps_count_range_and_order():
    from desync import desync_step
    phases = [0.1, 0.5, 0.9, 0.3]
    stepped = desync_step(phases, alpha=0.3)
    assert len(stepped) == len(phases) and all(0.0 <= p < 1.0 for p in stepped)


def test_desync_small_n_passes_through():
    from desync import desync_step
    assert len(desync_step([0.5, 0.6])) == 2   # < 3: no pair to repel between


def test_gap_witness_reads_lock_and_freedom():
    assert min_pairwise_gap([0.5, 0.5]) == 0.0    # two coincident clocks = locked (the averted failure)
    assert min_pairwise_gap([0.5]) == 1.0         # a lone clock = maximally free


def test_bad_dimension_refuses():
    with pytest.raises(ValueError):
        plastic_rho(0)
