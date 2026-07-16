"""rederive — the ground walk stays ordered, cid-bound, and loud on malformed ground."""

import pytest

import rederive as rd


def test_rederive_bands_refuses_an_undeclared_projector(tmp_path):
    (tmp_path / "manifest.json").write_text("{}", encoding="utf-8")
    import pytest
    with pytest.raises(SystemExit, match="no supported order projector"):
        rd.rederive_bands(str(tmp_path))


def test_rederive_bands_selects_order_not_earned_apertures(monkeypatch, tmp_path):
    (tmp_path / "manifest.json").write_text(
        '{"order":{"projector":"stream","basis":"observed:connection-sequence"},'
        '"apertures":{"beat":"worldline-dag"}}', encoding="utf-8")
    monkeypatch.setattr("bands.analyze_sensorium", lambda _root, **_opts: ([{"cid": "a"}], {"note": "ok"}))
    out = rd.rederive_bands(str(tmp_path))
    assert out["projector"] == "stream-order"
    assert out["basis"] == "observed:connection-sequence"


def test_stream_rederive_requires_one_causal_island(monkeypatch, tmp_path):
    (tmp_path / "manifest.json").write_text(
        '{"order":{"projector":"stream","basis":"observed:connection-sequence"}}', encoding="utf-8")
    seen = {}
    def analyze(_root, **opts):
        seen.update(opts)
        return [], {"note": "empty"}
    monkeypatch.setattr("bands.analyze_sensorium", analyze)
    rd.rederive_bands(str(tmp_path))
    assert seen["require_one_source"] is True


def test_bands_only_never_walks_or_wipes_planes(monkeypatch, tmp_path):
    monkeypatch.setattr(rd, "rederive_bands", lambda root: {"projector": "test", "root": root})
    monkeypatch.setattr(rd, "_ground_records", lambda _root: (_ for _ in ()).throw(AssertionError("ground walk")))
    out = rd.rederive(str(tmp_path), planes=False, bands=True)
    assert out["bands"]["projector"] == "test" and "planes" not in out


def _ground(tmp_path, rows):
    from content_io import ContentStore

    store = ContentStore(str(tmp_path / "bed" / "content"))
    for cid, text, meta in rows:
        store.put(cid, text, [0.1, 0.2], meta)
    return str(tmp_path / "bed")


def test_ground_walk_orders_by_source_then_chunk_then_cid(tmp_path):
    root = _ground(
        tmp_path,
        [
            ("c-b1", "beta one", {"source_file": "corpus:b.mem", "chunk_index": 1}),
            ("c-a0", "alpha", {"source_file": "corpus:a.mem", "chunk_index": 0}),
            ("c-b0", "beta zero", {"source_file": "corpus:b.mem", "chunk_index": 0}),
        ],
    )
    recs = rd._ground_records(root)
    assert [r["cid"] for r in recs] == ["c-a0", "c-b0", "c-b1"]
    assert recs[0]["text"] == "alpha"  # verbatim text rides out of the ground
    assert recs[0]["metadata"]["source_file"] == "corpus:a.mem"


def test_observed_order_refuses_to_fuse_independent_sources(tmp_path):
    from order_vectors import source_ordered_vectors
    root = _ground(tmp_path, [
        ("a", "one", {"source_file": "mudlet:conn-a", "chunk_index": 0}),
        ("b", "two", {"source_file": "mudlet:conn-b", "chunk_index": 0}),
    ])
    ids, vectors, note = source_ordered_vectors(root, require_one_source=True)
    assert ids == [] and vectors == [] and "causal islands" in note


def test_stream_plane_rederive_refuses_to_fuse_independent_sources(tmp_path, monkeypatch):
    root = _ground(tmp_path, [
        ("a", "one", {"source_file": "mudlet:conn-a", "chunk_index": 0}),
        ("b", "two", {"source_file": "mudlet:conn-b", "chunk_index": 0}),
    ])
    (tmp_path / "bed" / "manifest.json").write_text(
        '{"order":{"projector":"stream","basis":"observed:connection-sequence"}}', encoding="utf-8")
    monkeypatch.setattr("plane_fanout.compose_text_planes", lambda *args, **kwargs: [])

    with pytest.raises(SystemExit, match="independent causal islands"):
        rd.rederive(root)


def test_rederive_refuses_an_empty_ground(tmp_path):
    root = _ground(tmp_path, [])
    with pytest.raises(SystemExit, match="holds no records"):
        rd.rederive(root)


def test_rederive_refuses_loud_when_no_sensorium_named():
    with pytest.raises(SystemExit, match="no sensorium named"):
        rd.main([])


def test_rederive_never_touches_the_ground_dir(tmp_path, monkeypatch):
    # the wipe must reach ONLY structure/ and form/ — a ground wipe is the one
    # unforgivable move this verb exists to prevent.
    root = _ground(tmp_path, [("c1", "text", {"source_file": "s", "chunk_index": 0})])
    import os
    import shutil

    wiped = []
    real = shutil.rmtree
    monkeypatch.setattr(shutil, "rmtree", lambda d, **k: (wiped.append(os.path.basename(d)), real(d, **k)))
    os.makedirs(os.path.join(root, "structure"), exist_ok=True)
    os.makedirs(os.path.join(root, "form"), exist_ok=True)
    monkeypatch.setattr(
        "plane_fanout.compose_text_planes", lambda *a, **k: []
    )
    rd.rederive(root)
    assert sorted(wiped) == ["form", "structure"]  # content never in the wipe set
