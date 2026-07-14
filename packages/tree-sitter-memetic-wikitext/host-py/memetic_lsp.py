#!/usr/bin/env python3
"""memetic_lsp — the LSP server over the one grammar artifact.

The server reads the SAME compiled grammar the pipe folds with (memeast_fold
loads the committed parser.c) and the SAME shipped query files, so editor
symbols, colors, and diagnostics share one vocabulary source with the MemeAst
projections — the artifact serves every host, and none can drift alone.

Three reading surfaces, each a pure function over ground BYTES (the only span
currency; the UTF-16 conversion happens once, at the editor boundary):
  · semantic_tokens — highlights.scm captures → LSP delta-encoded ints,
    flattened narrowest-wins (a sigil body colors over its sigil teeth)
  · document_symbols — the starved fold's MemeAst → an outline (ahu blocks
    nest, headings and fences ride where they stand)
  · diagnostics — ERROR/MISSING nodes + the coverage gauge (the
    corpus-outgrew-grammar tell, the same gauge the pipe consumers watch)

The pygls wiring stays a thin skin at the bottom: every reading tests without
a socket. Serve over stdio: `python memetic_lsp.py`.

Meme: lar:///ha.ka.ba/lararium/sensorium/memetic-lsp
"""
from __future__ import annotations

import bisect
import os

import memeast_fold as mf

SERVER_NAME = "memetic-wikitext-lsp"
SERVER_VERSION = "0.1.0"

#: the semantic-token legend, in legend order (indices ride the wire)
TOKEN_TYPES = ["macro", "string", "operator", "keyword", "comment"]

#: highlights.scm capture name → legend token type
_CAPTURE_TO_TYPE = {
    "function.macro": "macro",
    "string.special": "string",
    "punctuation.special": "operator",
    "markup.raw": "string",
    "markup.heading": "keyword",
    "markup.list": "operator",
    "comment": "comment",
}

_ERROR_COVERAGE_CEILING = 0.02  # past this, the grammar no longer fits the ground


def _query_path(name: str) -> str:
    return os.path.join(mf._GRAMMAR_DIR, "queries", name)


class ByteIndex:
    """Byte offset → (line, UTF-16 column). The one currency exchange:
    tree-sitter and the MemeAst speak bytes; the LSP wire speaks UTF-16."""

    def __init__(self, data: bytes):
        self._data = data
        self._line_starts = [0]
        pos = data.find(b"\n")
        while pos != -1:
            self._line_starts.append(pos + 1)
            pos = data.find(b"\n", pos + 1)

    def position(self, byte_off: int) -> tuple[int, int]:
        line = bisect.bisect_right(self._line_starts, byte_off) - 1
        prefix = self._data[self._line_starts[line]:byte_off].decode("utf-8", errors="replace")
        return line, _utf16_len(prefix)


def _utf16_len(text: str) -> int:
    return sum(2 if ord(c) > 0xFFFF else 1 for c in text)


# --- semantic tokens ---------------------------------------------------------

def _highlight_spans(data: bytes) -> list[tuple[int, int, str]]:
    """Run the shipped highlights query; yield (start, end, token_type)."""
    from tree_sitter import Parser, Query, QueryCursor

    lang = mf._language()
    tree = Parser(lang).parse(data)
    with open(_query_path("highlights.scm"), encoding="utf-8") as fh:
        query = Query(lang, fh.read())
    spans = []
    for name, nodes in QueryCursor(query).captures(tree.root_node).items():
        token_type = _CAPTURE_TO_TYPE.get(name)
        if token_type is None:
            continue  # a capture the legend never claims stays editor-only
        for n in nodes:
            if n.start_byte < n.end_byte:
                spans.append((n.start_byte, n.end_byte, token_type))
    return spans


