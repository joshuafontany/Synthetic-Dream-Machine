#!/usr/bin/env python3
r"""tw5_bed — the PIDGIN test bed: TiddlyWiki5's own tree, with its own nested answer key.

WHY TW5 AND NOT ANOTHER CHANT. The Kumulipo hands us hierarchy nobody built for our convenience, and it
paid: Foote novelty over an exact-match WORD dotplot places the wā on the pure-Hawaiian bed and dies on the
Beckwith bed, where the same chant runs braided through English commentary. That death names the diagnosis:

    A WORD-IDENTITY DOTPLOT PRESUPPOSES ONE LEXICON. Mix grammars and the diagonal dilutes — not because
    structure left, but because the instrument sees recurrence only WITHIN ONE GRAMMAR. The prior hides
    IN THE TOKEN TYPE.

Our real corpus runs the mixed case, not the pure one: humans and AI inside one multistream of English,
code, wikitext, JSON, unicode, emoji. TW5 stands as that corpus with an answer key attached — a live pidgin
whose register switches somebody else already marked, at FOUR DEPTHS:

    file boundary  ⊃  grammar (extension) boundary  ⊃  header→body switch inside a .tid  ⊃  human language

THE FOUR BEDS:
  · tw5-files — .js modules concatenated. Truth = the FILE boundaries. Coarse; one grammar throughout.
  · tw5-kinds — runs of .js / .tid / .json / .css interleaved. Truth = where the GRAMMAR changes hands.
                File boundaries INSIDE a run stand as distractors, never as truth.
  · tw5-tid   — .tid files. Truth = the HEADER→BODY switch inside each. The sharpest rung: the switch runs
                internal, carries no file boundary to hide behind, and the file starts distract.
  · tw5-langs — languages/, one block per human language. Truth = the language boundaries. Pure script test.

THE TWO ARMS, AND WHY THE BED DIES WITHOUT THEM. A trivially-gameable bed teaches nothing: a detector that
spots a blank line, a `/*\`, or a `{` would ace every rung and learn no grammar at all.

  · cued   — the stream as it stands. The easy arm, the baseline.
  · decued — the SAME stream with the CHEAP SURFACE CUES STRIPPED. A detector must find the switch FROM THE
             LANGUAGE, never from a delimiter.

THE DECUE RULE IS AN IMPOSED PRIOR AND IT GETS SURFACED, NEVER HIDDEN. A cue = a token whose PRESENCE AT A
POSITION announces a new unit BY CONVENTION, readable without reading the language. Content = everything a
grammar produces throughout its span. What each bed strips, exactly:

  · tw5-files  — the TW5 pragma block (`/*\ title: … \*/`), the `"use strict";` prologue, and ALL blank
                 lines. Each recurs at (or one line from) every file head and announces it.
  · tw5-kinds  — the same, PLUS the .tid field-header block (up to and including its first blank line), so a
                 js→tid switch shows code giving way to wikitext with no delimiter between them.
  · tw5-tid    — ALL blank lines, and nothing else. Here the header IS half the target register, so stripping
                 it would delete the answer; the cue is the BLANK LINE that separates header from body.
  · tw5-langs  — the `title: $:/language/…` header line and ALL blank lines. What remains is `Key: 译文`
                 either side of every boundary — the switch lives in the SCRIPT alone.

WHAT WE DELIBERATELY LEFT IN, so an adversary need not find it for us:
  · JSON's braces, CSS's `{ }` and `;`, JS's `})();` module close, wikitext's `<$widget>`. These belong to
    their grammars. A detector reading them reads LANGUAGE (fair) rather than a delimiter (a cheat). We hold
    that line and name it — a reader who disagrees about `})();` may say so, and the decued numbers stand
    either way.
  · The `.tid` field lines themselves in tw5-tid. They ARE the header register. Their `key: value` shape is
    the grammar the detector must learn.

BED CONSTRUCTION PRIORS (all of them, stated):
  · The seeded sample and its size caps (deterministic given the seed and the TW5 commit).
  · tw5-tid samples only .tid files carrying ≥ MIN_TID_LINES lines and a real body — a 6-line stub gives the
    header→body switch no body to switch INTO, and a bed of stubs would score the file comb.
  · tw5-langs truncates each language block at LANG_BLOCK_LINES — a cap, not a selection; it preserves every
    boundary and only bounds the run.

THE WALL. `bed_text()` hands out TEXT ALONE. `ground_truth()` sits behind a separate call the instrument MUST
NEVER MAKE. Structural, never advisory — an instrument that cannot see the key cannot fit to it.

Rebuild: byte-identical for a given (seed, TW5 commit). `--manifest` prints both.
"""
from __future__ import annotations

