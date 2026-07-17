"""meta_io CONSUMES mempalace's heuristic ingest meta-model — entities + hall + room from content,
no LLM. Proves the structuring extraction runs standalone (the entities field that unlocks the rich
stack; the room bucket that seeds the session-scoped topic axis).

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_meta_io.py -q
"""

import meta_io


def test_annotate_returns_entities_hall_room_keys():
    r = meta_io.MetaModel().annotate("Joshua and Bob built the Lares node. Joshua wrote the keel. Joshua tested it.")
    assert set(r.keys()) == {"entities", "hall", "room"}
    assert isinstance(r["entities"], str)
    assert isinstance(r["hall"], str)
    assert isinstance(r["room"], str)


def test_annotate_room_scores_a_topic_bucket():
    # architecture keywords (schema/interface/module/layer) should route to the "architecture" room;
    # a technical-heavy turn routes to "technical". The seed rides the proven convo topic-detector.
    arch = meta_io.MetaModel().annotate("The schema and interface layer of this module is a clean architecture pattern.")
    assert arch["room"] == "architecture"
    tech = meta_io.MetaModel().annotate("The python function threw an api error; I ran the test to debug the git deploy.")
    assert tech["room"] == "technical"


def test_annotate_extracts_a_repeated_proper_noun():
    # "Joshua" appears >=2 times capitalized → the freq-floor entity path should surface it.
    r = meta_io.MetaModel().annotate("Joshua opened the shrine. Joshua fed the Lares. Joshua closed the loop.")
    assert "joshua" in r["entities"].lower()


def test_annotate_composes_only_enabled_capabilities():
    # The isomorphic toggle: a sensorium restricts the set, and the output carries exactly those keys.
    two = meta_io.MetaModel(["entities", "hall"]).annotate("The python api threw an error.")
    assert set(two.keys()) == {"entities", "hall"}  # room OFF — the corpus sensorium that skips topics
    one = meta_io.MetaModel(["room"]).annotate("The schema interface module layer architecture.")
    assert set(one.keys()) == {"room"}
    assert one["room"] == "architecture"


def test_annotate_drops_unknown_capability_names():
    # A stale capability name never crashes a sensorium — it drops, the known ones still run.
    r = meta_io.MetaModel(["hall", "not_a_real_cap"]).annotate("memory and recall and the archive palace.")
    assert set(r.keys()) == {"hall"}


def test_annotators_env_selects_the_set(monkeypatch):
    monkeypatch.setenv("META_ANNOTATORS", "entities,room")
    r = meta_io.MetaModel().annotate("Joshua chose the git deploy approach after the bug.")
    assert set(r.keys()) == {"entities", "room"}


def test_annotate_empty_is_safe():
    # empty content → no entities; detect_hall always returns a hall (its "general" fallback).
    r = meta_io.MetaModel().annotate("")
    assert r["entities"] == ""
    assert isinstance(r["hall"], str)  # "general" — the routing fallback, never a crash
