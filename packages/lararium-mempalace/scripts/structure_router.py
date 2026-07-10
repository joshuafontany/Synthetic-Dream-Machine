#!/usr/bin/env python3
"""structure_router — the STRUCTURE-plane parse ROUTER for the lares-corpus.

The corpus-palace's structure cap (corpus.md #the-caps) names two halves:
  1. the EXISTING content-free structurepalace encoder (`structurepalace_io._structural_embed`),
     which already eats ANY nested-dict tree and yields a cosine-meaningful SHAPE
     vector; and
  2. THIS router — `parse(kind, bytes) -> nested-dict-tree` — which turns any corpus
     chunk into the tree that encoder walks.

ONE return shape: a nested dict `{"type": <node-type>, "children": [...subtrees...]}`
— content-FREE (node TYPES + nesting only, never the source words), exactly what
`structurepalace_io._structural_features` reads (it labels a dict by its `type` field and
recurses into list/dict values). So the router is purely the front door; the encoder
is unchanged.

ROUTING — by corpus-KIND, auto-detected from extension + content:
  code / JS / TS      -> py-tree-sitter + tree-sitter-javascript
  markdown            -> tree-sitter-markdown
  json                -> tree-sitter-json
  toml                -> tree-sitter-toml
  wikitext (.tid …)   -> tree-sitter-wikitext
  memetic-wikitext    -> the SIGIL parser (our own `<<~ … >>` forms — the read-side
                         twin of the lar-sigil TW5 wikirules; the tree-sitter grammar
                         lives at grammars/tree-sitter-lar-sigil/grammar.js)
  prose               -> stanza constituency (Stanford, maintained, modern-torch — the
                         nested SPANS are the form-induction template candidates) → spaCy
                         dependency tree → nltk sentence/word → regex (graceful tiers)

GRACEFUL by construction: a kind with no available parser yields None ⇒ the caller
records `structure-skipped` and the content plane still stands. The heavy tree-sitter
/ spaCy imports are LAZY (per-kind), so `parse` of one kind never pays for another.

Protocol — three faces:
  * the library: `detect_kind`, `parse_to_tree`, `parse_sigils`, `parse_prose`
  * `parse  --path <file> [--kind K]`     -> the tree as JSON on stdout (one object)
  * `ingest --path <src>  --palace <dir>` -> walk a path, parse each file, push each
        tree through the structurepalace encoder into a structure chroma-palace under <dir>;
        a JSON summary on stdout ({files_seen, parsed, structures, skipped, by_kind}).

Run with the mempalace venv interpreter (PYTHONPATH=<repo>/mempalace so `ingest`'s
`import structurepalace_io`/`mempalace` resolve; `parse` needs neither):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 structure_router.py parse --path foo.js
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Callable

# A hard cap on tree size — a pathological / huge file cannot make the encoder walk
# unbounded. The shape vector saturates well before this; truncation only drops the
# deepest tail, never the dominant silhouette.
_MAX_NODES = 20_000


def _count_nodes(children: list, cap: int) -> int:
    """Nodes in a child list, counted no further than `cap` (an unbounded graft would let one
    pathological span exhaust the whole tree budget)."""
    n = 0
    stack = list(children)
    while stack and n <= cap:
        node = stack.pop()
        n += 1
        if isinstance(node, dict):
            stack.extend(node.get("children") or [])
    return n
_MAX_DEPTH = 200


# ── kind detection ───────────────────────────────────────────────────────────────────

# extension → kind. The router maps families of extensions onto one grammar (e.g. all
# JS/TS dialects ride the javascript grammar — close enough for SHAPE).
_EXT_KIND = {
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "javascript", ".tsx": "javascript",
    ".json": "json",
    ".md": "markdown", ".markdown": "markdown",
    ".toml": "toml",
    ".tid": "wikitext", ".wiki": "wikitext", ".mediawiki": "wikitext", ".wikitext": "wikitext",
    ".txt": "prose", ".text": "prose",
}

# The memetic-wikitext doctype marker the house stamps on its own memes (corpus.md, the
# sigil tiddlers): its presence (or a dense run of `<<~`) routes a file to the SIGIL parser.
_MEMETIC_DOCTYPE = "memetic-wikitext"
_SIGIL_OPEN = "<<~"
_SIGIL_DENSITY = 3  # ≥ this many `<<~` opens ⇒ treat a markdown/text file as memetic


def _decode(b: bytes) -> str:
    return b.decode("utf-8", errors="replace") if isinstance(b, (bytes, bytearray)) else str(b)


def detect_kind(path: str, content: bytes | str | None = None) -> str | None:
    """Best-effort corpus-kind for a file: extension first, then a content sniff that
    promotes a markdown/text meme carrying our doctype (or a dense sigil run) to
    `memetic-wikitext`. Returns None for an extension the router has no grammar for."""
    ext = os.path.splitext(path)[1].lower()
    kind = _EXT_KIND.get(ext)
    if content is not None:
        text = _decode(content if isinstance(content, (bytes, bytearray)) else content.encode())
        head = text[:4096]
        is_memetic = (_MEMETIC_DOCTYPE in head) or (text.count(_SIGIL_OPEN) >= _SIGIL_DENSITY)
        if is_memetic and kind in (None, "markdown", "prose", "wikitext"):
            return "memetic-wikitext"
    return kind


# ── tree-sitter routing (lazy per language) ───────────────────────────────────────────

# kind → the pip module that exposes `.language()` (a PyCapsule for tree-sitter 0.25+).
_TS_MODULE = {
    "javascript": "tree_sitter_javascript",
    "json": "tree_sitter_json",
    "markdown": "tree_sitter_markdown",
    "toml": "tree_sitter_toml",
    "wikitext": "tree_sitter_wikitext",
}

_ts_parser_cache: dict[str, object] = {}


def _ts_parser(kind: str):
    """A cached tree-sitter Parser for a kind, or None when the grammar / tree-sitter is
    not installed (graceful — that kind simply structure-skips)."""
    if kind in _ts_parser_cache:
        return _ts_parser_cache[kind]
    parser = None
    mod_name = _TS_MODULE.get(kind)
    if mod_name:
        try:
            import importlib

            from tree_sitter import Language, Parser

            mod = importlib.import_module(mod_name)
            parser = Parser(Language(mod.language()))
        except Exception as exc:  # noqa: BLE001 — missing grammar ⇒ skip this kind
            sys.stderr.write(f"structure_router: tree-sitter {kind} unavailable ({type(exc).__name__}: {exc})\n")
            parser = None
    _ts_parser_cache[kind] = parser
    return parser


def _ts_to_tree(node, depth: int, budget: list[int]) -> dict:
    """Convert a tree-sitter node to the encoder's nested-dict shape, NAMED children only
    (anonymous punctuation tokens carry no structural signal). Budget-bounded."""
    children = []
    if depth < _MAX_DEPTH:
        for child in node.named_children:
            if budget[0] <= 0:
                break
            budget[0] -= 1
            children.append(_ts_to_tree(child, depth + 1, budget))
    return {"type": node.type, "children": children}


def _parse_treesitter(kind: str, source: bytes) -> dict | None:
    parser = _ts_parser(kind)
    if parser is None:
        return None
    tree = parser.parse(source if isinstance(source, (bytes, bytearray)) else source.encode("utf-8"))
    budget = [_MAX_NODES]
    return _ts_to_tree(tree.root_node, 0, budget)


# ── the SIGIL parser — the read-side twin of the lar-sigil TW5 wikirules ───────────────
#
# Mirrors packages/lararium-tw5/src/wikirules/lar-sigil*.ts (the WRITE side). The node
# types match grammars/tree-sitter-lar-sigil/grammar.js (the formal tree-sitter twin):
#   source_file · doctype_comment · pranala_header · pranala · ahu_block ·
#   sharktooth_sigil(→ sigil_name, arg*) · text
# Content-free for the encoder: a sigil's NAME rides a `sigil_name` leaf's nesting, never
# its argument text. Block sigils (ahu, kahea-compound, pranala-block) nest their inner
# sigils as real children, so an ahu-wrapped run reads DEEPER than a flat sigil row.

import re as _re

# A sharktooth token: <<~ … >> or a closer <<~/word >>. Non-greedy to the next >>.
_TOKEN_RE = _re.compile(r"<<~/?[^\n]*?>>")
# Block openers whose matching closer we balance (mirrors lar-sigil BLOCK_CLOSERS +
# the kahea/aka compound child-slot form that closes on word1).
_BLOCK_OPENERS = {"ahu", "pranala", "kahea"}
_CHILD_SLOTS = {"ahu", "kau"}


def _sigil_first_word(inner: str) -> str | None:
    """The leading sigil keyword of a `<<~ … >>` inner body (after stripping control /
    pragma / doctype markers), or None for a bare/control sigil."""
    m = _re.match(r"^[!⊙]?\s*(?:&#x[0-9a-fA-F]+;)?\s*(\\?[A-Za-z?][\w-]*)?", inner)
    w = m.group(1) if m else None
    return w.lstrip("\\") if w else None


def _classify_token(tok: str):
    """(role, word) for a sharktooth token. role ∈ {close, doctype, pranala_header,
    sharktooth}; word is the sigil keyword (or close-key)."""
    inner = tok[3:-2].strip()  # drop <<~ … >>
    if inner.startswith("/"):
        return "close", inner[1:].strip().split()[0] if inner[1:].strip() else ""
    if inner.startswith("!DOCTYPE"):
        return "doctype", "DOCTYPE"
    if _re.match(r"^\?\s*->", inner):
        return "pranala_header", "?"
    return "sharktooth", _sigil_first_word(inner)


def _sigil_node(role: str, word: str | None, inner: str) -> dict:
    """A leaf sharktooth/pranala/doctype node: the sigil_name + one arg-token per
    whitespace-separated argument (capped), all content-free TYPE leaves."""
    if role == "pranala_header":
        return {"type": "pranala_header", "children": [{"type": "sigil_name", "children": []}]}
    if role == "doctype":
        return {"type": "doctype_comment", "children": [{"type": "sigil_name", "children": []}]}
    ntype = "pranala" if word == "pranala" else "sharktooth_sigil"
    children = [{"type": "sigil_name", "children": []}]
    # args: the whitespace tokens after the keyword — counted for SHAPE (fan-out), capped.
    rest = inner
    if word:
        idx = inner.find(word)
        rest = inner[idx + len(word):] if idx >= 0 else inner
    for _ in rest.split()[:32]:
        children.append({"type": "arg", "children": []})
    return {"type": ntype, "children": children}


def parse_sigils(text: str, *, prose: "Callable[[str], dict] | None" = None) -> dict:
    """Parse the memetic-wikitext `<<~ … >>` layer to the structure AST. A stack balances
    block openers (ahu / kahea-compound / pranala-block) against their `<<~/word >>`
    closers, so nesting depth is REAL; leaf sigils + inter-sigil prose attach as siblings.

    `prose` supplies the NEXT RUNG DOWN the gradient: memetic-wikitext is a SUPERSET of the
    prose beneath it, so an inter-sigil span parses through `prose` and its tree grafts in
    place of a bare `text` node (augment-and-wrap, never replace). With `prose=None` a span
    collapses to one structureless `text` node — which reads every sigil-less document as the
    SAME shape. That degenerate view serves a sigil-only reading; it MUST NOT serve a corpus
    where most records carry no sigils (their structural hashes would all collide)."""
    root: dict = {"type": "source_file", "children": []}
    stack: list[tuple[str, dict]] = [("", root)]  # (close-key, node)
    pos = 0
    budget = _MAX_NODES

    def cur() -> dict:
        return stack[-1][1]

    def add_text(s: str) -> None:
        nonlocal budget
        if budget <= 0 or not s.strip():
            return
        if prose is None:
            cur()["children"].append({"type": "text", "children": []})
            budget -= 1
            return
        sub = prose(s)
        # Graft the span's own tree under a `text` node — the sigil layer keeps its shape and
        # the prose beneath it carries its structure. The node budget bounds the graft.
        children = sub.get("children", []) if isinstance(sub, dict) else []
        cost = _count_nodes(children, budget)
        cur()["children"].append({"type": "text", "children": children if cost <= budget else []})
        budget -= min(cost, budget) + 1

    for m in _TOKEN_RE.finditer(text):
        if budget <= 0:
            break
        add_text(text[pos:m.start()])
        pos = m.end()
        tok = m.group(0)
        role, word = _classify_token(tok)
        inner = tok[3:-2].strip()
        if role == "close":
            # pop to the matching opener (tolerate an unbalanced closer = no-op)
            for i in range(len(stack) - 1, 0, -1):
                if stack[i][0] == word:
                    del stack[i:]
                    break
            continue
        if role == "sharktooth" and word in _BLOCK_OPENERS:
            # block IFF a matching closer exists ahead (mirrors lar-sigil findCloseEnd).
            close_key = word
            # kahea/aka compound child-slot: <<~ kahea ahu #slot >> closes on word1 (kahea)
            tail = inner[len(word):].strip().split()
            if word in ("kahea", "aka") and tail and tail[0] in _CHILD_SLOTS:
                close_key = word
            if f"<<~/{close_key}" in text[pos:]:
                node = {"type": "ahu_block" if word == "ahu" else "sharktooth_block",
                        "children": [{"type": "sigil_name", "children": []}]}
                cur()["children"].append(node)
                stack.append((close_key, node))
                budget -= 1
                continue
        # leaf sigil / pranala-header / doctype / non-block sharktooth
        cur()["children"].append(_sigil_node(role, word, inner))
        budget -= 1
    add_text(text[pos:])
    return root


# ── the PROSE tier — stanza constituency → spaCy dependency → nltk → regex ─────────────

_spacy_nlp = None
_spacy_tried = False
_stanza_nlp = None
_stanza_tried = False


def _device_cap() -> str:
    """The COMPUTE-DEVICE cap this box #has — resolved, never ambient. `cuda` when a torch
    GPU stands (this box), else `cpu` (e.g. the QA-lab lararium, a separate box with no card).
    An env override (STRUCTURE_ROUTER_DEVICE / MEMPALACE_EMBEDDING_DEVICE) forces the hand.
    The GPU is a CAP the entity composes when present — NEVER a dependency; the SAME nameless
    router stands at both scales, the cap resolving high on the card, low on the CPU."""
    forced = (os.environ.get("STRUCTURE_ROUTER_DEVICE")
              or os.environ.get("MEMPALACE_EMBEDDING_DEVICE") or "auto").strip().lower()
    if forced in ("cpu", "cuda"):
        return forced
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:  # noqa: BLE001 — no torch ⇒ CPU (stanza would not import either)
        return "cpu"


def _prose_stanza(text: str) -> dict | None:
    """Tier 1: stanza constituency parse (Stanford NLP — maintained, PyTorch, modern-torch
    clean). The nested phrase SPANS `(ROOT (S (NP …) (VP …)))` are exactly the form-induction
    template candidates (corpus.md #the-form-induction). Replaces the unmaintained benepar,
    which is dead against transformers ≥5 (T5Tokenizer API drift). Content-free: a phrase /
    POS LABEL rides each node, never the word. On any failure ⇒ None (spaCy tier takes over).

    The compute device rides {@link _device_cap} — the GPU is a CAP, not a dependency: on a
    card it lands `cuda`, on the QA box it lands `cpu`, the SAME tier standing either way. The
    English constituency model auto-downloads once into ~/stanza_resources on first use
    (matching how spaCy/nltk models bootstrap); thereafter it reuses the local copy."""
    global _stanza_nlp, _stanza_tried
    if _stanza_tried and _stanza_nlp is None:
        return None
    if _stanza_nlp is None:
        _stanza_tried = True
        device = _device_cap()
        try:
            import stanza

            # use_gpu gates the cap explicitly; stanza still self-checks torch.cuda, so a
            # cap:cuda that fails to place falls to CPU inside stanza rather than crashing.
            _stanza_nlp = stanza.Pipeline(
                "en", processors="tokenize,pos,constituency", verbose=False,
                use_gpu=(device == "cuda"),
            )
            sys.stderr.write(f"structure_router: stanza constituency on device-cap '{device}'\n")
        except Exception as exc:  # noqa: BLE001 — stanza / its model absent ⇒ spaCy tier
            sys.stderr.write(f"structure_router: stanza unavailable ({type(exc).__name__}) — spaCy tier\n")
            _stanza_nlp = None
            return None
    try:
        doc = _stanza_nlp(text[:100_000])
        root = {"type": "source_file", "children": []}
        budget = [_MAX_NODES]

        def conv(tree, depth: int) -> dict:
            # a word leaf (no children) → a content-free token; a phrase/POS node → its label.
            if not tree.children or depth >= _MAX_DEPTH:
                return {"type": "token", "children": []}
            kids = []
            for c in tree.children:
                if budget[0] <= 0:
                    break
                budget[0] -= 1
                kids.append(conv(c, depth + 1))
            return {"type": str(tree.label), "children": kids}

        for sent in doc.sentences:
            root["children"].append(conv(sent.constituency, 0))
        return root if root["children"] else None
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"structure_router: stanza parse failed ({type(exc).__name__}) — spaCy tier\n")
        return None


def _prose_spacy(text: str) -> dict | None:
    """Tier 2: spaCy dependency tree — a genuine nested syntactic structure (each token's
    dependency LABEL is the node type, recursed over its head→children). Content-free:
    the dep label rides, never the word."""
    global _spacy_nlp, _spacy_tried
    if _spacy_tried and _spacy_nlp is None:
        return None
    if _spacy_nlp is None:
        _spacy_tried = True
        try:
            import spacy

            _spacy_nlp = spacy.load("en_core_web_md", disable=["ner", "lemmatizer"])
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(f"structure_router: spaCy model unavailable ({type(exc).__name__}) — nltk tier\n")
            _spacy_nlp = None
            return None
    try:
        doc = _spacy_nlp(text[:100_000])
        root = {"type": "source_file", "children": []}
        budget = [_MAX_NODES]

        def conv(tok, depth: int) -> dict:
            kids = []
            if depth < _MAX_DEPTH:
                for c in tok.children:
                    if budget[0] <= 0:
                        break
                    budget[0] -= 1
                    kids.append(conv(c, depth + 1))
            return {"type": tok.dep_ or "dep", "children": kids}

        for sent in doc.sents:
            root["children"].append(conv(sent.root, 0))
        return root if root["children"] else None
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"structure_router: spaCy parse failed ({type(exc).__name__}) — nltk tier\n")
        return None


def _prose_segment(text: str) -> dict:
    """Tier 3/4: a shallow paragraph → sentence → token tree. Uses nltk punkt when present,
    else a regex split. Always succeeds — the prose floor that never structure-skips."""
    try:
        import nltk

        sent_split = nltk.sent_tokenize
        word_split = nltk.word_tokenize
    except Exception:  # noqa: BLE001
        sent_split = lambda s: _re.split(r"(?<=[.!?])\s+", s)  # noqa: E731
        word_split = lambda s: s.split()  # noqa: E731
    root = {"type": "source_file", "children": []}
    budget = _MAX_NODES
    for para in _re.split(r"\n\s*\n", text):
        if not para.strip() or budget <= 0:
            continue
        pnode = {"type": "paragraph", "children": []}
        for sent in sent_split(para)[:200]:
            if not sent.strip() or budget <= 0:
                continue
            snode = {"type": "sentence", "children": []}
            for _ in word_split(sent)[:200]:
                if budget <= 0:
                    break
                snode["children"].append({"type": "token", "children": []})
                budget -= 1
            pnode["children"].append(snode)
        if pnode["children"]:
            root["children"].append(pnode)
    return root


def parse_prose(text: str) -> dict:
    """Prose → constituency-ish tree, best tier available (stanza → spaCy → segment)."""
    return _prose_stanza(text) or _prose_spacy(text) or _prose_segment(text)


# ── the router front door ──────────────────────────────────────────────────────────────


def parse_memetic(text: str) -> dict:
    """memetic-wikitext, parsed down the GRACEFUL GRADIENT: the `<<~ … >>` sigil layer wraps, and
    every span beneath it parses as prose. A turn that invokes no sigil degrades to its prose
    constituency — never to one structureless `text` node, which would give every sigil-less
    document the same structural hash.

    The gradient IS the grammar: memetic-wikitext ⊃ wikitext ⊃ markdown ⊃ prose. A degraded state
    is still a state; no record falls out of the structure plane for failing to speak sigils."""
    return parse_sigils(text, prose=parse_prose)


def parse_to_tree(kind: str | None, source: bytes | str) -> dict | None:
    """Route a corpus chunk of `kind` to its parser → the encoder's nested-dict tree.

    A None kind still returns None — an unlabelled BYTE BLOB carries no grammar and must not be
    force-read as prose. Text that IS text says so: the AI-surface source-caps stamp
    `lar_kind = memetic-wikitext`, and that kind rides the graceful gradient down to prose."""
    if kind is None:
        return None
    text = _decode(source) if isinstance(source, (bytes, bytearray)) else source
    raw = source if isinstance(source, (bytes, bytearray)) else text.encode("utf-8")
    if kind == "memetic-wikitext":
        return parse_memetic(text)
    if kind == "prose":
        return parse_prose(text)
    if kind in _TS_MODULE:
        # A text language whose grammar module is absent degrades down the gradient rather than
        # dropping the record — the parse fails, the text does not stop being text.
        return _parse_treesitter(kind, raw) or parse_memetic(text)
    return None


# ── canonicalization + structural hash (mirrors the TS crypto.canonicalJson) ───────────


def canonical_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def structural_hash(tree) -> str:
    import hashlib

    return hashlib.sha256(canonical_json(tree).encode("utf-8")).hexdigest()


# ── the batch INGEST command — router → structurepalace encoder → structure palace ───────────

# Skip dirs / files that carry no structural corpus signal.
_SKIP_DIRS = {".git", "node_modules", "dist", "__pycache__", ".venv", ".corpus",
              ".structurepalace", ".meshpalace", ".mempalace"}
_MAX_FILE_BYTES = 2_000_000


def _iter_files(path: str):
    if os.path.isfile(path):
        yield path
        return
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS and not d.startswith(".corpus")]
        for fn in filenames:
            yield os.path.join(dirpath, fn)


def cmd_ingest(args) -> None:
    """Walk a source path; parse each file via the router; push each tree through the
    structurepalace structural encoder into a structure chroma-palace under <palace>. Graceful:
    a file the router can't parse is counted `skipped`, never fatal. JSON summary on stdout."""
    src = args.path
    palace_dir = args.palace
    summary = {"files_seen": 0, "parsed": 0, "structures": 0, "skipped": 0, "by_kind": {}, "errors": []}

    # The encoder + store live in structurepalace_io (lazy import: `parse` needs neither, and a
    # missing mempalace/chroma must degrade to a clean structure-skip, not a crash).
    try:
        import structurepalace_io
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"structurepalace-encoder-unavailable: {type(exc).__name__}: {exc}")
        sys.stdout.write(json.dumps(summary) + "\n")
        return

    store = None
    try:
        store = structurepalace_io.StructurePalaceStore(palace_dir)
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"structure-palace-unavailable: {type(exc).__name__}: {exc}")
        sys.stdout.write(json.dumps(summary) + "\n")
        return

    for fp in _iter_files(src):
        try:
            if os.path.getsize(fp) > _MAX_FILE_BYTES:
                summary["skipped"] += 1
                continue
            with open(fp, "rb") as fh:
                raw = fh.read()
        except OSError:
            summary["skipped"] += 1
            continue
        summary["files_seen"] += 1
        kind = detect_kind(fp, raw)
        if kind is None:
            summary["skipped"] += 1
            continue
        try:
            tree = parse_to_tree(kind, raw)
        except Exception as exc:  # noqa: BLE001 — one bad file never sinks the sweep
            summary["skipped"] += 1
            summary["errors"].append(f"{os.path.basename(fp)}: parse {type(exc).__name__}")
            continue
        if tree is None:
            summary["skipped"] += 1
            continue
        ast_json = canonical_json(tree)
        h = structural_hash(tree)
        rel = os.path.relpath(fp, src) if os.path.isdir(src) else os.path.basename(fp)
        try:
            store.put(h, ast_json, source_file=rel, verbatim_sha=h, turn_key="")
        except Exception as exc:  # noqa: BLE001
            summary["skipped"] += 1
            summary["errors"].append(f"{os.path.basename(fp)}: store {type(exc).__name__}")
            continue
        summary["parsed"] += 1
        summary["structures"] += 1
        summary["by_kind"][kind] = summary["by_kind"].get(kind, 0) + 1

    sys.stdout.write(json.dumps(summary) + "\n")


def cmd_parse(args) -> None:
    """Parse ONE file → the structure tree as JSON on stdout (the router probe / test face)."""
    with open(args.path, "rb") as fh:
        raw = fh.read()
    kind = args.kind or detect_kind(args.path, raw)
    tree = parse_to_tree(kind, raw)
    sys.stdout.write(json.dumps({"path": args.path, "kind": kind, "tree": tree}, ensure_ascii=False) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="structure_router — the corpus structure-plane parse router")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("parse", help="parse one file → its structure tree as JSON")
    p.add_argument("--path", required=True)
    p.add_argument("--kind", default="", help="force a kind (else auto-detect)")
    p.set_defaults(fn=lambda a: cmd_parse(argparse.Namespace(path=a.path, kind=a.kind or None)))
    g = sub.add_parser("ingest", help="walk a path → parse each file → structure chroma-palace under --palace")
    g.add_argument("--path", required=True)
    g.add_argument("--palace", required=True)
    g.set_defaults(fn=cmd_ingest)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
