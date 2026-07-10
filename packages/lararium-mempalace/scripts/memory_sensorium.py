#!/usr/bin/env python3
"""memory_sensorium — the GOAL driver: a 3-plane Memory sensorium over the AI-operator worldlines.

The test-bed (`corpus_testbed`) proves the instruments over curated frozen text — controlled ground
truth, where a cross-plane co-jump cannot be a shared-derivation artifact. This driver serves the goal:
the operator's real session transcripts (claude · codex · copilot), landed on the SAME three genuinely
independent planes (content · structure · form), one cid keying all three.

The independence discipline holds here exactly as it holds there: structure and form NEVER read the
content plane's embeddings — each parses the record's own text. A co-jump across planes derived from
one another would witness nothing.

Two wards guard the run:
  * the comparator ward — ~/.mempalace holds the clean dev-baseline; this driver never writes it.
  * the append-only ground — the Memory sensorium is immutable/verbatim; a re-run lands only the
    un-landed tail (idempotent re-derivation, the crash-cure), never a rewrite.

Only the Claude surface carries the parentUuid + subagent provenance the worldline observer reads, so
the fork-DAG leg rides claude alone; codex/copilot land content + planes and read `worldline: null`.

Meme: lar:///ha.ka.ba/lararium/sensorium/lares-mcp
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import content_io as cio
from capture_session import capture_and_observe
from plane_fanout import compose_corpus_planes

# The transcript globs each surface keeps its worldlines under. A pointer names ONE transcript;
# the sweep walks these and captures each in turn (the source-caps are per-pointer by contract).
_SURFACE_ROOTS = {
    "claude": ("~/.claude/projects", ".jsonl"),
    "codex": ("~/.codex/sessions", ".jsonl"),
}


def memory_sensorium_dir() -> str:
    """The canonical Memory sensorium home — `<XDG_DATA_HOME>/lares/sensoriums/memory`, the same dir
    `vessel-paths.ts` names, whose manifest declares the `#has` cap-stack. The filetree IS the
    composition: `content/` beside `structure/`, `form/`, `persistence/`."""
    data = os.environ.get("XDG_DATA_HOME") or os.path.join(os.path.expanduser("~"), ".local", "share")
    return os.path.join(data, "lares", "sensoriums", "memory")


def content_dir_of(root: str) -> str:
    """The content plane sits at `<root>/content` — a sibling of the derived planes, never the root
    itself. The lares content store REPLACES the vendored mempalace as the memory sensorium's content
    plane; the manifest's `content.engine` names which one stands."""
    return os.path.join(root, "content")


def _refuse_comparator(root: str) -> None:
    """The comparator ward: ~/.mempalace holds the clean dev-baseline — this driver never writes it.
    Designation carries authority; a root that reaches into the comparator fails LOUD. (The memory
    sensorium's content plane migrates OUT of ~/.mempalace into `<root>/content`; until the manifest
    names the lares engine, the vendored palace stays read-only ground.)"""
    comparator = os.path.realpath(os.path.expanduser("~/.mempalace"))
    real = os.path.realpath(os.path.expanduser(root))
    if real == comparator or real.startswith(comparator + os.sep):
        raise SystemExit(f"memory_sensorium: REFUSED — {root!r} sits inside the comparator "
                         "~/.mempalace (comparator only; this driver never writes it)")


def transcripts(surface: str, *, project: "str | None" = None) -> list:
    """Every transcript pointer a surface holds, newest LAST (so a sweep lands oldest-first and the
    watermark advances monotonically). `project` narrows claude to one project dir."""
    spec = _SURFACE_ROOTS.get(surface)
    if spec is None:
        raise SystemExit(f"memory_sensorium: surface {surface!r} carries no transcript root "
                         f"(known: {sorted(_SURFACE_ROOTS)}); copilot rides a SQLite store, not files")
    root, ext = spec
    base = os.path.expanduser(root)
    if project:
        base = os.path.join(base, project)
    if not os.path.isdir(base):
        return []
    found = []
    for dirpath, _dirs, files in os.walk(base):
        for f in files:
            if f.endswith(ext):
                found.append(os.path.join(dirpath, f))
    return sorted(found, key=lambda p: os.path.getmtime(p))


