"""Tests for form_encoder — the @daemon's fuzzy-form-vector integration (P2).

Run under the mempalace venv:

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-sensorium/scripts/test_form_encoder.py -q

The encode-path tests use a deterministic fake/dead scorer (fast, no model load);
two dedicated tests exercise the REAL SlorScorer to report live-vs-fallback. The
STORE tests drive a REAL temp-dir ChromaDB "form" collection (the caller-vector
base path); the SERVE tests cover the singleton lock + idle-reap loop.
"""

import io
import json
import math
import os
import threading

import pytest

import form_encoder as fe


# ---------------------------------------------------------------------------
# fixtures: a small constructicon basis + a serialized MoveSkeleton
# ---------------------------------------------------------------------------


def _axis(aid, category, label, layer="x-memetic", parent=None, kind=None):
    return {
        "id": aid,
        "category": category,
        "label": label,
        "layer": layer,
        "parentFamily": parent,
        "sigilKind": kind,
    }


def make_basis():
    """Canon-shaped basis: 3 layers · 1 family · 1 sigil (child of the family) ·
    1 voice · 1 phase · 1 ward — enough to exercise binding + propagation."""
    axes = [
        _axis("layer:html", "layer", "html", layer="html"),
        _axis("layer:wikitext", "layer", "wikitext", layer="wikitext"),
        _axis("layer:x-memetic", "layer", "x-memetic", layer="x-memetic"),
        _axis("family:relation", "family", "relation"),
        _axis("sigil:loulou", "sigil", "loulou", parent="relation", kind="PranalaSugar"),
        _axis("voice:council", "voice", "council"),
        _axis("phase:orient", "phase", "orient"),
        _axis("ward:sword", "ward", "sword"),
    ]
    index = {ax["id"]: i for i, ax in enumerate(axes)}
    return {"axes": axes, "index": index, "dimension": len(axes)}


def make_skeleton(loulou_standing=18):
    """A clean turn: aim · voice · hud(orient) · loulou edge · ward(sword) · yield."""
    stream = [
        {"kind": "bearing", "token": "aim", "axisId": "sigil:lares", "offset": -1},
        {"kind": "voice", "token": "council", "axisId": "voice:council", "offset": 5},
        {"kind": "content", "token": "_", "axisId": None, "offset": 10},
        {"kind": "hud", "token": "hud", "axisId": "sigil:hud", "offset": 20},
        {"kind": "phase", "token": "orient", "axisId": "phase:orient", "offset": 20},
        {"kind": "content", "token": "_", "axisId": None, "offset": 30},
        {"kind": "confidence", "token": "confidence", "axisId": "sigil:confidence", "offset": 35},
        {"kind": "oracle", "token": "oracle", "axisId": "sigil:oracle", "offset": 40},
        {"kind": "ward", "token": "sword", "axisId": "ward:sword", "offset": 50},
        {"kind": "bearing", "token": "yield", "axisId": "sigil:lares", "offset": 9999},
    ]
    graph = [
        {
            "kind": "sigil",
            "sigilName": "loulou",
            "family": "relation",
            "attrKeys": ["uri"],
            "standing": loulou_standing,
            "content": "_",
            "children": [
                {"kind": "text", "content": "_", "children": []},
            ],
        }
    ]
    counts = {
        "tokens": len(stream),
        "content": 2,
        "water": 0,
        "voices": 1,
        "wards": 1,
        "phases": 1,
        "sigils": 4,
    }
    return {"stream": stream, "graph": graph, "counts": counts, "band": "measure"}


class FakeScorer:
    """A live scorer returning a fixed SLOR — deterministic, no model load."""

    def __init__(self, value=1.0, model_name="fake"):
        self.model_name = model_name
        self.live = True
        self.reason = ""
        self._value = value

    def fit_unigram(self, corpus):  # noqa: D401 - noop
        pass

    def slor(self, text):
        return self._value


class DeadScorer:
    """A scorer whose LM never loaded — the documented graceful fallback."""

    def __init__(self):
        self.model_name = "distilgpt2"
        self.live = False
        self.reason = "ImportError: simulated missing model"

    def fit_unigram(self, corpus):
        pass

    def slor(self, text):
        return None


# ---------------------------------------------------------------------------
# t-norm + independent memberships + [0,1] clamp
# ---------------------------------------------------------------------------


