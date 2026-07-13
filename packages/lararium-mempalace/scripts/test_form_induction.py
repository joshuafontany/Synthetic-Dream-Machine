#!/usr/bin/env python3
"""Tests for form_induction — the S3 corpus FORM cap (blind grammar induction).

Proves the four movements corpus.md #the-form-induction names:
  1. TreeMiner surfaces frequent CLOSED embedded subtrees (no sub-pattern spam).
  2. PrefixSpan/BIDE surfaces frequent move-SEQUENCES over the streams.
  3. the MDL loop STOPS at the right grammar — a memorize-few template is rejected and the
     total description-length stops falling.
  4. seed-and-refine keeps a seed the corpus reproduces and DISCARDS one it does not.

Pure-miner tests need NO chroma; the batch `induce` graceful-skip test needs neither. Run:
    ~/.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_form_induction.py -q
"""
import io
import json
import os
import sys
import types

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import form_induction as fi


# ── fixture forests ───────────────────────────────────────────────────────────────────


def _leaf(t):
    return {"type": t, "children": []}


def _node(t, *kids):
    return {"type": t, "children": list(kids)}


def _sigil_row_tree():
    """A `source_file` holding three sharktooth sigils, each with a sigil_name leaf — the
    recurring house form the miners should surface."""
    return _node(
        "source_file",
        _node("sharktooth_sigil", _leaf("sigil_name")),
        _node("sharktooth_sigil", _leaf("sigil_name")),
        _node("sharktooth_sigil", _leaf("sigil_name")),
    )


def _ahu_tree():
    return _node(
        "source_file",
        _node("ahu_block", _leaf("sigil_name"), _node("sharktooth_sigil", _leaf("sigil_name"))),
    )


def _pair():
    """The recurring `sharktooth_sigil → sigil_name` construction, the reusable unit."""
    return _node("sharktooth_sigil", _leaf("sigil_name"))


def _varied_forest(n=6):
    """The pair recurs under DIFFERENT roots + before DIFFERENT trailing leaves, so the pair
    itself is the maximal recurring unit — no larger pattern is equally frequent (the case
    where closed mining keeps the pair, not an enclosing context)."""
    roots = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta"]
    bodies = ["text", "code", "heading", "quote", "list", "table", "rule", "blank"]
    return [_node(roots[i % len(roots)], _pair(), _leaf(bodies[i % len(bodies)])) for i in range(n)]


# ── 1. TreeMiner — frequent CLOSED embedded subtrees ─────────────────────────────────


def test_treeminer_surfaces_frequent_subtrees():
    forest = [_sigil_row_tree() for _ in range(5)]
    subs = fi.mine_subtrees(forest, min_support=3)
    assert subs, "the recurring sigil form should surface at least one frequent subtree"
    # the sharktooth_sigil → sigil_name pair recurs in every tree.
    seqs = [[lbl for lbl, _d in s["seq"]] for s in subs]
    assert any("sharktooth_sigil" in s and "sigil_name" in s for s in seqs)
    for s in subs:
        assert s["support"] >= 3


def test_treeminer_is_closed_no_subpattern_spam():
    """CLOSED mining: a bare `sharktooth_sigil` single-node pattern that recurs EXACTLY as
    often as the larger `sharktooth_sigil → sigil_name` pattern must NOT appear on its own —
    the super-pattern subsumes it. No every-sub-pattern spam."""
    forest = _varied_forest(6)  # pair recurs under varied roots+leaves → pair is the closed unit
    subs = fi.mine_subtrees(forest, min_support=3)
    def is_pat(s, types_):
        return [lbl for lbl, _d in s["seq"]] == types_
    have_pair = any(is_pat(s, ["sharktooth_sigil", "sigil_name"]) for s in subs)
    lone_shark = [s for s in subs if is_pat(s, ["sharktooth_sigil"])]
    assert have_pair, "the 2-node closed pattern should surface"
    # the lone single-node pattern is subsumed by the equally-frequent pair → closed away.
    assert not lone_shark, "an equally-frequent sub-pattern must be closed away (no spam)"


def test_embedded_inclusion_respects_ancestry_and_order():
    # pattern A(C) embeds in A(B(C)) (C is a DESCENDANT, embedded not induced).
    pat = (fi._as_forest(_node("A", _leaf("C"))),)
    assert fi._embeds(pat, _node("A", _node("B", _leaf("C"))))
    # but A(C) does NOT embed in a tree with no A-over-C ancestry.
    assert not fi._embeds(pat, _node("A", _leaf("D")))


# ── 2. PrefixSpan / BIDE — frequent move-sequences ───────────────────────────────────


