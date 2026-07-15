"""rederive — the ground walk stays ordered, cid-bound, and loud on malformed ground."""

import pytest

import rederive as rd


def test_rederive_bands_refuses_an_undeclared_projector(tmp_path):
    (tmp_path / "manifest.json").write_text("{}", encoding="utf-8")
    import pytest
    with pytest.raises(SystemExit, match="no bands ordering projector"):
        rd.rederive_bands(str(tmp_path))


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
        "plane_fanout.compose_corpus_planes", lambda *a, **k: []
    )
    rd.rederive(root)
    assert sorted(wiped) == ["form", "structure"]  # content never in the wipe set
