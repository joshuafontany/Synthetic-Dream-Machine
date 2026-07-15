#!/usr/bin/env python3
"""chain_invariant — the coarsening chain, measured on every bed before any result counts.

The canon holds the planes as a CHAIN of coarsenings over the record base:

    Content ↠ Structure ↠ Form        H(form) <= H(structure) <= H(content)

A chain is a checkable claim, and this organ checks it two ways, strongest first:

  · REFINEMENT — the exact test. Form coarsens Structure iff every structure
    class lands inside ONE form class; a structure class straddling two form
    classes breaks the coarsening map, and the report names it with the records
    that witnessed the straddle.
  · THE ENTROPY SHADOW — the numeric consequence. A coarsening never gains
    information, so the H inequality must hold. It follows from refinement;
    it prints beside it because a reader comparing beds wants the numbers.

A violation names a BROKEN COARSENING MAP — an instrument defect, never a
finding about the corpus (EMERGENCE-PREREG.md, precondition P4). The organ
REPORTS in full and exits nonzero on a break, so a bed runner wires the gate
with one line and hides nothing.

Reads ride plane_capacity's own readers (the record base rides the CONTENT
plane; a pattern plane crosses via the plane_base pushforward), so this organ
measures the same partitions every ceiling report reads. DETERMINISM: every
grouping sorts; labels canonicalize; no RNG, no clock.

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 chain_invariant.py --sensorium <place> [--sensorium <place> ...]

Meme: lar:///ha.ka.ba/lararium/sensorium/chain-invariant
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

from plane_capacity import native_labels, partition_entropy, record_labels

#: fine → coarse, the canon's order over the record base.
CHAIN = ("content", "structure", "form")

#: Records a plane never reaches fall into ONE joint class — the plane says
#: nothing about them, and silence groups (plane_capacity's own convention).
UNREACHED = "<unreached>"

_H_TOLERANCE = 1e-9


def canon(label) -> str:
    """One string per class, whatever shape the label rides in (a hash, a doc,
    a frozenset of patterns) — grouping and entropy read the class, never the type."""
    if isinstance(label, (frozenset, set, tuple, list)):
        return "|".join(sorted(str(x) for x in label))
    return str(label)


def refinement_violations(
    fine: "dict[str, object]",
    coarse: "dict[str, object]",
    examples_per_class: int = 4,
) -> "list[dict]":
    """Every fine class whose members straddle more than one coarse class —
    the exact witnesses of a broken coarsening map. Reads only the records
    BOTH planes label; a coverage gap is the coverage report's finding."""
    by_class: "dict[str, dict[str, list[str]]]" = {}
    for cid in sorted(set(fine) & set(coarse)):
        f, c = canon(fine[cid]), canon(coarse[cid])
        by_class.setdefault(f, {}).setdefault(c, []).append(cid)

    out = []
    for f, targets in sorted(by_class.items()):
        if len(targets) > 1:
            out.append(
                {
                    "fine_class": f,
                    "straddles": len(targets),
                    "witnesses": {
                        c: cids[:examples_per_class]
                        for c, cids in sorted(targets.items())
                    },
                }
            )
    return out


def _entropy_over(cids: "list[str]", labels: "dict[str, object]") -> float:
    """H of the plane's partition over the FULL record base — unreached
    records enter as one shared bucket rather than vanishing."""
    row = [canon(labels[c]) if c in labels else UNREACHED for c in cids]
    return partition_entropy(row)


def chain_report(
    cids: "list[str]", labels_by_plane: "dict[str, dict[str, object]]"
) -> dict:
    """The full P4 reading over one bed: entropies down the chain, the
    inequality verdict, and every refinement break on every adjacent leg."""
    h = {p: _entropy_over(cids, labels_by_plane.get(p, {})) for p in CHAIN}
    inequality_holds = all(
        h[CHAIN[i + 1]] <= h[CHAIN[i]] + _H_TOLERANCE for i in range(len(CHAIN) - 1)
    )
    legs = []
    for i in range(len(CHAIN) - 1):
        fine_p, coarse_p = CHAIN[i], CHAIN[i + 1]
        v = refinement_violations(
            labels_by_plane.get(fine_p, {}), labels_by_plane.get(coarse_p, {})
        )
        legs.append(
            {
                "fine": fine_p,
                "coarse": coarse_p,
                "violations": len(v),
                "examples": v[:8],
            }
        )
    coverage = {
        p: {
            "labeled": sum(1 for c in cids if c in labels_by_plane.get(p, {})),
            "unreached": sum(1 for c in cids if c not in labels_by_plane.get(p, {})),
        }
        for p in CHAIN
    }
    # A plane that labels NOTHING collapses to one silent class, H = 0, and the
    # inequality "holds" over a chain nobody measured. A vacuous pass reads as
    # health — the exact blindness this organ exists to catch — so vacuity gets
    # its own verdict and chain_holds refuses it.
    vacuous = [p for p in CHAIN if coverage[p]["labeled"] == 0]
    measured = not vacuous
    return {
        "records": len(cids),
        "record_bits": round(math.log2(len(cids)), 4) if len(cids) > 1 else 0.0,
        "H": {p: round(h[p], 4) for p in CHAIN},
        "inequality_holds": inequality_holds,
        "legs": legs,
        "coverage": coverage,
        "vacuous": vacuous,
        "chain_holds": measured
        and inequality_holds
        and all(leg["violations"] == 0 for leg in legs),
    }


def read_bed(root: str) -> dict:
    """One bed's chain reading off its real stores. The record base rides the
    content plane — never max-over-planes (a plane must not set its own denominator)."""
    root = os.path.expanduser(root)
    content_ids, _, content_err = native_labels(root, "content")
    if content_err:
        raise SystemExit(
            f"chain_invariant: the content plane under {root!r} refused to read "
            f"({content_err}) — no record base stands, so no chain can be measured."
        )
    cids = sorted(content_ids)
    labels_by_plane = {}
    for plane in CHAIN:
        by_record, _cov = record_labels(root, plane, cids)
        labels_by_plane[plane] = by_record
    rep = chain_report(cids, labels_by_plane)
    rep["root"] = root
    return rep


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sensorium", action="append", default=[], help="a sensorium root (repeatable)")
    args = ap.parse_args(argv)
    if not args.sensorium:
        raise SystemExit(
            "chain_invariant: no sensorium named — pass `--sensorium <dir>`. An unnamed check "
            "would measure whichever store sits at a default; name the bed, or stop."
        )
    broken = 0
    for root in sorted(dict.fromkeys(args.sensorium)):
        rep = read_bed(root)
        sys.stdout.write(json.dumps(rep, sort_keys=True) + "\n")
        if not rep["chain_holds"]:
            broken += 1
    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(main())
