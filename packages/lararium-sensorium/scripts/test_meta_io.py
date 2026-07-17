"""meta_io CONSUMES mempalace's heuristic ingest meta-model — entities + hall + room from content,
no LLM. Proves the structuring extraction runs standalone (the entities field that unlocks the rich
stack; the room bucket that seeds the session-scoped topic axis).

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_meta_io.py -q
"""

import json

import meta_io


def _write_meta_config(tmp_path, monkeypatch, schema: dict) -> None:
    """Point the house config at a tmp dir, write meta.json, force a cache reload."""
    monkeypatch.delenv("LAR_ROOT", raising=False)
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
    cfgdir = tmp_path / "lares"
    cfgdir.mkdir(exist_ok=True)
    (cfgdir / "meta.json").write_text(json.dumps(schema), encoding="utf-8")
    meta_io._config_mtime = -1.0  # invalidate the mtime cache so the write lands now


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


def test_room_taxonomy_config_supersedes_the_seed(tmp_path, monkeypatch):
    # The operator's tuned taxonomy (via `sense meta`) overrides the frozen convo seed the moment it lands.
    _write_meta_config(tmp_path, monkeypatch, {
        "room_taxonomy": {"liturgy": ["shrine", "incense", "libation"], "keel": ["spine", "worldline"]},
    })
    r = meta_io.MetaModel(["room"]).annotate("The shrine holds the incense and the libation dish.")
    assert r["room"] == "liturgy"  # NOT a seed bucket — the tuned taxonomy won
    meta_io._config_mtime = -1.0  # leave the cache clean for the next test


def test_annotators_config_selects_when_no_arg_or_env(tmp_path, monkeypatch):
    monkeypatch.delenv("META_ANNOTATORS", raising=False)
    _write_meta_config(tmp_path, monkeypatch, {"annotators": ["hall"]})
    r = meta_io.MetaModel().annotate("memory and recall and the archive palace.")
    assert set(r.keys()) == {"hall"}  # the house config narrowed the set
    meta_io._config_mtime = -1.0


def test_corrupt_meta_config_degrades_to_the_seed(tmp_path, monkeypatch):
    monkeypatch.delenv("LAR_ROOT", raising=False)
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
    cfgdir = tmp_path / "lares"
    cfgdir.mkdir(exist_ok=True)
    (cfgdir / "meta.json").write_text("{ this is not json", encoding="utf-8")
    meta_io._config_mtime = -1.0
    r = meta_io.MetaModel(["room"]).annotate("The schema interface module layer architecture.")
    assert r["room"] == "architecture"  # corrupt config → the proven seed still routes
    meta_io._config_mtime = -1.0


def test_annotate_empty_is_safe():
    # empty content → no entities; detect_hall always returns a hall (its "general" fallback).
    r = meta_io.MetaModel().annotate("")
    assert r["entities"] == ""
    assert isinstance(r["hall"], str)  # "general" — the routing fallback, never a crash
