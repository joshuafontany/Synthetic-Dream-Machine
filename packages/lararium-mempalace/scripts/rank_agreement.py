#!/usr/bin/env python3
"""rank_agreement — the tie-aware rank instruments for arms of UNEQUAL granularity.

THE LAW THIS MODULE ENFORCES. Two arms of a cross-plane read carry different numbers of
distinct values — a 3-class structure arm against a 51-class one, a bucket order against a
near-total order. A midrank Pearson correlation (Spearman) computed across that mismatch
reads a DOUBLE TIE — a pair tied in BOTH arms, carrying zero ordering information — as
agreement, and cannot attain +-1 at all. Under massive tie blocks it therefore drifts
toward agreement and manufactures structure (a "cliff" at the rung where the tie mass
concentrates). Every statistic here reports its TIE PROFILE beside its scalar; a reader
who sees `double_tied = 1227 / 1540` knows what the scalar cost.

THE FOUR INSTRUMENTS:
  · **Kendall tau-c** (Stuart's tau-c) — (C-D) scaled by min(rows, cols), so an arm with
    few distinct values cannot cap the coefficient below its own reachable range. The
    right scalar when granularities differ.
  · **Somers' D_{Y|X}** — asymmetric: it discards pairs tied on the PREDICTOR X and asks
    how well the coarse arm orders the fine one. Report it beside tau-c, both directions.
  · **Fagin's partial-ranking distance** K^(p) — Fagin, Kumar, Mahdian, Sivakumar & Vee,
    "Comparing partial rankings", SIAM J. Discrete Math 20(3):628-648 (2006). The
    definitive treatment of a BUCKET ORDER against a total order: Kendall distance with a
    tie penalty p charged on pairs a bucket order leaves unordered; p = 1/2 yields a true
    metric. Reported normalized onto [0,1].
  · **Spearman** — kept, and SAFE ONLY where both arms carry comparable granularity (see
    `spearman`); it rides here so a caller reading the bundle sees it beside the tie
    profile that qualifies it, never alone.

THE CROSSING SPECTRUM. Where a centrality mixes two channel metrics convexly,

    cent_a(lam) = mean_b [ 1 - (lam * d_red(a,b) + (1-lam) * d_black(a,b)) ]
                = (1 - mean_black(a)) + lam * (mean_black(a) - mean_red(a))

each record traces an exact STRAIGHT LINE in lam. Ranks therefore change ONLY where two
lines cross, and the crossings enumerate ANALYTICALLY (a closed form, no sampling). The
resulting lam* spectrum is CORPUS-DERIVED — nobody hand-set it — and it partitions [0,1]
into open intervals on which the rank order stands CONSTANT. A dial reading at hand-picked
rungs observes nothing the spectrum does not already contain, and misses every crossing
between its rungs. **The spectrum IS the observable; the dial setting is not.**

Meme: lar:///ha.ka.ba/lararium/sensorium/rank-agreement
"""
from __future__ import annotations

import math

#: Fagin's tie penalty. p = 1/2 makes K^(p) a true metric on bucket orders (Fagin et al.
#: 2006, Thm 3); any p in [1/2, 1] keeps it a near-metric. The default takes the metric.
FAGIN_P = 0.5


# ── the pair census (the number every rank statistic owes its reader) ─────────────────────


def pair_census(x: list, y: list) -> dict:
    """Classify every unordered pair of the two arms: concordant, discordant, tied on X
    alone, tied on Y alone, tied on BOTH. The double-tie count carries the warning — a
    pair tied in both arms holds zero ordering information, yet a midrank correlation
    scores it as agreement."""
    n = len(x)
    c = d = tx = ty = both = 0
    for i in range(n):
        for j in range(i + 1, n):
            dx = x[i] - x[j]
            dy = y[i] - y[j]
            if dx == 0.0 and dy == 0.0:
                both += 1
            elif dx == 0.0:
                tx += 1
            elif dy == 0.0:
                ty += 1
            elif dx * dy > 0.0:
                c += 1
            else:
                d += 1
    return {
        "n": n,
        "pairs": n * (n - 1) // 2,
        "concordant": c,
        "discordant": d,
        "tied_x_only": tx,
        "tied_y_only": ty,
        "double_tied": both,
        "distinct_x": len(set(x)),
        "distinct_y": len(set(y)),
    }


