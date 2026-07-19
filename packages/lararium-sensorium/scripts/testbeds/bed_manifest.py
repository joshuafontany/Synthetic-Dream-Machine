#!/usr/bin/env python3
"""bed_manifest — Infrastructure-as-Myth for the Sensorium Palace's test beds.

A bed pours from a DECLARED manifest, never from a script's habit. The
manifest carries the whole pour as data — the (flow, focus, watermark)
discipline applied at ingestion:

  flow        — source roots + exclusions (every exclusion COUNTED at pour,
                never silent) + the record-unit rule per file kind
  worldline   — which orderings run REAL (in-file · containment ·
                git-history · turn-sequence) and which arbitrary; a null
                twin may scramble ONLY a real ordering
  twins       — derived FROM the worldline: the scramble grain names a real
                ordering, the twin sits SIZE-MATCHED BY CONSTRUCTION (the
                trial's size confound dies in this schema, not in vigilance)
  apertures   — the readings landing at pour, each tagged given | induced
  predictions — a pointer into EMERGENCE-PREREG.md; a bed REFUSES to pour
                while its predictions entry stands absent (the sheet's own
                law, made structural)

The pour itself rides the standing corpus_testbed machinery — this module
resolves and validates; it never re-rolls the planes.

Usage (the mempalace venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 bed_manifest.py validate --manifest <bed.json>
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 bed_manifest.py pour     --manifest <bed.json> [--twin]

Meme: lar:///ha.ka.ba/lararium/sensorium/bed-manifest
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import random
import sys

BED_SCHEMA = 1

#: record-unit rules the pour ENGINE speaks today; declared-but-unpoured units
#: refuse loud at pour time with the seam named (honest scope, never a stub).
_POURABLE_UNITS = {"file"}
_DECLARED_UNITS = {"file", "turn", "tiddler", "module"}

#: orderings the worldline may name
_ORDERINGS = {"in-file", "containment", "git-history", "turn-sequence", "walk-order"}

#: twin scramble grains the builder speaks today
_TWIN_GRAINS = {"in-file-token"}

#: roots whose content belongs to the CRDT-Wiki — the separation law: data
#: crosses into a sensorium ONLY by an explicit operator act, so a manifest
#: sourcing these REFUSES without an `operatorAct` attribution (act-or-refuse,
#: the predictions gate's sibling).
_WIKI_CONTENT_ROOTS = ("bags", "wikis", "genesis")

# this module lives in scripts/testbeds/, so the repo root sits four levels up
_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))


def load_manifest(path: str) -> dict:
    """Read + validate a bed manifest, refusing loud on every malformation."""
    with open(path, encoding="utf-8") as fh:
        m = json.load(fh)
    problems: list[str] = []
    if m.get("schema") != BED_SCHEMA:
        problems.append(f"schema must read {BED_SCHEMA}, found {m.get('schema')!r}")
    # `root` no longer rides the required set — the pour derives each bed's home
    # from its NAME (the one XDG sensorium roster); a manifest MAY still carry a
    # `root` for documentation, but the pour ignores it.
    for key in ("bed", "flow", "worldline", "twins", "apertures", "predictions"):
        if key not in m:
            problems.append(f"missing member {key!r}")
    flow = m.get("flow", {})
    if not flow.get("sources"):
        problems.append("flow.sources must name at least one root")
    units = flow.get("record_unit", {})
    for ext, unit in units.items():
        if unit not in _DECLARED_UNITS:
            problems.append(f"record_unit[{ext!r}] names unknown unit {unit!r} "
                            f"(the schema speaks {sorted(_DECLARED_UNITS)})")
    wl = m.get("worldline", {})
    real, arbitrary = set(wl.get("real", [])), set(wl.get("arbitrary", []))
    unknown = (real | arbitrary) - _ORDERINGS
    if unknown:
        problems.append(f"worldline names unknown orderings {sorted(unknown)}")
    if real & arbitrary:
        problems.append(f"worldline lists {sorted(real & arbitrary)} as BOTH real and arbitrary")
    twins = m.get("twins", {})
    grain = twins.get("grain")
    if grain is not None:
        grain_ordering = {"in-file-token": "in-file"}.get(grain)
        if grain not in _TWIN_GRAINS:
            problems.append(f"twins.grain {grain!r} unsupported (the builder speaks {sorted(_TWIN_GRAINS)})")
        elif grain_ordering not in real:
            problems.append(f"twins.grain {grain!r} scrambles the {grain_ordering!r} ordering, "
                            "which the worldline never names REAL — a null that destroys "
                            "arbitrary order proves nothing")
        if twins.get("size_matched") is not True:
            problems.append("twins.size_matched must read true — the size confound dies here")
        if not isinstance(twins.get("seed"), int):
            problems.append("twins.seed must carry an int (reproducible nulls)")
    for ap in m.get("apertures", []):
        if ap.get("provenance") not in ("given", "induced"):
            problems.append(f"aperture {ap.get('name')!r} must tag provenance given|induced")
    pred = m.get("predictions", {})
    if not (pred.get("sheet") and pred.get("anchor")):
        problems.append("predictions must carry {sheet, anchor}")
    act = m.get("operatorAct")
    if act is not None and not (act.get("who") and act.get("date") and act.get("ruling")):
        problems.append("operatorAct must carry {who, date, ruling}")
    sources_wiki = any(
        (os.path.relpath(s, _REPO_ROOT) if os.path.isabs(s) else s).split(os.sep, 1)[0].split("/", 1)[0]
        in _WIKI_CONTENT_ROOTS
        for s in m.get("flow", {}).get("sources", []))
    if sources_wiki and act is None:
        problems.append(
            "flow sources CRDT-Wiki content — the separation law crosses data only by an "
            "explicit operator act; carry operatorAct {who, date, ruling} or the bed refuses")
    if problems:
        raise SystemExit("bed_manifest: REFUSED —\n  " + "\n  ".join(problems))
    return m


def predictions_stand(m: dict) -> bool:
    """The prereg gate: the named anchor must already ride the sheet."""
    sheet = os.path.join(_REPO_ROOT, m["predictions"]["sheet"])
    if not os.path.isfile(sheet):
        return False
    with open(sheet, encoding="utf-8") as fh:
        return m["predictions"]["anchor"] in fh.read()


def resolve_flow(m: dict) -> tuple[list[str], dict]:
    """Resolve flow.sources against exclusions. Returns (kept_files, tally) —
    the tally counts every exclusion by pattern, never a silent drop."""
    exts = tuple(m["flow"].get("record_unit", {}).keys())
    exclusions = m["flow"].get("exclusions", [])
    kept: list[str] = []
    tally = {pat: 0 for pat in exclusions}
    tally["_ext_filtered"] = 0
    for src in m["flow"]["sources"]:
        root = src if os.path.isabs(src) else os.path.join(_REPO_ROOT, src)
        for dirpath, _dirs, files in os.walk(root):
            for name in sorted(files):
                fp = os.path.join(dirpath, name)
                rel = os.path.relpath(fp, _REPO_ROOT)
                pat_hit = next((p for p in exclusions if fnmatch.fnmatch(rel, p)), None)
                if pat_hit is not None:
                    tally[pat_hit] += 1
                    continue
                if exts and not fp.endswith(exts):
                    tally["_ext_filtered"] += 1
                    continue
                try:
                    # the per-file size cap is MANIFEST-declared (flow.max_file_bytes; default 512 KB, 0 =
                    # uncapped) — a bed owns its own size policy, never a hardcoded global. A large file pours
                    # as many window-fit chunks now (the corpus chunker), so the cap reads as a bed's INCLUSION
                    # policy — whether to admit the big ones at all — not a truncation guard.
                    cap = int((m.get("flow") or {}).get("max_file_bytes", 512_000))
                    over = cap > 0 and os.path.getsize(fp) > cap
                    empty = not over and not open(fp, encoding="utf-8", errors="replace").read().strip()
                except OSError:
                    over, empty = True, False
                if over or empty:
                    tally["_size_or_empty"] = tally.get("_size_or_empty", 0) + 1
                    continue
                kept.append(fp)
    if not kept:
        raise SystemExit(f"bed_manifest: REFUSED — flow.sources yielded zero records "
                         f"for bed {m['bed']!r} (exclusion tally: {tally})")
    return kept, tally


def build_twin_corpus(m: dict, files: list[str], out_dir: str) -> dict:
    """The size-matched null: per-file token scramble at the declared grain,
    seeded — file count and per-file token count PRESERVED by construction.
    Only real in-file order dies; the arbitrary walk order never mattered."""
    grain = m["twins"]["grain"]
    if grain not in _TWIN_GRAINS:
        raise SystemExit(f"bed_manifest: twin grain {grain!r} unsupported")
    rng = random.Random(m["twins"]["seed"])
    os.makedirs(out_dir, exist_ok=True)
    total_tokens = 0
    for fp in files:
        with open(fp, encoding="utf-8", errors="replace") as fh:
            tokens = fh.read().split()
        rng.shuffle(tokens)
        total_tokens += len(tokens)
        rel = os.path.relpath(fp, _REPO_ROOT).replace(os.sep, "__")
        with open(os.path.join(out_dir, rel), "w", encoding="utf-8") as fh:
            fh.write(" ".join(tokens) + "\n")
    return {"files": len(files), "tokens": total_tokens, "grain": grain, "seed": m["twins"]["seed"]}


def pour(m: dict, *, twin: bool = False) -> dict:
    """Pour the bed (or its twin) through the standing corpus_testbed engine.
    Refuses loud when: predictions stand absent · the record unit outruns the
    engine · the root reaches the comparator (corpus_testbed's own ward)."""
    if not predictions_stand(m):
        raise SystemExit(f"bed_manifest: REFUSED — predictions anchor "
                         f"{m['predictions']['anchor']!r} stands ABSENT from "
                         f"{m['predictions']['sheet']} — vow forward, then pour")
    units = set(m["flow"].get("record_unit", {}).values())
    unpourable = units - _POURABLE_UNITS
    if unpourable:
        raise SystemExit(f"bed_manifest: REFUSED — record units {sorted(unpourable)} stand "
                         "declared but the pour engine speaks only 'file' today; the "
                         "turn/tiddler/module seams land with their own engines")
    files, tally = resolve_flow(m)
    # Every bed lands in the ONE sensorium roster the node governs: XDG
    # <data>/sensoriums/<bed>, resolved from the bed NAME (the address carries
    # the bearing — the manifest's literal `root` field stays advisory). This
    # seats each poured bed as a first-class EPHEMERAL sensorium (compose_testbed
    # stamps ephemeral=true) that the standing roster + teardown already reach,
    # collapsing the per-bed ~/.lares scatter into the one home.
    from sensorium import sensorium_dir
    root = sensorium_dir(m["bed"])
    if twin:
        twin_dir = root + "-twin-corpus"
        twin_stats = build_twin_corpus(m, files, twin_dir)
        corpus_pointer, root = twin_dir, root + "-twin"
    else:
        roots = [s if os.path.isabs(s) else os.path.join(_REPO_ROOT, s) for s in m["flow"]["sources"]]
        corpus_pointer = os.pathsep.join(roots)
        twin_stats = None

    import corpus_testbed
    out = corpus_testbed.run(
        corpus_pointer, root,
        wing=m.get("wing", "wing_testbed"), room=m.get("room", "corpus"),
        min_support=m.get("min_support", 2), max_forms=m.get("max_forms", 64),
        max_candidates=m.get("max_candidates", 96), sections=m.get("sections"))
    out["bed"] = m["bed"] + ("-twin" if twin else "")
    out["exclusion_tally"] = tally
    out["kept_files"] = len(files)
    if twin_stats:
        out["twin"] = twin_stats
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="bed_manifest — declared pours for the Sensorium Palace")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("validate", "pour"):
        p = sub.add_parser(name)
        p.add_argument("--manifest", required=True)
        if name == "pour":
            p.add_argument("--twin", action="store_true", help="pour the size-matched null twin")
    args = ap.parse_args()
    m = load_manifest(args.manifest)
    if args.cmd == "validate":
        files, tally = resolve_flow(m)
        ok = predictions_stand(m)
        sys.stdout.write(json.dumps({
            "bed": m["bed"], "valid": True, "files": len(files),
            "exclusion_tally": tally, "predictions_stand": ok}, indent=2) + "\n")
        return
    sys.stdout.write(json.dumps(pour(m, twin=args.twin), ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
