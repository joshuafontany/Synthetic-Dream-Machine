"""mempalace_pave — re-pave the projection from content atoms, keyed by content's own cid (parity).

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_mempalace_pave.py -q
"""

from mempalace_pave import pave
from mempalace_projection import MempalaceProjection

ATOMS = {"cid-a": "Joshua built the Lares node", "cid-b": "Bob fed the shrine incense"}


def _get(cid):
    return ATOMS.get(cid)


def _extract(text):
    return [w for w in text.replace(".", "").split() if w[:1].isupper()]


def test_pave_indexes_all_atoms_by_content_cid():
    p = MempalaceProjection(extract_entities=_extract, chunk_size=40, overlap=8)
    n = pave(ATOMS.items(), p)
    assert n == 2
    # cid-PARITY: the projection keys by content's own cids, resolvable back to content
    assert p.recall_entity("Joshua") == ["cid-a"]
    hits = p.search_lexical("shrine", _get)
    assert hits and hits[0][0].cid == "cid-b"
    p.close()


def test_re_pave_is_idempotent():
    p = MempalaceProjection(extract_entities=_extract, chunk_size=40, overlap=8)
    pave(ATOMS.items(), p)
    pave(ATOMS.items(), p)  # a full re-pave clears + re-indexes — no accumulation
    assert p.recall_entity("Joshua") == ["cid-a"]
    p.close()


def test_pave_no_rebuild_appends_new_atoms():
    p = MempalaceProjection(extract_entities=_extract, chunk_size=40, overlap=8)
    pave([("cid-a", "Joshua built the Lares node")], p)
    pave([("cid-b", "Bob fed the shrine incense")], p, rebuild=False)  # incremental catch-up
    assert p.recall_entity("Joshua") == ["cid-a"]
    assert p.recall_entity("Bob") == ["cid-b"]
    p.close()
