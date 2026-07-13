#!/usr/bin/env python3
r"""pidgin_bed — the REAL pidgin bed: our own transcripts, with the register answer key the source hands us.

WHY THIS BED EXISTS. The Kumulipo hands us hierarchy nobody built for our convenience, and it paid: Foote
novelty over an exact-match WORD dotplot places the wā on the pure-Hawaiian bed (lift positive at every
rung, p = 0.0005, meaning-death kills it) and COLLAPSES on the Beckwith bed, where the same chant runs
braided through English commentary. That collapse names the diagnosis:

    A WORD-IDENTITY DOTPLOT PRESUPPOSES ONE LEXICON. Mix grammars and the diagonal dilutes — not because
    structure left, but because the instrument sees recurrence only WITHIN ONE GRAMMAR. The imposed prior
    hides IN THE TOKEN TYPE.

The Kumulipo stands as a CURATED SLICE. `tw5_bed` builds a SYNTHETIC pidgin (TW5's own tree, concatenated).
This bed builds the LIVE one — the multistream a human and an AI actually inhabit — and its answer key costs
nothing, because the source already wrote it down.

THE KEY THE SOURCE HANDS US. Every Claude-Code transcript (`~/.claude/projects/**/*.jsonl`) stores its
content as TYPED BLOCKS: `text | thinking | tool_use | tool_result`, plus the bare-string user turn. The
block type IS a ground-truth register label, GIVEN, never inferred. Concatenate the blocks in causal order
and the type changes become KNOWN REGISTER-SWITCH POINTS. We have been throwing this away at ingest.

TRUTH = THE REGISTER SWITCH, NEVER THE BLOCK EDGE. Adjacent blocks of the SAME register (two parallel
`tool_use` calls, two `tool_result` returns) name no switch — they run on in one register. So same-register
blocks merge into a RUN, truth marks where a RUN opens, and every block edge INSIDE a run stands as a
DISTRACTOR. Same discipline as `tw5-kinds`. A detector that fires on block edges rather than register edges
therefore pays for it in precision.

THINKING BLOCKS CARRY ZERO CHARACTERS. The transcript persists `{"type":"thinking","thinking":"","signature":…}`
— the text redacted at write, the signature retained. A block with no characters cannot enter a character
stream, so `thinking` leaves the bed. Named here, so nobody later reads its absence as a finding.

THE TWO ARMS, AND WHY THE BED DIES WITHOUT THEM. A trivially-gameable bed teaches nothing: a detector that
merely spots a code fence or an opening brace would ace it and learn no grammar at all.

  · cued   — the stream as it stands, surface markers intact. The easy arm, the baseline.
  · decued — the SAME stream with the CHEAP SURFACE CUES STRIPPED. A detector must find the register switch
             FROM THE LANGUAGE ITSELF, never from a delimiter.

THE DECUE RULE IS AN IMPOSED PRIOR AND IT GETS SURFACED, NEVER HIDDEN. A cue = a token whose PRESENCE AT A
POSITION announces a new unit BY CONVENTION, readable without reading the language. Content = whatever a
grammar produces throughout its span. Exactly what `decued` strips, and every rule fires in EVERY register
(so a rule's own footprint never labels a register):

  1. THE MARKUP ENVELOPE — every `<tag …>` / `</tag>` token. This is one rule doing two jobs: it dissolves
     the `<tool_use name="Bash">` / `<param name="command">` envelope this bed renders a tool call into
     (taking THE TOOL NAME with it — the loudest cue in the corpus), and it dissolves the harness tags that
     ride inside user text (`<system-reminder>`, `<ide_opened_file>`, `<result>`). Inner text survives whole.
  2. CODE FENCES — a line that holds only ``` (with an optional language word).
  3. THE READ-TOOL LINE GUTTER — a leading `NNN→` or `NNN⇥`. The tool INJECTS it; no grammar produces it.
  4. BLANK LINES — a blank line at a seam announces the seam by convention.

WHAT WE DELIBERATELY LEAVE IN, so an adversary need not find it for us:
  · The shell text, file paths, tracebacks and ANSI-free tool output inside a `tool_result`. That IS the
    register's grammar; a detector reading it reads LANGUAGE (fair), never a delimiter (a cheat).
  · JSON braces and brackets that a tool's own OUTPUT emits — the tool's grammar, not our envelope.
  · The sigil/HUD markers (`<<~ lares aim … >>`) in assistant text. A Voice writes them; they are content.
    They are ALSO, undeniably, a strong register cue — and they survive the decue. We hold that line and
    name it: a reader who wants them stripped may say so, and the decued numbers stand either way.
  · Emoji, Hawaiian, CJK. The pidgin is the point.

BED-CONSTRUCTION PRIORS (all of them, stated):
  · Sessions get picked by CHARACTER MASS, one per project directory, top N — never by any look at how a
    detector fares. The manifest names the file and its sha256, so the pick stays auditable.
  · Each bed takes the FIRST CONTIGUOUS RUN of blocks, in causal order, whose CUED render reaches
    TARGET_LINES. A contiguous window of one session keeps the bed inside ONE causal island; splicing two
    sessions would fabricate a boundary no reader lived through.
  · The cued render of a tool call wears an XML-ish envelope (`<tool_use name=…><param name=…>`), which is
    the shape an agent actually reads a tool call in and which PRESERVES the line structure of the raw
    argument values (a compact `json.dumps` would escape every newline and collapse a 200-line script onto
    one line — the line-indexed scorer would then see a bed nobody wrote). The envelope is a CUE by
    construction; that is what the cued arm is for, and rule 1 removes it in the decued arm.
  · A `tool_result` wears NO envelope in either arm — the source stores its content bare, and inventing a
    wrapper would hand the cued arm a cue the transcript never held.

THE WALL. `bed_text()` hands out TEXT ALONE. `ground_truth()` sits behind a separate call the instrument MUST
NEVER MAKE. Structural, never advisory — an instrument that cannot see the key cannot fit to it.

NO GLOBAL CLOCK. The transcript's `timestamp` fields enter nowhere. Order comes from the file's own append
order — the causal log of one island — and nothing here reads a wall clock.

Rebuild: byte-identical for a given (seed, transcript sha256). `--manifest` prints both.
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import math
import os
import re

from tw5_bed import CLASSES, char_class, partition_entropy

ROOT = os.environ.get("CLAUDE_PROJECTS", os.path.expanduser("~/.claude/projects"))

SEED = 4241                 # the one seed the whole harness draws from
TARGET_LINES = 7000         # the bed stays BOUNDED, and lands on the Kumulipo's own scale (~6.6k lines)
N_SESSIONS = 3              # three beds, three projects — three different pidgins
MIN_BLOCKS = 300            # a session needs enough register turns to carry a boundary count worth scoring

#: The registers the source actually persists CHARACTERS for. `thinking` writes none (see the header).
REGISTERS = ("user/text", "user/raw_string", "assistant/text", "assistant/tool_use", "user/tool_result")

_TAG = re.compile(r"</?[A-Za-z][\w:.\-]*(?:\s[^<>]*?)?/?>")   # decue rule 1 — the markup envelope
_FENCE = re.compile(r"^\s*```+\s*[\w+.\-]*\s*$")              # decue rule 2 — a code fence line
_GUTTER = re.compile(r"^\s*\d+(?:→|\t)")                      # decue rule 3 — the Read-tool line gutter


# ── the source: typed blocks, in causal order ──────────────────────────────────────────────────────
def _render_tool_use(block: dict) -> str:
    """The CUED render of a tool call: the envelope an agent reads it in, with argument lines intact."""
    name = block.get("name") or "?"
    parts = [f'<tool_use name="{name}">']
    for k, v in (block.get("input") or {}).items():
        s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, indent=1)
        parts.append(f'<param name="{k}">')
        parts.append(str(s))
        parts.append("</param>")
    parts.append("</tool_use>")
    return "\n".join(parts)


def _render_tool_result(block: dict) -> str:
    """Bare content — the source stores it bare, and an invented wrapper would be a cue we authored."""
    c = block.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(b.get("text") or "" for b in c
                         if isinstance(b, dict) and b.get("type") == "text")
    return ""


def _blocks(path: str) -> "list[tuple[str, str]]":
    """(register, text) for every character-bearing block of one session, in the file's own append order."""
    out: list[tuple[str, str]] = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for ln in f:
            try:
                rec = json.loads(ln)
            except json.JSONDecodeError:
                continue
            role = rec.get("type")
            msg = rec.get("message")
            if role not in ("user", "assistant") or not isinstance(msg, dict):
                continue
            content = msg.get("content")
            if isinstance(content, str):
                out.append((f"{role}/raw_string", content))
                continue
            if not isinstance(content, list):
                continue
            for b in content:
                if not isinstance(b, dict):
                    continue
                t = b.get("type")
                if t == "text":
                    out.append((f"{role}/text", b.get("text") or ""))
                elif t == "tool_use":
                    out.append((f"{role}/tool_use", _render_tool_use(b)))
                elif t == "tool_result":
                    out.append((f"{role}/tool_result", _render_tool_result(b)))
                # `thinking` carries no characters — see the header. It cannot enter a character stream.
    return [(k, s) for k, s in out if s.strip()]


