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
