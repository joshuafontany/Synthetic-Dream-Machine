"""Phase-6a witness — lares_mcp: the isomorphic /mcp surface. The LaresCoordinator round-trips the
lifecycle verbs over a real ephemeral palace (pour->recall->status, kapae->recall-excludes->un_kapae-
restores), and the FastMCP tool-set MIRRORS the CLI lifecycle verbs exactly (the isomorphism contract).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_lares_mcp.py -q
"""
import asyncio
import json
import os

import pytest

from lares_mcp import (LIFECYCLE_VERBS, PLANE_VERBS, WIKI_VERBS, VAULT_VERBS, VERB_SEATS, DaemonCoordinator,
                       LaresCoordinator, build_mcp, guard_hitl, seat_of)
from worldline_veil import veiled_root

_HERE = os.path.dirname(os.path.abspath(__file__))
_FIXTURE = os.path.join(_HERE, "fixtures", "capture", "claude-main.jsonl")
_CLI_VERBS = os.path.join(_HERE, "fixtures", "cli-verbs.json")

# The coordinator pour rides the shipping veil path (C1b) — pin a WITNESS salt for the whole module so
# every pour derives a DETERMINISTIC, portable worldline root (never the operator's on-disk persona key).
_SALT = "witness-lares-mcp-salt"


@pytest.fixture(autouse=True)
def _pin_worldline_salt(monkeypatch):
    monkeypatch.setenv("LAR_WORLDLINE_SALT", _SALT)


def _fake_embed():
    # a deterministic stand-in — the coordinator's real minilm is witnessed at Phase 2; here we test routing.
    return (lambda t: [float(len(t)), float(sum(map(ord, t[:8])) % 97)], "fake-model")


def _coord(tmp_path):
    return LaresCoordinator(str(tmp_path / ".mem"), wing="w", embed_factory=_fake_embed)


def test_coordinator_pour_recall_status(tmp_path):
    coord = _coord(tmp_path)
    res = coord.pour("claude", _FIXTURE, wing="w")
    assert res["landed"] >= 1                       # a real fixture captured through the driver
    hits = coord.recall("turn", 3)
    assert hits["matches"]                           # recall read-face returns turns
    assert coord.status()["total"] >= 1             # status reports what the sensorium holds


def test_recall_filters_by_the_block_taxonomy(tmp_path):
    # THE tension this whole ontology answers: the operator's steering recalls as its OWN stratum,
    # no longer fused into the agent's stream. speaker/channel/function narrow to one taxonomy axis.
    coord = _coord(tmp_path)
    coord.pour("claude", _FIXTURE, wing="w")
    op = coord.recall("engine", 20, speaker="operator")["matches"]
    assert op and all(m["metadata"].get("lar_speaker") == "operator" for m in op)   # steering, alone
    speech = coord.recall("engine", 20, channel="speech")["matches"]
    assert speech and all(m["metadata"].get("lar_channel") == "speech" for m in speech)  # the loud voices
    tool = coord.recall("Write", 20, channel="tool")["matches"]
    assert all(m["metadata"].get("lar_channel") == "tool" for m in tool)             # the tool traffic, apart
    everyone = {m["metadata"].get("lar_speaker") for m in coord.recall("the", 20)["matches"]}
    assert "operator" in everyone and "agent" in everyone   # unfiltered spans all — steering no longer drowns


def test_recall_pairs_blocks_into_exchanges(tmp_path):
    # the exchange-VIEW: a matched block recalls WITH its turn's siblings (steering beside surface),
    # the merge done as a read-time view — never baked into content.
    coord = _coord(tmp_path)
    coord.pour("claude", _FIXTURE, wing="w")
    out = coord.recall("engine", 8, pair=True)
    assert "exchanges" in out and out["exchanges"]                # grouped into turns, not bare blocks
    ex = next((e for e in out["exchanges"] if any(b["speaker"] == "operator" for b in e["blocks"])), None)
    assert ex is not None                                          # a turn headed by the operator surfaced
    speakers = [b["speaker"] for b in ex["blocks"]]
    assert "operator" in speakers and "agent" in speakers         # steering paired with the agent's stream
    idx = [b["chunk_index"] for b in ex["blocks"]]
    assert idx == sorted(idx)                                      # blocks ride in document order


