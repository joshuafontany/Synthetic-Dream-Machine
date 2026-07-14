#!/usr/bin/env python3
"""prereg_sweep — the C-criteria read over standing beds, every number beside its null.

EMERGENCE-PREREG.md names what counts as signal; this runner computes it and
NOTHING else — no meaning retrofits onto whatever appears:

  C1 · the grammar beats ignorance, and MEANING carries it. Per bed: the two-part
       code's savings (dl0 - dl) on the real streams, beside the SAME induction over
       a seeded per-stream token shuffle (alphabet and lengths preserved, sequence
       destroyed) run in the SAME invocation — no naked numbers. The vow reads
       real >> shuffled, or the "structure" belongs to the alphabet.
  C4 · the coarsening stops somewhere content-bearing. The chain's H profile
       (chain_invariant's own reading) plus the silence check: a form plane at
       H = 0 over a multi-record bed reads as the degenerate attractor and FAILS.

Streams derive the way rederive derives them — the bed's own ground walked through
the stored lar_kind parse — so the sweep reads exactly what the planes read.
DETERMINISM: the shuffle seeds from the sheet's fixed seed (4241) + the stream
index; a double run emits identical bytes. The runner REPORTS; the sheet judges.

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 prereg_sweep.py --root <bed> [--root <bed> ...]

Meme: lar:///ha.ka.ba/lararium/sensorium/prereg-sweep
"""
from __future__ import annotations

import argparse
import json
import random
import sys

_SHEET_SEED = 4241  # the pre-registration's one fixed seed — shared by every null twin


def bed_streams(root: str) -> "list[list]":
    """The bed's preorder type streams, derived exactly as the planes derive them:
    ground walk (rederive's own reader) → stored-kind parse → preorder types."""
    from form_induction import _preorder_types
    from rederive import _ground_records
    from structure_router import parse_to_tree

    streams: "list[list]" = []
    for rec in _ground_records(root):
        kind = rec["metadata"].get("lar_kind") or None
        tree = parse_to_tree(kind, rec["text"])
        if tree is None:
            continue
        seq: list = []
        _preorder_types(tree, seq)
        streams.append(seq)
    return streams


def shuffle_twin(streams: "list[list]") -> "list[list]":
    """The null twin: each stream's tokens shuffle under the sheet seed + stream
    index — alphabet and lengths survive, sequence dies. What the twin still
    'saves' belongs to the alphabet, never the text."""
    out = []
    for i, s in enumerate(streams):
        twin = list(s)
        random.Random(_SHEET_SEED + i).shuffle(twin)
        out.append(twin)
    return out


def c1_reading(streams: "list[list]", *, min_support: int, max_candidates: int) -> dict:
    """One induction over the real streams and one over the twin, same invocation."""
    from form_induction import mdl_select, mine_sequences, delta_p_bigrams

    def induce(rows: "list[list]") -> dict:
        cands = mine_sequences(rows, min_support, max_forms=64) + delta_p_bigrams(
            rows, min_support=min_support
        )
        sel = mdl_select(rows, cands, min_support=min_support, max_forms=64)
        return {
            "dl0": round(sel["dl0"], 2),
            "dl": round(sel["dl"], 2),
            "saved_bits": round(sel["dl0"] - sel["dl"], 2),
            "kept": len(sel["kept"]),
        }

    real = induce(streams)
    twin = induce(shuffle_twin(streams))
    real_saved, twin_saved = real["saved_bits"], twin["saved_bits"]
    return {
        "real": real,
        "shuffled_twin": twin,
        # the vow's own reading — a ratio, never a threshold: the sheet judges it
        "meaning_ratio": round(real_saved / twin_saved, 3) if twin_saved > 0 else None,
        "sequence_only_bits": round(real_saved - twin_saved, 2),
    }


def c4_reading(root: str) -> dict:
    """The chain profile off the standing instrument, plus the silence check."""
    from chain_invariant import read_bed

    rep = read_bed(root)
    degenerate = rep["records"] > 1 and rep["H"]["form"] == 0.0 and not rep["vacuous"]
    return {
        "H": rep["H"],
        "chain_holds": rep["chain_holds"],
        "vacuous": rep["vacuous"],
        "silence_attractor": degenerate,
    }


def sweep_bed(root: str, *, min_support: int = 2, max_candidates: int = 96) -> dict:
    streams = bed_streams(root)
    if not streams:
        raise SystemExit(
            f"prereg_sweep: {root!r} yielded no parseable streams — a sweep over "
            "nothing would read as a finding; pour or rederive the bed first."
        )
    return {
        "root": root,
        "streams": len(streams),
        "tokens": sum(len(s) for s in streams),
        "C1": c1_reading(streams, min_support=min_support, max_candidates=max_candidates),
        "C4": c4_reading(root),
    }


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--root", action="append", default=[], help="a bed root (repeatable)")
    ap.add_argument("--min-support", type=int, default=2, dest="min_support")
    args = ap.parse_args(argv)
    if not args.root:
        raise SystemExit(
            "prereg_sweep: no bed named — pass `--root <dir>`; the sheet reads "
            "specific beds, never whichever store sits at a default."
        )
    for root in sorted(dict.fromkeys(args.root)):
        rep = sweep_bed(root, min_support=args.min_support)
        sys.stdout.write(json.dumps(rep, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
