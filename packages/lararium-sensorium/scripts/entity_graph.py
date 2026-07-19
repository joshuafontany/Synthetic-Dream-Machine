#!/usr/bin/env python3
"""entity_graph — the ENTITY recall surface as a DERIVED, REBUILDABLE view over the one content source.

Entities extracted from each content block (keyed by cid) form two recall structures — an INVERTED entity
index (entity → the cids that mention it) and HALLWAYS (entity co-occurrence over shared blocks). Both hold
NO verbatim bytes: a block's entities are a small derived tag-set keyed by its cid; the words live once in
content. So the mempalace gains its entity-graph arm — entity recall + co-occurrence — duplicating no
source and rebuilding from content alone (the one-bit test).

The extractor is INJECTED so this module stays decoupled and testable; `nakama_entity_extractor` binds the
proven heuristic (no LLM) for production, adopting the vendored extractor rather than re-rolling one.
"""
from __future__ import annotations

import sqlite3
from typing import Callable


def nakama_entity_extractor() -> Callable[[str], "list[str]"]:
    """The proven heuristic entity extractor (nakama, no LLM) — content → entity names."""
    from mempalace.miner import _extract_entities_for_metadata

    def extract(text: str) -> "list[str]":
        raw = _extract_entities_for_metadata(text or "") or ""
        return [e.strip() for e in raw.split(";") if e.strip()]

    return extract


class EntityGraph:
    """A cid-keyed entity index + co-occurrence hallways over content-addressed blocks. Tags live here;
    bytes live in content. Drop it and re-index to rebuild — it holds a derived view, never authority."""

    def __init__(self, db_path: str = ":memory:", extract_entities: "Callable[[str], list[str]] | None" = None) -> None:
        self._extract = extract_entities
        self._db = sqlite3.connect(db_path)
        self._db.execute("CREATE TABLE IF NOT EXISTS entities (cid TEXT, entity TEXT, UNIQUE(cid, entity))")
        self._db.execute("CREATE INDEX IF NOT EXISTS ix_entity ON entities(entity)")
        self._db.commit()

    def _extractor(self) -> "Callable[[str], list[str]]":
        if self._extract is None:  # lazy — the nakama import costs only when prod actually indexes
            self._extract = nakama_entity_extractor()
        return self._extract

    def index_block(self, cid: str, text: str) -> int:
        """Extract a block's entities and land them as cid→entity edges (idempotent; no verbatim held)."""
        ents = set(self._extractor()(text))
        for e in ents:
            self._db.execute("INSERT OR IGNORE INTO entities(cid, entity) VALUES (?,?)", (cid, e))
        self._db.commit()
        return len(ents)

    def entities_of(self, cid: str) -> "list[str]":
        return [r[0] for r in self._db.execute("SELECT entity FROM entities WHERE cid=? ORDER BY entity", (cid,))]

    def cids_with(self, entity: str) -> "list[str]":
        """The entity inverted index — the blocks that mention an entity (entity recall over the corpus)."""
        return [r[0] for r in self._db.execute("SELECT cid FROM entities WHERE entity=? ORDER BY cid", (entity,))]

    def hallways(self, min_count: int = 1) -> "list[dict]":
        """Entity co-occurrence edges — pairs sharing blocks, with a count. A self-join over the shared cid,
        the pair ordered `a < b` so each edge counts once. This is the hallway the nakama draws, here over
        the sensorium's own cids rather than a duplicated drawer store."""
        rows = self._db.execute(
            "SELECT a.entity, b.entity, COUNT(*) c FROM entities a JOIN entities b "
            "ON a.cid = b.cid AND a.entity < b.entity GROUP BY a.entity, b.entity HAVING c >= ? ORDER BY c DESC",
            (min_count,),
        ).fetchall()
        return [{"entity_a": a, "entity_b": b, "count": c} for a, b, c in rows]

    def clear(self) -> None:
        """Drop the derived edges — they rebuild from content by re-indexing (the one-bit test)."""
        self._db.execute("DELETE FROM entities")
        self._db.commit()

    def close(self) -> None:
        self._db.close()
