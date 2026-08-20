"""bed_manifest — the declared pour refuses loud, counts every drop, and its nulls size-match."""

import json
import os

import pytest

import bed_manifest as bm


def _manifest(tmp_path, **overrides):
    corpus = tmp_path / "corpus"
    corpus.mkdir(exist_ok=True)
    (corpus / "a.mem").write_text("alpha beta gamma delta\nepsilon zeta\n")
    (corpus / "b.mem").write_text("one two three\n")
    (corpus / "skip.log").write_text("never counted silently\n")
    m = {
        "schema": 1,
        "bed": "test-bed",
        "root": str(tmp_path / "bedroot"),
        "flow": {
            "sources": [str(corpus)],
            "exclusions": [],
            "record_unit": {".mem": "file"},
        },
        "worldline": {"real": ["in-file", "containment"], "arbitrary": ["walk-order"]},
        "twins": {"grain": "in-file-token", "size_matched": True, "seed": 191},
        "apertures": [
            {"name": "path-address", "provenance": "given"},
            {"name": "planes", "provenance": "induced"},
        ],
        "predictions": {"sheet": "packages/lararium-mempalace/docs/EMERGENCE-PREREG.md",
                        "anchor": "no-such-anchor-yet"},
    }
    m.update(overrides)
    path = tmp_path / "bed.json"
    path.write_text(json.dumps(m))
    return str(path), m


def test_valid_manifest_loads_and_counts_exclusions(tmp_path):
    path, _ = _manifest(tmp_path)
    m = bm.load_manifest(path)
    files, tally = bm.resolve_flow(m)
    assert len(files) == 2                      # the two .mem records
    assert tally["_ext_filtered"] == 1          # skip.log counted, never silent


def test_twin_grain_must_scramble_a_real_ordering(tmp_path):
    path, _ = _manifest(tmp_path, worldline={"real": ["containment"], "arbitrary": ["in-file"]})
    with pytest.raises(SystemExit, match="never names REAL"):
        bm.load_manifest(path)


def test_size_matched_is_law(tmp_path):
    path, _ = _manifest(tmp_path, twins={"grain": "in-file-token", "size_matched": False, "seed": 1})
    with pytest.raises(SystemExit, match="size_matched"):
        bm.load_manifest(path)


def test_unknown_record_unit_refuses(tmp_path):
    path, _ = _manifest(tmp_path)
    m = json.loads(open(path).read())
    m["flow"]["record_unit"][".xyz"] = "paragraph"
    open(path, "w").write(json.dumps(m))
    with pytest.raises(SystemExit, match="unknown unit"):
        bm.load_manifest(path)


def test_pour_refuses_absent_predictions(tmp_path):
    path, _ = _manifest(tmp_path)
    m = bm.load_manifest(path)
    with pytest.raises(SystemExit, match="predictions anchor"):
        bm.pour(m)


def test_pour_refuses_unpourable_units_by_name(tmp_path, monkeypatch):
    path, _ = _manifest(tmp_path, flow={
        "sources": [str(tmp_path / "corpus")], "exclusions": [],
        "record_unit": {".jsonl": "turn"},
    })
    m = bm.load_manifest(path)
    monkeypatch.setattr(bm, "predictions_stand", lambda _m: True)
    with pytest.raises(SystemExit, match="turn"):
        bm.pour(m)


def test_twin_corpus_size_matches_by_construction(tmp_path):
    path, _ = _manifest(tmp_path)
    m = bm.load_manifest(path)
    files, _ = bm.resolve_flow(m)
    out = tmp_path / "twin"
    stats = bm.build_twin_corpus(m, files, str(out))
    assert stats["files"] == len(files)
    originals = sum(len(open(f).read().split()) for f in files)
    twins = sum(len(open(os.path.join(out, f)).read().split()) for f in os.listdir(out))
    assert twins == originals                    # size-matched BY CONSTRUCTION
    # seeded → reproducible: a second build lands byte-identical
    out2 = tmp_path / "twin2"
    bm.build_twin_corpus(m, files, str(out2))
    a = sorted(open(os.path.join(out, f)).read() for f in os.listdir(out))
    b = sorted(open(os.path.join(out2, f)).read() for f in os.listdir(out2))
    assert a == b


def test_wiki_sources_refuse_without_operator_act(tmp_path):
    # the separation law: CRDT-Wiki content crosses only by an explicit act
    path, _ = _manifest(tmp_path, flow={
        "sources": ["bags/@lares"], "exclusions": [], "record_unit": {".mem": "file"}})
    with pytest.raises(SystemExit, match="operator act"):
        bm.load_manifest(path)


def test_operator_act_admits_wiki_sources(tmp_path):
    path, _ = _manifest(tmp_path, flow={
        "sources": ["bags/@lares"], "exclusions": [], "record_unit": {".mem": "file"}},
        operatorAct={"who": "operator", "date": "2026-07-15", "ruling": "Pono. Enact."})
    m = bm.load_manifest(path)
    assert m["operatorAct"]["who"] == "operator"


def test_manifest_without_root_still_validates(tmp_path):
    # the collapse retired `root` from the required set — the pour derives the
    # home from the bed NAME, so a rootless manifest loads clean.
    path, m = _manifest(tmp_path)
    del m["root"]
    open(path, "w").write(json.dumps(m))
    loaded = bm.load_manifest(path)
    assert "root" not in loaded


def test_pour_roots_in_the_xdg_sensorium_roster(tmp_path, monkeypatch):
    # the collapse: a bed pours into the ONE roster <lararium>/sensoriums/<bed>,
    # resolved from the bed NAME — never the manifest's stale literal root.
    monkeypatch.setenv("LAR_ROOT", str(tmp_path / "home"))     # redirect the XDG data home
    path, _ = _manifest(tmp_path, root="~/.lares/testbeds/ignored-stale-root")
    m = bm.load_manifest(path)
    monkeypatch.setattr(bm, "predictions_stand", lambda _m: True)

    seen = {}
    def _capture_run(corpus, root, **kw):
        seen["root"] = root
        return {}
    import corpus_testbed
    monkeypatch.setattr(corpus_testbed, "run", _capture_run)

    bm.pour(m)
    from sensorium import sensorium_dir
    assert seen["root"] == sensorium_dir(m["bed"])           # the bed name, not the stale field
    assert os.path.join("sensoriums", m["bed"]) in seen["root"]
    assert seen["root"].startswith(str(tmp_path / "home"))   # under the redirected home
