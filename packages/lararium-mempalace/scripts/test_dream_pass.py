"""dream_pass witnesses over a tmp eidetic fixture (deep-dream v0).

Three laws under test: the pass POPULATES a Dream sensorium beside the eidetic root
(templates + memberships + one coherence record, every record carrying provenance);
the pass NEVER writes the eidetic ground (the explicit ward — record-grain logical
identity plus byte identity of every non-sqlite plane file, checked independently of
the pass's own instruments); and a RE-DREAM replaces the Dream's prior content whole
(the mutable two-store law).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_dream_pass.py -q
"""
import hashlib
import json
import os

import pytest

import content_io as cio
import dream_pass
from capture_stream import ContentStoreLandCap, compose_pipeline
from plane_fanout import compose_corpus_planes

# Two alternating markdown skeletons — recurring shapes so the induction's MDL ledger
# keeps templates that pay (the plane_fanout fixture idiom).
_MD_A = "# Title\n\nA paragraph of prose about the hearth.\n\nAnother paragraph follows it.\n"
_MD_B = "# Head\n\n- one item\n- two items\n\nA closing paragraph stands here.\n"


def _fake_embed(text):
    return [float(len(text)), 1.0]


def _recs(n):
    return [{"seq": i + 1, "cid": f"c-{i}", "text": (_MD_A if i % 2 == 0 else _MD_B),
             "metadata": {"wing": "w", "room": "r", "lar_kind": "markdown",
                          "source_file": f"corpus:memes/f{i}.md", "lar_turn_key": f"t{i}"}}
            for i in range(n)]


def _stand_eidetic(root, n=6):
    """Stand a populated 3-plane eidetic bed: an append-only (immutable-ground) content
    store + the structure/form plane caps, one pass over n alternating records."""
    planes = compose_corpus_planes(root)
    store = cio.ContentStore(os.path.join(root, "content"), append_only=True)
    pipe = compose_pipeline(source=lambda recs: recs, land=ContentStoreLandCap(store),
                            embed=_fake_embed, planes=planes)
    res = pipe.run_pass(_recs(n))
    assert res["landed"] == n
    return store


def _byte_snapshot(root):
    """An INDEPENDENT byte snapshot of the eidetic plane PAYLOAD files (the sqlite
    carrier + the dot-prefixed one-time open markers set aside — a bare chroma open
    moves both with zero record writes, witnessed by probe; the record grain rides the
    content snapshot below)."""
    out = {}
    for sub in ("content", "structure", "form"):
        for dirpath, dirnames, filenames in os.walk(os.path.join(root, sub)):
            dirnames.sort()
            for fn in sorted(filenames):
                if fn.startswith("chroma.sqlite3") or fn.startswith("."):
                    continue
                p = os.path.join(dirpath, fn)
                with open(p, "rb") as f:
                    out[os.path.relpath(p, root)] = hashlib.sha256(f.read()).hexdigest()
    return out


def _content_snapshot(store):
    """The eidetic content rows whole (docs + metadata + vectors) — the record grain the
    never-writes ward must hold at."""
    rows = []
    offset = 0
    while True:
        page = store.scan(offset, 256)
        rows.extend(page.get("records") or [])
        if page.get("next") is None:
            break
        offset = page["next"]
    return sorted((json.dumps(r, sort_keys=True) for r in rows))


