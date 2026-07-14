#!/usr/bin/env python3
"""realign_md_tw5 — walk a corpus sub-tree from md-forms to TW5-forms, slowly.

Pass-1 transforms only (REALIGNMENT.md carries the ladder and the law):
  · headings  `^#{1,6} `  → `!{n} `
  · lists     `^- `       → `* `   (top-level only; indented `- ` defers)

The script REFUSES silence: every line it skips gets counted with a reason
(fence interior · source-text ahu · library path · indented list · git-dirty
file), and the report prints them all. Dry-run rides the default; `--apply`
writes. Exemptions enforce the operator's law: source-text never changes.

Usage:
  python realign_md_tw5.py <root> [--apply]

Meme: lar:///ha.ka.ba/lararium/sensorium/md-tw5-realign
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys

_HEADING = re.compile(r"^(#{1,6}) ")
_TOP_UL = re.compile(r"^- ")
_INDENTED_UL = re.compile(r"^\s+- ")
_FENCE = re.compile(r"^```")
_SOURCE_TEXT_OPEN = re.compile(r"^<<~\s*ahu\s+#source-text\b")
_AHU_OPEN = re.compile(r"^<<~\s*ahu\b")
_AHU_CLOSE = re.compile(r"^<<~/ahu\s*>>")


def _git_dirty(repo_root: str, path: str) -> bool:
    out = subprocess.run(
        ["git", "status", "--porcelain", "--", path],
        capture_output=True, text=True, cwd=repo_root,
    ).stdout.strip()
    return bool(out)


def realign_text(text: str, counts: dict) -> str:
    """One file's pass-1 walk. Fence state toggles on ``` lines; a source-text
    ahu suspends transforms until its close (nesting depth tracked so an inner
    ahu never re-opens the gate early)."""
    out_lines = []
    in_fence = False
    source_depth = 0  # >0 while inside a source-text ahu (any nesting)
    for line in text.splitlines(keepends=True):
        if _FENCE.match(line):
            in_fence = not in_fence
            out_lines.append(line)
            continue
        if in_fence:
            counts["skip_fence"] += 1
            out_lines.append(line)
            continue
        if source_depth > 0:
            if _AHU_OPEN.match(line):
                source_depth += 1
            elif _AHU_CLOSE.match(line):
                source_depth -= 1
            counts["skip_source_text"] += 1
            out_lines.append(line)
            continue
        if _SOURCE_TEXT_OPEN.match(line):
            source_depth = 1
            out_lines.append(line)
            continue
        m = _HEADING.match(line)
        if m:
            counts["heading"] += 1
            out_lines.append("!" * len(m.group(1)) + " " + line[m.end():])
            continue
        if _TOP_UL.match(line):
            counts["ul"] += 1
            out_lines.append("* " + line[2:])
            continue
        if _INDENTED_UL.match(line):
            counts["skip_indented_ul"] += 1
        out_lines.append(line)
    return "".join(out_lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="corpus sub-tree to walk (e.g. bags/@sdm)")
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    ap.add_argument("--exclude", action="append", default=[],
                    help="path substring to skip, reported loud (e.g. the boot seed)")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        raise SystemExit(f"realign: no such sub-tree {root!r}")
    repo_root = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, cwd=root,
    ).stdout.strip()

    total = {"heading": 0, "ul": 0, "skip_fence": 0, "skip_source_text": 0,
             "skip_indented_ul": 0, "skip_library": 0, "skip_dirty": 0,
             "skip_excluded": 0}
    touched = []
    for dirpath, _dirs, files in os.walk(root):
        if f"{os.sep}library" in dirpath + os.sep or dirpath.endswith("library"):
            total["skip_library"] += sum(1 for f in files if f.endswith(".mem"))
            continue
        for name in sorted(files):
            if not name.endswith(".mem"):
                continue
            path = os.path.join(dirpath, name)
            if any(pat in path for pat in args.exclude):
                total["skip_excluded"] += 1
                print(f"  SKIP excluded: {os.path.relpath(path, repo_root)}")
                continue
            if _git_dirty(repo_root, path):
                total["skip_dirty"] += 1
                print(f"  SKIP dirty-in-git: {os.path.relpath(path, repo_root)}")
                continue
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
            counts = {k: 0 for k in total}
            new = realign_text(text, counts)
            for k, v in counts.items():
                total[k] += v
            if new != text:
                touched.append((os.path.relpath(path, repo_root),
                                counts["heading"], counts["ul"]))
                if args.apply:
                    with open(path, "w", encoding="utf-8") as fh:
                        fh.write(new)

    mode = "APPLIED" if args.apply else "DRY-RUN"
    print(f"\n[{mode}] {os.path.relpath(root, repo_root)} — "
          f"{len(touched)} files change")
    print(f"  headings #→!  : {total['heading']}")
    print(f"  lists -→*     : {total['ul']}")
    print(f"  skipped       : fence-lines={total['skip_fence']} "
          f"source-text-lines={total['skip_source_text']} "
          f"indented-ul={total['skip_indented_ul']} "
          f"library-files={total['skip_library']} dirty-files={total['skip_dirty']} "
          f"excluded-files={total['skip_excluded']}")
    for rel, h, u in touched[:20]:
        print(f"    {rel}  (+{h} headings, +{u} lists)")
    if len(touched) > 20:
        print(f"    … and {len(touched) - 20} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