# ── the three tie-aware scalars ───────────────────────────────────────────────────────────


def kendall_tau_c(x: list, y: list, census: "dict | None" = None) -> "float | None":
    """Stuart's tau-c: 2m(C-D) / (n^2 (m-1)) with m = min(distinct_x, distinct_y). The
    min-granularity correction lets a coarse arm reach the full [-1, 1] range against a
    fine one — the failure tau-b and Spearman both carry."""
    ce = census or pair_census(x, y)
    n = ce["n"]
    m = min(ce["distinct_x"], ce["distinct_y"])
    if n < 2 or m < 2:
        return None
    return (2.0 * m * (ce["concordant"] - ce["discordant"])) / (n * n * (m - 1))


def somers_d(x: list, y: list, census: "dict | None" = None) -> "float | None":
    """Somers' D_{Y|X} — (C-D) over the pairs NOT tied on the predictor X. It asks how
    well X orders Y and charges nothing for X's own coarseness, so a 3-class predictor
    against a 51-class response reads its true directional strength."""
    ce = census or pair_census(x, y)
    denom = ce["concordant"] + ce["discordant"] + ce["tied_y_only"]
    if denom == 0:
        return None
    return (ce["concordant"] - ce["discordant"]) / denom


def fagin_distance(x: list, y: list, p: float = FAGIN_P,
                   census: "dict | None" = None) -> "float | None":
    """Fagin's K^(p) between the two arms READ AS BUCKET ORDERS, normalized onto [0,1] by
    the pair count. A pair ordered oppositely charges 1; a pair one arm buckets together
    while the other orders charges p; a pair BOTH arms bucket together charges 0 — the
    double tie costs nothing, which is exactly the honesty Spearman lacks. p = 1/2 makes
    the normalized number a metric."""
    ce = census or pair_census(x, y)
    if ce["pairs"] == 0:
        return None
    penalty = ce["discordant"] + p * (ce["tied_x_only"] + ce["tied_y_only"])
    return penalty / ce["pairs"]


# ── spearman (kept, scoped, and never reported alone) ─────────────────────────────────────


