"""qa_anchor.sealed — the sealed-judge harness SCAFFOLD.

The judge runs from an EMPTY temp CWD with the rubric inline and the answer-key
LOCKED OUT (setup-blind-judge.sh -> rate-sealed.sh); scoring is pre-registered
BEFORE any number is read (prereg) and reliability is gated on the LOWER bound of
a bootstrap CI, per facet, never averaged (score_alpha). This package builds the
sealed STRUCTURE; it does not run a live LLM judge.

It rides ATOP the COMPUTE kernel: ordinal Krippendorff alpha + the shared
percentile-bootstrap engine + the reliability bands all come from
qa_anchor.reliability / qa_anchor.bootstrap.
"""

from __future__ import annotations

from .prereg import (
    Preregistration,
    freeze_preregistration,
    verify_preregistration,
)
from .score_alpha import (
    SEAL_FACETS,
    FacetReliability,
    PanelVerdict,
    alpha_general,
    assert_key_absent,
    assert_sealed_cwd,
    build_matrix,
    masi_distance,
    score_facet,
    score_panel,
)

__all__ = [
    "SEAL_FACETS",
    "FacetReliability",
    "PanelVerdict",
    "build_matrix",
    "score_facet",
    "score_panel",
    "alpha_general",
    "masi_distance",
    "assert_sealed_cwd",
    "assert_key_absent",
    "Preregistration",
    "freeze_preregistration",
    "verify_preregistration",
]