def test_prefixspan_surfaces_frequent_sequences():
    # a repeated move-run: aim · hud · ward, five times, plus noise.
    streams = [["aim", "hud", "ward", "content"] for _ in range(5)]
    streams.append(["content", "noise"])
    seqs = fi.mine_sequences(streams, min_support=4, min_len=2)
    assert seqs, "PrefixSpan should surface the recurring move-run"
    found = [s["seq"] for s in seqs]
    # the closed run aim→hud→ward (or a superset) recurs in ≥4 streams.
    assert any(set(["aim", "hud", "ward"]).issubset(set(s)) for s in found)


def test_delta_p_surfaces_associated_bigrams():
    # 'aim' is ALWAYS followed by 'hud' → a high-ΔP construction candidate.
    streams = [["aim", "hud", "x"], ["aim", "hud", "y"], ["aim", "hud", "z"], ["q", "r"]]
    dp = fi.delta_p_bigrams(streams, dp_min=0.3, min_support=2)
    pairs = [tuple(d["seq"]) for d in dp]
    assert ("aim", "hud") in pairs


# ── 3. the MDL loop — stops at the right grammar, rejects memorize-few ───────────────


def test_mdl_rejects_memorize_few_template():
    # a template that appears in ONE stream cannot pay its l(G) → rejected; a frequent one kept.
    streams = [["a", "b", "c"] for _ in range(6)]
    streams.append(["rare", "once", "only"])
    frequent = {"seq": ["a", "b", "c"], "origin": "seq"}
    memorize_few = {"seq": ["rare", "once", "only"], "origin": "seq"}
    sel = fi.mdl_select(streams, [frequent, memorize_few], min_support=2, max_forms=8)
    kept = [tuple(c["seq"]) for c in sel["kept"]]
    rejected = [tuple(c["seq"]) for c in sel["rejected"]]
    assert ("a", "b", "c") in kept, "the frequent template earns its bits"
    assert ("rare", "once", "only") in rejected, "the memorize-few template is rejected"


def test_mdl_description_length_stops_falling():
    streams = [["a", "b", "c"] for _ in range(6)]
    dl_empty = fi.description_length(streams, [], alphabet_size=3)
    dl_one = fi.description_length(streams, [{"seq": ["a", "b", "c"]}], alphabet_size=3)
    assert dl_one < dl_empty, "a paying template lowers the description length"
    sel = fi.mdl_select(streams, [{"seq": ["a", "b", "c"]}, {"seq": ["a", "b"]}],
                        min_support=2, max_forms=8)
    # once the best template is taken, no remaining candidate lowers DL further → rounds bounded.
    assert sel["dl"] <= dl_empty
    assert sel["rounds"] >= 1
    # the loop terminated (it did not keep adding non-paying forms up to max_forms).
    assert len(sel["kept"]) < 8


# ── 4. seed-and-refine — the corpus can overrule a seed ──────────────────────────────


def test_seed_and_refine_discards_an_unearned_seed():
    # the corpus reproduces the sigil-row seed but NEVER the ahu-block seed → ahu dropped.
    forest = _varied_forest(6)
    seeds = [
        {"seq": ["sharktooth_sigil", "sigil_name"], "origin": "seed", "name_hint": "sigil-row"},
        {"seq": ["ahu_block", "sigil_name"], "origin": "seed", "name_hint": "ahu-block"},
    ]
    res = fi.induce_forest(forest, min_support=3, seeds=seeds)
    summ = res["summary"]
    assert "sigil-row" in summ["seeds_kept"], "the reproduced seed is kept"
    assert "ahu-block" in summ["seeds_dropped"], "the unreproduced seed is discarded (corpus overrules)"


def test_pure_cold_induction_available():
    forest = [_sigil_row_tree() for _ in range(5)]
    res = fi.induce_forest(forest, min_support=3, seeds=[])
    assert res["summary"]["seeds_kept"] == []
    assert res["forms"], "cold induction still surfaces the corpus's forms"


# ── the LLM names LAST (never inside the loop) ───────────────────────────────────────


def test_labeler_is_a_downstream_noop_without_a_namer():
    forms = [{"struct_hash": "h", "seq": ["a", "b"]}]
    assert fi.label_constructicon(forms) == forms  # no namer → the mining stands alone
    labelled = fi.label_constructicon(forms, namer=lambda f: "→".join(f["seq"]))
    assert labelled[0]["label"] == "a→b"


# ── the batch induce — end-to-end fold + keying + graceful skip ──────────────────────


def test_induce_forest_keys_forms_by_struct_hash():
    forest = [_sigil_row_tree() for _ in range(5)] + [_ahu_tree() for _ in range(5)]
    res = fi.induce_forest(forest, min_support=3)
    assert res["forms"]
    for f in res["forms"]:
        assert isinstance(f["struct_hash"], str) and len(f["struct_hash"]) == 32
        assert f["origin"] in ("tree", "seq", "dp", "seed")
    # the summary carries the MDL ledger the operator can challenge.
    assert res["summary"]["dl"] <= res["summary"]["dl0"]


