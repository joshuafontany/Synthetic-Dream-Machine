"""W1.5a/b/c/d — the COORDINATOR/DRIVER witnesses: the engine goes LIVE over a REAL Claude fixture into
an EPHEMERAL Memory palace (never the sovereign ~/.mempalace).

  · W1.5a real capture:      the whole transcript processes → landed == turn-count (the ~37× leak gone).
  · W1.5b idempotent:        a second pass lands +0 (the re-derivation no-op).
  · W1.5c crash re-derivation: a partial pass, then a full re-run lands the TAIL (the crash-cure).
  · W1.5d cid single-derivation: distinct turns → distinct FULL-hex cids in the LANDED store, re-derive matches.
  + the embedder-identity floor: the driver stamps lar_embedder_model + pins dim/model.
  + a REAL warm-embed wire (skipped when minilm can't load) — the true M1 keystone.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_capture_session.py -q
"""
import json
import os

import pytest

from capture_session import CaptureSessionServer, capture_and_observe
from capture_sources import derive_cid

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "capture")
CLAUDE = os.path.join(FIXTURES, "claude-main.jsonl")
TURN_COUNT = 9  # the claude-main fixture atomizes to 9 blocks (steering·thinking·surface·action·result·…)


def _stub_embed_factory(dim=4, model="stub-minilm/4"):
    """A deterministic warm-cap stand-in — a fixed-dim vector + a model name (no minilm load). Proves
    the driver's compose + stamp + dim/model floor without the heavy model."""
    def factory():
        def embed_one(text):
            h = abs(hash(text))
            return [float((h >> (8 * i)) & 0xFF) for i in range(dim)]
        return embed_one, model
    return factory


@pytest.fixture(autouse=True)
def _pin_worldline_salt(monkeypatch):
    """Capture now always observes Claude through the rooted stream stack."""
    monkeypatch.setenv("LAR_WORLDLINE_SALT", "capture-session-witness-salt")


def test_w1_5a_real_capture_lands_the_whole_transcript(tmp_path):
    res = capture_and_observe(str(tmp_path / ".mem"), "claude", CLAUDE, wing="wing_proj",
                        embed_factory=_stub_embed_factory())
    assert res["landed"] == TURN_COUNT and res["skipped"] == 0     # the WHOLE transcript processes
    assert res["watermark"] == TURN_COUNT and res["audit"]["ok"]
    assert res["embedder_model"] == "stub-minilm/4" and res["embedder_dim"] == 4


def test_memory_capture_materializes_its_rooted_cap_declaration(tmp_path):
    root = tmp_path / ".mem"
    capture_and_observe(str(root), "claude", CLAUDE, wing="wing_proj", embed_factory=_stub_embed_factory())
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["sensorium"] == "memory"
    assert manifest["order"] == {"projector": "worldline", "basis": "observed:turn-dag"}
    assert manifest["apertures"] == {"beat": "worldline-dag"}
    assert set(manifest["has"]) == {"content", "structure", "form", "persistence", "worldline"}


def test_w1_5b_second_pass_is_idempotent(tmp_path):
    palace = str(tmp_path / ".mem")
    capture_and_observe(palace, "claude", CLAUDE, wing="wing_proj", embed_factory=_stub_embed_factory())
    res2 = capture_and_observe(palace, "claude", CLAUDE, wing="wing_proj", embed_factory=_stub_embed_factory())
    assert res2["landed"] == 0 and res2["skipped"] == TURN_COUNT   # +0 landed the second pass
    assert res2["audit"]["ok"]


def test_serve_holder_keeps_capture_in_python_and_rederives_idempotently(tmp_path):
    # This is the daemon-facing seam: it accepts a pointer descriptor, not a turn payload.  One
    # warm Python holder parses and lands the source; a second request skips the same three CIDs.
    server = CaptureSessionServer(str(tmp_path / ".mem"), embed_factory=_stub_embed_factory())
    req = {"surface": "claude", "pointer": CLAUDE, "wing": "wing_proj", "room": "conversations"}
    first = server.capture(req)
    second = server.capture(req)
    assert first["landed"] == TURN_COUNT and first["skipped"] == 0
    assert second["landed"] == 0 and second["skipped"] == TURN_COUNT


