"""plane_census — the audit channel stays independent, loud, and byte-stable."""

import io
import json
import os
import sys

import pytest

import plane_census as pc


def _mint_palace(tmp_path, name, ids):
    """Stands a REAL chroma store (the census must read what chroma writes,
    not a hand-built imitation of its schema)."""
    from mempalace.palace import get_collection

    palace_dir = os.path.join(str(tmp_path), name)
    os.makedirs(palace_dir, exist_ok=True)
    col = get_collection(palace_dir, create=True, _skip_identity_check=True)
    if ids:
        col.upsert(
            ids=ids,
            documents=[f"doc {i}" for i in ids],
            embeddings=[[0.1] * 8 for _ in ids],
        )
    return palace_dir


def _run(argv):
    out = io.StringIO()
    old = sys.stdout
    sys.stdout = out
    try:
        pc.main(argv)
    finally:
        sys.stdout = old
    return out.getvalue()


def test_census_counts_records_per_collection(tmp_path):
    palace = _mint_palace(tmp_path, "p1", ["a", "b", "c"])
    rows = [json.loads(l) for l in _run(["--palace", palace]).splitlines()]
    assert {(r["collection"], r["records"]) for r in rows} == {("mempalace_drawers", 3)}


def test_census_reports_an_empty_collection_as_zero_not_absence(tmp_path):
    # An empty plane must land a 0-row — absence-of-row and absence-of-records
    # generate identically, which is the blindness this organ audits.
    palace = _mint_palace(tmp_path, "p0", [])
    rows = [json.loads(l) for l in _run(["--palace", palace]).splitlines()]
    assert rows == [
        {"palace": palace, "collection": "mempalace_drawers", "records": 0}
    ]


def test_census_double_run_emits_identical_bytes(tmp_path):
    p1 = _mint_palace(tmp_path, "p1", ["x", "y"])
    p2 = _mint_palace(tmp_path, "p2", ["z"])
    argv = ["--palace", p2, "--palace", p1, "--palace", p1]  # unordered + dup
    first, second = _run(argv), _run(argv)
    assert first == second
    # Total order over palaces, dup collapsed.
    palaces = [json.loads(l)["palace"] for l in first.splitlines()]
    assert palaces == sorted(set(palaces))


def test_census_root_walk_finds_nested_palaces(tmp_path):
    p1 = _mint_palace(tmp_path, "deep/nest/p1", ["a"])
    rows = [json.loads(l) for l in _run(["--root", str(tmp_path)]).splitlines()]
    assert [(r["palace"], r["records"]) for r in rows] == [(p1, 1)]


def test_census_refuses_loud_when_nothing_named():
    with pytest.raises(SystemExit, match="no palace named"):
        pc.main([])


def test_census_refuses_loud_on_a_storeless_dir(tmp_path):
    with pytest.raises(SystemExit, match="no chroma.sqlite3"):
        pc.main(["--palace", str(tmp_path)])
