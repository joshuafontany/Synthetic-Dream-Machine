#!/usr/bin/env python3
"""score_alpha — the sealed reliability scorer, built ATOP the COMPUTE kernel.

Reads a raw TSV of  `item_id <TAB> judge <TAB> json-profile`  (the rate-sealed.sh
output), and for EACH Syad facet SEPARATELY computes Krippendorff's alpha with a
bootstrap confidence interval, then GATES on the LOWER bound — never the point
estimate, never an across-facet average. A facet whose CI lower bound fails the
floor is uncertified, however high its point alpha reads.

Disciplines (the wards against a flattered reliability number):
  - PER-FACET, never averaged. One weak facet cannot hide behind four strong ones.
  - ORDINAL metric for the 0-20 graded facets (the kernel's ordinal alpha); MASI
    for set-valued label tasks (alpha_general + masi_distance).
  - GATE ON THE LOWER BOUND of a bootstrap CI (the kernel's shared percentile
    engine), not the point estimate — a wide CI with a high point still fails.
  - The score runs from a SEALED (empty) CWD with the answer-key ABSENT
    (assert_sealed_cwd / assert_key_absent) — the judge could read no peer score.

Ordinal alpha + the bootstrap CI + the reliability bands come from the kernel
(qa_anchor.reliability / qa_anchor.bootstrap). MASI is the set-valued extension
the kernel does not carry; it reuses the kernel's bootstrap_ci for its own CI.

usage:  PYTHONPATH=<scripts> python -m qa_anchor.sealed.score_alpha <raw.tsv> [floor]
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from qa_anchor.bootstrap import bootstrap_ci
from qa_anchor.reliability import (
    ALPHA_TENTATIVE_FLOOR,
    classify_alpha,
    krippendorff_alpha,
)

# The five Syad facets, in canonical order (Philosopher · Poet · Satirist · Humorist · Private).
SEAL_FACETS = ("philosopher", "poet", "satirist", "humorist", "private")


# ---------------------------------------------------------------------------
# the seal — a sealed CWD with the answer-key locked out
# ---------------------------------------------------------------------------

# Filenames that would leak an answer-key or a peer score into the judge's CWD.
_KEY_NAMES = (
    "answer-key", "answer_key", "answerkey", "key", "gold", "gold.tsv",
    "labels", "labels.json", "truth", "ground-truth", "ground_truth",
    "scores", "peer", "rubric-key",
)


def assert_sealed_cwd(cwd: str | os.PathLike) -> None:
    """The seal: the judge's working directory MUST be empty. A blind judge invoked
    here can `view` nothing — no rubric file, no answer-key, no peer score. Raises if
    any entry exists."""
    p = Path(cwd)
    if not p.is_dir():
        raise AssertionError(f"sealed CWD is not a directory: {p}")
    entries = list(p.iterdir())
    if entries:
        raise AssertionError(
            f"seal broken: CWD {p} is not empty ({[e.name for e in entries]})"
        )


def assert_key_absent(cwd: str | os.PathLike, *, key_names=_KEY_NAMES) -> None:
    """Belt to the seal's suspenders: assert no answer-key-shaped file sits in the
    CWD (case-insensitive, with or without a trailing extension)."""
    p = Path(cwd)
    if not p.is_dir():
        raise AssertionError(f"CWD is not a directory: {p}")
    lowered = {e.name.lower() for e in p.iterdir()}
    stems = {e.stem.lower() for e in p.iterdir()}
    banned = {k.lower() for k in key_names}
    hit = (lowered | stems) & banned
    if hit:
        raise AssertionError(f"answer-key leaked into sealed CWD: {sorted(hit)}")


# ---------------------------------------------------------------------------
# MASI distance + a generic alpha over any distance (set-valued labels)
# ---------------------------------------------------------------------------


def masi_distance(a, b) -> float:
    """MASI distance in [0, 1] for two set-valued labels (Passonneau 2006).

    distance = 1 - Jaccard * Monotonicity, where Monotonicity is 1 (equal),
    2/3 (one a proper subset of the other), 1/3 (overlap, neither a subset), or
    0 (disjoint). The set-valued analogue of an ordinal distance for the metric the
    kernel's numeric alpha cannot express."""
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 0.0
    inter = sa & sb
    union = sa | sb
    jaccard = len(inter) / len(union) if union else 1.0
    if sa == sb:
        mono = 1.0
    elif sa <= sb or sb <= sa:  # one a (proper) subset of the other
        mono = 2.0 / 3.0
    elif inter:
        mono = 1.0 / 3.0
    else:
        mono = 0.0
    return 1.0 - jaccard * mono


