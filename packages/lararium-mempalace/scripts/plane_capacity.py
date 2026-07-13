#!/usr/bin/env python3
"""plane_capacity — the CEILING every plane must report before anyone reads it.

THE INSTRUMENT THAT CANNOT LIE. A plane partitions N records into classes. The data-processing
inequality then bounds, EXACTLY, how much that plane can ever say about anything:

    I(target ; plane)  <=  H(plane)

H(plane) reads straight off the partition — a counting exercise. **No estimator. No bias correction.
No threshold. No hand-set anything.** And because it hands back an UPPER BOUND, the instrument can
only ever UNDER-claim: it structurally cannot manufacture a finding, which is the one property every
other instrument in this house has had to earn the hard way.

WHY IT EXISTS. A structure plane resolved 55 records into FOUR distinct trees — 0.697 bits, against
5.807 bits of record identity. Twelve percent. Every downstream reading of that plane — every
salience rank, every cross-plane disagreement, every dial rung — walked over a channel that could
not carry the signal, and nobody noticed, because nothing printed the ceiling. A whole
investigation into a "cliff" in the metric ran its course while the parser sat upstream, having
already discarded the information. **One line would have ended it on the first day:**

    H(red structure) = 0.697 bits — the plane cannot carry the record signal. Ceiling, never estimate.

So: no plane gets read without its ceiling beside it.

WHY MI ESTIMATION FAILS HERE, and why this replaces it. At N ~ 55 with ~55 distinct targets, EVERY
mutual-information estimator (Miller-Madow · NSB · JVHW · KSG) degenerates: N < |classes|, so any
injective feature scores I = H(target) BY CONSTRUCTION. An MI estimate here reports the estimator,
never the corpus. The DPI ceiling sidesteps the whole family — it estimates nothing.

THE READING:
  · ceiling ~ H(target)   — the plane COULD carry the signal (it says nothing about whether it does)
  · ceiling << H(target)  — the plane CANNOT. Stop. The parser upstream threw the signal away, and no
                            metric, no weight, and no dial downstream will bring it back.

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 plane_capacity.py --root <bed> [--root <bed> ...]
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys


def partition_entropy(labels: "list") -> float:
    """H of the partition these labels induce, in BITS. Counting, never estimation.

    Identical labels share a class; the entropy reads the class-size distribution. A plane that sorts
    every record into its own class maxes out at log2(N); a plane that sorts them all into one class
    reads 0 — and 0 bits means the plane distinguishes nothing, whatever its downstream numbers say.
    """
    n = len(labels)
    if n == 0:
        return 0.0
    counts: dict = {}
    for x in labels:
        k = json.dumps(x, sort_keys=True) if isinstance(x, (dict, list)) else str(x)
        counts[k] = counts.get(k, 0) + 1
    h = 0.0
    for c in counts.values():
        p = c / n
        h -= p * math.log2(p)
    return h


def plane_labels(root: str, plane: str) -> "tuple[list, list]":
    """(record ids, the plane's class label per record) — the plane's OWN partition, as it stands.

    Reads the durable plane, never a re-derivation: the ceiling must describe the channel the readers
    actually read, not a channel we could have built.
    """
    from mempalace.palace import get_collection

    d = os.path.join(root, plane)
    if not os.path.isdir(d):
        return [], []
    try:
        col = get_collection(d, create=False)
    except Exception:
        return [], []
    got = col.get(include=["metadatas", "documents"])
    ids = got.get("ids") or []
    metas = got.get("metadatas") or []
    docs = got.get("documents") or []
    labels = []
    for m, doc in zip(metas, docs):
        m = m or {}
        # A plane names its class in its own tongue; fall back to the document itself, which reads the
        # partition the plane actually induces even where it never named one.
        for key in ("struct_hash", "structure_hash", "class", "template", "membership", "form_hash"):
            if key in m:
                labels.append(m[key])
                break
        else:
            labels.append(doc)
    return ids, labels


def read_root(root: str, planes: "tuple" = ("content", "structure", "form", "persistence")) -> dict:
    root = os.path.expanduser(root)
    rows = []
    n_target = 0
    for plane in planes:
        ids, labels = plane_labels(root, plane)
        if not ids:
            continue
        n_target = max(n_target, len(ids))
        h = partition_entropy(labels)
        classes = len({json.dumps(x, sort_keys=True) if isinstance(x, (dict, list)) else str(x)
                       for x in labels})
        rows.append({"plane": plane, "n": len(ids), "classes": classes,
                     "ceiling_bits": round(h, 4)})
    # The target: record identity. A plane must clear THIS to say which record it looks at.
    h_target = math.log2(n_target) if n_target > 1 else 0.0
    for r in rows:
        r["target_bits"] = round(h_target, 4)
        r["share"] = round(r["ceiling_bits"] / h_target, 4) if h_target > 0 else 0.0
        r["verdict"] = ("CAN carry the record signal" if r["share"] >= 0.9 else
                        "PARTIAL — most of the signal never reaches this plane" if r["share"] >= 0.5 else
                        "CANNOT carry it — the parser upstream discarded it")
    return {"root": root, "n_records": n_target, "target_bits": round(h_target, 4), "planes": rows}


def render(rep: dict) -> None:
    print(f"\n══ {os.path.basename(rep['root'])} · {rep['n_records']} records "
          f"· record identity carries {rep['target_bits']} bits")
    print(f"\n  {'plane':<14}{'n':>5}{'classes':>9}{'CEILING':>10}{'share':>8}   verdict")
    for r in rep["planes"]:
        print(f"  {r['plane']:<14}{r['n']:>5}{r['classes']:>9}{r['ceiling_bits']:>10.3f}"
              f"{r['share']:>8.1%}   {r['verdict']}")
    print("\n  I(anything ; plane) <= CEILING. An upper bound — it can only under-claim, never invent.")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="the exact channel ceiling of every plane — I(target; plane) <= H(plane)")
    ap.add_argument("--root", action="append", required=True, help="a bed root (repeatable)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    out = [read_root(r) for r in a.root]
    if a.json:
        print(json.dumps(out, indent=1))
    else:
        for rep in out:
            render(rep)


if __name__ == "__main__":
    main()