def test_tnorm_product_and_min():
    assert fe._tnorm([0.5, 0.8], "product") == pytest.approx(0.4)
    assert fe._tnorm([0.5, 0.8], "min") == pytest.approx(0.5)
    assert fe._tnorm([], "product") == 0.0
    assert fe._tnorm([1.0], "product") == 1.0


def test_node_membership_grades_and_degrades():
    assert fe._node_membership({"standing": 20}) == 1.0
    assert fe._node_membership({"standing": 10}) == pytest.approx(0.5)
    assert fe._node_membership({"kind": "water"}) == fe._WATER_DEFAULT
    assert fe._node_membership({"recoveredAs": "augment"}) == fe._RECOVERED_DEFAULT
    assert fe._node_membership({"kind": "text"}) == 1.0  # pristine


def test_sanction_independent_and_clamped():
    """Memberships stay INDEPENDENT (no softmax → they need not sum to 1) and each
    rides in [0,1]."""
    basis = make_basis()
    sk = make_skeleton(loulou_standing=20)
    res = fe.encode_form(sk, basis, scorer=FakeScorer(1.0))
    act = res["axis_activation"]
    assert all(0.0 <= v <= 1.0 for v in act.values())
    # voice + ward + the clean loulou all sit near 1.0, independently.
    assert act["voice:council"] == pytest.approx(1.0)
    assert act["ward:sword"] == pytest.approx(1.0)
    assert act["sigil:loulou"] == pytest.approx(1.0)
    # NOT a probability simplex.
    assert sum(act.values()) > 1.0


def test_slor_factor_floored_never_annihilates():
    """A SLOR of 0.0 must NOT zero the vector — the factor floors at SLOR_FACTOR_FLOOR."""
    basis = make_basis()
    sk = make_skeleton(loulou_standing=20)
    res = fe.encode_form(sk, basis, scorer=FakeScorer(0.0))
    # clean structural (1.0) × floored slor (0.5) × neutral entrenchment (1.0).
    assert res["axis_activation"]["voice:council"] == pytest.approx(fe.SLOR_FACTOR_FLOOR)
    assert res["slor"]["live"] is True


def test_fallback_drops_slor_factor():
    """A dead scorer → SLOR factor dropped (1.0); sanction = structural × entrenchment."""
    basis = make_basis()
    sk = make_skeleton(loulou_standing=20)
    res = fe.encode_form(sk, basis, scorer=DeadScorer())
    assert res["slor"]["live"] is False
    assert "ImportError" in res["slor"]["reason"]
    assert res["axis_activation"]["voice:council"] == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# entrenchment prior
# ---------------------------------------------------------------------------


def test_entrenchment_normalizes_log():
    norm, max_c = fe._build_entrenchment({"sigil:loulou": 99, "voice:council": 0})
    assert max_c == 99
    assert norm["sigil:loulou"] == pytest.approx(1.0)  # the max → 1
    assert norm["voice:council"] == pytest.approx(math.log(1) / math.log(100))  # 0


def test_entrenchment_modulates_sanction():
    basis = make_basis()
    sk = make_skeleton(loulou_standing=20)
    res = fe.encode_form(
        sk, basis, scorer=FakeScorer(1.0), entrenchment={"sigil:loulou": 100, "voice:council": 1}
    )
    act = res["axis_activation"]
    # loulou (max entrenchment) > council (low entrenchment).
    assert act["sigil:loulou"] > act["voice:council"]
    assert act["sigil:loulou"] == pytest.approx(1.0)


def test_entrenchment_floor_keeps_reservoir():
    """An axis ABSENT from a non-empty table must NOT vanish — it keeps the
    ENTRENCHMENT_FLOOR toehold (the evolvability-reservoir canon: never prune a
    well-formed-but-rare construction)."""
    basis = make_basis()
    sk = make_skeleton(loulou_standing=20)
    # ward:sword is absent from the table → would be 0.0 without the floor.
    res = fe.encode_form(
        sk, basis, scorer=FakeScorer(1.0), entrenchment={"sigil:loulou": 100}
    )
    act = res["axis_activation"]
    assert act["ward:sword"] == pytest.approx(fe.ENTRENCHMENT_FLOOR)
    assert act["ward:sword"] > 0.0  # present, not pruned


# ---------------------------------------------------------------------------
# upward + down-the-tower propagation
# ---------------------------------------------------------------------------