import argparse
import functools
import json
import math
import os
import random
import re
import subprocess
import unicodedata

TW5 = os.environ.get("TW5_ROOT", "/home/joshu/Synthetic-Dream-Machine/TiddlyWiki5")

SEED = 4241                 # the one seed; every bed and every null draws from it

TARGET_LINES = 7000         # the run stays BOUNDED — a seeded sample in minutes beats a full-tree pour
MIN_TID_LINES = 25          # a .tid needs a BODY for the header→body switch to switch into anything
LANG_BLOCK_LINES = 260      # cap per language; preserves every boundary, bounds the pour
RUN_FILES = (1, 3)          # tw5-kinds: files per same-kind run — file starts inside a run DISTRACT

_PRAGMA_OPEN = re.compile(r"^/\*\\\s*$")
_PRAGMA_CLOSE = re.compile(r"^\\\*/\s*$")
_USE_STRICT = re.compile(r'^\s*["\']use strict["\'];?\s*$')
_FIELD = re.compile(r"^[A-Za-z0-9_.\-]+:\s")
_LANG_TITLE = re.compile(r"^title:\s*\$:/language/")

CLASSES = ("letter", "digit", "space", "punct", "other")


# ── the file pools ─────────────────────────────────────────────────────────────────────────────────
def _walk(sub: str, ext: str) -> "list[str]":
    """Every file of one extension under one subtree, in SORTED order — the sample seeds off a stable list."""
    root = os.path.join(TW5, sub)
    out = []
    for dirpath, _dirs, files in os.walk(root):
        out.extend(os.path.join(dirpath, f) for f in files if f.endswith(ext))
    return sorted(out)


def _read(path: str) -> "list[str]":
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read().splitlines()


def _pools() -> dict:
    """The four grammars, each drawn from a subtree that actually supplies it.

    CSS lives only in vendored plugin files and the minified ones carry a whole stylesheet on ONE line —
    a line-indexed bed cannot see inside a single line, so the minified files leave the pool. Named, so
    nobody later reads their absence as a result."""
    css = [p for p in _walk("plugins", ".css") if ".min." not in os.path.basename(p)]
    return {
        "js": _walk("core/modules", ".js"),
        "tid": _walk("core", ".tid"),
        "json": _walk("editions/tiddlywiki-surveys/tiddlers", ".json"),
        "css": css,
    }


# ── the decue ──────────────────────────────────────────────────────────────────────────────────────
def _strip_pragma(lines: "list[str]") -> "list[str]":
    """Drop the TW5 module pragma block and the `use strict` prologue — convention, not JavaScript."""
    out, i, n = [], 0, len(lines)
    if n and _PRAGMA_OPEN.match(lines[0]):
        i = 1
        while i < n and not _PRAGMA_CLOSE.match(lines[i]):
            i += 1
        i += 1
    for ln in lines[i:]:
        if _USE_STRICT.match(ln):
            continue
        out.append(ln)
    return out


def _split_tid(lines: "list[str]") -> "tuple[list[str], list[str]] | None":
    """(field-header lines, body lines) — TW5's own .tid format: fields, one blank line, then the body.

    Returns None when the file carries no body to switch into; such a file names no header→body event."""
    for i, ln in enumerate(lines):
        if ln.strip() == "":
            head, body = lines[:i], lines[i + 1:]
            if head and all(_FIELD.match(h) for h in head) and any(b.strip() for b in body):
                return head, body
            return None
    return None