def _live_turn_keys(coord):
    # the turn-keys RECALL surfaces (search excludes kapae-muted; taxonomy counts physical rows, so the
    # kapae contract reads through recall, not status).
    return {m["metadata"].get("lar_turn_key") for m in coord.recall("turn", 20)["matches"]}


def test_pour_refuses_unwired_shaping_args(tmp_path):
    # B2 footgun: all/writeback/dry_run ride the deferred cap-wire — they must REFUSE, never silently
    # ignore (dry_run=True would otherwise LAND for real on the append-only ground).
    coord = _coord(tmp_path)
    for kwargs in ({"all": True}, {"writeback": True}, {"dry_run": True}):
        with pytest.raises(NotImplementedError):
            coord.pour("claude", _FIXTURE, **kwargs)


def test_coordinator_kapae_cascade_round_trip(tmp_path):
    coord = _coord(tmp_path)
    coord.pour("claude", _FIXTURE, wing="w")
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


def test_pour_builds_the_worldline_and_kapae_cascades_the_subtree(tmp_path):
    # THE CROWN (step-1): pour now rides capture_and_observe, so the fork-DAG BUILDS on the shipping
    # path — coordinator.worldline() returns the REAL braid (not empty). And kapae over a fork-root mutes
    # the whole SUBTREE across the sensorium (not just the named turn).
    coord = _coord(tmp_path)
    coord.pour("claude", _FIXTURE, wing="w")

    wl_dag = coord.worldline()
    assert wl_dag["edges"], "pour built no worldline — the observe leg never reached the entrypoint"
    # the fixture's main chain roots at the VEILED run (C1b) — `wl-<hash>` of the session basename, never
    # the bare "claude-main" in the clear (owner-recomputable under the pinned salt).
    run = veiled_root("claude-main", secret=_SALT.encode())
    assert run.startswith("wl-") and run in coord._worldline.roots()
    assert "claude-main" not in coord._worldline.roots()

    # a fork subtree: bind a child branch under a captured turn, then kapae the branch-ROOT — the whole
    # subtree mutes (root + its descendants), not one turn.
    tks = sorted({m["metadata"].get("lar_turn_key") for m in coord.recall("turn", 8)["matches"]
                  if m["metadata"].get("lar_turn_key")})
    assert len(tks) >= 2
    coord._worldline.fork(tks[0], tks[1], 100)          # tks[1] rides a branch under tks[0]
    assert set(coord._worldline.branch_keys(tks[0])) >= {tks[0], tks[1]}   # the subtree carries both
    muted = coord.kapae(tks[0], 101)                     # mute the branch-ROOT
    assert set(muted["branch"]) >= {tks[0], tks[1]}      # the cascade muted the WHOLE subtree
    live = _live_turn_keys(coord)
    assert tks[0] not in live and tks[1] not in live     # recall excludes the muted subtree
    coord.un_kapae(tks[0], 102)
    assert {tks[0], tks[1]} <= _live_turn_keys(coord)    # move-not-delete restores the subtree


def test_grid_seats_the_verbs_by_reversibility_and_trust():
    for v in LIFECYCLE_VERBS:
        assert seat_of(v) == "HOTL"       # every lifecycle verb runs reversible + trusted
    assert seat_of("teardown") == "HITL"  # tears a sensorium store down — irreversible
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
    with pytest.raises(PermissionError):
        guard_hitl("teardown")            # HITL (irreversible store teardown) blocks without approval
    guard_hitl("purge", approval="operator-granted-cap")   # the @daemon-granted cap unblocks it
    guard_hitl("teardown", approval="operator-granted-cap")  # the same cap unblocks the store teardown


