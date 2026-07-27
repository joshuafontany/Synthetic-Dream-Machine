"""test_loci — the loci/imago spatial-schema shore wraps the nakama drawer-store as its first schema.

  · open_loci returns the nakama-drawer schema by default; an unknown schema refuses loudly.
  · the concrete schema delegates STRAIGHT to the nakama palace API (behave-close law) — locus_store
    returns whatever get_collection returns, no divergent store interposed.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_loci.py -q
"""
import sys
import types

import pytest

from loci import LocusSchema, NakamaLoci, open_loci


def test_open_loci_defaults_to_the_nakama_drawer_schema():
    schema = open_loci("/some/palace")
    assert isinstance(schema, NakamaLoci)
    assert isinstance(schema, LocusSchema)          # it satisfies the runtime-checkable protocol
    assert schema.schema_name() == "nakama-drawer"  # the first (today only) concrete schema


def test_unknown_schema_refuses_loud():
    with pytest.raises(ValueError, match="unknown"):
        open_loci("/some/palace", schema="hilbert-grid")   # no silent reach to a default


def test_locus_store_delegates_straight_to_the_nakama_palace_api(monkeypatch):
    # behave-close law: locus_store returns EXACTLY what the nakama's get_collection returns — the shore
    # wraps the vocabulary, never a divergent store. Inject a fake nakama palace module and witness the
    # call reaches it verbatim (palace path + the skip-identity flag the sovereign read uses).
    calls = {}
    fake = types.ModuleType("mempalace.palace")

    def _get_collection(palace, _skip_identity_check=False):
        calls["palace"] = palace
        calls["skip"] = _skip_identity_check
        return {"collection": "nakama-drawers", "palace": palace}

    fake.get_collection = _get_collection
    monkeypatch.setitem(sys.modules, "mempalace.palace", fake)

    got = open_loci("/p/joshu").locus_store()
    assert got == {"collection": "nakama-drawers", "palace": "/p/joshu"}
    assert calls == {"palace": "/p/joshu", "skip": True}   # delegated verbatim — the upstream store, untouched