def _drop_blanks(block: "list[str]", marks: "list[int]") -> "tuple[list[str], list[int]]":
    """Remove every blank line and carry the marked indices across the removal.

    A mark lands on the FIRST surviving line at or after it — the boundary keeps naming the same text, so
    the decue never quietly moves the answer it is supposed to hide."""
    keep = [i for i, ln in enumerate(block) if ln.strip() != ""]
    remap = {}
    for new, old in enumerate(keep):
        remap.setdefault(old, new)
    out_marks = []
    for m in marks:
        j = m
        while j < len(block) and j not in remap:
            j += 1
        out_marks.append(remap.get(j, len(keep)))
    return [block[i] for i in keep], out_marks


# ── the four beds ──────────────────────────────────────────────────────────────────────────────────
def _emit(blocks: "list[tuple[str, list[str]]]", marks_within: "list[list[int]]",
          decue: bool) -> "tuple[list[str], list[int], list[str]]":
    """Concatenate blocks; return (lines, TRUTH boundary indices, per-line register kind).

    `marks_within[i]` names the truth offsets INSIDE block i (empty when the block's own START carries the
    truth). Blank-line decue runs per block, so a mark never drifts across a block edge."""
    lines: list[str] = []
    truth: list[int] = []
    kinds: list[str] = []
    for bi, (kind, body) in enumerate(blocks):
        blk, mk = (body, marks_within[bi])
        if decue:
            blk, mk = _drop_blanks(blk, mk)
        base = len(lines)
        if marks_within[bi] == [] and bi > 0:
            truth.append(base)                     # the block's own START names the switch
        truth.extend(base + m for m in mk if 0 < m < len(blk))
        lines.extend(blk)
        # the register a line SPEAKS — for a two-register block the marks cut it in two
        cuts = [0] + sorted(mk) + [len(blk)]
        if mk:
            names = kind.split("|")
            for si in range(len(cuts) - 1):
                kinds.extend([names[min(si, len(names) - 1)]] * (cuts[si + 1] - cuts[si]))
        else:
            kinds.extend([kind] * len(blk))
    return lines, sorted(set(truth)), kinds


def _bed_files(decue: bool):
    rng = random.Random(SEED)
    pool = _pools()["js"]
    order = rng.sample(pool, len(pool))
    blocks, total = [], 0
    for p in order:
        body = _read(p)
        if decue:
            body = _strip_pragma(body)
        if not body:
            continue
        blocks.append(("js", body))
        total += len(body)
        if total >= TARGET_LINES:
            break
    return _emit(blocks, [[] for _ in blocks], decue)


def _bed_kinds(decue: bool):
    rng = random.Random(SEED + 1)
    pool = {k: rng.sample(v, len(v)) for k, v in _pools().items()}
    cursor = {k: 0 for k in pool}
    blocks, total, prev = [], 0, None
    while total < TARGET_LINES:
        avail = [k for k in pool if cursor[k] < len(pool[k]) and k != prev]
        if not avail:
            break
        kind = rng.choice(sorted(avail))
        run: list[str] = []
        for _ in range(rng.randint(*RUN_FILES)):
            if cursor[kind] >= len(pool[kind]):
                break
            body = _read(pool[kind][cursor[kind]])
            cursor[kind] += 1
            if decue:
                if kind == "js":
                    body = _strip_pragma(body)
                elif kind == "tid":
                    hb = _split_tid(body)
                    body = hb[1] if hb else []      # decue removes the .tid field header entirely here:
                                                    # in THIS bed the header is a delimiter, not a target
            run.extend(body)
        if not run:
            continue
        blocks.append((kind, run))                  # one block = one RUN; truth = the run's start
        total += len(run)
        prev = kind
    return _emit(blocks, [[] for _ in blocks], decue)