def alpha_general(units, distance) -> float:
    """Krippendorff's alpha for ANY difference function (the pairwise-distance form,
    Krippendorff 2011) — used for MASI / set-valued labels the numeric kernel alpha
    cannot reach. `units` is a list of units, each a list of >=1 rater values.

    alpha = 1 - D_o / D_e, observed vs expected mean pairwise distance. Returns NaN
    when nothing is pairable or no disagreement is expected. (Cross-checks against the
    kernel's nominal alpha on numeric data — see the test suite.)"""
    pool = [v for u in units for v in u]
    n = len(pool)
    if n < 2:
        return float("nan")
    if len(set(pool)) <= 1:
        return 1.0  # one value across all ratings: perfect agreement, no variance (kernel convention)

    num_o = 0.0
    denom_o = 0
    for u in units:
        m = len(u)
        if m < 2:
            continue
        s = 0.0
        for i in range(m):
            for j in range(m):
                if i != j:
                    s += distance(u[i], u[j])
        num_o += s / (m - 1)
        denom_o += m
    if denom_o == 0:
        return float("nan")
    d_o = num_o / denom_o

    s_e = 0.0
    for i in range(n):
        for j in range(n):
            if i != j:
                s_e += distance(pool[i], pool[j])
    d_e = s_e / (n * (n - 1))
    if d_e == 0:
        return float("nan")
    return 1.0 - d_o / d_e


# ---------------------------------------------------------------------------
# per-facet reliability, gated on the bootstrap LOWER bound
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FacetReliability:
    facet: str
    alpha: float  # point estimate on the full matrix
    lower: float  # bootstrap CI lower bound — the GATE reads this
    upper: float
    ci_level: float
    floor: float
    gate_pass: bool  # lower >= floor
    band: str  # kernel band of the POINT estimate (satisfactory/tentative/unreliable)
    n_items: int
    n_judges: int

    def as_dict(self) -> dict:
        return {
            "facet": self.facet,
            "alpha": self.alpha,
            "lower": self.lower,
            "upper": self.upper,
            "ci_level": self.ci_level,
            "floor": self.floor,
            "gate_pass": self.gate_pass,
            "band": self.band,
            "n_items": self.n_items,
            "n_judges": self.n_judges,
        }


@dataclass(frozen=True)
class PanelVerdict:
    """The whole panel's reading: per-facet, plus the conjunction (ALL facets must
    clear their gate — the weakest facet rules, never an average)."""

    facets: dict
    all_pass: bool
    weakest_facet: str
    weakest_lower: float

    def as_dict(self) -> dict:
        return {
            "all_pass": self.all_pass,
            "weakest_facet": self.weakest_facet,
            "weakest_lower": self.weakest_lower,
            "facets": {f: r.as_dict() for f, r in self.facets.items()},
        }


def build_matrix(rows, facet: str, judges=None, items=None) -> np.ndarray:
    """Assemble a (judges x items) reliability matrix for one facet, np.nan == missing.

    `rows` is an iterable of (item_id, judge, profile_dict); profile_dict maps each
    facet name to a numeric rating."""
    rows = [r for r in rows if facet in r[2]]
    judges = sorted({r[1] for r in rows}) if judges is None else list(judges)
    items = sorted({r[0] for r in rows}) if items is None else list(items)
    ji = {j: i for i, j in enumerate(judges)}
    ii = {it: i for i, it in enumerate(items)}
    m = np.full((len(judges), len(items)), np.nan)
    for item_id, judge, prof in rows:
        if judge in ji and item_id in ii:
            m[ji[judge], ii[item_id]] = float(prof[facet])
    return m


