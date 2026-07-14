"""Tests — the RED/BLACK channel dial: the split complements the sigil grammar, the
black view at lambda=0 reproduces extraction on a sigil-only envelope, the metric
mixture lands exactly on its channel endpoints, and every dial path re-derives
byte-identically (no RNG rides the dial)."""
from __future__ import annotations

from channel_dial import (
    _mixed_rank,
    _pair_agreement,
    black_parse,
    channel_views,
    dial_assignment,
    dial_spectrum,
    lambda_ladder,
    spearman,
    strip_red,
    structure_classes,
)
from kumulipo_sections import extract_source_text
from plane_base import BASE_RECORD, PatternRegistry
from run_projector import _centrality, _rank_salience
from channel_dial import _TOKEN_RE
from structure_router import parse_to_tree, structural_hash

# A wrapped mini-meme whose ENVELOPE carries sigil lines only (no black envelope prose),
# so the black channel equals the #source-text interior modulo blank lines — the case
# where the dial's lambda=0 must land ON the extraction, not near it.
_SIGIL_ONLY_WRAPPED = """<<~ &#x0001; ? -> lar:///ha.ka.ba/lares/testbed/dial/mini >>

<<~ &#x0002; >>

<<~ ahu #source-text >>

# A Heading

A paragraph of chant prose.

- one line
- two lines

Another paragraph closes it.

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
"""

# A wrapped meme with BLACK envelope matter too (a header paragraph outside the
# source-text block) — the honest gap between lambda=0 and extraction.
_MIXED_WRAPPED = """<<~ &#x0001; ? -> lar:///ha.ka.ba/lares/testbed/dial/mixed >>

<<~ ahu #meme-header >>

# Envelope Title

<<~/ahu >>

<<~ ahu #source-text >>

Interior prose line.

<<~/ahu >>
"""


# ── the channel split ────────────────────────────────────────────────────────────────────


def test_strip_red_removes_every_sigil_token_and_nothing_else():
    black = strip_red(_SIGIL_ONLY_WRAPPED)
    assert "<<~" not in black
    assert ">>" not in black
    # The black bytes survive in order: removing the tokens from the original leaves
    # exactly the black channel (the complement law).
    assert "# A Heading" in black
    assert "A paragraph of chant prose." in black
    # Token count on the original names the red channel's size.
    assert len(_TOKEN_RE.findall(_SIGIL_ONLY_WRAPPED)) == 6


def test_strip_red_deterministic():
    assert strip_red(_MIXED_WRAPPED) == strip_red(_MIXED_WRAPPED)


def test_channels_complement_the_sigil_parse():
    # The sigil parser reads tokens as nodes and inter-token spans as text leaves; the
    # split reads the SAME token grammar, so black + red account for the whole text.
    tree = parse_to_tree("memetic-wikitext", _SIGIL_ONLY_WRAPPED.encode())
    n_tokens = len(_TOKEN_RE.findall(_SIGIL_ONLY_WRAPPED))

    def _walk_count(node, kinds):
        own = 1 if node["type"] in kinds else 0
        return own + sum(_walk_count(c, kinds) for c in node.get("children", []))

    # every sharktooth token survives as a node (opener + closer included); the
    # ahu block rides ABOVE them as pure structure — the whole text stays accounted.
    assert _walk_count(tree, ("sigil", "sigil_close")) == n_tokens
    assert _walk_count(tree, ("ahu_block",)) == 1


# ── lambda=0 vs extraction ───────────────────────────────────────────────────────────────


def _squeeze_blanks(text: str) -> str:
    """Collapse blank-line runs to one — the MODULO the fixture vows (stripped sigil
    spans leave blanks where tokens stood; markdown seats paragraph breaks on them)."""
    import re

    return re.sub(r"\n\s*\n+", "\n\n", text).strip() + "\n"


def test_black_parse_reproduces_extraction_on_sigil_only_envelope():
    black_tree = parse_to_tree("markdown", _squeeze_blanks(strip_red(_SIGIL_ONLY_WRAPPED)))
    extracted = extract_source_text(_SIGIL_ONLY_WRAPPED)
    extracted_tree = parse_to_tree("markdown", _squeeze_blanks(extracted))
    assert black_tree is not None and extracted_tree is not None
    assert structural_hash(black_tree) == structural_hash(extracted_tree)