def _mcp_tool_names(tmp_path):
    mcp = build_mcp(_coord(tmp_path))
    return {t.name for t in asyncio.run(mcp.list_tools())}


def test_mcp_tools_mirror_the_cli_lifecycle_verbs(tmp_path):
    # the /mcp tool-set equals the declared lifecycle verb-set PLUS the per-plane query-door verbs,
    # name-for-name (the growth floor).
    assert _mcp_tool_names(tmp_path) == set(LIFECYCLE_VERBS) | set(PLANE_VERBS) | set(WIKI_VERBS) | set(VAULT_VERBS)


def test_recall_tool_args_are_isomorphic_with_the_recall_api(tmp_path):
    """ARG-level isomorphism (2 surfaces, 1 API): the /mcp recall TOOL exposes the same filter set as the
    LaresCoordinator.recall API the CLI also drives. A filter added to the coordinator but not the tool
    (or vice versa) fails this loud, so the two surfaces can never silently drift. The CLI's
    --speaker/--channel/--function/--pair mirror the same names."""
    import inspect
    mcp = build_mcp(_coord(tmp_path))
    tools = {t.name: t for t in asyncio.run(mcp.list_tools())}
    tool_args = set(tools["recall"].inputSchema.get("properties", {}))
    api_args = set(inspect.signature(LaresCoordinator.recall).parameters) - {"self"}
    taxonomy = {"speaker", "channel", "function", "pair"}
    assert taxonomy <= tool_args, "the recall TOOL is missing a taxonomy filter"
    assert taxonomy <= api_args, "the recall API is missing a taxonomy filter"
    # the tool mirrors the API and adds only `sensorium` (the router's which-sensorium key)
    assert tool_args <= api_args | {"sensorium"}, "the recall tool grew an arg the API cannot serve"


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
    # THE AHEAD-OF-CLI ALLOWANCES (query door + vault): PLANE_VERBS and VAULT_VERBS ride the MCP surface
    # AHEAD of their formal `cli_forms` mappings — the CLI forms + this fixture grow with those arcs. Until
    # then the parity invariants read over the tool-set MINUS the named allowances (never a silent
    # widening: each allowance is a declared tuple, and every allowance verb still seats in VERB_SEATS).
    mcp_tools = _mcp_tool_names(tmp_path)
    mirrored_tools = mcp_tools - set(PLANE_VERBS) - set(VAULT_VERBS)

    # (a) the MCP tool-set IS the mirrored anchor IS the cli_forms keys — grow a tool, grow all three.
    assert mirrored_tools == mirrored
    assert mirrored_tools == set(cli_forms)
    # (b) every MCP tool (plane verbs INCLUDED) carries a VERB_SEATS entry — the grid seats the whole surface.
    for name in mcp_tools:
        assert name in VERB_SEATS, f"MCP tool {name!r} rides UNSEATED — grow VERB_SEATS"
    # (c) the name-normalization BRIDGE: each MCP tool's CLI spelling lands on a REAL host verb — so a
    # sub-verb mirror (kapae → `worldline kapae`, status → `sensorium status`) still resolves to a top-level
    # verb the CLI actually carries (no orphan tool; MCP ⊆ CLI reads through the spelling, not the raw name).
    for m in mirrored_tools:
        head = cli_forms[m].split()[0]
        assert head in mirror_hosts and head in verbs, f"MCP {m!r} → CLI {cli_forms[m]!r} has no real host"
    # (d) COVERAGE partition (the surface GROWS): every CLI top-level verb is a mirror-host XOR awaits.
    assert mirror_hosts | not_yet == verbs
    assert mirror_hosts.isdisjoint(not_yet)


# ── the plane reads: `recall --lens structure/form` (folded) + the plane_record cross-plane witness ──


