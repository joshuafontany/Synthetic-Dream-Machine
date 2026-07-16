#!/usr/bin/env python3
"""plane_capacity — the CEILING every plane must report before anyone reads it.

THE INSTRUMENT THAT CANNOT LIE — once it is asked the right question. A plane partitions the RECORD
base into classes. The data-processing inequality then bounds, EXACTLY, how much that plane can ever
say about a record:

    I(record ; plane)  <=  H(plane's partition OF THE RECORD BASE)

H reads straight off the partition — a counting exercise. **No estimator. No bias correction. No
threshold. No hand-set anything.** It hands back an UPPER BOUND, so it can only ever UNDER-claim.

THE BASE SPACE IS PART OF THE QUESTION. A ceiling is a ceiling OVER SOMETHING. The structure plane's
rows key on a structural HASH, not on a record — one fiber per PATTERN. Ask "how many classes do the
structure ROWS fall into" and the answer is "all of them, one each" — log2(N_patterns) bits, 100% of
log2(N_patterns), a number that measures the ID COLUMN and nothing else. That reading MANUFACTURES ITS
FINDING: it is the instrument scoring its own primary key.

So the pattern plane's ceiling reads THROUGH THE PUSHFORWARD (plane_base): each record is labeled by
the SET of patterns lying over it via `lar_provenance`, and H of THAT partition — over the record base
— is the bound that governs every downstream cross-plane reading. Both numbers print, side by side,
because they answer different questions and only one of them binds the projector:

  · native ceiling  — H over the plane's own rows. Diagnostic. On a pattern plane it approaches
                      log2(N_patterns) by construction and means little.
  · RECORD ceiling  — H over the record base, after the pushforward. **This is the DPI bound.**

WHAT ELSE THIS FIXES. The reader no longer swallows a plane it cannot open. A plane whose collection
fails to load reports `unreadable`, loudly, with the error class named — silence there is how the form
plane vanished from every report while holding 914 rows.

THE READING:
  · record ceiling ~ H(record)   — the plane COULD carry the record signal (never that it does)
  · record ceiling << H(record)  — it CANNOT. Stop. The parser upstream threw the signal away, and no
                                   metric, no weight, and no dial downstream will bring it back.

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 plane_capacity.py --sensorium <place> [--sensorium <place> ...]

Meme: lar:///ha.ka.ba/lararium/sensorium/plane-capacity
"""
from __future__ import annotations

import argparse
import json
import math
import os

from plane_base import BASE_RECORD, PLANE_BASE, read_pattern_registry, records_to_patterns

PLANES = ("content", "structure", "form", "persistence")


def partition_entropy(labels: "list") -> float:
    """H of the partition these labels induce, in BITS. Counting, never estimation.

    Identical labels share a class; the entropy reads the class-size distribution. A plane sorting
    every record into its own class maxes at log2(N); one sorting them all into a single class reads
    0 — and 0 bits means the plane distinguishes nothing, whatever its downstream numbers say."""
    n = len(labels)
    if n == 0:
        return 0.0
    counts: dict = {}
    for x in labels:
        k = json.dumps(sorted(x)) if isinstance(x, (set, frozenset)) else (
            json.dumps(x, sort_keys=True) if isinstance(x, (dict, list)) else str(x))
        counts[k] = counts.get(k, 0) + 1
    h = 0.0
    for c in counts.values():
        p = c / n
        h -= p * math.log2(p)
    return h


def _classes(labels: list) -> int:
    return len({json.dumps(sorted(x)) if isinstance(x, (set, frozenset)) else (
        json.dumps(x, sort_keys=True) if isinstance(x, (dict, list)) else str(x)) for x in labels})


# ── reading a plane AS ITSELF (each by its own store, failures named) ─────────────────────


def _open(root: str, plane: str):
    """The plane's own collection, or a named failure. A plane keys its rows by its own base and
    names its own collection; a generic reader that assumes one of each drops planes on the floor."""
    d = os.path.join(root, plane)
    if not os.path.isdir(d):
        return None, "absent"
    try:
        if plane == "form":
            from form_encoder import FormPalaceStore
            return FormPalaceStore(d)._col, None       # noqa: SLF001 — the ceiling reads the raw plane
        from mempalace.palace import get_collection
        return get_collection(d, create=False, _skip_identity_check=True), None
    except Exception as e:                              # noqa: BLE001 — every failure gets a NAME
        return None, f"unreadable:{type(e).__name__}"


def native_labels(root: str, plane: str) -> "tuple[list, list, str | None]":
    """(row ids, each row's class label, error) — the plane's OWN partition over its OWN base."""
    col, err = _open(root, plane)
    if col is None:
        return [], [], err
    got = col.get(include=["metadatas", "documents"])
    ids = got.get("ids") or []
    metas = got.get("metadatas") or []
    docs = got.get("documents") or []
    labels = []
    for m, doc in zip(metas, docs):
        m = m or {}
        for key in ("lar_structural_hash", "struct_hash", "class", "template", "form_hash"):
            if key in m:
                labels.append(m[key])
                break
        else:
            labels.append(doc)
    return ids, labels, None