def test_repour_rejim_derives_the_geology_plane_over_content(tmp_path):
    # the serve op re-derives the rejim (rhythm/geology) DERIVED plane over the holder's content, on the
    # SAME serialized pipe as capture. The small fixture is far too short to LOCK a scale, so zero nameless
    # regimes ride out — but the plane derives + lands a valid geology record (the live-wiring witness).
    root = str(tmp_path / ".mem")
    server = CaptureSessionServer(root, embed_factory=_stub_embed_factory())
    server.capture({"surface": "claude", "pointer": CLAUDE, "wing": "wing_proj", "room": "conversations"})
    out = server.repour_rejim({})
    assert "rejim" in out and "n_ticks" in out and out["stream_chars"] > 0   # content stream drained
    geology = os.path.join(root, "rejim", "geology.json")
    assert os.path.exists(geology)                                           # landed to the rejim plane
    assert json.load(open(geology, encoding="utf-8"))["n_ticks"] == out["n_ticks"]


def test_read_rejim_makes_the_geology_askable(tmp_path):
    # the rhythm plane made ASKABLE: an honest absence before any repour, the landed geology after — the
    # derived plane now reads back through the pipe, not only writes (the audit's read-side gap, closed).
    root = str(tmp_path / ".mem")
    server = CaptureSessionServer(root, embed_factory=_stub_embed_factory())
    server.capture({"surface": "claude", "pointer": CLAUDE, "wing": "wing_proj", "room": "conversations"})
    absent = server.read_rejim({})
    assert absent["repoured"] is False and absent["geology"] is None      # never poured → honest None, no lie
    server.repour_rejim({})
    got = server.read_rejim({})
    assert got["repoured"] is True and got["geology"]["stream_chars"] > 0  # the landed geology reads back


def test_rejim_tick_holds_under_backpressure_then_fires_on_settled_ground(tmp_path, monkeypatch):
    # the live-drive: capture MARKS the scheduler; a tick under backpressure (a non-empty backlog) HOLDS the
    # heavy repour off the capture path, and only a settled + crested tick fires ONE repour of quiet ground.
    monkeypatch.setenv("LARES_DERIVED_WINDOW", "2")                        # a tiny window crests in-test
    root = str(tmp_path / ".mem")
    server = CaptureSessionServer(root, embed_factory=_stub_embed_factory())
    server.capture({"surface": "claude", "pointer": CLAUDE, "wing": "wing_proj", "room": "conversations"})
    assert server.rejim_tick({"backlog": 3})["fired"] is False            # backpressure holds the re-regime
    fired = server.rejim_tick({"backlog": 0})                             # settled + crested → fire once
    assert fired["fired"] is True and fired["revision"] >= 1
    assert os.path.exists(os.path.join(root, "rejim", "geology.json"))    # the repour landed on the tick
    assert server.rejim_tick({"backlog": 0})["fired"] is False            # coalesced — no new ground, no repour


def test_enrich_worldline_assigns_membership_slots(tmp_path):
    # the worldline enrichment: ASSIGN prenamed membership slots per node (the beat cell = turn-identity) down
    # the DAG — the deterministic counterpart to rejim's whole-stream detection. The memory sensorium declares
    # the worldline aperture, so the enricher is active; it stamps every braid's blocks (idempotent).
    server = _captured_server(tmp_path)
    out = server.enrich_worldline({})
    assert out["worldline"] is True and out["stamped"] >= 1               # slots assigned across the braids
    got = server._content_store()._col.get(include=["metadatas"])         # noqa: SLF001 — the test reads raw rows
    ffz = [(m or {}).get("lar_ffz") for m in (got.get("metadatas") or [])]
    assert any(a and "/" in a for a in ffz)                              # a membership address stands (slot filled)


def test_derived_idle_beat_drives_both_rejim_and_worldline(tmp_path, monkeypatch):
    # THE COLLAPSE witness: ONE idle beat drives EVERY derived enrichment off one cadence machinery. With a
    # tiny window, a capture then a crest fires BOTH — rejim lands geology.json (DETECTION) AND worldline
    # assigns membership slots (ASSIGNMENT) — distinct work, one drive.
    monkeypatch.setenv("LARES_DERIVED_WINDOW", "2")
    server = _captured_server(tmp_path)
    assert {e.name for e in server._derived} == {"rejim", "worldline-ffz"}   # both enrichers, one registry
    for _ in range(4):                                                   # tick past the window → both crest once
        server._derived_idle_beat()
    assert os.path.exists(os.path.join(str(tmp_path / ".mem"), "rejim", "geology.json"))   # rejim fired
    got = server._content_store()._col.get(include=["metadatas"])        # noqa: SLF001
    assert any((m or {}).get("lar_ffz") for m in (got.get("metadatas") or []))              # worldline fired