def _three_plane_bed(tmp_path):
    """A populated 3-plane palace in the TEST-BED layout (<root>/content|structure|form, one cid
    keying all three) — landed straight through the same stores plane_fanout composes, fixture-lite
    (two markdown records, hand-made form membership; no induction pass)."""
    import hashlib

    import content_io as cio
    from form_encoder import FormPalaceStore
    from structure_router import canonical_json, detect_kind, parse_to_tree, structural_hash
    from structurepalace_io import StructurePalaceStore

    root = str(tmp_path / "bed")
    embed_one, model = _fake_embed()
    content = cio.ContentStore(os.path.join(root, "content"), expected_dim=2, expected_model=model)
    structure = StructurePalaceStore(os.path.join(root, "structure"))
    form = FormPalaceStore(os.path.join(root, "form"))
    texts = {
        "alpha.md": "# Alpha\n\nfirst body\n",
        "beta.md": "# Beta\n\nsecond body\n\n- one\n- two\n",
    }
    cids, hashes = {}, {}
    memberships = {"alpha.md": {"indices": [0], "values": [1.0]},
                   "beta.md": {"indices": [0, 1], "values": [1.0, 1.0]}}
    for name, text in texts.items():
        cid = hashlib.sha256(text.encode()).hexdigest()
        cids[name] = cid
        content.put(cid, text, embed_one(text),
                    {"wing": "w", "room": "corpus", "source_file": name, "lar_embedder_model": model})
        tree = parse_to_tree(detect_kind(name, text), text)
        h = structural_hash(tree)
        hashes[name] = h
        structure.put(h, canonical_json(tree), source_file=name, verbatim_sha=cid)
        form.store(cid, memberships[name], 3, {"verbatim_sha": cid, "struct_hash": h})
    return root, cids, hashes


def _bed_coord(tmp_path):
    root, cids, hashes = _three_plane_bed(tmp_path)
    return LaresCoordinator(root, wing="w", embed_factory=_fake_embed), cids, hashes


def test_coordinator_resolves_the_three_plane_layout(tmp_path):
    # content lives at <root>/content in the test-bed layout — the coordinator reads it there
    # (never planting a second empty store at the root), so status counts the landed records.
    coord, cids, _ = _bed_coord(tmp_path)
    assert coord.status()["total"] == len(cids)


def test_recall_structure_answers_by_text(tmp_path):
    coord, _, hashes = _bed_coord(tmp_path)
    # a query of the SAME markdown shape as alpha.md (heading + paragraph) recalls its structural
    # entry nearest — the door rides the structural embedding, never the content vector.
    res = coord.recall_structure("# Gamma\n\nthird body\n", 2)
    assert res["present"] and res["matches"]
    assert res["matches"][0]["hash"] == hashes["alpha.md"]


def test_recall_structure_resolves_a_cid_through_provenance(tmp_path):
    coord, cids, hashes = _bed_coord(tmp_path)
    res = coord.recall_structure(cids["beta.md"], 4)
    assert res["present"] and res["entry"] is not None
    assert res["entry"]["hash"] == hashes["beta.md"]
    assert cids["beta.md"] in res["entry"]["provenance_cids"]


def test_recall_form_by_cid_with_neighbors(tmp_path):
    coord, cids, _ = _bed_coord(tmp_path)
    res = coord.recall_form(cids["alpha.md"], 3)
    assert res["present"] and res["record"] is not None
    assert res["record"]["dimension"] == 3
    assert res["record"]["active_templates"] == 1        # alpha carries one induced template
    neighbor_cids = [m["cid"] for m in res["matches"]]
    assert cids["alpha.md"] not in neighbor_cids          # self dropped
    assert cids["beta.md"] in neighbor_cids               # the other record rides nearest


def test_recall_form_text_query_answers_an_honest_null(tmp_path):
    coord, _, _ = _bed_coord(tmp_path)
    res = coord.recall_form("what shapes recur", 3)
    assert res["present"] and res["matches"] == [] and "note" in res


def test_plane_record_witnesses_all_three_planes(tmp_path):
    coord, cids, hashes = _bed_coord(tmp_path)
    rec = coord.plane_record(cids["alpha.md"])
    assert rec["content"]["present"] and rec["content"]["source_file"] == "alpha.md"
    assert rec["structure"]["present"] and rec["structure"]["hash"] == hashes["alpha.md"]
    assert rec["form"]["present"] and rec["form"]["active_templates"] == 1


