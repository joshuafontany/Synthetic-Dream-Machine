#!/usr/bin/env python3
"""ffz_frozen_rhythm — the frozen-rhythm probe: does FFZ rhythm live FROZEN in sequential text?

THE QUESTION. The FFZ clock recovers a beat from an event-indexed signal (ffz_clock.recover_clock,
PLL-style), and the static-corpus-null discipline forbids fabricating a beat from read-order. This
probe asks the complementary question: when the event axis rides the TEXT'S OWN SEQUENCE — line
after line of chant, in the order the carrier sings it — does a recoverable beat stand IN the text?
A chant carries refrain couplets and genealogical list-frames; babble with the same lexicon and the
same line shapes carries none. Streaming each corpus through the UNMODIFIED clock-recovery machinery
turns the placebo pair into the probe's null: nonsense streams SHOULD refuse to lock.

THE SIGNAL (named): per non-blank line, ADJACENT-LINE LEXICAL COHESION — the Jaccard similarity of
the line's word-token set with the previous non-blank line's. Refrains and paired verses pulse this
signal periodically; per-section Markov babble (which preserves lexicon, line count, and per-line
token counts, but destroys cross-line recurrence) flattens it to noise. The signal reads CONTENT
across lines — exactly what the placebo null removes — never mere line shape (which the placebo
holds fixed by construction).

CLOCK PURITY + THE SEAM, surfaced: the event ordinal = the line's position in chant order; no
wall-clock touches any path. The gate API expects drift/cohesion telemetry from a live pipeline;
this probe feeds it a text-derived cohesion series instead — an ADAPTATION AT THE SIGNAL, never at
the guards: recover_clock and SchmittLock run at their default thresholds, unweakened. A lock here
claims a SEQUENTIAL period in the text's own order (a frozen rhythm), never a temporal beat — the
static-corpus-null guard stays intact, and the probe REPORTS holdover as honestly as lock.

STREAM SHAPE: one stream per sensorium (bed) — the domain corpus end-to-end in its natural order,
work by work (logical sources sorted), chant order (the sectioner's chunk ordinals) within each.
Each logical source ALSO reads as its own segment, so a seam artifact at a work/rendering boundary
stays visible rather than silently blended.

Usage (the mempalace venv):
  ~/.venv/bin/python3 ffz_frozen_rhythm.py probe --root <bed> [--root <bed> ...]
      [--window 128] [--stride 8]
  ~/.venv/bin/python3 ffz_frozen_rhythm.py walk --root <bed>     # the wa-order deltaF re-walk

Meme: lar:///ha.ka.ba/@lararium/sensorium/ffz-frozen-rhythm
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

from ffz_clock import recover_clock
from nalu_gate import SchmittLock

_TOKEN_RE = re.compile(r"[a-z0-9']+")


# ── the stream: bed records in chant order ────────────────────────────────────────────────


def chant_order_records(root: str) -> list:
    """The bed's content records in the corpus's natural order: logical sources sorted
    (work by work), the sectioner's chunk ordinals (wa order) within each — never the
    cid-hex filing order. Reads the durable store only."""
    import content_io as cio

    store = cio.ContentStore(os.path.join(root, "content"))
    records = []
    offset = 0
    while True:
        page = store.scan(offset, 256)
        records.extend(page.get("records") or [])
        if page.get("next") is None:
            break
        offset = page["next"]
    records.sort(key=lambda r: ((r.get("metadata") or {}).get("source_file", ""),
                                int((r.get("metadata") or {}).get("chunk_index", 0))))
    return records


def cohesion_signal(texts: list) -> list:
    """The named event signal: one event per non-blank line across the concatenated texts,
    valued as the Jaccard similarity of its word-token set with the previous non-blank
    line's (the first line reads 0 — no predecessor). Pure sequence-time."""
    signal: list = []
    prev: "set | None" = None
    for text in texts:
        for line in text.split("\n"):
            if not line.strip():
                continue
            toks = set(_TOKEN_RE.findall(line.lower()))
            if not toks:
                continue
            if prev is None:
                signal.append(0.0)
            else:
                union = toks | prev
                signal.append(len(toks & prev) / len(union) if union else 0.0)
            prev = toks
    return signal


# ── the streaming lock read ───────────────────────────────────────────────────────────────