def test_degraded_leaf_lights_parent_and_lower_layer():
    """A degraded sigil:loulou (low standing) must light its parent family axis
    AND the grammar-layer beneath it — degradation falls upward + down the tower,
    never hard-faults."""
    basis = make_basis()
    sk = make_skeleton(loulou_standing=4)  # 4/20 = 0.2 → heavily degraded
    degraded = fe.encode_form(sk, basis, scorer=FakeScorer(1.0), prop_fraction=0.5)
    act = degraded["axis_activation"]

    # The clean contrast: same turn, pristine loulou.
    clean = fe.encode_form(
        make_skeleton(loulou_standing=20), basis, scorer=FakeScorer(1.0), prop_fraction=0.5
    )["axis_activation"]

    # loulou is degraded but still present.
    assert act["sigil:loulou"] == pytest.approx(0.2)

    # UPWARD: the parent family axis is lit ABOVE its bare direct binding (0.2) by
    # the degradation share — and above where the clean run leaves it after
    # accounting for the leaf's own drop.
    assert act["family:relation"] > 0.2
    assert act["family:relation"] == pytest.approx(0.6)  # 0.2 direct + 0.4 share

    # DOWN-THE-TOWER: layer:wikitext is NOT directly bound (the node seats at
    # x-memetic), yet the degradation lights it; the clean run never touches it.
    assert act["layer:wikitext"] > 0.0
    assert "layer:wikitext" not in clean


def test_clean_leaf_does_not_propagate():
    basis = make_basis()
    sk = make_skeleton(loulou_standing=20)  # clean → no degradation
    res = fe.encode_form(sk, basis, scorer=FakeScorer(1.0), prop_fraction=0.5)
    act = res["axis_activation"]
    # family:relation is bound DIRECTLY by the clean loulou node (1.0) — but gets
    # NO propagation share (the node is clean, zero degradation).
    assert act["family:relation"] == pytest.approx(1.0)
    # layer:wikitext is neither directly bound nor propagated-to → absent.
    assert "layer:wikitext" not in act


def test_lower_layer_helper():
    assert fe._lower_layer("x-memetic") == "wikitext"
    assert fe._lower_layer("wikitext") == "html"
    assert fe._lower_layer("html") is None
    assert fe._lower_layer(None) is None


# ---------------------------------------------------------------------------
# n-gram + trajectory features
# ---------------------------------------------------------------------------


def test_ngram_features_uni_bi_tri():
    sk = make_skeleton()
    feats = fe._ngram_features(sk["stream"])
    # uni for an axis token
    assert feats["uni:voice:council"] == 1
    # a bigram over consecutive symbols exists
    bigrams = [k for k in feats if k.startswith("bi:")]
    trigrams = [k for k in feats if k.startswith("tri:")]
    assert bigrams and trigrams
    # counts add up: n symbols → n uni, n-1 bi, n-2 tri
    n = len(sk["stream"])
    assert sum(v for k, v in feats.items() if k.startswith("uni:")) == n
    assert sum(v for k, v in feats.items() if k.startswith("bi:")) == n - 1
    assert sum(v for k, v in feats.items() if k.startswith("tri:")) == n - 2


def test_trajectory_stats():
    s = fe._stats([4.0, 8.0, 12.0])
    assert s["mean"] == pytest.approx(8.0)
    assert s["min"] == 4.0 and s["max"] == 12.0
    assert s["first"] == 4.0 and s["last"] == 12.0
    assert s["slope"] == pytest.approx(4.0)  # +4 per step
    assert fe._stats([]) is None
    one = fe._stats([7.0])
    assert one["slope"] == 0.0 and one["mean"] == 7.0


def test_trajectory_over_skeleton_and_curves():
    basis = make_basis()
    sk = make_skeleton(loulou_standing=18)
    res = fe.encode_form(
        sk, basis, scorer=FakeScorer(1.0), curves={"aperture": [10, 11, 13], "oodaha": [3, 4]}
    )
    traj = res["trajectory"]
    assert traj["standing"]["first"] == 18.0  # the one graded node
    assert traj["aperture"]["slope"] > 0
    assert traj["oodaha"]["mean"] == pytest.approx(3.5)


# ---------------------------------------------------------------------------
# turn conformance
# ---------------------------------------------------------------------------


def test_turn_conformance_full_vs_water():
    sk = make_skeleton()
    full = fe._turn_conformance(sk)
    assert full == pytest.approx(1.0)  # all frame elements present, no water

    # Inject water → conformance attenuates.
    sk2 = make_skeleton()
    sk2["counts"]["water"] = 3
    sk2["counts"]["tokens"] = sk2["counts"]["tokens"] + 3
    assert fe._turn_conformance(sk2) < full


