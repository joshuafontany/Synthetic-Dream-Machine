#!/usr/bin/env python3
"""memeast_fold — the starved fold: carrier CST → canonical MemeAst JSON.

The grammar artifact (tree-sitter-memetic-wikitext) parses the CARRIER; its
shipped `queries/memeast.scm` names the MemeAst vocabulary as capture names.
This fold runs that compiled query and emits canonical MemeAst JSON under the
STARVATION RULE: it branches ONLY on capture names — any logic that would
inspect CST structure belongs in the grammar or the query, never here. A fold
that grows a grammar opinion reads as a parity regression by definition.

Canonical form (the cross-host parity currency):
  · node kind = the capture name (e.g. "meme.sigil", "meme.ahu")
  · spans = BYTE offsets into the ground bytes — the only span currency
    (TS speaks UTF-16, py speaks codepoints, tree-sitter speaks bytes; the
    canonical form speaks bytes so the parity sha256 cannot pass while
    positions silently disagree)
  · children = by strict span containment, siblings in start-byte order
  · keys sorted, no floats, no host fields
  · structural sha256 over the canonical bytes = the parity gate's handle

The parser loads from the COMMITTED generated parser.c (the drift-free
artifact), compiled once to a cached shared object beside it.

Meme: lar:///ha.ka.ba/lararium/sensorium/memeast-fold
"""
from __future__ import annotations

import ctypes
import hashlib
import json
import os
import subprocess

# the host rides INSIDE the artifact bundle — the grammar sits one hop up
_GRAMMAR_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
)

#: captures that never nest anything (leaves of the MemeAst)
_LEAF_KINDS = frozenset({
    "meme.sigil.body", "meme.sigil.close.body", "meme.fence.info",
    "meme.heading", "meme.list", "meme.comment", "meme.text", "meme.blank",
    "meme.table.row", "meme.transclude", "meme.transclude.filtered",
    "meme.macrocall", "meme.hr", "meme.html", "meme.field", "meme.pragma",
})
#: captures that ride as fields of their parent rather than as children
_FIELD_KINDS = frozenset({
    "meme.sigil.body": "body", "meme.sigil.close.body": "body",
    "meme.fence.info": "info", "meme.ahu.open": "open", "meme.ahu.close": "close",
    "meme.quote.info": "info", "meme.style.info": "info", "meme.typed.info": "info",
    "meme.pragma.block.open": "open", "meme.pragma.block.close": "close",
}.items())
_FIELD_OF = dict(_FIELD_KINDS)


def _shared_object() -> str:
    """The compiled grammar beside its committed source — built once, reused;
    a stale .so (older than parser.c) rebuilds so the artifact stays the truth."""
    src = os.path.join(_GRAMMAR_DIR, "src", "parser.c")
    so = os.path.join(_GRAMMAR_DIR, "memetic.so")
    if not os.path.isfile(src):
        raise SystemExit(
            f"memeast_fold: the grammar artifact stands absent ({src!r}) — "
            "the fold reads the committed parser.c, never a private grammar."
        )
    if not os.path.isfile(so) or os.path.getmtime(so) < os.path.getmtime(src):
        subprocess.run(
            ["cc", "-shared", "-fPIC", "-I", os.path.join(_GRAMMAR_DIR, "src"), src, "-o", so],
            check=True,
        )
    return so


def artifact_quad() -> dict:
    """The artifact's declared version quad (grammar-ABI · CLI · runtime ·
    toolchain), read from the bundle's own manifest — the sole sovereign
    every host subscribes to."""
    with open(os.path.join(_GRAMMAR_DIR, "package.json"), encoding="utf-8") as fh:
        pkg = json.load(fh)
    quad = pkg.get("artifact")
    if not isinstance(quad, dict) or "grammarAbi" not in quad:
        raise SystemExit(
            "memeast_fold: the artifact declares no version quad "
            "(package.json 'artifact') — a quad-less bundle cannot be honored."
        )
    return quad


def _refuse_loud_on_mismatch(lang) -> None:
    """The subscriber law: a host that cannot honor the artifact's quad
    refuses LOUD, naming both sides — never a silent half-broken load."""
    import tree_sitter as ts

    declared = artifact_quad()["grammarAbi"]
    compiled = lang.abi_version
    if compiled != declared:
        raise SystemExit(
            f"memeast_fold: grammar-ABI mismatch — the compiled grammar speaks "
            f"ABI {compiled} but the artifact declares {declared}; regenerate "
            f"with the pinned tree-sitter-cli or re-declare the quad."
        )
    low, high = ts.MIN_COMPATIBLE_LANGUAGE_VERSION, ts.LANGUAGE_VERSION
    if not (low <= compiled <= high):
        raise SystemExit(
            f"memeast_fold: runtime cannot honor the artifact — grammar ABI "
            f"{compiled} sits outside this tree_sitter runtime's window "
            f"[{low}, {high}] (py tree_sitter {ts.__version__}); align the "
            f"pin-pair before loading."
        )


def _language():
    from tree_sitter import Language

    lib = ctypes.CDLL(_shared_object())
    lib.tree_sitter_memetic_wikitext.restype = ctypes.c_void_p
    lang = Language(lib.tree_sitter_memetic_wikitext())
    _refuse_loud_on_mismatch(lang)
    return lang


def _query_source() -> str:
    path = os.path.join(_GRAMMAR_DIR, "queries", "memeast.scm")
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def fold(data: bytes) -> dict:
    """Ground bytes → canonical MemeAst. Deterministic: same bytes, same
    grammar artifact → identical JSON, identical hash."""
    from tree_sitter import Parser, Query, QueryCursor

    lang = _language()
    tree = Parser(lang).parse(data)
    captures = QueryCursor(Query(lang, _query_source())).captures(tree.root_node)

    # one flat span list, THEN containment — the fold never walks the CST
    spans = []
    for name, nodes in captures.items():
        for n in nodes:
            spans.append({"kind": name, "start": n.start_byte, "end": n.end_byte})
    spans.sort(key=lambda s: (s["start"], -s["end"], s["kind"]))

    root = {"kind": "meme.document", "start": 0, "end": len(data), "children": []}
    stack = [root]
    for s in spans:
        while stack and not (stack[-1]["start"] <= s["start"] and s["end"] <= stack[-1]["end"]):
            stack.pop()
        parent = stack[-1] if stack else root
        field = _FIELD_OF.get(s["kind"])
        if field is not None:
            parent[field] = {"kind": s["kind"], "start": s["start"], "end": s["end"]}
            continue
        node = {"kind": s["kind"], "start": s["start"], "end": s["end"]}
        if s["kind"] not in _LEAF_KINDS:
            node["children"] = []
            parent.setdefault("children", []).append(node)
            stack.append(node)
        else:
            parent.setdefault("children", []).append(node)
    return root


def canonical_json(ast: dict) -> str:
    return json.dumps(ast, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def structural_hash(ast: dict) -> str:
    return hashlib.sha256(canonical_json(ast).encode("utf-8")).hexdigest()
