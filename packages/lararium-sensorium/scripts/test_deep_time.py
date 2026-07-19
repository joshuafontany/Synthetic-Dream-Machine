"""test_deep_time — the deep-time seams stay BYTE-IDENTICAL to the raw forms they centralize.

Two hedges, each a single home; both MUST match the pre-seam output byte-for-byte so existing
records (manifests, content addresses) stay consistent across a centuries-long run.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_deep_time.py -q
"""
import hashlib
import re

from deep_time import content_hash, island_local_now


def test_island_local_now_default_matches_bare_isoformat_shape():
    # structurepalace_io / form_encoder shape: datetime.now(utc).isoformat() → trailing +00:00.
    s = island_local_now()
    assert s.endswith("+00:00")
    assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?\+00:00", s)


def test_island_local_now_millis_z_matches_manifest_created_shape():
    # sensorium manifest `created` shape: isoformat(timespec="milliseconds").replace("+00:00","Z").
    s = island_local_now(millis=True, z=True)
    assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", s)


def test_content_hash_is_byte_identical_to_bare_sha256():
    for data in (b"", b"hello", b"some/file.jsonl", "ॐ ँ".encode("utf-8")):
        assert content_hash(data) == hashlib.sha256(data).hexdigest()


def test_deep_time_imports_only_stdlib_no_sensorium_cycle():
    import ast

    import deep_time

    tree = ast.parse(open(deep_time.__file__, encoding="utf-8").read())
    imported = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    for forbidden in ("structurepalace_io", "form_encoder", "sensorium", "capture_sources"):
        assert forbidden not in imported, f"deep_time must not import {forbidden} (circular-import guard)"