def test_black_parse_gap_stays_where_black_envelope_matter_rides():
    # With black envelope prose the two trees diverge — the dial approximates
    # extraction, never fakes identity with it.
    black_tree = black_parse(_MIXED_WRAPPED, "memetic-wikitext")
    extracted_tree = parse_to_tree("markdown", extract_source_text(_MIXED_WRAPPED))
    assert structural_hash(black_tree) != structural_hash(extracted_tree)


def test_black_parse_of_non_memetic_kind_keeps_its_own_grammar():
    md = "# Plain\n\nprose\n"
    assert structural_hash(black_parse(md, "markdown")) == \
        structural_hash(parse_to_tree("markdown", md))


# ── the metric mixture ───────────────────────────────────────────────────────────────────


def _toy_metrics():
    # Three units; red and black disagree on which pair sits close.
    keys = ["a", "b", "c"]
    d_red = {("a", "b"): 0.1, ("a", "c"): 0.9, ("b", "c"): 0.9}
    d_black = {("a", "b"): 0.9, ("a", "c"): 0.1, ("b", "c"): 0.9}

    def red(x, y):
        return d_red[tuple(sorted((x, y)))]

    def black(x, y):
        return d_black[tuple(sorted((x, y)))]

    return keys, red, black


def test_mixture_lands_exactly_on_the_channel_endpoints():
    keys, red, black = _toy_metrics()
    red_only = _rank_salience(_centrality(keys, lambda a, b: 1.0 - red(a, b)))
    black_only = _rank_salience(_centrality(keys, lambda a, b: 1.0 - black(a, b)))
    assert _mixed_rank(keys, red, black, 1.0) == red_only
    assert _mixed_rank(keys, red, black, 0.0) == black_only


def test_mixture_moves_between_the_endpoints():
    keys, red, black = _toy_metrics()
    at_1 = _mixed_rank(keys, red, black, 1.0)
    at_0 = _mixed_rank(keys, red, black, 0.0)
    assert at_1 != at_0
    # The half-way rung reads its own ordering (here the two channels cancel onto a tie
    # between b and c's hubs while a leads) — deterministic across calls.
    assert _mixed_rank(keys, red, black, 0.5) == _mixed_rank(keys, red, black, 0.5)


# ── the dial over synthetic planes (no chroma needed) ────────────────────────────────────


def _toy_planes():
    """Two synthetic records shaped like _read_planes output: a PATTERN REGISTRY on the red
    side (the structure plane keys on structural hashes and lies over records through
    `lar_provenance`), plus record-base content rows and form memberships. The black side
    derives its own per-record trees off the same documents."""
    recs = []
    registry = PatternRegistry()
    for i, body in enumerate(["# One\n\nalpha beta\n", "- a\n- b\n- c\n"]):
        cid = f"cid-{i}"
        wrapped = f"<<~ ahu #source-text >>\n{body}<<~/ahu >>\n"
        recs.append({"cid": cid, "document": wrapped,
                     "embedding": [1.0, float(i)],
                     "metadata": {"source_file": f"corpus:t/{i}", "lar_kind": "memetic-wikitext"}})
        t = parse_to_tree("memetic-wikitext", wrapped.encode())
        h = structural_hash(t)
        registry.trees[h] = t
        registry.count[h] = registry.count.get(h, 0) + 1
        registry.exhibits.setdefault(h, []).append(cid)
    memberships = {"cid-0": {0}, "cid-1": {0}}
    return {"records": recs, "registry": registry, "memberships": memberships}


def test_dial_assignment_deterministic_and_endpoint_faithful():
    from channel_dial import derive_black_planes

    planes = _toy_planes()
    black = derive_black_planes(planes)
    a1 = dial_assignment(planes, black, 1.0)
    a1b = dial_assignment(planes, black, 1.0)
    a0 = dial_assignment(planes, black, 0.0)
    assert a1 == a1b
    # Content salience never takes the dial.
    sal = {r["plane"]: r["value"] for r in a1["restrictions"]}
    sal0 = {r["plane"]: r["value"] for r in a0["restrictions"]}
    assert sal["content"] == sal0["content"]


