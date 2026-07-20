"""mempalace_projection — the combined-arms cap: lexical + entity recall over one cid source, RRF-fused.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_mempalace_projection.py -q
"""

from mempalace_projection import MempalaceProjection

CONTENT = {
    "cid-a": "Joshua built the Lares node with the orichalcum figure at the shrine",
    "cid-b": "Bob closed the loop and fed the incense",
    "cid-c": "Joshua and Bob raised the shrine together",
}


def _get(cid):
    return CONTENT.get(cid)


def _extract(text):
    return [w for w in text.replace(".", "").split() if w[:1].isupper()]


def _proj():
    p = MempalaceProjection(extract_entities=_extract, chunk_size=40, overlap=8)
    for cid, text in CONTENT.items():
        p.index_block(cid, text)
    return p


def test_index_block_fans_into_both_surfaces():
    p = _proj()
    # lexical surface finds a keyword; entity surface recalls by entity
    assert p.search_lexical("orichalcum", _get)
    assert set(p.recall_entity("Joshua")) == {"cid-a", "cid-c"}
    p.close()


def test_hallways_compose_over_the_shared_cids():
    p = _proj()
    halls = p.hallways(min_count=1)
    # Joshua & Bob co-occur in cid-c
    assert any({h["entity_a"], h["entity_b"]} == {"Bob", "Joshua"} for h in halls)
    p.close()


def test_hybrid_search_fuses_lexical_and_entity():
    p = _proj()
    # "Joshua" is both a lexical token AND an entity → both surfaces contribute, RRF fuses
    fused = p.hybrid_search("Joshua", _get, k=5)
    assert "cid-a" in fused and "cid-c" in fused  # both blocks mentioning Joshua surface
    p.close()


def test_hybrid_search_cid_filter_narrows_both_surfaces():
    # a FILTERED recall carries a cid_filter (the taxonomy `where`) — the projection narrows BOTH surfaces
    # to the cids that pass, so a filtered recall KEEPS combined-arms rather than dropping the projection
    # leg (the SPEAKER-stratum fix). None → the unfiltered combined-arms, unchanged.
    p = _proj()
    fused = p.hybrid_search("Joshua", _get, k=5, cid_filter=lambda cid: cid == "cid-c")
    assert fused == ["cid-c"]                       # cid-a matches "Joshua" but is filtered OUT
    wide = p.hybrid_search("Joshua", _get, k=5, cid_filter=None)
    assert "cid-a" in wide and "cid-c" in wide      # no narrowing without a filter
    p.close()


def test_projection_holds_no_verbatim_and_rebuilds():
    p = _proj()
    # verbatim comes only from content: drop content, the lexical match still lands but carries no words
    hits = p.search_lexical("shrine", lambda cid: None)
    assert hits and hits[0][1] == ""  # zero bytes at rest in the projection
    # rebuildable: clear + re-index from content
    p.clear()
    assert not p.search_lexical("shrine", _get)
    for cid, text in CONTENT.items():
        p.index_block(cid, text)
    assert p.search_lexical("shrine", _get)
    p.close()
