"""Phase-6a witness — lares_mcp: the isomorphic /mcp surface. The LaresCoordinator round-trips the
lifecycle verbs over a real ephemeral palace (harvest->recall->status, kapae->recall-excludes->un_kapae-
restores), and the FastMCP tool-set MIRRORS the CLI lifecycle verbs exactly (the isomorphism contract).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_lares_mcp.py -q
"""
import asyncio
import os

import pytest

from lares_mcp import LIFECYCLE_VERBS, LaresCoordinator, build_mcp, guard_hitl, seat_of

_FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "capture", "claude-main.jsonl")


def _fake_embed():
    # a deterministic stand-in — the coordinator's real minilm is witnessed at Phase 2; here we test routing.
    return (lambda t: [float(len(t)), float(sum(map(ord, t[:8])) % 97)], "fake-model")


def _coord(tmp_path):
    return LaresCoordinator(str(tmp_path / ".mem"), wing="w", embed_factory=_fake_embed)


def test_coordinator_harvest_recall_status(tmp_path):
    coord = _coord(tmp_path)
    res = coord.harvest("claude", _FIXTURE, wing="w")
    assert res["landed"] >= 1                       # a real fixture captured through the driver
    hits = coord.recall("turn", 3)
    assert hits["matches"]                           # recall read-face returns turns
    assert coord.status()["total"] >= 1             # status reports what the sensorium holds


def _live_turn_keys(coord):
    # the turn-keys RECALL surfaces (search excludes kapae-muted; taxonomy counts physical rows, so the
    # kapae contract reads through recall, not status).
    return {m["metadata"].get("lar_turn_key") for m in coord.recall("turn", 20)["matches"]}


def test_coordinator_kapae_cascade_round_trip(tmp_path):
    coord = _coord(tmp_path)
    coord.harvest("claude", _FIXTURE, wing="w")
    # bind the captured turns onto a worldline branch, then kapae it via the coordinator verb
    tks = sorted({m["metadata"].get("lar_turn_key") for m in coord.recall("turn", 8)["matches"]
                  if m["metadata"].get("lar_turn_key")})
    assert len(tks) >= 2
    coord._worldline.fork(tks[0], tks[1], 1)         # tks[1] rides a branch under tks[0]
    assert tks[1] in _live_turn_keys(coord)
    muted = coord.kapae(tks[1], 2)
    assert muted["muted_entries"] >= 1               # the branch's entries muted across the sensorium
    assert tks[1] not in _live_turn_keys(coord)      # recall now EXCLUDES the muted branch
    restored = coord.un_kapae(tks[1], 3)
    assert restored["restored_entries"] >= 1
    assert tks[1] in _live_turn_keys(coord)          # move-not-delete: un-kapae restores it to recall


def test_grid_seats_the_verbs_by_reversibility_and_trust():
    for v in LIFECYCLE_VERBS:
        assert seat_of(v) == "HOTL"       # every lifecycle verb runs reversible + trusted
    assert seat_of("purge") == "HITL"     # irreversible
    assert seat_of("attach") == "HITL"    # trust-crossing


def test_hitl_gate_blocks_without_approval():
    guard_hitl("recall")                  # HOTL passes freely
    guard_hitl("kapae")                   # reversible mute passes freely
    with pytest.raises(PermissionError):
        guard_hitl("purge")               # HITL (irreversible) blocks without approval
    with pytest.raises(PermissionError):
        guard_hitl("attach")              # HITL (trust-crossing) blocks without approval
    guard_hitl("purge", approval="operator-granted-cap")   # the @daemon-granted cap unblocks it


def test_mcp_tools_mirror_the_cli_lifecycle_verbs(tmp_path):
    # the ISOMORPHISM contract: the /mcp tool-set equals the CLI lifecycle verb-set, name-for-name.
    mcp = build_mcp(_coord(tmp_path))
    names = {t.name for t in asyncio.run(mcp.list_tools())}
    assert names == set(LIFECYCLE_VERBS)
