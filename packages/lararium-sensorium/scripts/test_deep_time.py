"""test_deep_time — the deep-time shores stay BYTE-IDENTICAL to the raw forms they centralize.

Two hedges, each a single home; both MUST match the pre-shore output byte-for-byte so existing
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


def test_routed_identity_hash_callers_stay_byte_pinned():
    # Every content-ADDRESS/identity site routed through content_hash MUST stay byte-identical —
    # a drift orphans stored addresses/keys. These pins lock the hash-agility shore's callers:
    # derive_cid (the canonical cid), the corpus worldline root, the constructicon key, and the
    # structure-palace structural key (which also mirrors the TS crypto.canonicalJson byte-for-byte).
    from capture_sources import derive_cid
    from corpus_worldline import _root_for
    from form_induction import _struct_hash
    from structure_router import structural_hash

    assert derive_cid("some/file.jsonl", 3) == (
        "97a91a0a641038aaba24bc544a83955d0732fa6d670cc0f8fb51b339aa75ac02_3")
    assert _root_for("claude:sess-x/file.jsonl") == "corpus:36c106d82b3f7603d2458f2e"
    assert _struct_hash({"type": "x", "children": [1, 2]}) == "e904fb57fef5a699e3458945d6ff801d"
    assert structural_hash({"type": "source_file", "children": []}) == (
        "6d077246ee7fb09098af26ff1b950b16a3a021d24f4900160bfdaa2468637b72")


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