def stream_lock(signal: list, *, window: int = 128, stride: int = 8) -> dict:
    """Stream the signal through the UNMODIFIED lock machinery: at each stride, a
    recover_clock snapshot over the trailing window feeds SchmittLock.step (default
    thresholds — the anti-fabrication guards stand as shipped). Returns the streaming
    verdict + the full-signal stateless read."""
    lock = SchmittLock()
    steps = 0
    locked_steps = 0
    beats_locked: dict = {}
    reading = None
    for k in range(min(window, len(signal)), len(signal) + 1, stride):
        snap = recover_clock(signal[max(0, k - window):k])
        reading = lock.step(snap.lock_quality, snap.beat)
        steps += 1
        if reading.asserted:
            locked_steps += 1
            beats_locked[reading.beat] = beats_locked.get(reading.beat, 0) + 1
    full = recover_clock(signal)
    return {
        "events": len(signal),
        "stream": {
            "steps": steps,
            "locked_steps": locked_steps,
            "locked_frac": round(locked_steps / steps, 4) if steps else 0.0,
            "final_state": reading.state.value if reading else "unlocked",
            "final_beat": reading.beat if reading else 0,
            "beats_locked": beats_locked,
        },
        "full_signal": {
            "beat": full.beat,
            "lock_quality": round(full.lock_quality, 4),
            "locked": full.locked,
            "holdover": full.holdover,
            "bands": [{"name": b.name, "period": b.period, "resolved": b.resolved}
                      for b in full.bands],
        },
    }


def probe_root(root: str, *, window: int = 128, stride: int = 8) -> dict:
    """One sensorium's probe: the whole-corpus stream reading + a per-logical-source
    segment reading (each rendering in its own chant order), so a seam artifact at a
    work boundary stays visible."""
    records = chant_order_records(root)
    by_source: dict = {}
    order: list = []
    for r in records:
        src = (r.get("metadata") or {}).get("source_file", "")
        if src not in by_source:
            by_source[src] = []
            order.append(src)
        by_source[src].append(r.get("document") or "")
    whole = stream_lock(cohesion_signal([t for s in order for t in by_source[s]]),
                        window=window, stride=stride)
    segments = []
    for src in order:
        seg = stream_lock(cohesion_signal(by_source[src]), window=window, stride=stride)
        segments.append({"source": src, **seg})
    return {"root": root, "records": len(records), "source_order": order,
            "whole_stream": whole, "segments": segments}


# ── the wa-order deltaF re-walk (the held honest-next from the ablation) ──────────────────


def walk_delta_f(root: str, *, rungs: int = 28, arl_hi: float = 200.0, arl_lo: float = 1.6,
                 seed: int = 0x51611) -> dict:
    """Re-run the projector's deltaF walk over ONE bed under TWO record orders — the
    filing order the sweeps used (source_file, cid-hex) vs the chant order (source_file,
    chunk ordinal) — same assignment, same rung ladder, same seed. The question the
    ablation held open: does deltaF turn positive when the series walks the chant's own
    sequence?"""
    from run_projector import (
        _delta_f,
        _plane_reads,
        _read_planes,
        build_assignment,
        geom_arl0_range,
    )

    planes = _read_planes(root)
    assignment = build_assignment(planes)
    chunk_of = {r["cid"]: int((r.get("metadata") or {}).get("chunk_index", 0))
                for r in planes["records"]}
    src_of = {r["cid"]: (r.get("metadata") or {}).get("source_file", "")
              for r in planes["records"]}
    filing = [r["cid"] for r in planes["records"]]                # already (source, cid) sorted
    chant = sorted(filing, key=lambda c: (src_of[c], chunk_of[c]))

    rows = []
    for arl0 in geom_arl0_range(arl_hi, arl_lo, rungs):
        arl0 = max(1.0, arl0)
        alpha = 1.0 / arl0
        d_filing = _delta_f(_plane_reads(assignment, filing), alpha, seed)
        d_chant = _delta_f(_plane_reads(assignment, chant), alpha, seed)
        rows.append({"arl0": round(arl0, 2), "alpha": round(alpha, 4),
                     "deltaF_filing": round(d_filing, 3), "deltaF_chant": round(d_chant, 3),
                     "chant_minus_filing": round(d_chant - d_filing, 3)})
    return {
        "root": root,
        "rows": rows,
        "chant_positive_rungs": sum(1 for r in rows if r["deltaF_chant"] > 0),
        "chant_above_filing_rungs": sum(1 for r in rows if r["chant_minus_filing"] > 0),
    }


# ── the CLI face ──────────────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser(
        description="ffz_frozen_rhythm — stream chant-ordered corpuses through the FFZ lock")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("probe", help="the per-corpus lock readings (whole stream + segments)")
    p.add_argument("--root", action="append", required=True,
                   help="a populated test-bed root (repeatable — the readings land side by side)")
    p.add_argument("--window", type=int, default=128)
    p.add_argument("--stride", type=int, default=8)
    w = sub.add_parser("walk", help="the wa-order deltaF re-walk (chant order vs filing order)")
    w.add_argument("--root", required=True)
    w.add_argument("--rungs", type=int, default=28)
    w.add_argument("--seed", type=int, default=0x51611)
    args = ap.parse_args()
    if args.cmd == "probe":
        out = [probe_root(os.path.expanduser(r), window=args.window, stride=args.stride)
               for r in args.root]
    else:
        out = walk_delta_f(os.path.expanduser(args.root), rungs=args.rungs, seed=args.seed)
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