def test_plane_record_honest_nulls_for_an_unknown_cid(tmp_path):
    coord, _, _ = _bed_coord(tmp_path)
    rec = coord.plane_record("f" * 64)
    assert not rec["content"]["present"]
    assert not rec["structure"]["present"]
    assert not rec["form"]["present"]


def test_plane_verbs_read_honest_nulls_without_plane_stores(tmp_path):
    # a plain capture palace (no structure/ or form/ store) answers present:false — the read
    # verbs never PLANT an empty plane palace.
    coord = _coord(tmp_path)
    assert coord.recall_structure("# Q\n\nbody\n", 2) == {
        "plane": "structure", "present": False, "matches": [],
        "note": "structure: this palace carries no structure store"}
    assert coord.recall_form("c" * 64, 2)["present"] is False
    assert not os.path.isdir(str(tmp_path / ".mem" / "structure"))


def test_cid_gate_carries_the_chunk_suffixed_form():
    # the live capture chunker keys records `<sha256>_<n>` — both the bare and the chunk-suffixed
    # form read as cids; prose (even hex-dense) reads as query text.
    from lares_mcp import _reads_as_cid
    assert _reads_as_cid("a" * 64)
    assert _reads_as_cid("a" * 64 + "_0")
    assert _reads_as_cid("a" * 64 + "_12")
    assert not _reads_as_cid("a" * 64 + "_x")
    assert not _reads_as_cid("a" * 63)
    assert not _reads_as_cid("what shapes recur across the corpus")


def test_plane_verbs_seat_hotl():
    for v in PLANE_VERBS:
        assert seat_of(v) == "HOTL"                       # every plane verb reads — reversible, trusted


def test_recall_lens_folds_the_plane_reads(tmp_path):
    # the per-plane reads fold onto `recall --lens <plane>`: structure/form dispatch to the SAME plane
    # doors the direct methods drive — one surface, the bespoke reads unchanged.
    coord, cids, _ = _bed_coord(tmp_path)
    assert coord.recall("# Gamma\n\nthird body\n", 2, lens="structure") == \
        coord.recall_structure("# Gamma\n\nthird body\n", 2)
    assert coord.recall(cids["alpha.md"], 3, lens="form") == coord.recall_form(cids["alpha.md"], 3)
    # the default lens keeps the combined-arms content read
    assert "plane" not in coord.recall("body", 2)


def test_recall_unknown_lens_refuses(tmp_path):
    coord, _, _ = _bed_coord(tmp_path)
    with pytest.raises(ValueError):
        coord.recall("q", 2, lens="bogus")


def test_structure_query_face_carries_the_cross_plane_join(tmp_path):
    # the STORE now #has a clean query face (the coordinator stops reaching `_col`) — and each match
    # rides its `verbatim_sha`, the join key a cross-plane recall needs.
    coord, cids, hashes = _bed_coord(tmp_path)
    res = coord.recall_structure("# Gamma\n\nthird body\n", 2)
    assert res["present"] and res["matches"]
    top = res["matches"][0]
    assert top["hash"] == hashes["alpha.md"]
    assert top["verbatim_sha"] == cids["alpha.md"]


def test_recall_crossplane_widens_a_text_query_across_all_planes(tmp_path):
    # HUMAN-QUERY ALL PLANES: one text query → content hits, each WIDENED across form + structure by the
    # cross-plane cid-join (WITHOUT text-searching form/structure).
    coord, cids, hashes = _bed_coord(tmp_path)
    res = coord.recall_crossplane("body", 4)
    assert res["plane"] == "crossplane" and res["hits"]
    by_cid = {h["cid"]: h for h in res["hits"]}
    h = by_cid[cids["alpha.md"]]
    assert h["join_key"] == cids["alpha.md"]
    assert h["content"]["present"] and h["content"]["source_file"] == "alpha.md"
    assert h["structure"]["present"] and h["structure"]["hash"] == hashes["alpha.md"]
    assert h["form"]["present"] and h["form"]["active_templates"] == 1
    # the lens folds onto recall (isomorphic with the direct method)
    assert coord.recall("body", 4, lens="crossplane") == res