def _leaf_segments(spans: list[tuple[int, int, str]]) -> list[tuple[int, int, str]]:
    """Flatten properly-nested capture spans narrowest-wins: each byte gets
    the innermost capture that covers it (the sigil body overrides the teeth)."""
    spans = sorted(spans, key=lambda s: (s[0], -s[1]))
    segments: list[tuple[int, int, str]] = []
    stack: list[list] = []  # [start, end, type, cursor]

    def _close_through(pos: float) -> None:
        while stack and stack[-1][1] <= pos:
            start, end, typ, cursor = stack.pop()
            if cursor < end:
                segments.append((cursor, end, typ))
            if stack:
                stack[-1][3] = end  # the parent resumes past its child
    for start, end, typ in spans:
        _close_through(start)
        if stack and stack[-1][3] < start:
            segments.append((stack[-1][3], start, stack[-1][2]))
            stack[-1][3] = start
        stack.append([start, end, typ, start])
    _close_through(float("inf"))
    return segments


def semantic_tokens(data: bytes) -> list[int]:
    """Ground bytes → the LSP delta-encoded token stream (groups of five:
    deltaLine, deltaStartChar, length, tokenType, tokenModifiers). Segments
    split at newlines so no token spans lines (the widest client contract)."""
    index = ByteIndex(data)
    encoded: list[int] = []
    prev_line, prev_col = 0, 0
    for start, end, typ in _leaf_segments(_highlight_spans(data)):
        seg_start = start
        while seg_start < end:
            nl = data.find(b"\n", seg_start, end)
            seg_end = end if nl == -1 else nl
            if seg_end > seg_start:
                line, col = index.position(seg_start)
                length = _utf16_len(data[seg_start:seg_end].decode("utf-8", errors="replace"))
                delta_line = line - prev_line
                delta_col = col - prev_col if delta_line == 0 else col
                encoded.extend([delta_line, delta_col, length, TOKEN_TYPES.index(typ), 0])
                prev_line, prev_col = line, col
            seg_start = seg_end + 1
    return encoded


# --- document symbols --------------------------------------------------------

def _slice(data: bytes, node: dict) -> str:
    return data[node["start"]:node["end"]].decode("utf-8", errors="replace").strip()


def _symbol_name(data: bytes, node: dict) -> str:
    kind = node["kind"]
    if kind == "meme.ahu":
        opener = node.get("open")
        if not opener:
            return "ahu"
        # the field node rides flat (no nested body) — shed the teeth by hand
        text = _slice(data, opener)
        return text.removeprefix("<<~").removesuffix(">>").strip() or "ahu"
    if kind == "meme.heading":
        return _slice(data, node).lstrip("#!").strip() or "!"
    if kind == "meme.fence":
        info = node.get("info")
        text = (_slice(data, info) if info else "```").lstrip("`").strip()
        return text or "fence"
    body = node.get("body")
    return _slice(data, body) if body else _slice(data, node)


#: MemeAst kind → LSP SymbolKind number (Namespace=3, String=15, Object=19)
_SYMBOL_KINDS = {"meme.ahu": 3, "meme.heading": 15, "meme.fence": 19}


def document_symbols(data: bytes) -> list[dict]:
    """The starved fold's MemeAst → a plain-dict outline the wiring lifts
    into lsprotocol types. Only structural kinds surface; ahu blocks nest."""
    index = ByteIndex(data)

    def _range(node: dict) -> dict:
        sl, sc = index.position(node["start"])
        el, ec = index.position(node["end"])
        return {"start": {"line": sl, "character": sc}, "end": {"line": el, "character": ec}}

    def _walk(node: dict) -> list[dict]:
        out = []
        for child in node.get("children", []):
            if child["kind"] in _SYMBOL_KINDS:
                out.append({
                    "name": _symbol_name(data, child),
                    "kind": _SYMBOL_KINDS[child["kind"]],
                    "range": _range(child),
                    "selectionRange": _range(child.get("open", child)),
                    "children": _walk(child),
                })
            else:
                out.extend(_walk(child))
        return out
    return _walk(mf.fold(data))


# --- diagnostics -------------------------------------------------------------