def _captured_server(tmp_path):
    # one warm holder over the small claude fixture — the base for the lifecycle/plane serve-op witnesses.
    server = CaptureSessionServer(str(tmp_path / ".mem"), embed_factory=_stub_embed_factory())
    server.capture({"surface": "claude", "pointer": CLAUDE, "wing": "wing_proj", "room": "conversations"})
    return server


def _turn_keys(server):
    got = server._content_store()._col.get(include=["metadatas"])   # noqa: SLF001 — the test walks the raw rows
    return sorted({(m or {}).get("lar_turn_key") for m in (got.get("metadatas") or []) if (m or {}).get("lar_turn_key")})


def test_status_serve_op_reports_the_taxonomy_over_the_owned_store(tmp_path):
    # the taxonomy over the ONE content handle the holder already owns (no second client opened).
    server = _captured_server(tmp_path)
    tax = server.status({})
    assert tax["total"] == TURN_COUNT                                # the whole fixture landed, counted


def test_status_reports_the_derived_layer(tmp_path):
    # status tells the WHOLE truth: the content taxonomy AND the derived layer (mempalace · rejim), each an
    # honest absence until re-derived. After a rejim repour the rhythm view reads present with its regime count.
    server = _captured_server(tmp_path)
    before = server.status({})
    assert before["derived"]["rejim"]["present"] is False            # never repoured → honest absent, no lie
    assert before["derived"]["mempalace"]["present"] is False        # never paved → honest absent
    server.repour_rejim({})
    after = server.status({})
    assert after["derived"]["rejim"]["present"] is True              # the repour landed → the view reads present
    assert "regimes" in after["derived"]["rejim"]                    # + the landed summary (regime count)


def test_worldline_serve_op_reads_the_forkdag(tmp_path):
    # the claude surface builds the fork-DAG braid beside the palace; the serve-op reads it through a
    # fresh WorldlineStore (opened + closed per-op), so the rhizome reads back over the pipe.
    server = _captured_server(tmp_path)
    dag = server.worldline({})
    assert dag["edges"], "the observe leg built no worldline braid on capture"


def test_kapae_serve_op_round_trips_mute_then_restore(tmp_path):
    # the branch-mute cascade rides the holder's ONE content store, serialized with capture. A content-bound
    # turn resolves (no fork needed); kapae mutes its entries, un_kapae restores them (move-not-delete).
    server = _captured_server(tmp_path)
    tks = _turn_keys(server)
    assert tks
    muted = server.kapae({"branch": tks[0], "tick": 1})
    assert muted["resolved"] and muted["muted_entries"] >= 1         # the branch's entries muted across the store
    restored = server.un_kapae({"branch": tks[0], "tick": 2})
    assert restored["resolved"] and restored["restored_entries"] >= 1  # move-not-delete restores them


def test_kapae_mutation_guards_its_own_args(tmp_path):
    # a MUTATION self-guards: an empty branch or a missing/non-int tick raises BEFORE any store opens — the
    # capture-op rigor held at the mutation point. Reads degrade to honest nulls; a mute never runs on bad args.
    server = _captured_server(tmp_path)
    for bad in ({"branch": "b"}, {"branch": "b", "tick": "1"}, {"tick": 1}, {"branch": "", "tick": 1}):
        with pytest.raises(ValueError):
            server.kapae(bad)
        with pytest.raises(ValueError):
            server.un_kapae(bad)


def test_plane_record_serve_op_witnesses_the_content_leg(tmp_path):
    # the cross-plane witness over the holder's own content store — a real captured cid reads present on the
    # content leg (the SAME plane_query implementation the /mcp coordinator drives); an unknown cid reads null.
    server = _captured_server(tmp_path)
    cid = (server._content_store()._col.get().get("ids") or [None])[0]   # noqa: SLF001 — a real landed cid
    assert cid is not None
    rec = server.plane_record({"cid": cid})
    assert rec["content"]["present"] is True                        # the captured cid witnesses on content
    absent = server.plane_record({"cid": "f" * 64})
    assert absent["content"]["present"] is False                    # an unknown cid reads an honest null