def _sessions() -> "list[str]":
    """The N heaviest sessions, ONE PER PROJECT — three projects, three pidgins, picked before any detector."""
    per_project: dict = {}
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.jsonl"), recursive=True)):
        proj = os.path.basename(os.path.dirname(p))
        try:
            blocks = _blocks(p)
        except OSError:
            continue
        if len(blocks) < MIN_BLOCKS:
            continue
        mass = sum(len(s) for _k, s in blocks)
        cur = per_project.get(proj)
        if cur is None or mass > cur[0]:
            per_project[proj] = (mass, p)
    ranked = sorted(per_project.values(), reverse=True)
    return [p for _m, p in ranked[:N_SESSIONS]]


# ── the decue ──────────────────────────────────────────────────────────────────────────────────────
def decue(text: str) -> str:
    """Strip the four cues, in EVERY register. The rules live in the header; nothing else gets touched."""
    text = _TAG.sub("", text)
    keep = []
    for ln in text.split("\n"):
        if _FENCE.match(ln):
            continue
        ln = _GUTTER.sub("", ln)
        if ln.strip() == "":
            continue
        keep.append(ln)
    return "\n".join(keep)


# ── the bed ────────────────────────────────────────────────────────────────────────────────────────
def _build(key: str):
    """(lines, TRUTH boundary indices, per-line register). Truth = where a REGISTER RUN opens."""
    idx, arm = key.rsplit(":", 1)
    path = _BEDS[idx]
    decued = arm == "decued"

    lines: list[str] = []
    kinds: list[str] = []
    truth: list[int] = []
    prev_kind = None
    for kind, raw in _blocks(path):
        body = decue(raw) if decued else raw
        blk = [ln for ln in body.split("\n")]
        if decued:
            blk = [ln for ln in blk if ln.strip() != ""]
        if not any(ln.strip() for ln in blk):
            continue
        if prev_kind is not None and kind != prev_kind and lines:
            truth.append(len(lines))          # the RUN opens here — a block edge inside a run is a distractor
        lines.extend(blk)
        kinds.extend([kind] * len(blk))
        prev_kind = kind
        if len(lines) >= TARGET_LINES:
            break
    return lines, sorted(set(truth)), kinds