def test_turn_conformance_partial_frame():
    """A turn missing the closing ward + yield reads lower than a full one."""
    sk = make_skeleton()
    sk["stream"] = [t for t in sk["stream"] if t["token"] not in ("yield", "sword")]
    sk["counts"]["wards"] = 0
    assert fe._turn_conformance(sk) < 1.0


# ---------------------------------------------------------------------------
# end-to-end: a real serialized MoveSkeleton → a sensible sparse vector
# ---------------------------------------------------------------------------


def test_end_to_end_sparse_vector_shape():
    basis = make_basis()
    sk = make_skeleton(loulou_standing=18)
    res = fe.encode_form(sk, basis, scorer=FakeScorer(0.8))

    fv = res["form_vector"]
    assert res["dimension"] == basis["dimension"]
    # sparse: indices strictly ascending, within range, values in [0,1]
    assert fv["indices"] == sorted(fv["indices"])
    assert all(0 <= i < basis["dimension"] for i in fv["indices"])
    assert all(0.0 <= v <= 1.0 for v in fv["values"])
    assert len(fv["indices"]) == len(fv["values"])
    # the bound axes (voice, ward, phase, sigil, layer) all light up
    lit_ids = {basis["axes"][i]["id"] for i in fv["indices"]}
    assert "voice:council" in lit_ids
    assert "ward:sword" in lit_ids
    assert "sigil:loulou" in lit_ids


def test_l2_normalization():
    basis = make_basis()
    sk = make_skeleton(loulou_standing=18)
    res = fe.encode_form(sk, basis, scorer=FakeScorer(1.0), l2=True)
    vals = res["form_vector"]["values"]
    norm = math.sqrt(sum(v * v for v in vals))
    assert norm == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# the REAL SlorScorer — reports live-vs-fallback (the load-bearing requirement)
# ---------------------------------------------------------------------------


def test_real_slor_live_or_documented_fallback():
    """Construct the REAL scorer. If distilgpt2 loads, assert SLOR discriminates a
    well-formed English string above gibberish. If it cannot load, assert the
    documented fallback: live False, a precise reason, slor() → None."""
    sc = fe.SlorScorer(corpus=["the cat sat on the mat", "a dog ran in the park"])
    if sc.live:
        good = sc.slor("the cat sat on the mat")
        junk = sc.slor("asdf qwer zxcv plugh")
        assert good is not None and junk is not None
        assert 0.0 <= good <= 1.0 and 0.0 <= junk <= 1.0
        assert good > junk, f"SLOR should rank fluent>gibberish (got {good} vs {junk})"
    else:
        assert sc.reason, "a dead scorer must carry a precise reason"
        assert sc.slor("anything") is None


def test_real_scorer_end_to_end():
    """A real scorer threaded through encode_form yields a live (or fallback) flag
    and a non-collapsed vector either way."""
    basis = make_basis()
    sk = make_skeleton(loulou_standing=18)
    sc = fe.SlorScorer()
    res = fe.encode_form(sk, basis, scorer=sc)
    assert isinstance(res["slor"]["live"], bool)
    # Floored/fallback factor → the vector never collapses to empty.
    assert len(res["form_vector"]["indices"]) > 0


# ---------------------------------------------------------------------------
# densify — sparse {indices, values} → fixed dense vector of basis.dimension
# ---------------------------------------------------------------------------


def test_densify_scatters_sparse_into_fixed_length():
    dense = fe._densify({"indices": [1, 3], "values": [0.5, 0.9]}, 5)
    assert dense == [0.0, 0.5, 0.0, 0.9, 0.0]
    assert len(dense) == 5


def test_densify_ignores_out_of_range_indices():
    # An index past the pinned dimension is dropped, never overflows the dense vector.
    dense = fe._densify({"indices": [0, 99], "values": [1.0, 1.0]}, 3)
    assert dense == [1.0, 0.0, 0.0]


# ---------------------------------------------------------------------------
# FormPalaceStore — the REAL "form" collection (caller-vector, no model invoked)
# ---------------------------------------------------------------------------

SHA_A = "a" * 64
SHA_B = "b" * 64


@pytest.fixture
def store(tmp_path):
    return fe.FormPalaceStore(str(tmp_path / "formpalace"))