def test_recall_persistence_by_cid_neighbors_and_text_null(tmp_path):
    from persistence_io import PersistenceStore
    root = str(tmp_path / "bed")
    p = PersistenceStore(os.path.join(root, "persistence"))
    p.put("a" * 64, "ki", [1.0, 0.0], "signer", "frontier", {}, "finding one")
    p.put("b" * 64, "ki", [0.9, 0.1], "signer", "frontier", {}, "finding two")
    coord = LaresCoordinator(root, wing="w", embed_factory=_fake_embed)
    res = coord.recall_persistence("a" * 64, 3)
    assert res["present"] and res["record"]["kind"] == "ki"
    ncids = [m["cid"] for m in res["matches"]]
    assert ("b" * 64) in ncids and ("a" * 64) not in ncids     # neighbor rides, self dropped
    null = coord.recall_persistence("what earned standing", 3)
    assert null["present"] and null["matches"] == [] and "note" in null
    assert coord.recall("a" * 64, 3, lens="persistence") == res
    # honest null where the palace carries no persistence store
    assert _coord(tmp_path).recall("c" * 64, 2, lens="persistence")["present"] is False


def test_where_predicate_narrows_by_taxonomy():
    # the SPEAKER-stratum predicate: a filtered recall's `where` reads against the content metadata (the
    # projection owns none), so the projection leg narrows to the same stratum the content-vector does.
    from lares_mcp import _where_matches, _make_where_predicate
    assert _where_matches({"lar_speaker": "operator"}, {"lar_speaker": "operator"})
    assert not _where_matches({"lar_speaker": "agent"}, {"lar_speaker": "operator"})
    assert _where_matches({"a": 1, "b": 2}, {"$and": [{"a": 1}, {"b": 2}]})
    assert not _where_matches({"a": 1, "b": 3}, {"$and": [{"a": 1}, {"b": 2}]})

    class _FakeContent:
        def get(self, cid):
            return {"metadata": {"lar_speaker": "operator" if cid == "ok" else "agent"}}

    keep = _make_where_predicate(_FakeContent(), {"lar_speaker": "operator"})
    assert keep("ok") and not keep("no")
    assert _make_where_predicate(_FakeContent(), None) is None


def test_daemon_recall_plane_lens_owes_the_routing():
    # the routed read-holder threads the CONTENT lens today — a plane lens over the wire refuses,
    # naming the routing generalization rather than silently reading content.
    dc = DaemonCoordinator()
    with pytest.raises(RuntimeError):
        dc.recall("q", 2, lens="structure")


def test_daemon_pour_routes_to_the_capture_verb(monkeypatch):
    # pour rides the @daemon `capture` verb (the same verb harvest/`lares sense pour` drives) — the
    # routed surface REACHES the holder instead of `_owed`-refusing. Record the wire call to prove the
    # verb name + camelCase arg mapping without a live daemon.
    calls = []

    def _rec(verb, args):
        calls.append((verb, args))
        return {"landed": 1}

    monkeypatch.setattr("lares_mcp.uds.output", _rec)
    dc = DaemonCoordinator(wing="w")
    out = dc.pour("claude", "/x/claude-main.jsonl", wing="w", room="conversations")
    assert out == {"landed": 1}                                   # the daemon's payload rides back
    assert calls == [("capture",                                  # routed, never _owed
                      {"surface": "claude", "pointer": "/x/claude-main.jsonl",
                       "wing": "w", "room": "conversations"})]
    # the addressed sensorium threads as the daemon's `sensoriumRoot` (picks the holder by root)
    calls.clear()
    dc.pour("codex", "/y/codex.jsonl", wing="w", sensorium_root="/root/mesh")
    assert calls[0][1]["sensoriumRoot"] == "/root/mesh"
    # an absent wing falls to the coordinator default (capture needs a non-empty wing)
    calls.clear()
    dc.pour("claude", "/z", room="conversations")
    assert calls[0][1]["wing"] == "w"