def _midranks(values: list) -> list:
    """Average-tie ranks (1-based, averaged across each tie run) — the Spearman grain."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(x: list, y: list) -> "float | None":
    """Pearson of the midranks. SAFE ONLY where both arms carry COMPARABLE GRANULARITY —
    the same plane read on two beds, or two rungs of one plane's own dial, where the
    distinct-value counts sit within a factor of ~2 and the double-tie mass stays small.
    Across granularities it inflates toward agreement (a double tie reads as concordance)
    and cannot reach +-1; the bundle below therefore never emits it without the census
    that qualifies it. None where a side carries zero rank variance."""
    n = len(x)
    if n < 3:
        return None
    rx = _midranks(x)
    ry = _midranks(y)
    mx = sum(rx) / n
    my = sum(ry) / n
    vx = sum((a - mx) ** 2 for a in rx)
    vy = sum((b - my) ** 2 for b in ry)
    if vx == 0.0 or vy == 0.0:
        return None
    cov = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    return cov / math.sqrt(vx * vy)


# ── the bundle (the ONLY sanctioned way to read two arms against each other) ──────────────


def agreement(a: dict, b: dict, *, p: float = FAGIN_P, digits: int = 4) -> dict:
    """The full tie-aware read of two salience dicts over their SHARED keys: tau-c, both
    Somers' D directions, Fagin's K^(p), Spearman, and the census that qualifies all of
    them. `spearman_safe` fires false where the granularities diverge past 2x or the
    double-tie mass passes a fifth of the pairs — at which point the scalar beside it
    reads as an artifact of the ties, not a finding."""
    keys = sorted(set(a) & set(b))
    if len(keys) < 3:
        return {"shared": len(keys), "census": None, "note": "fewer than three shared keys"}
    x = [a[k] for k in keys]
    y = [b[k] for k in keys]
    ce = pair_census(x, y)

    def _r(v):
        return None if v is None else round(v, digits)

    dx, dy = ce["distinct_x"], ce["distinct_y"]
    ratio = max(dx, dy) / max(1, min(dx, dy))
    tie_mass = ce["double_tied"] / ce["pairs"] if ce["pairs"] else 1.0
    return {
        "shared": len(keys),
        "tau_c": _r(kendall_tau_c(x, y, ce)),
        "somers_d_y_given_x": _r(somers_d(x, y, ce)),
        "somers_d_x_given_y": _r(somers_d(y, x, pair_census(y, x))),
        "fagin_kp": _r(fagin_distance(x, y, p, ce)),
        "fagin_p": p,
        "spearman": _r(spearman(x, y)),
        "spearman_safe": ratio <= 2.0 and tie_mass < 0.2,
        "granularity_ratio": round(ratio, 3),
        "double_tie_mass": round(tie_mass, 4),
        "census": ce,
    }


# ── the crossing spectrum (the corpus-derived observable) ─────────────────────────────────


def affine_centrality(keys: list, d_red, d_black) -> dict:
    """Per key the EXACT affine coefficients (A, B) of its mixed hub-centrality:

        cent_a(lam) = A_a + lam * B_a,
        A_a = 1 - mean_b d_black(a,b),  B_a = mean_b d_black(a,b) - mean_b d_red(a,b).

    A closed form, never a fit — the convex metric mixture rides inside a mean, so the
    mean carries it out linearly."""
    out: dict = {}
    n = len(keys)
    for i, a in enumerate(keys):
        if n < 2:
            out[a] = (0.0, 0.0)
            continue
        mr = sum(d_red(a, b) for j, b in enumerate(keys) if j != i) / (n - 1)
        mb = sum(d_black(a, b) for j, b in enumerate(keys) if j != i) / (n - 1)
        out[a] = (1.0 - mb, mb - mr)
    return out


def crossing_spectrum(coeffs: dict, *, lo: float = 0.0, hi: float = 1.0,
                      eps: float = 1e-12) -> list:
    """Every lam* in (lo, hi) where two centrality lines CROSS — solve A_a + lam B_a =
    A_b + lam B_b for each pair, keep the interior roots. Parallel lines (equal slopes)
    never cross and drop out. The returned list sorts ascending, each entry naming its
    lam* and the pair that produced it: the rank order stands CONSTANT between consecutive
    lam*, so this spectrum exhausts the dial's observable content."""
    keys = sorted(coeffs)
    out = []
    for i, a in enumerate(keys):
        aa, ba = coeffs[a]
        for b in keys[i + 1:]:
            ab, bb = coeffs[b]
            db = ba - bb
            if abs(db) < eps:
                continue
            lam = (ab - aa) / db
            if lo + eps < lam < hi - eps:
                out.append({"lambda": lam, "a": a, "b": b})
    out.sort(key=lambda r: r["lambda"])
    return out


def spectrum_rungs(spectrum: list, *, lo: float = 0.0, hi: float = 1.0,
                   merge_eps: float = 1e-9) -> list:
    """The dial ladder the CORPUS dictates: the endpoints, plus one representative inside
    every open interval the crossings carve out of [lo, hi]. The rank order stands
    constant on each interval, so this ladder reads EVERY distinct ordering the dial can
    produce and no ordering twice — nobody hand-picked a rung. Coincident crossings (the
    degenerate confluences) merge, so a mass of lines meeting at one lam* contributes ONE
    boundary, never a nest of empty intervals."""
    cuts: list = []
    for r in spectrum:
        lam = r["lambda"]
        if not cuts or lam - cuts[-1] > merge_eps:
            cuts.append(lam)
    bounds = [lo] + cuts + [hi]
    rungs = [lo]
    for left, right in zip(bounds, bounds[1:]):
        if right - left > merge_eps:
            rungs.append((left + right) / 2.0)
    rungs.append(hi)
    return rungs