def test_store_then_get_round_trip(store):
    """A form-vector stores keyed by verbatim_sha and reads back with its metadata —
    the cross-graph join key present (form-drawer.id == content's verbatim_sha)."""
    fv = {"indices": [0, 2], "values": [1.0, 0.5]}
    res = store.store(
        SHA_A, fv, dimension=4,
        metadata={"register": "synthesis", "grammar_layer": "x-memetic",
                  "struct_hash": "sh1", "verbatim_sha": SHA_A, "conformance": 0.83},
    )
    assert res["key"] == SHA_A
    assert res["dimension"] == 4
    assert res["count"] == 1
    got = store.get(SHA_A)
    assert got is not None
    assert got["key"] == SHA_A
    assert got["metadata"]["lar_verbatim_sha"] == SHA_A  # the content-join key
    assert got["metadata"]["register"] == "synthesis"
    assert got["metadata"]["struct_hash"] == "sh1"
    assert got["metadata"]["conformance"] == pytest.approx(0.83)


def test_store_persists_form_vector_in_document(store):
    """The TRUE dense basis (sparse form_vector) rides the persisted document alongside
    axis_activation — a downstream reader (node parse-form-vector) recovers the real basis
    rather than reconstructing indices from the ID-keyed activation profile alone (F4)."""
    fv = {"indices": [0, 2], "values": [1.0, 0.5]}
    store.store(
        SHA_A, fv, dimension=4,
        metadata={"verbatim_sha": SHA_A,
                  "axis_activation": {"sigil:loulou": 0.91}},
    )
    doc = json.loads(store.get(SHA_A)["document"])
    assert doc["form_vector"] == fv  # the basis round-trips verbatim
    assert doc["axis_activation"] == {"sigil:loulou": 0.91}  # profile still carried


def test_store_recurrence_bumps_count(store):
    fv = {"indices": [0], "values": [1.0]}
    store.store(SHA_A, fv, 4, {"verbatim_sha": SHA_A})
    res2 = store.store(SHA_A, fv, 4, {"verbatim_sha": SHA_A})
    assert res2["count"] == 2  # same key re-mined → recurrence tally
    assert store.get(SHA_A)["metadata"]["count"] == 2


def test_query_finds_by_form_similarity(store):
    """The collection is queryable by form-similarity: the nearest hit to a vector is
    the entry stored from that very vector."""
    near = {"indices": [0, 1], "values": [1.0, 1.0]}
    far = {"indices": [2, 3], "values": [1.0, 1.0]}
    store.store(SHA_A, near, 4, {"verbatim_sha": SHA_A, "register": "synthesis"})
    store.store(SHA_B, far, 4, {"verbatim_sha": SHA_B, "register": "provisional"})
    res = store.query(near, 4, n_results=2, where=None)
    assert res["matches"], "query returned no matches"
    assert res["matches"][0]["key"] == SHA_A  # the nearest is itself
    keys = {m["key"] for m in res["matches"]}
    assert keys == {SHA_A, SHA_B}


def test_query_narrows_by_metadata_where_filter(store):
    near = {"indices": [0, 1], "values": [1.0, 1.0]}
    far = {"indices": [2, 3], "values": [1.0, 1.0]}
    store.store(SHA_A, near, 4, {"verbatim_sha": SHA_A, "register": "synthesis"})
    store.store(SHA_B, far, 4, {"verbatim_sha": SHA_B, "register": "provisional"})
    res = store.query(near, 4, n_results=5, where={"register": "provisional"})
    keys = {m["key"] for m in res["matches"]}
    assert keys == {SHA_B}  # the where-filter excludes the nearer synthesis entry


def test_store_dimension_drift_surfaces(store):
    """A second store whose dimension differs from the pinned collection length
    surfaces as a clear basis-drift error, never a silent corruption."""
    store.store(SHA_A, {"indices": [0], "values": [1.0]}, 4, {"verbatim_sha": SHA_A})
    with pytest.raises(ValueError, match="drift|dimension"):
        store.store(SHA_B, {"indices": [0], "values": [1.0]}, 8, {"verbatim_sha": SHA_B})


# ---------------------------------------------------------------------------
# the encode_store wire — encode a skeleton then store, joined by verbatim_sha
# ---------------------------------------------------------------------------


