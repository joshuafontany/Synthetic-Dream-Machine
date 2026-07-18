"""content_atoms — the CONTENT→atoms adapter pages a store into (cid, text), resolves verbatim by cid.

    ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_content_atoms.py -q
"""

from content_atoms import authored_only, content_atoms, content_getter

RECS = [("cid-a", "alpha text"), ("cid-b", "beta text"), ("cid-c", "gamma text")]


class FakeStore:
    """A ContentStore stand-in — the scan/get surface the adapter reads, nothing more."""

    def __init__(self, recs, page_size=2):
        self._recs = recs
        self._page = page_size

    def scan(self, offset, limit):
        chunk = self._recs[offset:offset + limit]
        nxt = offset + len(chunk)
        return {
            "records": [{"cid": c, "document": d} for c, d in chunk],
            "next": (nxt if nxt < len(self._recs) else None),
            "total": len(self._recs),
        }

    def get(self, cid):
        for c, d in self._recs:
            if c == cid:
                return {"cid": c, "document": d, "metadata": {}}
        return None


def test_content_atoms_pages_all_records():
    # a page size of 2 over 3 records forces a second page — the drain must cross it
    assert list(content_atoms(FakeStore(RECS, page_size=2))) == RECS


def test_content_atoms_empty_store():
    assert list(content_atoms(FakeStore([]))) == []


def test_content_getter_resolves_and_misses():
    g = content_getter(FakeStore(RECS))
    assert g("cid-b") == "beta text"
    assert g("absent") is None


def test_atoms_with_no_document_yield_empty_text():
    # a record whose document is absent still rides its cid (the resolve fetches bytes later)
    assert list(content_atoms(FakeStore([("cid-x", None)]))) == [("cid-x", "")]


class MetaStore:
    """A store whose scan carries per-record metadata — for the volume `keep` policy."""

    def __init__(self, recs):
        self._recs = recs  # (cid, doc, meta)

    def scan(self, offset, limit):
        chunk = self._recs[offset:offset + limit]
        nxt = offset + len(chunk)
        return {
            "records": [{"cid": c, "document": d, "metadata": m} for c, d, m in chunk],
            "next": (nxt if nxt < len(self._recs) else None),
            "total": len(self._recs),
        }


def test_authored_only_keeps_normal_skips_low_volume():
    store = MetaStore([
        ("cid-auth", "the operator's own words", {"lar_volume": "normal"}),
        ("cid-harness", "<command-name>/model</command-name>", {"lar_volume": "low"}),
        ("cid-generic", "a corpus with no stratum stamp", {}),  # no lar_volume → reads normal → kept
    ])
    kept = list(content_atoms(store, keep=authored_only))
    cids = [c for c, _ in kept]
    assert "cid-auth" in cids and "cid-generic" in cids  # authored voice + generic corpus ride
    assert "cid-harness" not in cids                     # the low-volume murmur stays out of the view


def test_no_keep_indexes_every_stratum():
    store = MetaStore([("cid-auth", "x", {"lar_volume": "normal"}), ("cid-harness", "y", {"lar_volume": "low"})])
    assert len(list(content_atoms(store))) == 2  # keep=None → the whole stream


def test_dedup_by_atom_key_collapses_a_re_carried_atom():
    # one atom (a1) re-carried across a resume: same lar_atom_key, distinct cids under different sources.
    store = MetaStore([
        ("cid-parent_0", "the ruling atom", {"lar_atom_key": "a1"}),
        ("cid-resume_0", "the ruling atom", {"lar_atom_key": "a1"}),   # the re-carry — content keeps it, view drops it
        ("cid-other_0",  "a different atom", {"lar_atom_key": "a2"}),
        ("cid-yes-a_0",  "yes", {"lar_atom_key": "a3"}),               # a genuine repeat: same bytes, own atom-key
        ("cid-yes-b_0",  "yes", {"lar_atom_key": "a4"}),               # keeps its own identity — both ride
    ])
    cids = [c for c, _ in content_atoms(store, dedup_key="lar_atom_key")]
    assert cids == ["cid-parent_0", "cid-other_0", "cid-yes-a_0", "cid-yes-b_0"]  # a1 rode once; a3/a4 both kept


def test_dedup_absent_key_still_rides():
    # a record lacking the dedup key never collapses (an absent atom-key is not a shared identity).
    store = MetaStore([("cid-a_0", "x", {}), ("cid-b_0", "y", {})])
    assert len(list(content_atoms(store, dedup_key="lar_atom_key"))) == 2