def tri_plane_witness(root: str, *, sample_limit: int = 200) -> dict:
    """The cross-plane read-back: how many cids the THREE planes jointly key, and whether the form
    plane's `struct_hash` agrees with the structure plane's own hash for them.

    The test-bed's witness samples the first content rows and joins outward. Over a curated corpus the
    form plane covers nearly every record, so that window finds a join immediately. Over real worldlines
    the form plane stays SPARSE — a record lands there only when a template induces at min_support — so
    a first-rows window reads `sample: null` while a real join sits deeper. Join from the SPARSE plane
    instead: every form cid, checked against structure's provenance and content's store.

    An agreement below 100% would say the planes disagree about what they projected — the one result
    that would void the cross-plane thesis. Reported, never assumed."""
    from embed_cap import make_embed_cap
    from form_encoder import FormPalaceStore
    from structurepalace_io import StructurePalaceStore

    root = os.path.expanduser(root)
    embed_one, model = make_embed_cap()
    # The content plane roots at `<root>/content`; an older layout rooted it at `<root>` itself.
    content = content_dir_of(root)
    if not os.path.exists(os.path.join(content, "chroma.sqlite3")):
        content = root
    store = cio.ContentStore(content, expected_dim=len(embed_one("probe")), expected_model=model)
    structure = StructurePalaceStore(os.path.join(root, "structure"))
    form = FormPalaceStore(os.path.join(root, "form"))

    # structure keys by STRUCTURAL HASH; its provenance names the content cids it covers.
    got = structure._col.get(include=["metadatas"])  # noqa: SLF001 — the witness probe reads the raw collection
    covered: dict = {}
    for i, shash in enumerate(got.get("ids") or []):
        meta = (got.get("metadatas") or [])[i] or {}
        try:
            for p in json.loads(meta.get("lar_provenance") or "[]"):
                if p.get("verbatim_sha"):
                    covered[p["verbatim_sha"]] = (shash, meta.get("count"))
        except (ValueError, TypeError):
            continue

    form_cids = set(form._col.get(include=[])["ids"])  # noqa: SLF001 — form keys BY cid
    tri = sorted(form_cids & set(covered))

    checked = agree = 0
    sample = None
    for cid in tri[:sample_limit]:
        row = store.get(cid)
        if not row:
            continue
        fmeta = (form.get(cid) or {}).get("metadata") or {}
        shash, recurrence = covered[cid]
        checked += 1
        if str(fmeta.get("struct_hash")) == str(shash):
            agree += 1
        if sample is None:
            sample = {
                "cid": cid,
                "content_head": (row.get("document") or "")[:100].replace("\n", " "),
                "wing": (row.get("metadata") or {}).get("wing"),
                "surface": (row.get("metadata") or {}).get("lar_surface"),
                "structure_hash": shash,
                "structure_recurrence": recurrence,
                "form_struct_hash": fmeta.get("struct_hash"),
                "form_dimension": fmeta.get("dimension"),
            }

    content_total = int(store.scan(0, 1).get("total", 0))
    return {
        "counts": {
            "content": content_total,
            "structure": int(structure._col.count()),  # noqa: SLF001
            "form": int(form._col.count()),            # noqa: SLF001
        },
        "cross_plane": {
            "structure_covered_cids": len(covered),
            "form_cids": len(form_cids),
            "tri_plane_cids": len(tri),
            "form_coverage": round(len(form_cids) / content_total, 4) if content_total else None,
            "sampled": checked,
            "struct_hash_agreement": f"{agree}/{checked}" if checked else "0/0",
        },
        "sample": sample,
    }


