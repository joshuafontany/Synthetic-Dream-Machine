"""content_atoms — the CONTENT→atoms adapter pages a store into (cid, text), resolves verbatim by cid.

    ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_content_atoms.py -q
"""

from content_atoms import content_atoms, content_getter

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
