"""The 3-plane fan-out witness over REAL stores in a tmp test-bed (RUN-ARC #1, the keystone).

One pass lands content + structure + form for the SAME records, each plane by its OWN
mechanism (embed / parse-router / induced grammar); a second pass lands ZERO on every
plane (the idempotent re-derivation, held in the stores not process state); the record's
cid keys all three planes.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_plane_fanout.py -q
"""
import os

import content_io as cio
from capture_stream import ContentStoreLandCap, compose_pipeline
from plane_fanout import compose_text_planes
from structure_router import structural_hash

# Two alternating markdown skeletons — recurring shapes so the induction's MDL ledger
# finds templates that pay (min-support 2 rides easily on 6 records).
_MD_A = "# Title\n\nA paragraph of prose about the hearth.\n\nAnother paragraph follows it.\n"
_MD_B = "# Head\n\n- one item\n- two items\n\nA closing paragraph stands here.\n"


def _fake_embed(text):
    return [float(len(text)), 1.0]     # deterministic — the content plane's stand-in vector


def _recs(n):
    return [{"seq": i + 1, "cid": f"c-{i}", "text": (_MD_A if i % 2 == 0 else _MD_B),
             "metadata": {"wing": "w", "room": "r", "lar_kind": "markdown",
                          "source_file": f"corpus:memes/f{i}.md", "lar_turn_key": f"t{i}"}}
            for i in range(n)]


def _pipeline(root):
    planes = compose_text_planes(root)
    store = cio.ContentStore(os.path.join(root, "content"))
    pipe = compose_pipeline(source=lambda recs: recs, land=ContentStoreLandCap(store),
                            embed=_fake_embed, planes=planes)
    return pipe, store, planes


def test_three_planes_ride_one_pass_and_idempotent_re_pass(tmp_path):
    root = str(tmp_path / "bed")
    pipe, store, planes = _pipeline(root)
    res = pipe.run_pass(_recs(6))

    # content: all six landed durable.
    assert res["landed"] == 6 and res["audit"]["ok"]
    # structure: every record parsed + landed (two recurring shapes → recurrence, no skips).
    s = res["planes"]["structure"]
    assert s == {"landed": 6, "already": 0, "skipped": 0}
    # form: the induction kept templates and every record got its membership row.
    f = res["planes"]["form"]
    assert f["forms"] >= 1 and f["landed"] == 6 and f["skipped"] == 0

    # THE JOIN: one cid keys all three planes.
    structure_cap, form_cap = planes
    cid = "c-0"
    assert store.get(cid)["document"] == _MD_A                       # content by cid
    h = structural_hash(structure_cap.trees[cid])
    entry = structure_cap._store.get(h)                              # structure by hash → provenance binds the cid
    assert any(p.get("verbatim_sha") == cid for p in entry["provenance"])
    assert entry["count"] == 3                                       # the A-shape recurs over c-0/c-2/c-4
    form_row = form_cap._store.get(cid)                              # form by cid
    assert form_row is not None
    assert form_row["metadata"]["lar_verbatim_sha"] == cid
    assert form_row["metadata"]["struct_hash"] == h                  # the cross-plane join key rides along

    # PASS 2 over a FRESH composition: zero new on every plane (idempotence lives in the stores).
    pipe2, _store2, _planes2 = _pipeline(root)
    res2 = pipe2.run_pass(_recs(6))
    assert res2["landed"] == 0 and res2["skipped"] == 6
    assert res2["planes"]["structure"] == {"landed": 0, "already": 6, "skipped": 0}
    f2 = res2["planes"]["form"]
    assert f2["landed"] == 0 and f2["already"] == 6


def test_unparseable_kind_structure_skips_content_still_stands(tmp_path):
    # a record the router holds no grammar for structure-skips (and so form-skips) — the
    # content plane still lands whole; graceful, never fatal.
    root = str(tmp_path / "bed")
    pipe, store, planes = _pipeline(root)
    recs = _recs(2)
    recs.append({"seq": 3, "cid": "c-x", "text": "opaque bytes",
                 "metadata": {"wing": "w", "room": "r", "lar_kind": "",
                              "source_file": "corpus:memes/blob.bin", "lar_turn_key": "tx"}})
    res = pipe.run_pass(recs)
    assert res["landed"] == 3                                        # content: all three
    assert res["planes"]["structure"]["skipped"] == 1                # the kindless record skipped
    assert res["planes"]["form"]["skipped"] == 1                     # no structure → no form for it
    assert store.get("c-x")["document"] == "opaque bytes"