def test_cmd_induce_graceful_skip_when_no_store(tmp_path):
    """No structure store under the dir ⇒ forms:0 with a form-skipped note (other planes
    untouched). The chroma import may be absent OR present-but-empty; either way, skip."""
    args = types.SimpleNamespace(structure=str(tmp_path / "nope"), out="", min_support=2, max_forms=8)
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        fi.cmd_induce(args)
    finally:
        sys.stdout = old
    summary = json.loads(buf.getvalue().strip().splitlines()[-1])
    assert summary["forms"] == 0
    assert "form-skipped" in summary["note"]


def test_mine_sequences_reads_full_streams_without_a_cap():
    """The lattice walk retired: maximal repeats read the WHOLE streams (no slice, no
    top-k) and return promptly on exactly the regime that blew the closed lattice —
    long repetitive low-alphabet streams (the sectioned-chant shape)."""
    import time

    streams = [(["paragraph", "inline", "text"] * 1200) + [f"tail{i}"] for i in range(8)]
    t0 = time.time()
    out = fi.mine_sequences(streams, 2, max_forms=8, topk=True)
    assert time.time() - t0 < 60                       # the lattice never returned at all
    assert out                                         # the recurring motif still surfaces
    top = out[0]
    assert top["support"] == 8                         # the motif rides every stream
    assert ["paragraph", "inline", "text"] * 2 <= top["seq"] or "paragraph" in top["seq"]


def test_emb_forest_survives_a_node_count_past_the_recursion_limit():
    """Cases (b)/(c) splice children into the sibling row, so the naive recursion's depth
    grows with the target's TOTAL node count — a dense sigil corpus blew ~6000 frames
    through the motif bounds. The iterative driver must walk a 5000-sibling row flat."""
    from form_induction import _emb_forest

    wide = tuple(("x", ()) for _ in range(5000))
    assert _emb_forest((("y", ()),), wide, {}) is False   # every skip, no match
    assert _emb_forest((("x", ()),), wide, {}) is True    # first sibling matches
    deep = ("d", ())
    for _ in range(3000):
        deep = ("d", (deep,))
    assert _emb_forest((("d", ()),), (deep,), {}) is True  # descent past the limit


def test_mdl_select_matches_the_reference_trials_exactly():
    """The vectorized cover (cached masks + once-per-round baseline + the unit bound)
    must stay VERDICT-IDENTICAL to reference description_length trials — same kept
    set, same dl, same rounds — over randomized corpora."""
    import random

    def reference(streams, candidates, min_support, max_forms, holdout):
        alphabet = sorted({x for s in streams for x in s})
        asize = max(len(alphabet), 1)
        pool, seen = [], set()
        for c in candidates:
            key = tuple(c["seq"])
            if key in seen or len(key) < 1:
                continue
            seen.add(key)
            pool.append(dict(c))
        pool.sort(key=lambda c: (-int(c.get("support", 0) or 0), fi._canonical(c["seq"])))
        kept, kept_keys = [], set()
        dl = fi.description_length(streams, [], asize)
        rounds = 0
        while len(kept) < max_forms:
            best, best_dl = None, dl
            for c in pool:
                key = tuple(c["seq"])
                if key in kept_keys or fi._seq_support(streams, key) < min_support:
                    continue
                if holdout and fi._seq_support(holdout, key) < 1:
                    continue
                trial = fi.description_length(streams, kept + [c], asize)
                if trial < best_dl - 1e-9:
                    best_dl, best = trial, c
            if best is None:
                break
            kept.append(best)
            kept_keys.add(tuple(best["seq"]))
            dl = best_dl
            rounds += 1
        return [tuple(k["seq"]) for k in kept], round(dl, 6), rounds

    rng = random.Random(4241)
    for _ in range(12):
        alpha = ["a", "b", "c", "d", "e"][: rng.randrange(3, 6)]
        streams = [
            [rng.choice(alpha) for _ in range(rng.randrange(20, 60))] for _ in range(4)
        ]
        holdout = [streams.pop()] if rng.random() < 0.5 else None
        cands = fi.mine_sequences(streams, 2, max_forms=32)
        got = fi.mdl_select(streams, cands, min_support=2, max_forms=8, holdout=holdout)
        want_kept, want_dl, want_rounds = reference(streams, cands, 2, 8, holdout)
        assert [tuple(k["seq"]) for k in got["kept"]] == want_kept
        assert round(got["dl"], 6) == want_dl
        assert got["rounds"] == want_rounds