def _discover() -> dict:
    return {f"pidgin-{i + 1}": p for i, p in enumerate(_sessions())}


_BEDS = _discover()
ARMS = ("cued", "decued")


def bed_names() -> "list[str]":
    return [f"{b}:{a}" for b in _BEDS for a in ARMS]


def bed_text(key: str) -> "list[str]":
    """THE INSTRUMENT'S ONLY DOOR. Lines of the bed, and nothing that names a register.

    A caller reaching past this for the key has stopped testing an instrument and started fitting one.
    """
    return _build(key)[0]


def ground_truth(key: str) -> dict:
    """THE KEY. The SCORER crosses this wall; an instrument never does.

    `boundaries` holds the INTERNAL register switches only — the stream's opening names no boundary, and
    counting it would inflate every score by a cut nobody found. `hinge` reads None: no single switch in a
    transcript claims to matter more than the rest, so the hinge test declines rather than inventing a target.
    """
    lines, truth, kinds = _build(key)
    lengths = [b - a for a, b in zip([0] + truth, truth + [len(lines)])]
    return {
        "bed": key,
        "n_lines": len(lines),
        "n_wa": len(truth) + 1,                       # segments, in the scorer's vocabulary
        "boundaries": truth,
        "segment_lengths": lengths,
        "hinge": None,
        "length_ratio": (max(lengths) / min(lengths)) if lengths and min(lengths) else 0.0,
        "kinds": kinds,
    }


