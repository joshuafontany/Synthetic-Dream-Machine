"""lexical_index — a contentless-FTS5 lexical surface: tokens live here, verbatim lives in content.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_lexical_index.py -q
"""

from lexical_index import LexicalIndex

CONTENT = {"cid-a": "the shrine holds the incense and the libation dish beside the orichalcum figure"}


def _get(cid):
    return CONTENT.get(cid)


def test_index_and_search_returns_span_and_verbatim():
    idx = LexicalIndex()
    idx.index_atom("cid-a", CONTENT["cid-a"], size=30, overlap=10)
    hits = idx.search("orichalcum", _get)
    assert hits
    span, verbatim = hits[0]
    assert span.cid == "cid-a"
    assert "orichalcum" in verbatim  # verbatim resolved from CONTENT, never stored in the FTS
    idx.close()


def test_fts_holds_no_verbatim_bytes():
    # The kupono invariant witnessed: the FTS matches on indexed TOKENS, but the verbatim comes ONLY from
    # content via the span. Drop content and the match still lands — but carries no words. Rebuildable proof.
    idx = LexicalIndex()
    idx.index_atom("cid-a", CONTENT["cid-a"], size=30, overlap=10)
    hits = idx.search("shrine", lambda cid: None)  # content gone
    assert hits  # tokens still indexed → the lexical match survives
    span, verbatim = hits[0]
    assert verbatim == ""  # no bytes without content → the FTS held none
    idx.close()


def test_independent_chunk_segmentation_matches_across_a_turn_boundary():
    # A chunk window can carry two ideas a turn-window would split — the point of the distinct segmentation.
    idx = LexicalIndex()
    idx.index_atom("cid-a", CONTENT["cid-a"], size=80, overlap=0)  # one wide chunk over the atom
    hits = idx.search("incense AND orichalcum", _get)  # both terms, far apart, in one chunk
    assert hits  # the chunk surfaces a co-occurrence a narrow turn-window might miss
    idx.close()


def test_clear_and_reindex_rebuilds_from_content():
    idx = LexicalIndex()
    idx.index_atom("cid-a", CONTENT["cid-a"], size=30, overlap=5)
    idx.clear()
    assert idx.search("shrine", _get) == []  # dropped
    idx.index_atom("cid-a", CONTENT["cid-a"], size=30, overlap=5)  # rebuild from content alone
    assert idx.search("shrine", _get)
    idx.close()
