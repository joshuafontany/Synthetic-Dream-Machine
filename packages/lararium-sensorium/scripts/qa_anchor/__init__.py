"""qa_anchor — the COMPUTE kernel of the gold-anchor rig (KUE-1).

The design-stable statistical core of the native multi-palace qa_rig: it turns a
detector's fires, scored against human ground-truth labels, into a Signal-
Detection (d', criterion) estimate, a bootstrap CI, the KUE-1 verdict, and the
rater-reliability that backs the labels. Pure stdlib + numpy — no palace, no
detector, no sampler, no human in the loop.

See README.md for what is BUILT here and what still AWAITS upstream.
"""

from __future__ import annotations

from .bootstrap import (
    BootstrapResult,
    bootstrap_ci,
    bootstrap_dprime,
)
from .dprime import (
    ConfusionMatrix,
    Kue1Story,
    Kue1Thresholds,
    Kue1Verdict,
    SdtEstimate,
    compute_sdt,
    confusion_from_labels,
    kue1_verdict,
    loglinear_rates,
    z,
)
from .register import (
    aggregate as register_aggregate,
)
from .register import (
    scan_artifacts,
    scan_text,
)
from .reliability import (
    ALPHA_SATISFACTORY,
    ALPHA_TENTATIVE_FLOOR,
    AlphaBand,
    IccResult,
    KappaResult,
    Level,
    bootstrap_alpha,
    classify_alpha,
    cohens_kappa,
    intraclass_correlation,
    krippendorff_alpha,
)
from .wards import (
    NULL_CONSTRUCT,
    AblationPair,
    Construct,
    DecoyItem,
    ablate,
    ablation_pair,
    decoy_set,
    is_null_construct,
    ritual_tokens,
)

__all__ = [
    "ConfusionMatrix",
    "SdtEstimate",
    "compute_sdt",
    "confusion_from_labels",
    "loglinear_rates",
    "z",
    "Kue1Story",
    "Kue1Thresholds",
    "Kue1Verdict",
    "kue1_verdict",
    "BootstrapResult",
    "bootstrap_ci",
    "bootstrap_dprime",
    "bootstrap_alpha",
    "Level",
    "krippendorff_alpha",
    "classify_alpha",
    "AlphaBand",
    "ALPHA_SATISFACTORY",
    "ALPHA_TENTATIVE_FLOOR",
    "cohens_kappa",
    "KappaResult",
    "intraclass_correlation",
    "IccResult",
    # register — the deterministic swell-read (no LLM)
    "scan_text",
    "scan_artifacts",
    "register_aggregate",
    # wards — the circularity wards
    "Construct",
    "NULL_CONSTRUCT",
    "is_null_construct",
    "DecoyItem",
    "decoy_set",
    "AblationPair",
    "ablate",
    "ablation_pair",
    "ritual_tokens",
]