# ── the bed reports ITSELF, before any detector runs ───────────────────────────────────────────────
def channel_ceiling(key: str) -> dict:
    """The EXACT DPI ceiling of the character-class channel over the register partition.

    I(register ; class) ≤ H(register), read off the joint count table — counting, never estimation. If the
    mutual information reads ~0, the lexicon-free channel CANNOT separate these registers, and we have
    proven it BEFORE spending a cycle on a detector.

    BOTH GRAINS, because the surviving channel names the TRANSITION train, never the bare class: the unigram
    (5 symbols) and the class-TRANSITION bigram (25 symbols). Reporting only the unigram would test a channel
    nobody proposed.
    """
    lines = bed_text(key)
    kinds = ground_truth(key)["kinds"]
    uni: dict = {}
    bi: dict = {}
    for ln, kd in zip(lines, kinds):
        cs = [char_class(ch) for ch in ln + "\n"]
        for i, c in enumerate(cs):
            uni[(kd, c)] = uni.get((kd, c), 0) + 1
            if i + 1 < len(cs):
                cell = (kd, c + ">" + cs[i + 1])
                bi[cell] = bi.get(cell, 0) + 1

    def _mi(joint: dict) -> "tuple[float, float, float]":
        n = sum(joint.values()) or 1
        pk: dict = {}
        pc: dict = {}
        for (k, c), v in joint.items():
            pk[k] = pk.get(k, 0) + v
            pc[c] = pc.get(c, 0) + v
        hk = -sum((v / n) * math.log2(v / n) for v in pk.values())
        hc = -sum((v / n) * math.log2(v / n) for v in pc.values())
        mi = sum((v / n) * math.log2((v / n) / ((pk[k] / n) * (pc[c] / n)))
                 for (k, c), v in joint.items() if v)
        return hk, hc, mi

    hk, hc, mi = _mi(uni)
    _hk2, hc2, mi2 = _mi(bi)
    pk = {k: sum(v for (kk, _c), v in uni.items() if kk == k) for k in set(kinds)}
    profile = {k: {c: round(uni.get((k, c), 0) / max(1, pk[k]), 4) for c in CLASSES} for k in sorted(pk)}
    return {
        "H_register_bits": round(hk, 4),
        "H_class_bits": round(hc, 4),
        "I_class_register_bits": round(mi, 4),
        "share_of_register": round(mi / hk, 4) if hk else 0.0,
        "H_transition_bits": round(hc2, 4),
        "I_transition_register_bits": round(mi2, 4),
        "share_of_register_transition": round(mi2 / hk, 4) if hk else 0.0,
        "profile": profile,
    }


def report_bed(key: str) -> dict:
    g = ground_truth(key)
    L = g["segment_lengths"]
    return {
        "bed": key,
        "n_lines": g["n_lines"],
        "n_boundaries": len(g["boundaries"]),
        "seg_min": min(L) if L else 0,
        "seg_max": max(L) if L else 0,
        "seg_ratio": round(g["length_ratio"], 1),
        # the median rides beside the ratio: one 1-line segment carries a 1000x ratio on its own, and a
        # ratio a singleton owns would overstate how badly the scale defeats a window
        "seg_median": sorted(L)[len(L) // 2] if L else 0,
        "H_segment_identity_bits": round(partition_entropy(
            [sum(1 for b in g["boundaries"] if b <= i) for i in range(g["n_lines"])]), 4),
        "H_register_kind_bits": round(partition_entropy(g["kinds"]), 4),
        "register_share": {k: round(g["kinds"].count(k) / max(1, len(g["kinds"])), 4)
                           for k in sorted(set(g["kinds"]))},
        "channel": channel_ceiling(key),
    }


def manifest() -> dict:
    out = []
    for name, path in _BEDS.items():
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        out.append({"bed": name, "path": path, "sha256": h.hexdigest()[:16]})
    return {"seed": SEED, "target_lines": TARGET_LINES, "sessions": out}


def render(rep: dict) -> None:
    c = rep["channel"]
    print(f"\n══ {rep['bed']:<20} {rep['n_lines']:>6} lines · {rep['n_boundaries']:>4} register switches · "
          f"segments {rep['seg_min']}–{rep['seg_max']} (median {rep['seg_median']}, RATIO {rep['seg_ratio']}x)")
    print("   registers: " + " · ".join(f"{k} {v:.1%}" for k, v in rep["register_share"].items()))
    print(f"   H(register) {rep['H_register_kind_bits']:.3f} bits · "
          f"H(segment identity) {rep['H_segment_identity_bits']:.3f} bits")
    print(f"   CHAR-CLASS CEILING (DPI) against H(register) = {c['H_register_bits']:.4f} bits")
    print(f"     · unigram class    I = {c['I_class_register_bits']:.4f} → {c['share_of_register']:.1%}")
    flag = ("   ← the channel CANNOT separate these registers"
            if c["share_of_register_transition"] < 0.05 else "")
    print(f"     · class-TRANSITION I = {c['I_transition_register_bits']:.4f} → "
          f"{c['share_of_register_transition']:.1%}{flag}")
    print(f"   {'register':<22}" + "".join(f"{cl:>9}" for cl in CLASSES))
    for k, prof in c["profile"].items():
        print(f"   {k:<22}" + "".join(f"{prof[cl]:>9.3f}" for cl in CLASSES))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="the LIVE pidgin bed — it reports ITSELF before any detector runs")
    ap.add_argument("--bed", action="append", choices=bed_names())
    ap.add_argument("--manifest", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    m = manifest()
    for s in m["sessions"]:
        print(f"  {s['bed']}  sha256:{s['sha256']}  {s['path']}")
    if a.manifest:
        print(json.dumps(m, indent=1))
    reps = [report_bed(b) for b in (a.bed or bed_names())]
    if a.json:
        print(json.dumps({"manifest": m, "beds": reps}, indent=1))
    else:
        for r in reps:
            render(r)
