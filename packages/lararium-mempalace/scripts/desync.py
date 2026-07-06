"""desync — the INTER-clock incommensurability tool: phase-offsets that keep N worldline-clocks
mutually NON-RESONANT, so no two rhythms lock into a manufactured global-now.

Leads with the PLASTIC number ρ (the Roberts low-discrepancy constant, DIMENSION-CORRECT for d=2 —
NOT copied φ, which is the d=1 case). Corpus-grounded (ffz-mesh-timing: the operator dissolved
"φ vs e"; a shared timing constant would BE a shared clock). The pair CHECKS the invariant (mutual
non-resonance); each node HOLDS the tool (its own low-discrepancy phase, chosen coordination-free from
its index). A HELD FORK stands beside this — φ+e-jitter (per-node 1-D) · coprime-integer (13/17) ·
Kuramoto frequency-dispersion — the others compose the same interface; plastic-ρ leads.

Meme: lar:///ha.ka.ba/@lararium/sensorium/desync (the incommensurability tool).
"""
from __future__ import annotations


def plastic_rho(d: int = 2) -> float:
    """Return the generalized-golden ratio ρ_d — the unique real root of `x^(d+1) = x + 1`.
    d=1 yields φ ≈ 1.6180 (the 1-D case); d=2 yields the PLASTIC number ≈ 1.3247 (the dimension-correct
    constant for a 2-D node×time desync). Fixed-point iteration `x ← (1 + x)^(1/(d+1))` converges for
    d ≥ 1 (it contracts toward the root)."""
    if d < 1:
        raise ValueError(f"plastic_rho: d must be >= 1 (got {d})")
    x = 1.0
    for _ in range(200):
        x = (1.0 + x) ** (1.0 / (d + 1))
    return x


def roberts_phase(index: int, d: int = 2) -> float:
    """Return the index-th low-discrepancy phase-offset on [0, 1) — the Roberts additive recurrence
    `frac(index / ρ_d)`. Successive indices land as far apart as the irrational ρ allows, so N worldlines
    keyed by index hold mutually non-resonant phases without any shared coordination."""
    inv = 1.0 / plastic_rho(d)
    return (index * inv) % 1.0


def desync_phases(n: int, d: int = 2) -> list:
    """Mint n mutually-incommensurable phase-offsets (one per worldline/node) from the plastic-ρ tool."""
    return [roberts_phase(i, d) for i in range(n)]


def desync_step(phases: list, alpha: float = 0.5) -> list:
    """One round of ACTIVE DESYNC local phase-repulsion (Degesys-Nagpal): each node moves its phase a
    fraction `alpha` toward the MIDPOINT of its two CIRCULAR phase-neighbors — coordination-free,
    neighbors-only, no shared constant. This is the active cap (rides the coupling-read: the neighbors
    ARE what a node 'hears'). Preserves the caller's index order; fewer than 3 phases have no pair to
    repel between and pass through."""
    n = len(phases)
    if n < 3:
        return [p % 1.0 for p in phases]
    order = sorted(range(n), key=lambda i: phases[i] % 1.0)
    s = [phases[i] % 1.0 for i in order]
    moved = list(s)
    for k in range(n):
        before = s[k - 1] - (1.0 if k == 0 else 0.0)          # unwrap the circular predecessor
        after = s[(k + 1) % n] + (1.0 if k == n - 1 else 0.0)  # unwrap the circular successor
        mid = (before + after) / 2.0
        moved[k] = ((1.0 - alpha) * s[k] + alpha * mid) % 1.0
    out = list(phases)
    for k, i in enumerate(order):
        out[i] = moved[k]
    return out


def desync_relax(phases: list, alpha: float = 0.5, rounds: int = 60) -> list:
    """Iterate DESYNC to convergence — the active cap driving toward EVEN interleaving (the max spread
    the pairwise-non-resonance invariant rewards, min-gap → 1/n), auto-adjusting to node count. Composes
    behind the same invariant as the statistical plastic-ρ jitter; the operator picks per stream —
    statistical (zero-coupling) or active (real collision-avoidance on the coupling-read)."""
    p = list(phases)
    for _ in range(rounds):
        p = desync_step(p, alpha)
    return p


def min_pairwise_gap(phases: list) -> float:
    """Return the smallest CIRCULAR gap between any two phases on [0, 1) — the incommensurability
    WITNESS. A larger min-gap means the phases spread better (rhythms stay apart); 0.0 means two clocks
    coincide (locked — the failure this tool averts). A lone phase reads maximally free (1.0)."""
    wrapped = sorted(p % 1.0 for p in phases)
    if len(wrapped) < 2:
        return 1.0
    gaps = [wrapped[i + 1] - wrapped[i] for i in range(len(wrapped) - 1)]
    gaps.append(1.0 - wrapped[-1] + wrapped[0])   # the wrap-around gap closes the circle
    return min(gaps)
