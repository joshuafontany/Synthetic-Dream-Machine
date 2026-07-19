#!/usr/bin/env python3
"""mempalace_projection — the mempalace cap composed as a THIN, DERIVED projection over the one content
source.

It ties the derived recall surfaces the keel carries: a LEXICAL surface (contentless FTS5 over chunk-spans)
+ an ENTITY-GRAPH (inverted index + hallways), both keyed by content cid, holding NO verbatim. `index_block`
fans one block into every surface; `hybrid_search` fuses the lexical + entity recalls by Reciprocal Rank
Fusion (RRF) — the rank-merge that dodges BM25-vs-graph score incompatibility. The whole projection drops
and rebuilds from content (the one-bit test): content is the single writable source, this cap is a
disposable combined-arms VIEW over it — the shape the kupono data-model research named.
"""
from __future__ import annotations

from typing import Callable

from entity_graph import EntityGraph
from lexical_index import LexicalIndex


class MempalaceProjection:
    """The combined-arms mempalace cap: lexical + entity recall over one cid-keyed content source, verbatim
    held nowhere here. Every surface is derived and rebuildable; the projection owns no authority."""

    def __init__(
        self,
        db_path: str = ":memory:",
        extract_entities: "Callable[[str], list[str]] | None" = None,
        chunk_size: int = 512,
        overlap: int = 64,
    ) -> None:
        lex_path = ":memory:" if db_path == ":memory:" else f"{db_path}.lex"
        ent_path = ":memory:" if db_path == ":memory:" else f"{db_path}.ent"
        self._lex = LexicalIndex(lex_path)
        self._ent = EntityGraph(ent_path, extract_entities)
        self._size, self._overlap = chunk_size, overlap

    def index_block(self, cid: str, text: str) -> None:
        """Fan one content block into every derived surface — the lexical chunks + the entity edges."""
        self._lex.index_block(cid, text, size=self._size, overlap=self._overlap)
        self._ent.index_block(cid, text)

    def search_lexical(self, query: str, get_content: Callable[[str], "str | None"], k: int = 10):
        """The independent chunk-lexical surface — spans + verbatim resolved from content."""
        return self._lex.search(query, get_content, k=k)

    def recall_entity(self, entity: str) -> "list[str]":
        """The entity inverted index — blocks mentioning an entity."""
        return self._ent.cids_with(entity)

    def hallways(self, min_count: int = 1) -> "list[dict]":
        return self._ent.hallways(min_count=min_count)

    def hybrid_search(
        self, query: str, get_content: Callable[[str], "str | None"], k: int = 10, rrf_k: int = 60,
    ) -> "list[str]":
        """Fuse the lexical + entity recalls into ONE ranked cid list by RRF: `score(cid) = Σ 1/(rrf_k +
        rank_i)` over each surface's own ranking. Lexical contributes BM25-ranked cids (via its spans);
        entity contributes the cids whose entities match a query token. The fusion is rank-only, so BM25
        scores and graph hits never have to share a scale."""
        lex_cids: "list[str]" = []
        for span, _ in self._lex.search(query, get_content, k=k * 2):
            if span.cid not in lex_cids:
                lex_cids.append(span.cid)
        ent_cids: "list[str]" = []
        for tok in query.split():
            for cid in self._ent.cids_with(tok):
                if cid not in ent_cids:
                    ent_cids.append(cid)
        scores: "dict[str, float]" = {}
        for ranked in (lex_cids, ent_cids):
            for rank, cid in enumerate(ranked):
                scores[cid] = scores.get(cid, 0.0) + 1.0 / (rrf_k + rank)
        return [cid for cid, _ in sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:k]]

    def clear(self) -> None:
        """Drop every derived surface — the projection rebuilds from content by re-indexing."""
        self._lex.clear()
        self._ent.clear()

    def close(self) -> None:
        self._lex.close()
        self._ent.close()