def test_dream_pass_populates_beside_the_ground(tmp_path):
    eidetic = str(tmp_path / "bed")
    dream = str(tmp_path / "bed-dream")
    _stand_eidetic(eidetic, n=6)

    w = dream_pass.run(eidetic, dream)

    # the Dream stands populated: templates + one membership per parsed record + ONE coherence.
    assert w["counts"]["template"] >= 1
    assert w["counts"]["membership"] == 6
    assert w["counts"]["coherence"] == 1
    assert w["records"] == 6

    store = cio.ContentStore(os.path.join(dream, "content"))
    eidetic_cids = {f"c-{i}" for i in range(6)}

    # a template record: first-class, provenance-carrying, members referencing eidetic cids.
    t_cid = f"dream:template:{json.loads(w['sample']['document'])['struct_hash']}" \
        if w["sample"]["metadata"]["lar_dream_kind"] == "template" else None
    assert t_cid is not None
    row = store.get(t_cid)
    body = json.loads(row["document"])
    assert row["metadata"]["lar_dream_kind"] == "template"
    assert row["metadata"]["lar_dream_eidetic_root"] == os.path.expanduser(eidetic)
    assert row["metadata"]["lar_dream_as_of"] == w["as_of"]
    assert set(body["members"]) <= eidetic_cids           # references, never carried bytes
    assert body["seq"]                                     # the derived schema rides the record

    # a membership record keys back to its eidetic cid and to real template records.
    m = store.get("dream:membership:c-0")
    assert m is not None
    m_body = json.loads(m["document"])
    assert m_body["eidetic_cid"] == "c-0"
    for h in m_body["templates"]:
        assert store.get(f"dream:template:{h}") is not None

    # the ONE coherence record: radius + H1 gate + a reading, never an average of a cocycle.
    c = store.get("dream:coherence")
    c_body = json.loads(c["document"])
    assert c_body["reading"] in ("consensus", "held-open")
    assert "radius" in c_body and "dim_h1" in c_body and "r_sem" in c_body
    if c_body["reading"] == "consensus":
        assert c_body["dim_h1"] == 0
        assert set(c_body["consensus"].keys()) <= eidetic_cids
    else:
        assert c_body["dim_h1"] > 0
        assert "held_open" in c_body and "consensus" not in c_body

    # the manifest marks the sensorium mutable and carries the provenance.
    with open(os.path.join(dream, "dream-manifest.json")) as fh:
        manifest = json.load(fh)
    assert manifest["kind"] == "dream" and manifest["mutable"] is True
    assert manifest["as_of"] == w["as_of"]

    # no wall-clock rides the record path: the pass stamps only lar_dream_* provenance.
    for key in row["metadata"]:
        assert "time" not in key and "date" not in key


def test_the_pass_never_writes_the_eidetic_ground(tmp_path):
    """THE WARD, explicit and independent: byte identity of every non-sqlite plane file
    plus record-grain identity of the content rows, snapshotted OUTSIDE the pass's own
    instruments; and the path wards refuse a nested or collapsed layout."""
    eidetic = str(tmp_path / "bed")
    dream = str(tmp_path / "bed-dream")
    store = _stand_eidetic(eidetic, n=6)

    bytes_before = _byte_snapshot(eidetic)
    rows_before = _content_snapshot(store)

    w = dream_pass.run(eidetic, dream)

    assert _byte_snapshot(eidetic) == bytes_before
    assert _content_snapshot(store) == rows_before
    assert w["eidetic_ward"]["logical_equal"] and w["eidetic_ward"]["byte_equal"]

    # the path wards fail loud before any byte moves.
    with pytest.raises(SystemExit):
        dream_pass.run(eidetic, os.path.join(eidetic, "dream"))   # Dream inside the ground
    with pytest.raises(SystemExit):
        dream_pass.run(eidetic, eidetic)                          # the roots collapse
    with pytest.raises(SystemExit):
        dream_pass.run(os.path.join(dream, "bed"), dream)         # ground inside the Dream


def test_a_redream_replaces_the_prior_dream_whole(tmp_path):
    eidetic = str(tmp_path / "bed")
    dream = str(tmp_path / "bed-dream")
    _stand_eidetic(eidetic, n=6)

    w1 = dream_pass.run(eidetic, dream)
    total1 = sum(w1["counts"].values())
    assert w1["replaced"] == 0                                # the first dream supersedes nothing

    # plant a stale row the re-dream must sweep out (the mutable store accepts the write).
    store = cio.ContentStore(os.path.join(dream, "content"), append_only=False)
    stale = "dream:template:stale"
    store.put(stale, "{}", dream_pass._locator(stale),
              {"lar_dream_kind": "template", "lar_dream_eidetic_root": eidetic,
               "lar_dream_as_of": "stale"})
    assert store.get(stale) is not None

    w2 = dream_pass.run(eidetic, dream)
    assert w2["replaced"] == total1 + 1                       # every prior row swept, stale included
    assert store.get(stale) is None                           # the stale template stands superseded
    assert w2["counts"] == w1["counts"]                       # same ground -> same consolidation
    assert w2["as_of"] == w1["as_of"]                         # provenance keys to the ground, not a clock
    # the fresh records stand whole after the sweep.
    assert store.get("dream:coherence") is not None
    assert store.get("dream:membership:c-0") is not None