def run(root: str, *, surface: str, wing: str, room: str, pointers: list,
        min_support: int, max_forms: int, max_candidates: int) -> dict:
    """Capture every pointer onto all three planes, then witness what landed. Each pointer stands a
    FRESH cap-stack (the plane caps hold a per-pass tree map), so idempotence must live in the durable
    stores, never in process state."""
    _refuse_comparator(root)
    os.makedirs(os.path.expanduser(root), exist_ok=True)
    root = os.path.expanduser(root)

    content = content_dir_of(root)
    worldline = os.path.join(root, ".worldline")
    passes = []
    for p in pointers:
        planes = compose_corpus_planes(root, min_support=min_support, max_forms=max_forms,
                                       max_candidates=max_candidates)
        summary = capture_and_observe(content, surface, p, wing=wing, room=room, planes=planes,
                                      worldline_palace=worldline)
        plane = summary.get("planes", {})
        passes.append({
            "pointer": os.path.basename(p),
            "landed": summary.get("landed"),
            "skipped": summary.get("skipped"),
            "failed": len(summary.get("failed", []) or []),
            "structure": (plane.get("structure") or {}).get("landed"),
            "form": (plane.get("form") or {}).get("landed"),
            "worldline": bool(summary.get("worldline")),
        })

    # Read the planes back off FRESH handles — the witness never trusts the writer's own count.
    return {"root": root, "surface": surface, "wing": wing,
            "pointers": len(pointers), "passes": passes,
            "witness": tri_plane_witness(root)}


def main() -> None:
    ap = argparse.ArgumentParser(description="memory_sensorium — the 3-plane Memory sensorium over the AI-operator worldlines")
    sub = ap.add_subparsers(dest="cmd", required=True)

    ls = sub.add_parser("list", help="the transcripts a surface holds (no capture)")
    ls.add_argument("--surface", default="claude", choices=sorted(_SURFACE_ROOTS))
    ls.add_argument("--project", default=None, help="narrow to one project dir (claude)")

    w = sub.add_parser("witness", help="read the three planes back off a standing palace (no capture)")
    w.add_argument("--root", default=None)
    w.add_argument("--sample-limit", type=int, default=200, dest="sample_limit")

    r = sub.add_parser("run", help="capture transcripts onto content + structure + form, then witness")
    r.add_argument("--root", default=None,
                   help="the Memory sensorium root (default: the canonical <data>/lares/sensoriums/memory); never ~/.mempalace")
    r.add_argument("--surface", default="claude", choices=sorted(_SURFACE_ROOTS))
    r.add_argument("--wing", required=True, help="the per-project wing slug (`lares wing-of <transcript>`)")
    r.add_argument("--room", default="conversations")
    r.add_argument("--project", default=None, help="narrow to one project dir (claude)")
    r.add_argument("--pointer", action="append", default=None,
                   help="capture exactly this transcript (repeatable); overrides the sweep")
    r.add_argument("--limit", type=int, default=None, help="capture at most N transcripts (oldest first)")
    r.add_argument("--min-support", type=int, default=2, dest="min_support")
    r.add_argument("--max-forms", type=int, default=64, dest="max_forms")
    r.add_argument("--max-candidates", type=int, default=96, dest="max_candidates")

    args = ap.parse_args()

    if args.cmd == "list":
        for p in transcripts(args.surface, project=args.project):
            sys.stdout.write(p + "\n")
        return

    if args.cmd == "witness":
        args.root = args.root or memory_sensorium_dir()
        _refuse_comparator(args.root)
        out = tri_plane_witness(args.root, sample_limit=args.sample_limit)
        sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        return

    args.root = args.root or memory_sensorium_dir()
    pointers = args.pointer or transcripts(args.surface, project=args.project)
    if args.limit is not None:
        pointers = pointers[: args.limit]
    if not pointers:
        raise SystemExit(f"memory_sensorium: no {args.surface} transcripts found")

    out = run(args.root, surface=args.surface, wing=args.wing, room=args.room, pointers=pointers,
              min_support=args.min_support, max_forms=args.max_forms, max_candidates=args.max_candidates)
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
