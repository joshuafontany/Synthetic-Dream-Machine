"""Phase-6a witness — lares_mcp: the isomorphic /mcp surface. The LaresCoordinator round-trips the
lifecycle verbs over a real ephemeral palace (harvest->recall->status, kapae->recall-excludes->un_kapae-
restores), and the FastMCP tool-set MIRRORS the CLI lifecycle verbs exactly (the isomorphism contract).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_lares_mcp.py -q
"""
import asyncio
import json
import os

import pytest

from lares_mcp import LIFECYCLE_VERBS, VERB_SEATS, LaresCoordinator, build_mcp, guard_hitl, seat_of

_HERE = os.path.dirname(os.path.abspath(__file__))
_FIXTURE = os.path.join(_HERE, "fixtures", "capture", "claude-main.jsonl")
_CLI_VERBS = os.path.join(_HERE, "fixtures", "cli-verbs.json")


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
    assert seat_of("release") == "HITL"   # irreversible — drops a guest handle for good
    assert seat_of("reconcile") == "HOTL" # reversible re-settle against source


def test_hitl_gate_blocks_without_approval():
    guard_hitl("recall")                  # HOTL passes freely
    guard_hitl("kapae")                   # reversible mute passes freely
    guard_hitl("reconcile")               # HOTL re-settle passes freely
    with pytest.raises(PermissionError):
        guard_hitl("purge")               # HITL (irreversible) blocks without approval
    with pytest.raises(PermissionError):
        guard_hitl("attach")              # HITL (trust-crossing) blocks without approval
    with pytest.raises(PermissionError):
        guard_hitl("release")             # HITL (irreversible) blocks without approval
    guard_hitl("purge", approval="operator-granted-cap")   # the @daemon-granted cap unblocks it


def _mcp_tool_names(tmp_path):
    mcp = build_mcp(_coord(tmp_path))
    return {t.name for t in asyncio.run(mcp.list_tools())}


def test_mcp_tools_mirror_the_cli_lifecycle_verbs(tmp_path):
    # the /mcp tool-set equals the declared lifecycle verb-set, name-for-name (the growth floor).
    assert _mcp_tool_names(tmp_path) == set(LIFECYCLE_VERBS)


def test_parity_inventory_three_way(tmp_path):
    """THREE-WAY isomorphism guard against the CLI-verb INVENTORY (fixtures/cli-verbs.json — the
    surface GROWS into it). Mutating any side (add an orphan MCP tool, seat-drop a mirrored verb,
    or split the inventory) fails this loud. The `lares` MCP surface mirrors the WHOLE CLI, so the
    invariant reads MCP ⊆ CLI (no orphan tool), never a permanent cli-only claim."""
    with open(_CLI_VERBS, encoding="utf-8") as f:
        inv = json.load(f)
    verbs = set(inv["verbs"])                    # all CLI top-level command names
    mirrored = set(inv["mirrored"])             # the MCP tool-names (the anchor; MCP-form)
    mirror_hosts = set(inv["mirror_hosts"])     # the CLI top-level verbs those tools land on (coverage-form)
    not_yet = set(inv["not_yet_mirrored"])
    cli_forms = inv["cli_forms"]
    mcp_tools = _mcp_tool_names(tmp_path)

    # (a) the MCP tool-set IS the mirrored anchor IS the cli_forms keys — grow a tool, grow all three.
    assert mcp_tools == mirrored
    assert mcp_tools == set(cli_forms)
    # (b) every MCP tool carries a VERB_SEATS entry — the grid seats the whole surface.
    for name in mcp_tools:
        assert name in VERB_SEATS, f"MCP tool {name!r} rides UNSEATED — grow VERB_SEATS"
    # (c) the name-normalization BRIDGE: each MCP tool's CLI spelling lands on a REAL host verb — so a
    # sub-verb mirror (kapae → `worldline kapae`, status → `sensorium status`) still resolves to a top-level
    # verb the CLI actually carries (no orphan tool; MCP ⊆ CLI reads through the spelling, not the raw name).
    for m in mcp_tools:
        head = cli_forms[m].split()[0]
        assert head in mirror_hosts and head in verbs, f"MCP {m!r} → CLI {cli_forms[m]!r} has no real host"
    # (d) COVERAGE partition (the surface GROWS): every CLI top-level verb is a mirror-host XOR awaits.
    assert mirror_hosts | not_yet == verbs
    assert mirror_hosts.isdisjoint(not_yet)