def test_encode_store_wire_end_to_end(tmp_path):
    """encode_store: a serialized MoveSkeleton + basis → encode → store → queryable.
    The whole form-graph slice in one round-trip, keyed by verbatim_sha."""
    palace = str(tmp_path / "formpalace")
    holder = {"scorer": FakeScorer(1.0), "store": None, "palace": palace}
    out = io.StringIO()
    basis = make_basis()
    sk = make_skeleton(loulou_standing=18)
    req = {
        "id": 1, "op": "encode_store", "key": SHA_A,
        "skeleton": sk, "basis": basis,
        "metadata": {"register": "synthesis", "grammar_layer": "x-memetic",
                     "struct_hash": "sh1", "verbatim_sha": SHA_A},
    }
    fe._handle_request(req, holder, out)
    resp = json.loads(out.getvalue().splitlines()[0])
    assert resp["ok"] is True
    r = resp["result"]
    assert r["key"] == SHA_A
    assert r["dimension"] == basis["dimension"]
    assert 0.0 <= r["conformance"] <= 1.0
    assert r["form_vector"]["indices"]

    # Queryable by form-similarity through the same warm holder.
    out2 = io.StringIO()
    fe._handle_request(
        {"id": 2, "op": "query", "skeleton": sk, "basis": basis, "n_results": 3}, holder, out2
    )
    q = json.loads(out2.getvalue().splitlines()[0])["result"]
    assert q["matches"][0]["key"] == SHA_A

    # get returns the metadata with the verbatim_sha content-join key.
    out3 = io.StringIO()
    fe._handle_request({"id": 3, "op": "get", "key": SHA_A}, holder, out3)
    g = json.loads(out3.getvalue().splitlines()[0])["result"]
    assert g["metadata"]["lar_verbatim_sha"] == SHA_A
    assert g["metadata"]["struct_hash"] == "sh1"


def test_store_op_requires_palace():
    """Without a --palace the store/query/get ops fail clearly (encode still works)."""
    holder = {"scorer": FakeScorer(1.0), "store": None, "palace": None}
    out = io.StringIO()
    fe._handle_request(
        {"id": 1, "op": "store", "key": SHA_A, "form_vector": {"indices": [0], "values": [1.0]},
         "dimension": 4, "metadata": {"verbatim_sha": SHA_A}}, holder, out
    )
    resp = json.loads(out.getvalue().splitlines()[0])
    assert resp["ok"] is False
    assert "palace" in resp["error"]


# ---------------------------------------------------------------------------
# serve singleton lock + idle-reap loop (mirrors structurepalace_io's protocol)
# ---------------------------------------------------------------------------

_posix_flock = pytest.mark.skipif(
    fe._fcntl is None, reason="serve.lock singleton relies on POSIX fcntl.flock"
)


@_posix_flock
def test_serve_lock_is_singleton_per_palace(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    palace_a = str(tmp_path / "palace_a")
    palace_b = str(tmp_path / "palace_b")
    fh1 = fe._acquire_serve_lock(palace_a)
    assert fh1 is not None
    assert fe._acquire_serve_lock(palace_a) is None  # same palace, held → refused
    fh_b = fe._acquire_serve_lock(palace_b)
    assert fh_b is not None  # different palace → independent singleton
    fe._release_lock(fh1)
    fh2 = fe._acquire_serve_lock(palace_a)
    assert fh2 is not None  # released → claimable again
    fe._release_lock(fh2)
    fe._release_lock(fh_b)


@pytest.mark.skipif(fe._select is None, reason="idle-reap needs select")
def test_serve_loop_reaps_when_idle(monkeypatch):
    monkeypatch.setenv(fe.IDLE_TTL_ENV, "0.5")
    r, w = os.pipe()
    out = io.StringIO()
    done = threading.Event()

    def _run():
        fe._serve_loop({"scorer": None, "store": None, "palace": None}, r, out)
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        assert done.wait(timeout=5), "idle loop did not reap within the TTL window"
    finally:
        os.close(w)
        os.close(r)
        t.join(timeout=2)


def test_serve_loop_handles_ping_then_exits_on_eof(monkeypatch):
    monkeypatch.setenv(fe.IDLE_TTL_ENV, "0")  # EOF drives exit
    r, w = os.pipe()
    out = io.StringIO()
    done = threading.Event()

    def _run():
        fe._serve_loop({"scorer": None, "store": None, "palace": None}, r, out)
        done.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    try:
        os.write(w, (json.dumps({"id": 1, "op": "ping"}) + "\n").encode("utf-8"))
        os.close(w)
        assert done.wait(timeout=5), "loop did not exit on EOF"
    finally:
        os.close(r)
        t.join(timeout=2)
    line = json.loads(out.getvalue().splitlines()[0])
    assert line["id"] == 1 and line["ok"] is True
    assert line["result"]["ready"] is True
    assert line["result"]["store"] is False  # no palace bound