def _bed_tid(decue: bool):
    rng = random.Random(SEED + 2)
    pool = [p for p in _pools()["tid"]]
    rng.shuffle(pool)
    blocks, marks, total = [], [], 0
    for p in pool:
        raw = _read(p)
        if len(raw) < MIN_TID_LINES:
            continue
        hb = _split_tid(raw)
        if hb is None:
            continue
        head, body = hb
        block = head + [""] + body                  # the file as it stands; the blank line rides the CUE arm
        blocks.append(("header|body", block))
        marks.append([len(head) + 1])               # TRUTH: the first BODY line. The file start distracts.
        total += len(block)
        if total >= TARGET_LINES:
            break
    return _emit(blocks, marks, decue)


def _bed_langs(decue: bool):
    langs = sorted(d for d in os.listdir(os.path.join(TW5, "languages"))
                   if os.path.isdir(os.path.join(TW5, "languages", d)))
    blocks = []
    for lg in langs:
        body: list[str] = []
        for p in sorted(_walk(os.path.join("languages", lg), ".multids")):
            raw = _read(p)
            if decue:
                raw = [ln for ln in raw if not _LANG_TITLE.match(ln)]
            body.extend(raw)
            if len(body) >= LANG_BLOCK_LINES:
                break
        body = body[:LANG_BLOCK_LINES]
        if body:
            blocks.append((lg, body))
    return _emit(blocks, [[] for _ in blocks], decue)


_BEDS = {"tw5-files": _bed_files, "tw5-kinds": _bed_kinds, "tw5-tid": _bed_tid, "tw5-langs": _bed_langs}
ARMS = ("cued", "decued")


def bed_names() -> "list[str]":
    return [f"{b}:{a}" for b in _BEDS for a in ARMS]


@functools.lru_cache(maxsize=None)
def _build(key: str):
    """The bed is a PURE FUNCTION of (seed, TW5 commit), so the cache changes nothing but the clock —
    and the scorer re-reads the key once per tolerance rung per null draw, which without this pours the
    whole TW5 tree off disk twelve thousand times."""
    bed, arm = key.split(":")
    return _BEDS[bed](arm == "decued")


def bed_text(key: str) -> "list[str]":
    """THE INSTRUMENT'S ONLY DOOR. Lines of the bed, and nothing that names a register.

    A caller reaching past this for the key has stopped testing an instrument and started fitting one.
    """
    return _build(key)[0]


def ground_truth(key: str) -> dict:
    """THE KEY. The SCORER crosses this wall; an instrument never does.

    `boundaries` holds the INTERNAL switches only — the stream's opening names no boundary, and counting it
    would inflate every score by a cut nobody found. `hinge` reads None: TW5 nominates no single switch as
    the one that should rank first, so the hinge test declines rather than inventing a target.
    """
    lines, truth, kinds = _build(key)
    lengths = [b - a for a, b in zip([0] + truth, truth + [len(lines)])]
    return {
        "bed": key,
        "n_lines": len(lines),
        "n_wa": len(truth) + 1,                    # segments, in the scorer's vocabulary
        "boundaries": truth,
        "segment_lengths": lengths,
        "hinge": None,
        "length_ratio": (max(lengths) / min(lengths)) if lengths and min(lengths) else 0.0,
        "kinds": kinds,
    }


# ── the bed reports ITSELF, before any detector runs ───────────────────────────────────────────────
def partition_entropy(labels: "list") -> float:
    """H of the partition these labels induce, in BITS. Counting, never estimation (plane_capacity's law)."""
    n = len(labels)
    if not n:
        return 0.0
    counts: dict = {}
    for x in labels:
        counts[x] = counts.get(x, 0) + 1
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def char_class(ch: str) -> str:
    """The LEXICON-FREE channel. It does not know what a word is, what language it speaks, or whether it
    holds code. Five classes and no sixth: adding a CJK class here would smuggle a script prior into the one
    instrument that survived every Kumulipo bed BY carrying none."""
    if ch.isspace():
        return "space"
    if ch.isdigit():
        return "digit"
    if ch.isalpha():
        return "letter"
    cat = unicodedata.category(ch)
    return "punct" if cat.startswith(("P", "S")) else "other"