def test_daemon_pour_refuses_shaping_args_over_the_wire(monkeypatch):
    # all/writeback/dry_run carry no `capture`-verb support — the routed pour REFUSES them (never routes
    # a silently-dropped shaping arg; dry_run=True would otherwise LAND for real). Same footgun the
    # standalone LaresCoordinator.pour guards, held at the wire.
    monkeypatch.setattr("lares_mcp.uds.output",
                        lambda *a, **k: pytest.fail("shaping args must not reach the wire"))
    dc = DaemonCoordinator(wing="w")
    for kwargs in ({"all": True}, {"writeback": True}, {"dry_run": True}):
        with pytest.raises(NotImplementedError):
            dc.pour("claude", "/x", wing="w", **kwargs)


def test_daemon_routes_the_lifecycle_and_plane_verbs(monkeypatch):
    # THE WALL CLEARED: status/worldline/kapae/un_kapae/plane_record now ride @daemon wire verbs — each
    # routes to the serve-op on the capture holder (the ONE palace owner) instead of `_owed`-refusing.
    # Record the wire call to prove the verb name + camelCase arg mapping without a live daemon.
    calls = []
    monkeypatch.setattr("lares_mcp.uds.output", lambda verb, args: (calls.append((verb, args)), {"ok": True})[1])
    dc = DaemonCoordinator(wing="w")

    assert dc.status() == {"ok": True}
    assert calls[-1] == ("status", {})                               # the taxonomy read, routed
    assert dc.worldline() == {"ok": True}
    assert calls[-1] == ("worldline", {})                            # the fork-DAG read, routed
    assert dc.kapae("branch", 1) == {"ok": True}
    assert calls[-1] == ("kapae", {"branch": "branch", "tick": 1})   # the branch-mute cascade, routed
    assert dc.un_kapae("branch", 2) == {"ok": True}
    assert calls[-1] == ("un_kapae", {"branch": "branch", "tick": 2})  # the restore cascade, routed
    assert dc.plane_record("f" * 64) == {"ok": True}
    assert calls[-1] == ("plane_record", {"cid": "f" * 64})          # the cross-plane witness, routed

    # the addressed sensorium threads as the daemon's `sensoriumRoot` on every routed verb (holder-by-root)
    calls.clear()
    dc.status(sensorium_root="/root/mesh")
    dc.plane_record("a" * 64, sensorium_root="/root/mesh")
    assert calls[0][1]["sensoriumRoot"] == "/root/mesh"
    assert calls[1][1]["sensoriumRoot"] == "/root/mesh"


def test_daemon_routed_set_names_the_wired_verbs():
    # the ROUTED set carries the wired lifecycle/plane/read verbs beside recall + pour — the routing table
    # the surface declares. `rejim` reads through the daemon `rejim` verb (repour rides `refresh`); `analyze`
    # routes to the daemon `analyze` verb (its registry entry lands in the wiki-VM TS build target).
    assert DaemonCoordinator.ROUTED == {"recall", "pour", "sweep", "status", "worldline", "kapae",
                                        "un_kapae", "plane_record", "rejim", "analyze"}


# ── the sensorium address resolver (name → root; mirrors TS sensoriumDir/sensoriumNames) ──────


def test_sensorium_address_resolver_honors_lar_root(monkeypatch, tmp_path):
    # the py resolver mirrors TS larDataHome/sensoriumDir: LAR_ROOT/data for an isolated instance, so the
    # MCP `sensorium=` address and the CLI `lares sense <sensorium>` name ONE root byte-for-byte.
    from sensorium import sensorium_dir, sensorium_names
    monkeypatch.setenv("LAR_ROOT", str(tmp_path))
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    assert sensorium_dir("memory") == os.path.join(str(tmp_path), "data", "sensoriums", "memory")
    assert sensorium_names() == []                         # an absent dir rosters empty, never raises
    os.makedirs(os.path.join(str(tmp_path), "data", "sensoriums", "ai-sessions"))
    assert "ai-sessions" in sensorium_names()             # a stood sensorium shows in the roster