def test_structure_classes_counts_join_at_interior():
    from channel_dial import derive_black_planes

    planes = _toy_planes()
    black = derive_black_planes(planes)
    # The JOIN at interior lambda can only refine the endpoint partitions — count off
    # the actual channel hashes.
    n_red = structure_classes(planes, black, 1.0)
    n_black = structure_classes(planes, black, 0.0)
    n_join = structure_classes(planes, black, 0.5)
    assert n_join >= max(n_red, n_black)


def test_dial_restrictions_carry_their_base_and_the_pushforward_origin():
    from channel_dial import derive_black_planes

    planes = _toy_planes()
    a = dial_assignment(planes, derive_black_planes(planes), 0.5)
    by = {r["plane"]: r for r in a["restrictions"]}
    assert all(r["base"] == BASE_RECORD for r in a["restrictions"])
    # the red structure arm crossed from the PATTERN base; the crossing names itself.
    assert by["structure"]["origin"].startswith("pushforward:lar_provenance")
    assert by["content"]["origin"] == "native"


# ── the crossing spectrum (the dial's observable) ────────────────────────────────────────


def test_spectrum_and_ladder_come_off_the_bed_not_off_a_hand():
    from channel_dial import derive_black_planes

    planes = _toy_planes()
    black = derive_black_planes(planes)
    spec = dial_spectrum(planes, black, channel_views(planes, black))
    assert set(spec) == {"structure", "form"}
    assert spec["structure"]["interior_crossings"] == len(spec["structure"]["lambda_star"])
    ladder = lambda_ladder(spec)
    assert ladder[0] == 0.0 and ladder[-1] == 1.0
    # one rung per constant-order interval: the count follows the crossings, never a default.
    cuts = sorted({round(x, 9) for p in spec for x in spec[p]["lambda_star"]})
    assert len(ladder) == len(cuts) + 3      # endpoints + a rung inside each interval


def test_rank_order_holds_between_crossings_and_turns_across_one():
    from channel_dial import derive_black_planes

    planes = _toy_planes()
    black = derive_black_planes(planes)
    views = channel_views(planes, black)
    cuts = dial_spectrum(planes, black, views)["structure"]["lambda_star"]
    keys = views["structure"]["keys"]
    red, blk = views["structure"]["red"], views["structure"]["black"]

    def order(lam):
        r = _mixed_rank(keys, red, blk, lam)
        return tuple(sorted(keys, key=lambda k: r[k]))

    for cut in cuts:
        if 1e-6 < cut < 1 - 1e-6:
            assert order(cut - 1e-6) != order(cut + 1e-6)


# ── the tie-aware read ───────────────────────────────────────────────────────────────────


def test_pair_agreement_carries_the_census_beside_every_scalar():
    from channel_dial import derive_black_planes

    planes = _toy_planes()
    a = dial_assignment(planes, derive_black_planes(planes), 1.0)
    bundles = _pair_agreement({r["plane"]: r["value"] for r in a["restrictions"]})
    assert set(bundles) == {"content-structure", "content-form", "structure-form"}
    for b in bundles.values():
        # two toy records give fewer than three shared keys — the bundle REFUSES a scalar
        # rather than reporting one off a single pair.
        assert b["census"] is None or "double_tied" in b["census"]


# ── spearman (the scoped survivor) ───────────────────────────────────────────────────────


def test_spearman_reads_agreement_and_reversal():
    a = {"x": 0.1, "y": 0.5, "z": 0.9}
    assert spearman(a, dict(a)) == 1.0
    assert spearman(a, {"x": 0.9, "y": 0.5, "z": 0.1}) == -1.0


def test_spearman_refuses_zero_variance():
    a = {"x": 0.1, "y": 0.5, "z": 0.9}
    assert spearman(a, {"x": 0.5, "y": 0.5, "z": 0.5}) is None


def test_spearman_inflates_where_the_bundle_says_it_may_not_run():
    # a 3-class arm against a 12-class one, ordered identically in blocks: Spearman scores
    # near-perfect agreement off pairs it never ordered. The bundle flags it unsafe.
    from rank_agreement import agreement

    coarse = {f"k{i}": float(i // 4) for i in range(12)}
    fine = {f"k{i}": float(i) for i in range(12)}
    bundle = agreement(coarse, fine)
    assert spearman(coarse, fine) > 0.94              # 0.9461 — off 48 of 66 ordered pairs
    assert bundle["spearman_safe"] is False
    assert bundle["census"]["tied_x_only"] == 18      # the pairs the coarse arm never ordered