def record_labels(root: str, plane: str, cids: list) -> "tuple[dict, dict]":
    """Each RECORD's class label under this plane — the partition the DPI bound actually reads.

    A record-base plane labels directly. A PATTERN-base plane crosses via the pushforward: a record's
    label reads as the SET of patterns lying over it (the honest fiber — a record exhibiting two
    shapes belongs to neither alone). Returns (cid -> label, the map's own coverage report)."""
    base = PLANE_BASE.get(plane)
    if base == BASE_RECORD:
        col, err = _open(root, plane)
        if col is None:
            return {}, {"error": err}
        got = col.get(include=["metadatas", "documents"])
        ids = got.get("ids") or []
        metas = got.get("metadatas") or []
        docs = got.get("documents") or []
        known = set(cids)
        out = {}
        for i, m, doc in zip(ids, metas, docs):
            if i not in known:
                continue
            m = m or {}
            out[i] = m.get("struct_hash") or m.get("lar_structural_hash") or doc
        return out, {"native": True}

    registry = read_pattern_registry(root)
    per_record = records_to_patterns(registry, cids)
    cov = registry.coverage(cids)
    cov["tombstoned_patterns"] = registry.tombstoned
    return ({c: v for c, v in per_record.items() if v}, cov)


def read_root(root: str, planes: tuple = PLANES) -> dict:
    """Every plane's ceiling over the record base, with its native ceiling beside it for contrast."""
    root = os.path.expanduser(root)

    # The record base rides the CONTENT plane — the drawers ARE the records. Never max-over-planes:
    # taking the target from whichever plane happens to hold the most rows lets a pattern plane set
    # its own denominator and score 100% against itself.
    content_ids, _, content_err = native_labels(root, "content")
    cids = sorted(content_ids)
    n_records = len(cids)
    h_record = math.log2(n_records) if n_records > 1 else 0.0

    rows = []
    for plane in planes:
        ids, labels, err = native_labels(root, plane)
        if err == "absent":
            continue
        if err:
            rows.append({"plane": plane, "base": PLANE_BASE.get(plane, "?"), "error": err})
            continue
        row = {"plane": plane, "base": PLANE_BASE.get(plane, "?"), "n": len(ids),
               "native_classes": _classes(labels),
               "native_ceiling_bits": round(partition_entropy(labels), 4)}
        if n_records > 1:
            by_record, cov = record_labels(root, plane, cids)
            covered = list(by_record.values())
            # Records the plane never reaches fall into ONE joint class (it says nothing about them),
            # so they enter the partition as a single "unseen" bucket rather than vanishing.
            unseen = n_records - len(covered)
            labels_r = covered + ["<unreached>"] * unseen
            h = partition_entropy(labels_r)
            row.update({
                "record_classes": _classes(labels_r),
                "record_ceiling_bits": round(h, 4),
                "records_covered": len(covered),
                "share": round(h / h_record, 4) if h_record > 0 else 0.0,
                "coverage": cov,
            })
            row["verdict"] = ("CAN carry the record signal" if row["share"] >= 0.9 else
                              "PARTIAL — most of the signal never reaches this plane"
                              if row["share"] >= 0.5 else
                              "CANNOT carry it — the parser upstream discarded it")
        else:
            row["verdict"] = "NO RECORD BASE — the content plane holds no records; no DPI bound stands"
        rows.append(row)

    return {"root": root, "n_records": n_records, "record_bits": round(h_record, 4),
            "content_error": content_err, "planes": rows}


def ceiling_index(root: str) -> dict:
    """plane -> its RECORD-base ceiling row. The projector prints this beside every plane it reads —
    no plane gets reported without its ceiling."""
    rep = read_root(root)
    return {r["plane"]: r for r in rep["planes"]}


def render(rep: dict) -> None:
    print(f"\n══ {os.path.basename(rep['root'])} · {rep['n_records']} records "
          f"· record identity carries {rep['record_bits']} bits")
    if rep["n_records"] == 0:
        print("  the CONTENT plane holds no records — no record base, so no DPI bound stands. "
              "Every share below would score against its own primary key.")
    print(f"\n  {'plane':<13}{'base':<9}{'rows':>6}{'NATIVE':>8}{'RECORD':>8}{'share':>8}   verdict")
    for r in rep["planes"]:
        if r.get("error"):
            print(f"  {r['plane']:<13}{r['base']:<9}{'—':>6}{'—':>8}{'—':>8}{'—':>8}   {r['error']}")
            continue
        nat = f"{r['native_ceiling_bits']:.3f}"
        rec = f"{r['record_ceiling_bits']:.3f}" if "record_ceiling_bits" in r else "—"
        shr = f"{r['share']:.1%}" if "share" in r else "—"
        print(f"  {r['plane']:<13}{r['base']:<9}{r['n']:>6}{nat:>8}{rec:>8}{shr:>8}   {r['verdict']}")
        cov = r.get("coverage") or {}
        if cov.get("lossy"):
            print(f"    ↳ pushforward LOSSY: {cov['unreached']} records no pattern reaches · "
                  f"{cov['truncated_patterns']} patterns past the provenance cap")
    print("\n  I(record ; plane) <= RECORD ceiling. NATIVE scores the plane's own id column — "
          "diagnostic only.")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="the exact channel ceiling of every plane — I(record; plane) <= H(plane|record base)")
    ap.add_argument("--sensorium", action="append", required=True, help="a sensorium root (repeatable)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    out = [read_root(os.path.expanduser(r)) for r in a.sensorium]
    if a.json:
        print(json.dumps(out, indent=1))
    else:
        for rep in out:
            render(rep)


if __name__ == "__main__":
    main()
