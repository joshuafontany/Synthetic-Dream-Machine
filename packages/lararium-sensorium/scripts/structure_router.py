#!/usr/bin/env python3
"""structure_router — the STRUCTURE-plane parse ROUTER for the lares-corpus.

The corpus sensorium's structure cap (corpus.md #the-caps) names two halves:
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
  memetic-wikitext    -> THE CARRIER (tree-sitter-memetic-wikitext, the one grammar
                         artifact — sigils + ahu + the TW5 forms), prose grafted
                         under text runs (the graceful gradient)
  tiddlywiki (.tid)   -> the same carrier (ours supersets TW5 — the dialect wall)
  prose               -> stanza constituency (Stanford, maintained, modern-torch — the
                         nested SPANS are the form-induction template candidates) → spaCy
                         dependency tree → nltk sentence/word → regex (graceful tiers)

GRACEFUL by construction: a kind with no available parser yields None ⇒ the caller
records `structure-skipped` and the content plane still stands. The heavy tree-sitter
/ spaCy imports are LAZY (per-kind), so `parse` of one kind never pays for another.

Protocol — three faces:
  * the library: `detect_kind`, `parse_to_tree`, `parse_prose`
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
import re as _re
import signal
import sys
import threading

# A hard cap on tree size — a pathological / huge file cannot make the encoder walk
# unbounded. The shape vector saturates well before this; truncation only drops the
# deepest tail, never the dominant silhouette.
_MAX_NODES = 20_000

# stanza's constituency parse is O(sentence-length³): a single pathological "sentence" — a table, an index,
# a run-on with no terminal punctuation — walks for HOURS and locks the whole pour. Two graceful-failure
# guards keep the top prose tier degrading INTO its gradient (spaCy → nltk → regex) instead of hanging:
#   · a per-sentence CHAR cap bounds the cubic input before it reaches the parser (the dominant fix);
#   · a wall-clock TIMEOUT is the general backstop — any residual hang falls through to the spaCy tier.
_MAX_SENT_CHARS = 2_000     # ~400 tokens; above this a "sentence" is layout/data, not prose worth a tree
_STANZA_TIMEOUT_S = 60      # a legitimate 100k-char parse finishes in seconds; this only catches pathology
# PROGRESSIVE BOUNDING — a chat block mixes prose with code / tool-output / sigil runs, and the O(n³)
# constituency search on those non-prose tails is what blows the timeout. Rather than drop the WHOLE block
# to the weaker spaCy tier on the first timeout, re-parse with a tighter per-sentence cap: shorter sentences
# parse far faster, so the block's real prose still lands a CLEAN constituency tree (the tail just truncates
# harder). Only when even the tightest cap times out does the tier degrade. Maximizes the clean-parse rate.
_STANZA_CAPS = (_MAX_SENT_CHARS, 600, 200)


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
    ".tid": "tiddlywiki",
    ".wiki": "wikitext", ".mediawiki": "wikitext", ".wikitext": "wikitext",
    ".txt": "prose", ".text": "prose",
}

# The memetic-wikitext doctype marker the house stamps on its own memes (corpus.md, the
# sigil tiddlers): its presence (or a dense run of `<<~`) promotes a file to the carrier.
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
        if is_memetic and kind in (None, "markdown", "prose", "wikitext", "tiddlywiki"):
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


# ── the CARRIER route — TW5 + memetic ground through the one grammar artifact ──────────

_carrier_parser_cache: list[object | None] | None = None


def _carrier_parser():
    """The committed carrier grammar (tree-sitter-memetic-wikitext), loaded through the
    fold's own single-source loader — one grammar, every host, this route included.
    Absent artifact ⇒ None (graceful: the kind rides the gradient down)."""
    global _carrier_parser_cache
    if _carrier_parser_cache is not None:
        return _carrier_parser_cache[0]
    parser = None
    try:
        host_py = os.path.normpath(os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "tree-sitter-memetic-wikitext", "host-py"))
        if host_py not in sys.path:
            sys.path.insert(0, host_py)
        import memeast_fold as _mf
        from tree_sitter import Parser

        parser = Parser(_mf._language())
    except Exception as exc:  # noqa: BLE001 — artifact absent ⇒ the gradient serves
        sys.stderr.write(f"structure_router: carrier grammar unavailable ({type(exc).__name__}: {exc})\n")
        parser = None
    _carrier_parser_cache = [parser]
    return parser


def _parse_carrier(source: bytes, prose=None) -> dict | None:
    """TW5/memetic ground → the encoder's nested-dict tree via the carrier grammar.
    Content-free: node TYPES ride, text never does — the structure plane's currency.
    With `prose`, consecutive text-line runs graft their constituency subtree (the
    graceful gradient: the superset's skeleton above, the prose's own shape below)."""
    parser = _carrier_parser()
    if parser is None:
        return None
    raw = source if isinstance(source, (bytes, bytearray)) else source.encode("utf-8")
    tree = parser.parse(raw)
    budget = [_MAX_NODES]
    return _carrier_to_tree(tree.root_node, raw, budget, prose, 0)


def _carrier_to_tree(node, raw: bytes, budget: list[int], prose, depth: int) -> dict:
    """Carrier CST → encoder tree. Consecutive text_line runs coalesce into ONE
    `text` node (blank lines inside a run keep the paragraph breaks the prose
    tier splits on), grafted through `prose` under the node budget."""
    children: list[dict] = []
    buf: list[tuple[int, int]] = []  # [start_byte, end_byte] of the open text run

    def flush() -> None:
        if not buf:
            return
        start, end = buf[0][0], buf[-1][1]
        buf.clear()
        span = raw[start:end].decode("utf-8", errors="replace")
        if not span.strip() or budget[0] <= 0:
            return
        if prose is None:
            children.append({"type": "text", "children": []})
            budget[0] -= 1
            return
        sub = prose(span)
        kids = sub.get("children", []) if isinstance(sub, dict) else []
        cost = _count_nodes(kids, budget[0])
        children.append({"type": "text", "children": kids if cost <= budget[0] else []})
        budget[0] -= min(cost, budget[0]) + 1

    if depth < _MAX_DEPTH:
        for child in node.named_children:
            if budget[0] <= 0:
                break
            if child.type == "text_line":
                buf.append((child.start_byte, child.end_byte))
                continue
            if child.type == "blank_line":
                if buf:
                    buf.append((child.start_byte, child.end_byte))
                continue
            flush()
            budget[0] -= 1
            children.append(_carrier_to_tree(child, raw, budget, prose, depth + 1))
        flush()
    return {"type": node.type, "children": children}


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


def _bound_sentences(text: str, cap: int = _MAX_SENT_CHARS) -> str:
    """Truncate any candidate sentence over `cap` chars so the O(n³) constituency parse stays bounded. Splits
    on sentence terminals and hard line breaks (a table's rows, a run-on's absent terminals), keeps each
    segment's head, and rejoins preserving the delimiters — graceful degradation of the pathological tail,
    never a hang. Prose sentences sit far under the cap; only data/layout runs get clipped."""
    parts = _re.split(r"([.!?\n])", text)          # keep the delimiters so layout survives
    out = []
    for i in range(0, len(parts), 2):
        seg = parts[i]
        out.append(seg[:cap] if len(seg) > cap else seg)
        if i + 1 < len(parts):
            out.append(parts[i + 1])
    return "".join(out)


def _call_stanza(text: str):
    """Run the stanza pipeline under a wall-clock timeout so no residual pathology can hang the pour. The
    alarm rides the MAIN thread only (signal's home); off the main thread the per-sentence cap alone guards,
    and the call runs plain. A timeout raises through as an ordinary exception → the spaCy tier takes over."""
    on_main = threading.current_thread() is threading.main_thread()
    if _STANZA_TIMEOUT_S and hasattr(signal, "SIGALRM") and on_main:
        def _boom(_sig, _frame):
            raise TimeoutError(f"stanza constituency exceeded {_STANZA_TIMEOUT_S}s — degrading tier")
        prev = signal.signal(signal.SIGALRM, _boom)
        signal.alarm(_STANZA_TIMEOUT_S)
        try:
            return _stanza_nlp(text)
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, prev)
    return _stanza_nlp(text)


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
    clipped = text[:100_000]
    for cap in _STANZA_CAPS:                 # progressive bounding — stay in the clean tier before degrading
        try:
            doc = _call_stanza(_bound_sentences(clipped, cap))
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
        except TimeoutError:
            if cap != _STANZA_CAPS[-1]:
                sys.stderr.write(f"structure_router: stanza timeout at sent-cap {cap} — retry tighter\n")
                continue                     # a tighter cap parses faster; keep the block in stanza
            sys.stderr.write("structure_router: stanza timed out at every sent-cap — spaCy tier\n")
            return None
        except Exception as exc:  # noqa: BLE001 — stanza broke on this text ⇒ spaCy tier
            sys.stderr.write(f"structure_router: stanza parse failed ({type(exc).__name__}) — spaCy tier\n")
            return None
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
        doc = _spacy_nlp(_bound_sentences(text[:100_000]))   # same per-sentence guard as the stanza tier
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
    for para in _re.split(r"\n\s*\n", _bound_sentences(text[:100_000])):   # same input bound as the tiers above
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
        # the house dialect rides the ONE carrier; prose grafts under text runs
        # (the graceful gradient). Absent artifact ⇒ prose serves, degraded loud.
        return _parse_carrier(raw, prose=parse_prose) or parse_prose(text)
    if kind == "tiddlywiki":
        # THE DIALECT WALL: three kinds stay distinct as DECLARED dialects —
        # memetic-wikitext (ours, the superset) ⊃ tiddlywiki (TW5, this route) ⊥
        # wikitext (MediaWiki, foreign — its own pip grammar). TW5 rides the
        # carrier grammar natively BECAUSE ours supersets it; the kind stamp
        # still says what the author declared, never which parser read it.
        # Absent artifact, the sigil parser + prose gradient still serves.
        return _parse_carrier(raw, prose=parse_prose) or parse_prose(text)
    if kind == "prose":
        return parse_prose(text)
    if kind in _TS_MODULE:
        # A text language whose grammar module is absent degrades down the gradient rather than
        # dropping the record — the parse fails, the text does not stop being text.
        return _parse_treesitter(kind, raw) or _parse_carrier(raw, prose=parse_prose) or parse_prose(text)
    return None


# ── canonicalization + structural hash (mirrors the TS crypto.canonicalJson) ───────────


def canonical_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def structural_hash(tree) -> str:
    # Routes the identity KEY through the ONE content-address home (deep_time.content_hash,
    # hash-agility); today still sha256, BYTE-IDENTICAL, so it stays byte-for-byte the TS
    # crypto.canonicalJson mirror and every stored structural key resolves.
    from deep_time import content_hash

    return content_hash(canonical_json(tree).encode("utf-8"))


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
