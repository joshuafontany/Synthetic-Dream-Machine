"""meta_io CONSUMES mempalace's heuristic ingest meta-model — entities + hall from content, no LLM.
Proves the structuring extraction runs standalone (the entities field that unlocks the rich stack).

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-mempalace/scripts/test_meta_io.py -q
"""

import meta_io


def test_annotate_returns_entities_and_hall_keys():
    r = meta_io.MetaModel().annotate("Joshua and Bob built the Lares node. Joshua wrote the keel. Joshua tested it.")
    assert set(r.keys()) == {"entities", "hall"}
    assert isinstance(r["entities"], str)
    assert isinstance(r["hall"], str)


def test_annotate_extracts_a_repeated_proper_noun():
    # "Joshua" appears >=2 times capitalized → the freq-floor entity path should surface it.
    r = meta_io.MetaModel().annotate("Joshua opened the shrine. Joshua fed the Lares. Joshua closed the loop.")
    assert "joshua" in r["entities"].lower()


def test_annotate_empty_is_safe():
    # empty content → no entities; detect_hall always returns a hall (its "general" fallback).
    r = meta_io.MetaModel().annotate("")
    assert r["entities"] == ""
    assert isinstance(r["hall"], str)  # "general" — the routing fallback, never a crash