def channel_ceiling(key: str) -> dict:
    """The EXACT ceiling of the character-class channel over the register partition.

    I(register ; class) ≤ H(register). Plug-in mutual information from the joint count table — millions of
    characters, five classes, so the plug-in bias sits far below the reading. If I(class;register) reads
    ~0, the character-class channel CANNOT separate these registers, and we have proven it BEFORE spending
    a cycle on the detector.

    BOTH GRAINS, because the hypothesis names the TRANSITION train, never the bare class: the unigram
    (5 symbols) and the class-TRANSITION bigram (25 symbols, the channel that survived every Kumulipo bed).
    Reporting only the unigram would test a channel nobody proposed."""
    g = ground_truth(key)
    lines = bed_text(key)
    kinds = g["kinds"]
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
    pk = {k: sum(v for (kk, _c), v in uni.items() if kk == k) for k in kinds}
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
    kinds = g["kinds"]
    return {
        "bed": key,
        "n_lines": g["n_lines"],
        "n_boundaries": len(g["boundaries"]),
        "seg_min": min(L) if L else 0,
        "seg_max": max(L) if L else 0,
        "seg_ratio": round(g["length_ratio"], 1),
        # the median rides beside the ratio: one 1-line segment can carry a 1200x ratio on its own, and a
        # ratio a singleton owns would overstate how badly the scale defeats a window
        "seg_median": sorted(L)[len(L) // 2] if L else 0,
        "H_segment_identity_bits": round(partition_entropy(
            [sum(1 for b in g["boundaries"] if b <= i) for i in range(g["n_lines"])]), 4),
        "H_register_kind_bits": round(partition_entropy(kinds), 4),
        "channel": channel_ceiling(key),
    }


def manifest() -> dict:
    try:
        commit = subprocess.run(["git", "-C", TW5, "rev-parse", "HEAD"],
                                capture_output=True, text=True, check=True).stdout.strip()
    except Exception:                               # noqa: BLE001
        commit = "unknown"
    return {"tw5_commit": commit, "seed": SEED, "target_lines": TARGET_LINES,
            "min_tid_lines": MIN_TID_LINES, "lang_block_lines": LANG_BLOCK_LINES}


def render(rep: dict) -> None:
    c = rep["channel"]
    print(f"\n══ {rep['bed']:<18} {rep['n_lines']:>6} lines · {rep['n_boundaries']:>3} boundaries · "
          f"segments {rep['seg_min']}–{rep['seg_max']} (median {rep['seg_median']}, RATIO {rep['seg_ratio']}x)")
    print(f"   register:  H(kind) {rep['H_register_kind_bits']:.3f} bits · "
          f"H(segment identity) {rep['H_segment_identity_bits']:.3f} bits")
    print(f"   CHAR-CLASS CEILING (DPI):  H(register) {c['H_register_bits']:.4f} bits")
    print(f"     · unigram class    I = {c['I_class_register_bits']:.4f} → {c['share_of_register']:.1%}")
    print(f"     · class-TRANSITION I = {c['I_transition_register_bits']:.4f} → "
          f"{c['share_of_register_transition']:.1%}"
          f"{'   ← the channel CANNOT separate these registers' if c['share_of_register_transition'] < 0.05 else ''}")
    print(f"   {'register':<12}" + "".join(f"{cl:>9}" for cl in CLASSES))
    for k, prof in list(c["profile"].items())[:10]:
        print(f"   {k:<12}" + "".join(f"{prof[cl]:>9.3f}" for cl in CLASSES))
    if len(c["profile"]) > 10:
        print(f"   … {len(c['profile']) - 10} more registers")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="the TW5 pidgin bed — it reports ITSELF before any detector runs")
    ap.add_argument("--bed", action="append", choices=bed_names())
    ap.add_argument("--manifest", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    m = manifest()
    print(f"TW5 commit {m['tw5_commit'][:12]} · seed {m['seed']} · "
          f"target {m['target_lines']} lines — the bed rebuilds byte-identical from these")
    if a.manifest:
        print(json.dumps(m, indent=1))
    reps = [report_bed(b) for b in (a.bed or bed_names())]
    if a.json:
        print(json.dumps({"manifest": m, "beds": reps}, indent=1))
    else:
        for r in reps:
            render(r)
