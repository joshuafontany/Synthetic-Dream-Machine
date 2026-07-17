#!/usr/bin/env python3
"""lexical_index — the LEXICAL recall surface as a DERIVED, REBUILDABLE view over the one content source.

A contentless SQLite FTS5 index (`content=''`) tokenizes chunk-spans and stores TOKENS ONLY — no verbatim
bytes at rest. A side `spans` table holds each chunk's `(cid, start, end)` offsets (no bytes either). A
query matches tokens → span rowids (BM25-ranked) → spans → verbatim resolved from the content plane by
cid + slice. So the mempalace gains an INDEPENDENT chunk-segmented lexical surface — a segmentation
DISTINCT from the content plane's turns — that duplicates NO source bytes and rebuilds from content alone
(the one-bit test). This is the standoff + external-content-FTS form the kupono data-model research named:
content is the single writable arbiter; this index is a disposable projection over it.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Callable

from span_layer import Span, chunk_spans

# The stream does as the stream does — content holds the raw bytes untouched. But a lexical VIEW over a
# terminal/session stream reads pono only after MINIMAL semantic cleaning: ANSI/VT display escapes (color
# SGR + friends) and stray C0 control chars carry no searchable meaning, and left in they glue onto words
# (`\x1b[1mOpus` tokenizes to `1mOpus`, so a search for "Opus" misses). Normalize them to a space in the
# INDEXED TOKENS ONLY; the span table keeps RAW offsets, so a resolve returns the true stream verbatim.
_ANSI_CSI = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")
_C0_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")  # C0 controls EXCEPT \t (09) \n (0a) \r (0d)


def _normalize_for_index(text: str) -> str:
    """Minimal semantic cleaning for the lexical VIEW — strip ANSI escapes + stray control chars to a
    space so words stay findable. Never touches content; only the tokens this index holds at rest."""
    return _C0_CTRL.sub(" ", _ANSI_CSI.sub(" ", text))


class LexicalIndex:
    """A contentless-FTS5 lexical surface over content-addressed atoms. Tokens live here; bytes live in
    content. Drop it and re-index to rebuild — it holds no authority, only a derived view."""

    def __init__(self, db_path: str = ":memory:") -> None:
        self._db = sqlite3.connect(db_path)
        self._create()
        self._db.commit()

    def _create(self) -> None:
        # contentless FTS5 — indexes tokens, stores no document; the side table carries the spans (offsets).
        self._db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(text, content='')")
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS spans "
            "(rowid INTEGER PRIMARY KEY, cid TEXT, start INTEGER, end INTEGER, layer TEXT)"
        )

    def index_atom(self, cid: str, text: str, size: int = 512, overlap: int = 64, layer: str = "chunk") -> int:
        """Chunk ONE content atom into overlapping lexical spans and index each chunk's tokens. The chunk
        text tokenizes into the FTS (tokens only at rest); the span's offsets land in the side table. The
        chunk text reads from the atom text in hand — content is not re-fetched at index time."""
        n = 0
        for span in chunk_spans(cid, len(text), size=size, overlap=overlap, layer=layer):
            cur = self._db.execute(
                "INSERT INTO spans(cid, start, end, layer) VALUES (?,?,?,?)",
                (span.cid, span.start, span.end, span.layer),
            )
            # The span keeps RAW offsets (above); the FTS holds the NORMALIZED tokens, so the view reads
            # pono while a resolve still returns the true stream from content.
            self._db.execute(
                "INSERT INTO chunks_fts(rowid, text) VALUES (?, ?)",
                (cur.lastrowid, _normalize_for_index(text[span.start:span.end])),
            )
            n += 1
        self._db.commit()
        return n

    def search(self, query: str, get_content: Callable[[str], "str | None"], k: int = 10) -> "list[tuple[Span, str]]":
        """MATCH the lexical query → span rowids (BM25-ranked) → resolve each span's VERBATIM from content.
        The FTS holds no bytes; the exact words come from the one content source on read."""
        rows = self._db.execute(
            "SELECT s.cid, s.start, s.end, s.layer FROM chunks_fts f "
            "JOIN spans s ON s.rowid = f.rowid WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT ?",
            (query, k),
        ).fetchall()
        out: "list[tuple[Span, str]]" = []
        for cid, start, end, layer in rows:
            span = Span(cid=cid, start=start, end=end, layer=layer)
            out.append((span, span.resolve(get_content)))
        return out

    def clear(self) -> None:
        """Drop the derived index — it rebuilds from content by re-indexing (the one-bit test). A DROP,
        not a DELETE: a contentless FTS5 forbids row-delete, and a full drop IS the rebuild posture."""
        self._db.execute("DROP TABLE IF EXISTS chunks_fts")
        self._db.execute("DROP TABLE IF EXISTS spans")
        self._create()
        self._db.commit()

    def close(self) -> None:
        self._db.close()