def test_w1_5c_crash_then_full_recovers_the_tail(tmp_path):
    # crash sim: land only a truncated prefix (a partial transcript = the "crash"), then re-run over the
    # FULL fixture — the re-derivation lands the tail (the blocks past the prefix), skips the durable prefix.
    palace = str(tmp_path / ".mem")
    partial = tmp_path / "partial.jsonl"
    lines = open(CLAUDE, encoding="utf-8").read().splitlines()
    # keep the header + records through a-3 (drop the u-4/a-4 tail): u-1·a-1(×3)·u-2·u-3·a-3 = 7 blocks.
    partial.write_text("\n".join(lines[:6]) + "\n", encoding="utf-8")

    # the partial file has a DIFFERENT basename → a different source_file/cid, so witness the crash-cure
    # on ONE stable source: capture the partial, then the full, both keyed to the SAME basename.
    stable = tmp_path / "claude-main.jsonl"
    stable.write_text(partial.read_text(encoding="utf-8"), encoding="utf-8")
    r1 = capture_and_observe(palace, "claude", str(stable), wing="wing_proj", embed_factory=_stub_embed_factory())
    assert r1["landed"] == 7                                       # the crash left only the 7 prefix blocks

    stable.write_text(open(CLAUDE, encoding="utf-8").read(), encoding="utf-8")  # the full transcript returns
    r2 = capture_and_observe(palace, "claude", str(stable), wing="wing_proj", embed_factory=_stub_embed_factory())
    assert r2["landed"] == 2 and r2["skipped"] == 7              # only the u-4/a-4 tail lands; prefix skips
    assert r2["watermark"] == TURN_COUNT and r2["audit"]["ok"]


def test_w1_5d_landed_store_carries_distinct_full_hex_cids(tmp_path):
    palace = str(tmp_path / ".mem")
    capture_and_observe(palace, "claude", CLAUDE, wing="wing_proj", embed_factory=_stub_embed_factory())
    # reach the store through a fresh compose + assert each exchange's cid landed distinct + full-hex.
    from sensorium import compose_content_land
    s = compose_content_land(palace)
    for chunk in range(TURN_COUNT):
        cid = derive_cid("claude:claude-main",chunk)
        got = s.store.get(cid)
        assert got is not None                                     # the single-gate cid round-trips
        assert len(cid.rsplit("_", 1)[0]) == 64                    # FULL hex, never [:24]
    # a re-derived cid matches the landed one (idempotent key)
    assert s.store.get(derive_cid("claude:claude-main",0)) is not None


def test_embedder_model_floor_rejects_a_mismatched_stamp(tmp_path):
    # the driver pins expected_model AND stamps lar_embedder_model — the floor the driver relies on:
    # a record whose stamp DISAGREES with the store's pin fails LOUD (a same-dim different-model swap
    # corrupts recall silently otherwise). Witness the contract directly: pin model-A, land a model-B
    # stamp → ValueError.
    from sensorium import compose_content_land, compose_sensorium

    def mismatched_source(_pointer):
        yield {"seq": 1, "cid": derive_cid("x.jsonl", 0), "text": "t",
               "metadata": {"wing": "w", "room": "r", "lar_turn_key": "k",
                            "lar_embedder_model": "model-B/4"}}

    s = compose_sensorium(
        kind="memory", source=mismatched_source, embed=lambda _t: [0.0, 0.0, 0.0, 0.0],
        land=compose_content_land(str(tmp_path / ".mem"), required_keys={"wing", "room"},
                                  expected_dim=4, expected_model="model-A/4"),
    )
    with pytest.raises(ValueError):
        s.capture(None)


@pytest.mark.parametrize("_", [0])
def test_real_warm_embed_wires_the_keystone(tmp_path, _):
    # THE true M1 wire — the real warm minilm cap. Skips when the model can't load (offline/no weights).
    try:
        from embed_cap import make_embed_cap
        embed_one, model = make_embed_cap()
        dim = len(embed_one("probe"))
    except Exception as e:  # noqa: BLE001 — model unavailable in this env
        pytest.skip(f"warm embed cap unavailable: {e}")
    res = capture_and_observe(str(tmp_path / ".mem"), "claude", CLAUDE, wing="wing_proj")
    assert res["landed"] == TURN_COUNT and res["audit"]["ok"]
    assert res["embedder_model"] == model and res["embedder_dim"] == dim