def diagnostics(data: bytes) -> tuple[list[dict], float]:
    """ERROR/MISSING nodes as plain-dict diagnostics + the ERROR-coverage
    fraction — the same gauge the pipe consumers fail loud on."""
    from tree_sitter import Parser

    tree = Parser(mf._language()).parse(data)
    index = ByteIndex(data)
    found: list[dict] = []
    error_bytes = 0
    cursor = tree.walk()
    running = True
    while running:
        node = cursor.node
        if node.is_error or node.is_missing:
            # count the whole span once; never descend (nested marks would double-count)
            error_bytes += node.end_byte - node.start_byte
            sl, sc = index.position(node.start_byte)
            el, ec = index.position(node.end_byte)
            found.append({
                "range": {"start": {"line": sl, "character": sc},
                          "end": {"line": el, "character": ec}},
                "severity": 1,  # Error
                "source": SERVER_NAME,
                "message": ("the carrier expected a token here" if node.is_missing
                            else "the carrier cannot read this span"),
            })
            running = _advance_skipping(cursor)
        elif node.has_error:
            running = _advance(cursor)  # a mark hides somewhere beneath
        else:
            running = _advance_skipping(cursor)  # a clean subtree reports nothing
    coverage = (error_bytes / len(data)) if data else 0.0
    if coverage > _ERROR_COVERAGE_CEILING:
        found.append({
            "range": {"start": {"line": 0, "character": 0},
                      "end": {"line": 0, "character": 0}},
            "severity": 2,  # Warning
            "source": SERVER_NAME,
            "message": f"ERROR coverage {coverage:.1%} — the ground may have outgrown the grammar",
        })
    return found, coverage


def _advance(cursor) -> bool:
    if cursor.goto_first_child():
        return True
    return _advance_skipping(cursor)


def _advance_skipping(cursor) -> bool:
    while True:
        if cursor.goto_next_sibling():
            return True
        if not cursor.goto_parent():
            return False


# --- the pygls skin ----------------------------------------------------------

def build_server():
    """Wire the pure readings onto a pygls LanguageServer. Import stays inside
    so the readings above test without pygls installed."""
    from lsprotocol import types as lsp
    from pygls.lsp.server import LanguageServer

    server = LanguageServer(SERVER_NAME, SERVER_VERSION)

    def _text(params) -> bytes:
        doc = server.workspace.get_text_document(params.text_document.uri)
        return doc.source.encode("utf-8")

    def _publish(uri: str, data: bytes) -> None:
        found, _ = diagnostics(data)
        server.text_document_publish_diagnostics(lsp.PublishDiagnosticsParams(
            uri=uri,
            diagnostics=[lsp.Diagnostic(
                range=_lift_range(d["range"]),
                severity=lsp.DiagnosticSeverity(d["severity"]),
                source=d["source"],
                message=d["message"],
            ) for d in found],
        ))

    def _lift_range(r: dict) -> "lsp.Range":
        return lsp.Range(
            start=lsp.Position(line=r["start"]["line"], character=r["start"]["character"]),
            end=lsp.Position(line=r["end"]["line"], character=r["end"]["character"]),
        )

    def _lift_symbol(s: dict) -> "lsp.DocumentSymbol":
        return lsp.DocumentSymbol(
            name=s["name"], kind=lsp.SymbolKind(s["kind"]),
            range=_lift_range(s["range"]), selection_range=_lift_range(s["selectionRange"]),
            children=[_lift_symbol(c) for c in s["children"]],
        )

    @server.feature(lsp.TEXT_DOCUMENT_DID_OPEN)
    def _did_open(ls, params):
        _publish(params.text_document.uri, params.text_document.text.encode("utf-8"))

    @server.feature(lsp.TEXT_DOCUMENT_DID_CHANGE)
    def _did_change(ls, params):
        _publish(params.text_document.uri, _text(params))

    @server.feature(
        lsp.TEXT_DOCUMENT_SEMANTIC_TOKENS_FULL,
        lsp.SemanticTokensLegend(token_types=TOKEN_TYPES, token_modifiers=[]),
    )
    def _tokens(ls, params):
        return lsp.SemanticTokens(data=semantic_tokens(_text(params)))

    @server.feature(lsp.TEXT_DOCUMENT_DOCUMENT_SYMBOL)
    def _symbols(ls, params):
        return [_lift_symbol(s) for s in document_symbols(_text(params))]

    return server


if __name__ == "__main__":
    build_server().start_io()