def test_sensorium_address_resolver_falls_to_xdg(monkeypatch, tmp_path):
    # LAR_ROOT unset → $XDG_DATA_HOME/lares/sensoriums/<name>, the same fall TS larDataHome takes.
    from sensorium import sensorium_dir
    monkeypatch.delenv("LAR_ROOT", raising=False)
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path))
    assert sensorium_dir("mesh") == os.path.join(str(tmp_path), "lares", "sensoriums", "mesh")


# ── the human-query INSTRUMENTS: rejim (rhythm) · analyze (change-points) · the routed analyze wall ──


def test_coordinator_rejim_reads_geology_or_honest_absence(tmp_path):
    # rejim reads the landed rhythm/geology plane; never-repoured → an HONEST absence (never a lie), and a
    # `repour=True` re-derives from the poured content (reusing the ONE content handle) then reads it back.
    coord = _coord(tmp_path)
    coord.pour("claude", _FIXTURE, wing="w")
    absent = coord.rejim()
    assert absent["repoured"] is False and absent["geology"] is None      # never repoured — honest absence
    got = coord.rejim(repour=True)
    assert got["repoured"] is True
    g = got["geology"]
    assert isinstance(g, dict) and "rejim" in g and "stream_chars" in g   # the landed geology schema


def test_coordinator_analyze_returns_word_indexed_boundaries(tmp_path):
    # analyze runs the DETECT-ONLY arms over the poured content stream and returns a boundary map — every cut
    # a WORD INDEX into the reconstructed stream (the MAUP-free coordinate), the in-memory word cache dropped.
    coord = _coord(tmp_path)
    coord.pour("claude", _FIXTURE, wing="w")
    res = coord.analyze()
    assert res["n_words"] >= 1 and "boundaries" in res
    assert "_words" not in res                                            # the word cache never crosses the return
    n = res["n_words"]
    for arm, cuts in res["boundaries"].items():
        assert isinstance(cuts, list)
        assert all(isinstance(c, int) and 0 <= c <= n for c in cuts), f"{arm}: cut off the word axis"


def test_daemon_analyze_routes(monkeypatch):
    # analyze routes to the daemon `analyze` verb (the detect-only change-point read through the holder that
    # owns the store); the span rides the wire as `sample`, the addressed root threads through.
    calls = []
    monkeypatch.setattr("lares_mcp.uds.output", lambda verb, args: (calls.append((verb, args)), {"ok": True})[1])
    dc = DaemonCoordinator(wing="w")
    dc.analyze(spectral=True, span=8, sensorium_root="/root/mesh")
    assert calls[-1][0] == "analyze"
    assert calls[-1][1] == {"spectral": True, "sample": 8, "sensoriumRoot": "/root/mesh"}


def test_daemon_rejim_routes_and_repour_rides_refresh(monkeypatch):
    # rejim routes to the daemon `rejim` verb; `repour=True` first rides the reversible `refresh` verb
    # narrowed to the rejim enrichment (which=rejim), then reads — the addressed root threads through both.
    calls = []
    monkeypatch.setattr("lares_mcp.uds.output", lambda verb, args: (calls.append((verb, args)), {"ok": True})[1])
    dc = DaemonCoordinator(wing="w")
    dc.rejim()
    assert calls[-1] == ("rejim", {})                                     # the plane read, routed
    calls.clear()
    dc.rejim(repour=True, sensorium_root="/root/mesh")
    assert calls[0] == ("refresh", {"which": "rejim", "sensoriumRoot": "/root/mesh"})   # repour rides refresh
    assert calls[1] == ("rejim", {"sensoriumRoot": "/root/mesh"})         # then reads, root threaded
