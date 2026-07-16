"""chain_invariant — the coarsening chain check stays exact, honest about gaps, and repeat-stable."""

import pytest

import chain_invariant as ci


# ── a bed whose chain HOLDS: content refines structure refines form ────────────

CIDS = ["c1", "c2", "c3", "c4", "c5", "c6"]
CONTENT = {c: f"doc-{c}" for c in CIDS}  # every record its own class
STRUCTURE = {"c1": "sA", "c2": "sA", "c3": "sB", "c4": "sB", "c5": "sC", "c6": "sC"}
FORM = {"c1": "fX", "c2": "fX", "c3": "fX", "c4": "fX", "c5": "fY", "c6": "fY"}


def test_a_true_chain_holds_and_entropies_descend():
    rep = ci.chain_report(CIDS, {"content": CONTENT, "structure": STRUCTURE, "form": FORM})
    assert rep["chain_holds"] is True
    assert rep["inequality_holds"] is True
    assert rep["H"]["form"] <= rep["H"]["structure"] <= rep["H"]["content"]
    assert all(leg["violations"] == 0 for leg in rep["legs"])


def test_a_straddle_breaks_the_chain_and_names_its_witnesses():
    # sB straddles fX and fY — the coarsening map breaks at one named class.
    broken_form = dict(FORM, c4="fY")
    rep = ci.chain_report(CIDS, {"content": CONTENT, "structure": STRUCTURE, "form": broken_form})
    assert rep["chain_holds"] is False
    leg = next(leg for leg in rep["legs"] if leg["fine"] == "structure")
    assert leg["violations"] == 1
    ex = leg["examples"][0]
    assert ex["fine_class"] == "sB"
    assert ex["straddles"] == 2
    assert ex["witnesses"] == {"fX": ["c3"], "fY": ["c4"]}


def test_the_entropy_shadow_can_break_without_a_straddle():
    # A form plane FINER than structure: no structure class straddles, but the
    # refinement runs the wrong way and the inequality catches it.
    fine_form = {c: f"f-{c}" for c in CIDS}  # one form class per record
    rep = ci.chain_report(CIDS, {"content": CONTENT, "structure": STRUCTURE, "form": fine_form})
    assert rep["inequality_holds"] is False
    assert rep["chain_holds"] is False


def test_unreached_records_group_into_one_bucket_never_vanish():
    # form labels only two records: the other four share the <unreached> class.
    sparse_form = {"c1": "fX", "c2": "fX"}
    rep = ci.chain_report(CIDS, {"content": CONTENT, "structure": STRUCTURE, "form": sparse_form})
    assert rep["coverage"]["form"] == {"labeled": 2, "unreached": 4}
    # partition = {fX: 2, <unreached>: 4} — H reads the gap as one silent class
    assert rep["H"]["form"] == pytest.approx(0.9183, abs=1e-3)


def test_frozenset_labels_canonicalize_order_free():
    assert ci.canon(frozenset({"b", "a"})) == ci.canon(frozenset({"a", "b"})) == "a|b"


def test_report_repeats_byte_identical():
    import json

    planes = {"content": CONTENT, "structure": STRUCTURE, "form": FORM}
    a = json.dumps(ci.chain_report(CIDS, planes), sort_keys=True)
    b = json.dumps(ci.chain_report(list(CIDS), dict(planes)), sort_keys=True)
    assert a == b


def test_cli_refuses_loud_when_no_sensorium_named():
    with pytest.raises(SystemExit, match="no sensorium named"):
        ci.main([])


def test_a_vacuous_chain_never_passes():
    # An unfed plane collapses to one silent class and the inequality "holds"
    # over a chain nobody measured — vacuity gets named, never certified.
    rep = ci.chain_report(CIDS, {"content": CONTENT, "structure": {}, "form": {}})
    assert rep["vacuous"] == ["structure", "form"]
    assert rep["inequality_holds"] is True  # the shadow, honestly reported
    assert rep["chain_holds"] is False      # but no verdict of health
