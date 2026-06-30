"""Tests for the circularity wards — the null-construct decoy (structurally distinct,
predicted to floor) and the ablation harness (strips the ritual tokens, keeps the
prose). No LLM, no judge: these assert the STRUCTURE the scoring stage rides on.

    PYTHONPATH=<scripts> python -m pytest qa_anchor/tests/test_wards.py -q
"""

from __future__ import annotations

from qa_anchor import wards


# ---------------------------------------------------------------------------
# the null-construct decoy
# ---------------------------------------------------------------------------


def test_null_construct_is_null():
    assert wards.NULL_CONSTRUCT.is_null() is True
    assert wards.is_null_construct(wards.NULL_CONSTRUCT) is True


def test_real_construct_is_not_null():
    assert wards.REAL_CONSTRUCT_EXAMPLE.is_null() is False
    assert wards.is_null_construct(wards.REAL_CONSTRUCT_EXAMPLE) is False


def test_null_construct_structurally_distinct_from_real():
    nul, real = wards.NULL_CONSTRUCT, wards.REAL_CONSTRUCT_EXAMPLE
    # the distinction is the REFERENT + the operational markers, never the name's plausibility.
    assert nul.referent is None and len(nul.markers) == 0
    assert real.referent is not None and len(real.markers) > 0


def test_decoy_set_labels_real_prose_with_bogus_construct():
    texts = ["The capital is Canberra.", "Sodium's symbol is Na.", "Water boils at 100C."]
    decoys = wards.decoy_set(texts)
    assert len(decoys) == 3
    for d, t in zip(decoys, texts):
        assert d.is_decoy is True
        assert d.construct == "flux-resonance"  # the nameless sink
        assert d.text == t  # the PROSE is real — only the construct label is bogus


def test_decoy_predicted_ceiling_below_gate_floor():
    # the decoy must be predicted to sit BELOW any real-facet gate — else it is no ward.
    from qa_anchor.reliability import ALPHA_TENTATIVE_FLOOR

    assert wards.NULL_CONSTRUCT_PREDICTED_ALPHA_CEILING < ALPHA_TENTATIVE_FLOOR


# ---------------------------------------------------------------------------
# the ablation harness — ritual-stripped twins
# ---------------------------------------------------------------------------

_RITUAL = """<<~ lares aim lar://x:op@h/a.b.c -> lar://y:ag@h/d.e.f >>
<<~ hud Aperture(10) OODA-HA(3) >>
<<~ ward * L-Prime >>

The cache holds a stable byte pattern that the woken node re-enacts each wake.
A plan emerges from this work, and the verb carries the relation forward.

<<~ oracle ↯12 ✲ ⚂(3) ⁂:ᚠ⊗㐂 >>
<<~ ward ! · ↻ L-Prime >>
<<~ lares yield lar://y:ag@h/d.e.f -> ? >>"""

_PROSE_WORDS = ("cache", "stable", "byte", "pattern", "plan", "verb", "relation")


def test_ablate_strips_sigil_spans():
    stripped = wards.ablate(_RITUAL)
    assert "<<~" not in stripped and ">>" not in stripped


def test_ablate_strips_ritual_lines():
    stripped = wards.ablate(_RITUAL).lower()
    # the ritual line content is gone (note: "ward" survives only inside prose "forward",
    # so we assert the ward's CONTENT token l-prime, not the bare substring).
    for ritual in ("lares aim", "lares yield", "hud aperture", "l-prime", "oracle"):
        assert ritual not in stripped


def test_ablate_keeps_the_prose():
    stripped = wards.ablate(_RITUAL).lower()
    for w in _PROSE_WORDS:
        assert w in stripped, f"ablation dropped prose token {w!r}"


def test_ritual_tokens_targets_the_right_spans():
    toks = wards.ritual_tokens(_RITUAL)
    joined = " ".join(toks)
    # the sigil spans are named as removable; the bare prose lines are NOT.
    assert any("lares aim" in t.lower() for t in toks)
    assert any("oracle" in t.lower() for t in toks)
    assert "cache holds" not in joined


def test_ablation_pair_holds_content_drops_ornament():
    pair = wards.ablation_pair("item-001", _RITUAL)
    assert pair.original == _RITUAL
    assert "<<~" not in pair.stripped
    assert "cache" in pair.stripped.lower()
    assert len(pair.removed_tokens) > 0


def test_ablate_idempotent_on_plain_prose():
    plain = "A plan emerges from this work. The verb carries the relation forward."
    assert wards.ablate(plain) == plain
