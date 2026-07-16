#!/usr/bin/env python3
"""prereg — the pre-registration stub: freeze the rubric, the predicted decoy floor,
and the alpha-gate BEFORE any score is read.

The ward against "the thinker thinks, then the prover proves": commit the rubric
(by content hash), the predicted null-construct floor, and the reliability gate to
a frozen artifact FIRST, so a later score cannot be reverse-fit to the rubric.
`verify_preregistration` re-hashes the rubric at scoring time and fails closed if a
single byte drifted since the freeze.

Pure stdlib. The freeze is deterministic given an explicit `frozen_at` (the tests
pin it); left None it stamps wall-clock UTC.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

PREREG_VERSION = 1


@dataclass(frozen=True)
class Preregistration:
    """A frozen pre-registration. The rubric is committed by hash, not by copy, so
    the freeze stays small and the verify is a pure re-hash."""

    rubric_sha256: str
    predicted_decoy_alpha_ceiling: float  # the null construct must NOT exceed this
    alpha_gate_floor: float  # a real facet's CI lower bound must clear this
    frozen_at: str
    version: int = PREREG_VERSION
    note: str = ""

    def as_dict(self) -> dict:
        return asdict(self)


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def freeze_preregistration(
    rubric_text: str,
    *,
    predicted_decoy_alpha_ceiling: float,
    alpha_gate_floor: float,
    frozen_at: str | None = None,
    note: str = "",
) -> Preregistration:
    """Freeze the rubric + the two predictions into a Preregistration BEFORE scoring.
    The rubric is committed by SHA-256 so any later edit is detectable."""
    if not 0.0 <= predicted_decoy_alpha_ceiling <= 1.0:
        raise ValueError("predicted_decoy_alpha_ceiling must lie in [0, 1]")
    if not 0.0 <= alpha_gate_floor <= 1.0:
        raise ValueError("alpha_gate_floor must lie in [0, 1]")
    if predicted_decoy_alpha_ceiling >= alpha_gate_floor:
        raise ValueError(
            "the decoy ceiling must sit BELOW the real-facet gate floor "
            "(a decoy that could clear the gate is no ward)"
        )
    stamp = frozen_at or datetime.now(timezone.utc).isoformat()
    return Preregistration(
        rubric_sha256=_sha256(rubric_text),
        predicted_decoy_alpha_ceiling=predicted_decoy_alpha_ceiling,
        alpha_gate_floor=alpha_gate_floor,
        frozen_at=stamp,
        note=note,
    )


def write_preregistration(prereg: Preregistration, path: str | Path) -> Path:
    """Persist the frozen pre-registration as JSON (the artifact the score reads back)."""
    p = Path(path)
    p.write_text(json.dumps(prereg.as_dict(), indent=2, sort_keys=True), encoding="utf-8")
    return p


def load_preregistration(path: str | Path) -> Preregistration:
    obj = json.loads(Path(path).read_text(encoding="utf-8"))
    return Preregistration(**obj)


def verify_preregistration(prereg: Preregistration, rubric_text: str) -> bool:
    """Fail-closed re-hash: True iff the rubric is byte-identical to the frozen one.
    A single edited byte since the freeze returns False — the rubric drifted, the
    pre-registration no longer governs this score."""
    return _sha256(rubric_text) == prereg.rubric_sha256