def score_facet(matrix: np.ndarray, *, facet: str = "?", level: str = "ordinal",
                floor: float = ALPHA_TENTATIVE_FLOOR, n_resamples: int = 2000,
                ci_level: float = 0.95, seed: int | None = 0) -> FacetReliability:
    """Ordinal Krippendorff alpha for one facet's (judges x items) matrix, with a
    bootstrap CI over ITEMS, GATED on the lower bound. Uses the kernel's alpha + the
    kernel's shared bootstrap engine (resampling columns == items)."""
    n_judges, n_items = matrix.shape

    def _stat(block_T: np.ndarray) -> float:
        # bootstrap_ci resamples ROWS; we feed the transpose (items x judges) so the
        # resampled unit is the ITEM, then transpose back for the units-x... convention.
        return krippendorff_alpha(block_T, level=level)

    point = krippendorff_alpha(matrix.T, level=level)  # units(items) x raters(judges)
    boot = bootstrap_ci(matrix.T, _stat, n_resamples=n_resamples, ci_level=ci_level, seed=seed)
    lower = boot.lower
    gate_pass = bool(np.isfinite(lower) and lower >= floor)
    return FacetReliability(
        facet=facet,
        alpha=float(point),
        lower=float(lower),
        upper=float(boot.upper),
        ci_level=ci_level,
        floor=floor,
        gate_pass=gate_pass,
        band=classify_alpha(point).label,
        n_items=n_items,
        n_judges=n_judges,
    )


def score_panel(rows, *, facets=SEAL_FACETS, level: str = "ordinal",
                floor: float = ALPHA_TENTATIVE_FLOOR, n_resamples: int = 2000,
                seed: int | None = 0) -> PanelVerdict:
    """Score every facet SEPARATELY and read the panel by the WEAKEST facet's lower
    bound (the conjunction gate). Never averages across facets."""
    out = {}
    for f in facets:
        m = build_matrix(rows, f)
        if m.shape[1] == 0:  # facet absent from the data
            continue
        out[f] = score_facet(m, facet=f, level=level, floor=floor,
                             n_resamples=n_resamples, seed=seed)
    if not out:
        return PanelVerdict(facets={}, all_pass=False, weakest_facet="-", weakest_lower=float("nan"))
    weakest = min(out.values(), key=lambda r: (r.lower if np.isfinite(r.lower) else -np.inf))
    all_pass = all(r.gate_pass for r in out.values())
    return PanelVerdict(
        facets=out,
        all_pass=all_pass,
        weakest_facet=weakest.facet,
        weakest_lower=weakest.lower,
    )


# ---------------------------------------------------------------------------
# TSV reader + CLI
# ---------------------------------------------------------------------------


def read_raw_tsv(path: str | os.PathLike, *, facets=SEAL_FACETS):
    """Parse `item_id <TAB> judge <TAB> json-profile` lines into (item, judge, profile)
    rows. Lines whose JSON lacks every facet are skipped (the rate-sealed convention)."""
    data = Path(path).read_bytes().decode("utf-8", "replace").replace("\r", "")
    rows = []
    for ln in data.split("\n"):
        parts = ln.split("\t")
        if len(parts) < 3:
            continue
        match = re.search(r"\{[^{}]*\}", parts[-1])
        if not match:
            continue
        try:
            obj = json.loads(match.group(0))
        except json.JSONDecodeError:
            continue
        prof = {f: float(obj[f]) for f in facets if f in obj}
        if prof:
            rows.append((parts[0], parts[1], prof))
    return rows


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv:
        print("usage: score_alpha.py <raw.tsv> [floor]", file=sys.stderr)
        return 2
    raw = argv[0]
    floor = float(argv[1]) if len(argv) > 1 else ALPHA_TENTATIVE_FLOOR
    rows = read_raw_tsv(raw)
    verdict = score_panel(rows, floor=floor)
    print(json.dumps(verdict.as_dict(), indent=2))
    print(
        f"\nPANEL: all_pass={verdict.all_pass}  weakest={verdict.weakest_facet} "
        f"(lower={verdict.weakest_lower:+.3f}, floor={floor})",
        file=sys.stderr,
    )
    return 0 if verdict.all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
