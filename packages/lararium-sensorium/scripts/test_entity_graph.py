"""entity_graph — a cid-keyed entity index + co-occurrence hallways; tags at rest, verbatim in content.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_entity_graph.py -q
"""

from entity_graph import EntityGraph


def _extract(text):
    # a deterministic stub extractor (capitalized words) — the real nakama heuristic is injected in prod.
    return [w for w in text.replace(".", "").split() if w[:1].isupper()]


def test_entities_indexed_and_recalled_by_cid():
    g = EntityGraph(extract_entities=_extract)
    g.index_atom("cid-a", "Joshua built the Lares node with Bob")
    assert set(g.entities_of("cid-a")) == {"Joshua", "Lares", "Bob"}
    g.close()


def test_entity_inverted_index_recalls_atoms_across_the_corpus():
    g = EntityGraph(extract_entities=_extract)
    g.index_atom("cid-a", "Joshua opened the shrine")
    g.index_atom("cid-b", "Joshua closed the loop")
    assert g.cids_with("Joshua") == ["cid-a", "cid-b"]  # entity recall spans atoms — the graph's value
    g.close()


def test_hallways_count_co_occurrence():
    g = EntityGraph(extract_entities=_extract)
    g.index_atom("cid-a", "Joshua Bob")
    g.index_atom("cid-b", "Joshua Bob")
    g.index_atom("cid-c", "Joshua Mara")
    halls = g.hallways(min_count=2)
    assert any(h["entity_a"] == "Bob" and h["entity_b"] == "Joshua" and h["count"] == 2 for h in halls)
    # the min_count gate drops the single co-occurrence (Joshua-Mara)
    assert all(h["count"] >= 2 for h in halls)
    g.close()


def test_holds_no_verbatim_and_rebuilds_from_content():
    g = EntityGraph(extract_entities=_extract)
    g.index_atom("cid-a", "Joshua built Lares")
    g.clear()
    assert g.entities_of("cid-a") == []  # dropped
    g.index_atom("cid-a", "Joshua built Lares")  # rebuild from content alone
    assert set(g.entities_of("cid-a")) == {"Joshua", "Lares"}
    g.close()


def test_index_atom_is_idempotent():
    g = EntityGraph(extract_entities=_extract)
    g.index_atom("cid-a", "Joshua Lares")
    g.index_atom("cid-a", "Joshua Lares")  # re-index the same atom
    assert sorted(g.entities_of("cid-a")) == ["Joshua", "Lares"]  # no duplicate edges (UNIQUE)
    g.close()
