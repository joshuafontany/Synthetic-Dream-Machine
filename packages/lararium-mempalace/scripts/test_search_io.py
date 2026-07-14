"""search_io CONSUMES mempalace's hybrid search over our OWNED caller-vector content palace: seed
via content_io (embed_io vectors), then search_memories finds the semantically+lexically right
drawer — proving the consume works over a flat palace with no mempalace structure. Pinned to minilm.

    MEMPALACE_EMBEDDING_MODEL=minilm PYTHONPATH=<repo>/mempalace \
      ~/.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_search_io.py -q
"""

import os

os.environ.setdefault("MEMPALACE_EMBEDDING_MODEL", "minilm")

import content_io  # noqa: E402
import embed_io  # noqa: E402
import search_io  # noqa: E402


def _seed(palace):
    store = content_io.ContentStore(palace)
    e = embed_io.Embedder()
    docs = {
        "d1": "the whale breached against the grey open sea at dawn",
        "d2": "she simmered the garlic broth with thyme for hours",
        "d3": "the rover crossed the red martian dust under a thin sky",
    }
    for cid, text in docs.items():
        vec = e.embed([text])["vectors"][0]
        store.put(cid, text, vec, {})
    return docs


def test_consume_search_finds_the_right_drawer(tmp_path):
    palace = str(tmp_path / ".content")
    _seed(palace)
    res = search_io.Searcher(palace).search("a marine mammal in the ocean", k=3)
    assert "results" in res
    texts = [r.get("text", "") for r in res["results"]]
    assert any("whale" in t for t in texts)   # hybrid BM25+vector surfaced the whale drawer


def test_consume_search_hybrid_catches_lexical(tmp_path):
    # a lexical term pure-cosine might rank lower — the consumed BM25 leg should catch "martian".
    palace = str(tmp_path / ".content")
    _seed(palace)
    res = search_io.Searcher(palace).search("martian", k=3)
    texts = [r.get("text", "") for r in res["results"]]
    assert any("martian" in t for t in texts)


def test_search_empty_palace_is_empty(tmp_path):
    palace = str(tmp_path / ".empty")
    content_io.ContentStore(palace)   # create the (empty) collection
    res = search_io.Searcher(palace).search("anything", k=3)
    assert res.get("results", []) == []


def test_self_discount_and_horizon_grade_by_distance(tmp_path):
    """The gradient's two axes together: a same-root hit in the caller's window rides
    the discount; a same-root hit BEHIND the horizon reads genuinely absent and keeps
    full weight; an ordinal-less same-root hit degrades honestly to the discount."""
    palace = str(tmp_path / "palace")
    store = content_io.ContentStore(palace)
    e = embed_io.Embedder()
    rows = [
        ("old", "the tide pulled the canoe past the reef at dusk",
         {"lar_root_handle": "run-a", "lar_turn_ordinal": 3}),      # behind the horizon
        ("new", "the tide pulled the canoe over the reef at dawn",
         {"lar_root_handle": "run-a", "lar_turn_ordinal": 90}),     # in the window
        ("noord", "the tide carried the canoe along the reef",
         {"lar_root_handle": "run-a"}),                              # same root, no ordinal
        ("foreign", "the tide moved a canoe near a reef",
         {"lar_root_handle": "run-b", "lar_turn_ordinal": 2}),      # other root — untouched
    ]
    for cid, text, meta in rows:
        store.put(cid, text, e.embed([text])["vectors"][0], meta)

    s = search_io.Searcher(palace)
    res = s.search("canoe past the reef", k=4, not_root="run-a",
                   self_weight=0.25, self_horizon=50)
    by = { (h.get("metadata") or {}).get("lar_turn_ordinal", "none")
           if (h.get("metadata") or {}).get("lar_root_handle") == "run-a"
           else "foreign": h for h in res["results"] }
    assert not by[3].get("self_discounted")          # behind the horizon: full weight
    assert by[90].get("self_discounted") is True     # in the window: discounted, and says so
    assert by["none"].get("self_discounted") is True # no ordinal: honest blanket discount
    assert not by["foreign"].get("self_discounted")  # other roots never touched
