"""lares_mcp — the /mcp surface mirroring the `lares` CLI (ISOMORPHIC verb parity: CLI commands <-> MCP
tools, one verb-ontology across two surfaces). A fresh py FastMCP server routing to the lares house's own
py sensorium backend (capture_session · content_io · worldline_io). The coordinator-seat ruling: the MCP
verb-surface lives py; the TS @daemon supervises the fleet + keeps the surface-wiring. The vendored
mempalace mcp_server.py stays for the upstream nakama on their causal island — this serves the lares house.

The isomorphism lives in `LaresCoordinator` (the verb-router both surfaces call); the CLI commands and the
MCP tools stay thin skins over it, each verb named the same on both — pour · recall · status · worldline
· kapae · un_kapae (Phase-6a lifecycle floor; the extensions declare/attach/reconcile/release/daydream/
deep-dream + the HITL/HOTL grid ride in at 6b).

Meme: lar:///ha.ka.ba/lararium/sensorium/lares-mcp (the isomorphic surface).
"""
from __future__ import annotations

import json
import os

import content_io as cio
import worldline_io as wl
import lares_uds as uds
from capture_session import capture_and_observe, worldline_path
from embed_cap import make_embed_cap
from sensorium import sensorium_paths, read_stream_manifest, sensorium_dir

# The lifecycle-floor verbs the MCP surface mirrors from the `lares` CLI. Each name reads identically on
# both surfaces (the isomorphism contract); a parity test asserts the two sets agree.
LIFECYCLE_VERBS = ("pour", "recall", "status", "worldline", "kapae", "un_kapae")

# The per-plane QUERY DOOR verb — read-only cross-plane interrogation of a 3-plane test-bed sensorium
# (content · structure · form, one cid keying all three planes; corpus_testbed/plane_fanout land it).
# The per-plane READS (structure · form) fold onto `recall --lens <plane>` — the plane rides as a
# parameter, so only the cross-plane WITNESS keeps its own verb here.
# THE PARITY SEAM: this rides the MCP surface AHEAD of its CLI spelling — the CLI form + the cli-verbs
# fixture grow with the projector arc, so the parity test carries it as a NAMED allowance
# (mcp_tools − PLANE_VERBS mirrors the fixture) until the CLI catches up.
PLANE_VERBS = ("plane_record",)

# The reversibility×trust GRID: each verb declares (reversible, trust_crossing). The seat follows —
# HOTL (reversible AND trusted) runs on the operator's loop, no pause; HITL (irreversible OR trust-
# crossing) blocks for the operator's hand. One grid across both surfaces (CLI + MCP). The @daemon holds
# the LaresCoordinator cap in its wiki-island VM worker; it reads a verb's seat and grants the operator-
# authorized approval capability an HITL verb needs (capability-based — the @daemon is the cap-holder).
VERB_SEATS = {
    "pour": (True, False),       # append-only capture — reversible (an edit rides kapae), trusted
    "recall": (True, False),     # read — reversible, trusted
    "status": (True, False),     # read — reversible, trusted
    "worldline": (True, False),  # read — reversible, trusted
    "kapae": (True, False),      # move-not-delete mute — reversible, trusted
    "un_kapae": (True, False),   # restore — reversible, trusted
    "plane_record": (True, False),      # cross-plane read — reversible, trusted (structure/form fold onto recall --lens)
    # teardown tears a whole sensorium store DOWN — IRREVERSIBLE → HITL. It rides the CLI today, gated
    # by --confirm (the operator's hand at the door); the grid NAMES its HITL seat so a future MCP mirror
    # inherits the gate rather than crossing the surface ungated.
    "teardown": (False, False),
    # 6b control verbs — the SEAT stands now; execution rides in after the HITL talk-story locks.
    "purge": (False, False),     # HARD-delete — IRREVERSIBLE → HITL
    "attach": (True, True),      # admit a guest sensorium — TRUST-CROSSING → HITL
    "release": (False, False),   # let a guest sensorium GO (drops its handle) — IRREVERSIBLE → HITL
    "reconcile": (True, False),  # re-settle a sensorium against its source — reversible, trusted → HOTL
}


def seat_of(verb: str) -> str:
    """HOTL when a verb runs reversible AND trusted; HITL (needs the operator's hand) when it turns
    irreversible OR crosses a trust boundary."""
    reversible, trust_crossing = VERB_SEATS[verb]
    return "HOTL" if (reversible and not trust_crossing) else "HITL"


def guard_hitl(verb: str, approval=None) -> None:
    """Gate a verb by its seat: a HOTL verb passes freely; an HITL verb needs a truthy operator-approval
    capability (the @daemon grants it out-of-band). Raise when an HITL verb rides without one."""
    if seat_of(verb) == "HITL" and not approval:
        why = "irreversible" if not VERB_SEATS[verb][0] else "trust-crossing"
        raise PermissionError(f"{verb} sits HITL ({why}) — an operator-approval capability is required; "
                              "the @daemon grants it out-of-band. A reversible verb (e.g. kapae) needs none.")


# The stamp-filter → metadata-key map: each recall filter narrows on the key the py CAPTURE actually
# stamps (filter and stamp share ONE key so they never drift). PHYSICS/STRUCTURAL filters ONLY — the
# ENRICHMENT filters (voice/band/agent-handle/drift) drop from the surface until enrichment EMERGES from
# the breathing sensorium (the Li/Ki nameless-entity detection); stamping them at capture would freeze a
# guess the detection should discover. Keys match capture_sources: `wing` (raw, structural), `lar_surface`
# + `lar_agent` (physics stream-provenance; lar_agent on sub-agent turns).
_STAMP_KEYS = {
    "wing": "wing",
    "surface": "lar_surface",
    "agent": "lar_agent",
    # the block taxonomy axes — recall the operator's steering as its own stratum (speaker="operator"),
    # the loud voices (channel="speech"), or one communicative role (function="steering").
    "speaker": "lar_speaker",
    "channel": "lar_channel",
    "function": "lar_function",
}


def _recall_where(*, wing=None, agent=None, surface=None, speaker=None, channel=None, function=None):
    """Build a chroma `where` from the recall filters — one clause per provided filter, keyed to the slot
    the capture stamps. The taxonomy axes (speaker/channel/function) let a recall surface ONE stratum: the
    operator's steering (speaker="operator"), the loud voices (channel="speech"), a single role. Returns
    None when no filter narrows (the pool stays open); a many-clause filter ANDs (chroma `$and`)."""
    clauses = {"wing": wing, "agent": agent, "surface": surface,
               "speaker": speaker, "channel": channel, "function": function}
    where = {_STAMP_KEYS[name]: val for name, val in clauses.items() if val is not None}
    return where or None


_HEX_DIGITS = frozenset("0123456789abcdef")


def _reads_as_cid(s: str) -> bool:
    """A record cid reads as a full sha-256 hex, optionally chunk-suffixed (`<hex64>_<n>` — the
    capture chunker keys each chunk; the live test-bed carries this form); anything else reads
    as query TEXT."""
    if not isinstance(s, str):
        return False
    head, sep, tail = s.partition("_")
    return (len(head) == 64 and all(c in _HEX_DIGITS for c in head.lower())
            and (not sep or tail.isdigit()))


def _structure_entry_for_cid(store, cid: str) -> "dict | None":
    """Resolve a record cid to its STRUCTURE entry through the provenance join — the structurepalace
    keys by structural HASH, so the cid walks the provenance lines (the same read-back leg the
    corpus_testbed witness rides). None when no entry binds the cid."""
    got = store._col.get(include=["metadatas"])  # noqa: SLF001 — the read probe walks the raw collection
    ids = got.get("ids") or []
    metas = got.get("metadatas") or []
    for i, h in enumerate(ids):
        meta = metas[i] or {}
        try:
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        if any(p.get("verbatim_sha") == cid for p in provenance):
            return {"hash": h, "count": meta.get("count"),
                    "provenance_cids": sorted({p.get("verbatim_sha") for p in provenance
                                               if p.get("verbatim_sha")})}
    return None


def _rrf_fuse(ranked_lists: "list[list[str]]", k: int, rrf_k: int = 60) -> "list[str]":
    """Reciprocal Rank Fusion over several ordered cid lists → ONE ranked cid list. Rank-only, so surfaces
    whose scores live on incomparable scales (cosine distance ⊥ lexical BM25 ⊥ entity co-occurrence) fuse
    without a shared metric: `score(cid) = Σ 1/(rrf_k + rank_i)`. This is the merge the combined-arms recall
    rides over whatever recall-surfaces the sensorium #has."""
    scores: "dict[str, float]" = {}
    for cids in ranked_lists:
        for rank, cid in enumerate(cids):
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (rrf_k + rank)
    return [cid for cid, _ in sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:k]]


class LaresCoordinator:
    """The verb-router BOTH surfaces (CLI + MCP) call — it holds a warm embedder + a content-store and a
    worldline handle on ONE sensorium palace, and drives the capture engine. Naming each method for its
    CLI verb keeps the isomorphism honest; the surfaces stay thin skins."""

    def __init__(self, sensorium_root: str, *, wing: str = "wing_default", embed_factory=None) -> None:
        self._paths = sensorium_paths(sensorium_root)
        self._palace = self._paths.root
        self._wing = wing
        embed_factory = embed_factory or make_embed_cap
        self._embed_one, self._model = embed_factory()
        self._dim = len(self._embed_one("probe"))           # pin the width off the warm cap
        self._plane_stores: dict = {}                        # lazy structure/form handles, opened on first read
        self._content = cio.ContentStore(self._paths.content, expected_dim=self._dim, expected_model=self._model)
        # The fork-DAG rides the ONE canonical `worldline/` dir the capture wire builds into — the same
        # helper both sides call, so a pour's braid IS the DAG this coordinator reads (no path split).
        self._worldline = wl.WorldlineStore(worldline_path(self._palace))

    def pour(self, surface: str, pointer: str, *, all: bool = False, writeback: bool = False,
             dry_run: bool = False, wing: "str | None" = None,
             room: str = "conversations") -> dict:
        """Capture a surface's transcript into the Memory sensorium (mirrors `lares sense pour`).
        Idempotent re-derivation — a re-run lands only the un-landed tail (the crash-cure).

        The isomorphism contract carries the CLI's rich args onto this one spine: `all` sweeps every
        surface, `writeback` re-enriches a wing's drawers, `dry_run` previews without landing. The
        per-pointer capture rides `capture_and_observe` here — it lands the content AND builds the
        worldline fork-DAG into the shared `worldline/`, so `worldline()`/`kapae` read a REAL braid on
        the shipping path; the sweep/writeback/preview SHAPING rides the CLI skin + the deferred
        @daemon-cap-wire, so the params stand in the signature and thread through as the wire lands them."""
        if all or writeback or dry_run:
            # REFUSE HONESTLY, never silently ignore: dry_run especially would otherwise LAND on the
            # append-only ground (the tool advertises a preview it can't yet give). The sweep/writeback/
            # preview shaping rides the deferred @daemon-cap-wire — the same discipline as the kapae stub.
            raise NotImplementedError(
                "pour all/writeback/dry_run: the sweep/writeback/preview shaping rides the deferred "
                "@daemon-cap-wire (not yet wired) — refusing rather than capturing for real")
        return capture_and_observe(self._palace, surface, pointer, wing=wing or self._wing, room=room,
                                   embed_factory=lambda: (self._embed_one, self._model))

    def _exchange_view(self, matches: list) -> list:
        """Pair matched blocks into EXCHANGES — the read-time view the ontology names. Group the matches
        by lar_turn_key, fetch each turn's FULL block-set (its siblings via content.cids_for_turn), order
        by chunk_index. So a bare matched block recalls WITH its turn's context — the operator's steering
        beside the agent's surface — the merge done as a VIEW, never baked into content. Turn order follows
        the match ranking (the best-matching turn first); a turn surfaces once however many blocks matched."""
        exchanges: list = []
        seen: "set[str]" = set()
        for m in matches:
            tk = (m.get("metadata") or {}).get("lar_turn_key")
            if not tk or tk in seen:
                continue
            seen.add(tk)
            blocks = []
            for cid in self._content.cids_for_turn(tk):
                rec = self._content.get(cid)
                if not rec:
                    continue
                meta = rec.get("metadata") or {}
                blocks.append({"cid": cid, "chunk_index": meta.get("chunk_index", 0),
                               "speaker": meta.get("lar_speaker"), "function": meta.get("lar_function"),
                               "channel": meta.get("lar_channel"), "text": rec.get("document", "")})
            blocks.sort(key=lambda b: b["chunk_index"])
            exchanges.append({"turn_key": tk, "blocks": blocks})
        return exchanges

    def recall(self, query: str, k: int = 8, *, wing: "str | None" = None, imago: "str | None" = None,
               list: bool = False, agent: "str | None" = None, surface: "str | None" = None,
               speaker: "str | None" = None, channel: "str | None" = None, function: "str | None" = None,
               pair: bool = False, lens: str = "content") -> dict:
        """Recall the nearest turns to a query (mirrors `lares sense recall`); kapae-muted turns stay excluded.

        The `lens` folds the per-plane reads onto this one verb — the plane rides as a parameter, so the
        surface stays one recall however many planes stand: `content` (default) rides the combined-arms
        engine below; `structure` and `form` ride their plane doors (the SAME bespoke reads, one surface).

        COMBINED-ARMS (content lens): the recall FUSES every recall-surface this sensorium #has — the
        content-vector (the eidetic ground, always) plus the mempalace projection (lexical + entity) when the
        #has stack declares it and it is paved — by reciprocal rank fusion, resolving verbatim from content.
        Isomorphic: a bare stream sensorium recalls by vector alone; a memory sensorium fuses
        lexical+entity+vector — the SAME machinery reading whatever the stack composes (never a hardcoded list).

        Read modes + filters shed onto this spine: `imago` fetches ONE verbatim entry by turn-key; `list`
        reports the taxonomy. A `wing`/`agent`/`surface` filter narrows by provenance; the TAXONOMY filters
        `speaker`/`channel`/`function` narrow by the block's own axis — so a recall can surface the operator's
        steering as its own stratum (speaker="operator"), the loud voices (channel="speech"), or one role.
        Because the lexical/entity projection carries no such filter yet, a FILTERED recall rides the
        content-vector ALONE (honest — never fuse in unfiltered hits); the unfiltered common case fuses the
        full combined-arms."""
        if lens == "structure":
            return self.recall_structure(query, k)
        if lens == "form":
            return self.recall_form(query, k)
        if lens != "content":
            raise ValueError(f"recall lens {lens!r} unknown — name one of: content · structure · form")
        if imago:
            return self._content.get(imago) or {}
        if list:
            return self._content.taxonomy()
        where = _recall_where(wing=wing, agent=agent, surface=surface,
                              speaker=speaker, channel=channel, function=function)
        surfaces = self._recall_surfaces()
        if where or len(surfaces) <= 1:
            # a filtered read, or a bare single-surface sensorium → the content-vector path, unchanged.
            out = self._content.search(self._embed_one(query), k, where)
        else:
            # FUSE the #has surfaces: each yields ordered cids; RRF merges; content resolves the verbatim.
            pool = max(k * 2, 16)
            ranked = [fn(query, pool) for _name, fn in surfaces]
            fused = _rrf_fuse(ranked, k)
            matches = []
            for cid in fused:
                rec = self._content.get(cid)
                if rec:
                    matches.append({"cid": cid, "distance": None,
                                    "document": rec.get("document", ""), "metadata": rec.get("metadata", {})})
            out = {"matches": matches, "scanned": pool, "matched": len(matches),
                   "surfaces": [name for name, _ in surfaces]}
        if pair:
            # the exchange-VIEW: pair the matched blocks into their turns (steering beside surface).
            rest = {kk: vv for kk, vv in out.items() if kk != "matches"}
            return {"exchanges": self._exchange_view(out.get("matches", [])), **rest}
        return out

    def _recall_surfaces(self) -> list:
        """The recall-surface caps this sensorium #has — each `(name, search(query, k) -> ordered cids)`.

        Discovered from the manifest #has stack (the nameless-entity composition), never a hardcoded list:
        the content-vector rides the eidetic ground always; the mempalace projection (lexical + entity) rides
        when the stack declares a `mempalace` cap AND its projection is paved on disk. A future recall-capable
        cap joins the fusion simply by standing in the stack — the recall composes what the sensorium has."""
        def _vector(query: str, k: int) -> "list[str]":
            res = self._content.search(self._embed_one(query), k)
            return [m["cid"] for m in res.get("matches", [])]
        surfaces: list = [("content-vector", _vector)]
        manifest = read_stream_manifest(self._palace, absent_ok=True) or {}
        mp = (manifest.get("has") or {}).get("mempalace")
        if isinstance(mp, dict):
            mp_db = os.path.join(self._palace, mp.get("dir") or "mempalace", "mempalace")
            if os.path.exists(mp_db + ".lex"):                 # the projection is paved (realized on disk)
                def _projection(query: str, k: int) -> "list[str]":
                    from mempalace_projection import MempalaceProjection
                    proj = MempalaceProjection(db_path=mp_db)   # read-only: hybrid_search reads the stored graph
                    try:
                        return proj.hybrid_search(
                            query, lambda cid: (self._content.get(cid) or {}).get("document"), k)
                    finally:
                        proj.close()
                surfaces.append(("mempalace", _projection))
        return surfaces

    def status(self) -> dict:
        """What the sensorium holds — the taxonomy over the palace (mirrors `lares status`)."""
        return self._content.taxonomy()

    def worldline(self, selector: "str | None" = None, *, as_of=None) -> dict:
        """The fork-DAG rhizome (mirrors `lares worldline`). `selector` names which run/handle the CLI
        walks; the py `dag` renders the whole edge-DAG and the selector-narrowing rides the CLI skin.
        `diff` stays a CLI-only delta (it refuses honestly on the persisted-ITC gap) — never a method
        here."""
        return self._worldline.dag(as_of=as_of)

    def kapae(self, branch: str, tick) -> dict:
        """Mute a worldline branch + cascade the mute across the sensorium (mirrors `lares worldline kapae`).
        Reversible — un_kapae restores; move-not-delete throughout."""
        return wl.cascade_kapae(self._worldline, [self._content], branch, tick)

    def un_kapae(self, branch: str, tick) -> dict:
        """Restore a muted branch across the sensorium (mirrors `lares worldline un-kapae`)."""
        return wl.cascade_un_kapae(self._worldline, [self._content], branch, tick)

    # ── the per-plane QUERY DOOR (read-only; PLANE_VERBS) ────────────────────────────────────

    def _plane_store(self, plane: str):
        """Open the named plane palace (<palace>/structure | <palace>/form) lazily and cache the
        handle. Returns None when the plane carries no store yet — the query verbs answer an
        honest null rather than PLANTING an empty palace (the read verbs never write the ground)."""
        cached = self._plane_stores.get(plane)
        if cached is not None:
            return cached
        path = os.path.join(self._palace, plane)
        if not os.path.exists(os.path.join(path, "chroma.sqlite3")):
            return None
        if plane == "structure":
            from structurepalace_io import StructurePalaceStore
            store = StructurePalaceStore(path)
        else:
            from form_encoder import FormPalaceStore
            store = FormPalaceStore(path)
        self._plane_stores[plane] = store
        return store

    def recall_structure(self, query_or_cid: str, k: int = 8) -> dict:
        """Interrogate the STRUCTURE plane (read-only). A 64-hex cid resolves through the provenance
        join to the structural entry binding it; any other string parses to a content-free tree
        (markdown-hinted; a sigil-dense query still promotes to memetic-wikitext) and rides the
        STRUCTURAL embedding into nearest-shape recall — never the content vector (the independence
        law holds through the door). Honest nulls where the plane or the record stays absent."""
        store = self._plane_store("structure")
        if store is None:
            return {"plane": "structure", "present": False, "matches": [],
                    "note": "structure: this palace carries no structure store"}
        if _reads_as_cid(query_or_cid):
            entry = _structure_entry_for_cid(store, query_or_cid)
            return {"plane": "structure", "present": True, "cid": query_or_cid,
                    "entry": entry, "matches": []}
        from structure_router import detect_kind, parse_to_tree
        from structurepalace_io import _structural_embed
        kind = detect_kind("query.md", query_or_cid)
        tree = parse_to_tree(kind, query_or_cid)
        if tree is None:
            return {"plane": "structure", "present": True, "matches": [],
                    "note": f"structure: the router holds no grammar for kind {kind!r}"}
        got = store._col.query(query_embeddings=[_structural_embed(tree)],  # noqa: SLF001 — the store carries no query face yet
                               n_results=max(k, 1), include=["metadatas", "distances"])
        ids = (got.get("ids") or [[]])[0]
        metas = (got.get("metadatas") or [[]])[0]
        dists = (got.get("distances") or [[]])[0]
        matches = [{"hash": ids[i],
                    "distance": dists[i] if i < len(dists) else None,
                    "count": (metas[i] or {}).get("count"),
                    "source_file": (metas[i] or {}).get("source_file", "")}
                   for i in range(len(ids))]
        return {"plane": "structure", "present": True, "kind": kind, "matches": matches}

    def recall_form(self, query_or_cid: str, k: int = 8) -> dict:
        """Interrogate the FORM plane (read-only): a cid fetches its induced-template membership row,
        then rides its OWN stored vector into nearest-by-membership neighbors (self dropped). A text
        query answers an honest null — text→membership needs the induced constructicon, which the
        store keeps only as per-record vectors, never as a queryable grammar."""
        store = self._plane_store("form")
        if store is None:
            return {"plane": "form", "present": False, "matches": [],
                    "note": "form: this palace carries no form store"}
        if not _reads_as_cid(query_or_cid):
            return {"plane": "form", "present": True, "matches": [],
                    "note": "form: text queries need the induced constructicon (not persisted as a "
                            "queryable grammar) — query by cid, or ride recall_structure/plane_record"}
        row = store.get(query_or_cid)
        if row is None:
            return {"plane": "form", "present": True, "cid": query_or_cid, "record": None, "matches": []}
        got = store._col.get(ids=[query_or_cid], include=["embeddings"])  # noqa: SLF001 — the stored vector drives the neighbor read
        embs = got.get("embeddings")
        vec = [float(x) for x in embs[0]] if embs is not None and len(embs) else []
        meta = row.get("metadata") or {}
        record = {"dimension": meta.get("dimension"), "count": meta.get("count"),
                  "struct_hash": meta.get("struct_hash", ""),
                  "active_templates": sum(1 for v in vec if v > 0.0)}
        res = store._col.query(query_embeddings=[vec], n_results=max(k, 1) + 1,  # noqa: SLF001 — +1 covers the self-hit
                               include=["metadatas", "distances"])
        ids = (res.get("ids") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        matches = [{"cid": ids[i], "distance": dists[i] if i < len(dists) else None}
                   for i in range(len(ids)) if ids[i] != query_or_cid][:max(k, 1)]
        return {"plane": "form", "present": True, "cid": query_or_cid, "record": record, "matches": matches}

    def plane_record(self, cid: str) -> dict:
        """The cross-plane witness read: ONE cid → its presence + payload summary across content ·
        structure · form, honest nulls where a plane lacks the record. READ-only — it witnesses
        co-presence and scores nothing. THE COHERE SEAM: cross-plane AGREEMENT (cohere) lands its
        organs with the projector arc; this verb stays the bare 3-plane witness until then."""
        out: dict = {"cid": cid}
        row = self._content.get(cid)
        if row is None:
            out["content"] = {"present": False}
        else:
            meta = row.get("metadata") or {}
            out["content"] = {"present": True,
                              "head": (row.get("document") or "")[:120].replace("\n", " "),
                              "source_file": meta.get("source_file", ""),
                              "wing": meta.get("wing", ""), "room": meta.get("room", "")}
        s_store = self._plane_store("structure")
        if s_store is None:
            out["structure"] = {"present": False, "note": "no structure store"}
        else:
            entry = _structure_entry_for_cid(s_store, cid)
            out["structure"] = {"present": entry is not None, **(entry or {})}
        f_store = self._plane_store("form")
        if f_store is None:
            out["form"] = {"present": False, "note": "no form store"}
        else:
            f_row = f_store.get(cid)
            if f_row is None:
                out["form"] = {"present": False}
            else:
                got = f_store._col.get(ids=[cid], include=["embeddings"])  # noqa: SLF001 — the membership count reads the vector
                embs = got.get("embeddings")
                vec = [float(x) for x in embs[0]] if embs is not None and len(embs) else []
                f_meta = f_row.get("metadata") or {}
                out["form"] = {"present": True, "dimension": f_meta.get("dimension"),
                               "count": f_meta.get("count"),
                               "active_templates": sum(1 for v in vec if v > 0.0)}
        return out


def build_mcp(coordinator: LaresCoordinator):
    """Wrap the coordinator in a FastMCP server — one @tool per lifecycle verb, each a thin skin that
    routes straight to the coordinator (the isomorphism holds because both surfaces share it).

    HITL-GATE PIN (6b): the six lifecycle tools below all seat HOTL, so `guard_hitl` no-ops on them.
    When the 6b control verbs (purge/attach/release) wire in as tools here, each MUST call
    `guard_hitl(verb, approval)` before executing — the grid SEATS them HITL, but nothing structurally
    forces the gate until the tool calls it. The @daemon (holding this cap in its wiki-island VM worker)
    supplies the approval capability out-of-band (ask→confirm→cap→wiki-audit)."""
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("lares")

    # The addressed-sensorium seam: an AI names a sensorium; the tool resolves the name to its root and
    # threads it up the @daemon cap-ladder (the routed recall/capture/refresh verbs pick the holder by
    # root). Absent → the memory default. A standalone coordinator binds ONE palace at construction, so a
    # name resolving to a DIFFERENT root refuses rather than reading the wrong store; the routed router
    # holds no palace, so it carries the root across to whichever holder owns it.
    bound_root = getattr(coordinator, "_palace", None)   # standalone holds one root; the router holds none
    routed = bound_root is None

    def _address(sensorium: "str | None") -> "str | None":
        if not sensorium:
            return None
        root = sensorium_dir(sensorium)
        if bound_root is not None and os.path.realpath(root) != os.path.realpath(bound_root):
            raise ValueError(f"--standalone opens ONE sensorium ({bound_root}); addressing {sensorium!r} "
                             "rides the routed @daemon (drop --standalone, or name the bound sensorium)")
        return root

    def _call(verb: str, sensorium: "str | None", *args, **kwargs):
        """Resolve the addressed sensorium and drive the shared coordinator: the router carries the root
        across; the bound standalone already owns its one palace, so it needs no root threaded in."""
        root = _address(sensorium)
        method = getattr(coordinator, verb)
        return method(*args, sensorium_root=root, **kwargs) if routed else method(*args, **kwargs)

    @mcp.tool()
    def pour(surface: str, pointer: str, all: bool = False, writeback: bool = False,
             dry_run: bool = False, wing: "str | None" = None,
             room: str = "conversations", sensorium: "str | None" = None) -> dict:
        """Capture a surface's transcript (claude/codex/copilot) into a sensorium (`sensorium` names it;
        absent → memory). `all` sweeps every surface, `writeback` re-enriches a wing, `dry_run` previews."""
        return _call("pour", sensorium, surface, pointer, all=all, writeback=writeback, dry_run=dry_run,
                     wing=wing, room=room)

    @mcp.tool()
    def recall(query: str, k: int = 8, wing: "str | None" = None, imago: "str | None" = None,
               list: bool = False, agent: "str | None" = None, surface: "str | None" = None,
               speaker: "str | None" = None, channel: "str | None" = None, function: "str | None" = None,
               pair: bool = False, lens: str = "content", sensorium: "str | None" = None) -> dict:
        """Recall the nearest turns to a query from a sensorium (`sensorium` names it; absent → memory).
        `lens` names the plane: `content` (default, combined-arms) · `structure` (nearest shapes) · `form`
        (induced-template membership, by cid). `imago` fetches one verbatim; `list` reports the taxonomy.
        Filters narrow the pool: wing/agent/surface by provenance; the block-taxonomy `speaker` (operator/
        agent/harness) · `channel` (speech/thought/tool) · `function` (steering/surface/…) surface ONE
        stratum — the operator's steering alone, the loud voices, a single role. `pair` returns the
        exchange-view (each block paired with its turn's siblings). Mirrors `lares sense recall` exactly —
        two surfaces, one API."""
        return _call("recall", sensorium, query, k, wing=wing, imago=imago, list=list,
                     agent=agent, surface=surface, speaker=speaker, channel=channel, function=function,
                     pair=pair, lens=lens)

    @mcp.tool()
    def status(sensorium: "str | None" = None) -> dict:
        """Report what a sensorium holds (the taxonomy). `sensorium` names it; absent → memory."""
        return _call("status", sensorium)

    @mcp.tool()
    def worldline(selector: "str | None" = None, sensorium: "str | None" = None) -> dict:
        """Render the fork-DAG rhizome of turns. `selector` names which run/handle to walk; `sensorium`
        names the sensorium (absent → memory)."""
        return _call("worldline", sensorium, selector)

    @mcp.tool()
    def kapae(branch: str, tick: int, sensorium: "str | None" = None) -> dict:
        """Mute a worldline branch (a fork-path-dead-end) + cascade the mute across a sensorium
        (`sensorium` names it; absent → memory)."""
        return _call("kapae", sensorium, branch, tick)

    @mcp.tool()
    def un_kapae(branch: str, tick: int, sensorium: "str | None" = None) -> dict:
        """Restore a previously kapae-muted branch across a sensorium (`sensorium` names it; absent → memory)."""
        return _call("un_kapae", sensorium, branch, tick)

    @mcp.tool()
    def plane_record(cid: str, sensorium: "str | None" = None) -> dict:
        """The cross-plane witness: one cid -> presence + payload summary across content,
        structure and form (honest nulls where a plane lacks it). `sensorium` names the sensorium
        (absent → memory)."""
        return _call("plane_record", sensorium, cid)

    return mcp


class DaemonCoordinator:
    """The verb-router that HOLDS NOTHING — every verb rides the @daemon cap-wire (`lares_uds`).

    MCP speaks stdio-per-client, so a harness running N sessions runs N of these processes. A coordinator
    that opened a ContentStore would therefore put N unsynchronized chroma clients on one index — and no
    lock cures that, because the palace serve-holders speak NDJSON on raw stdin and answer only the
    process that spawned them. Exactly ONE OWNER holds the palace — the @daemon — and everyone else asks it.

    All the COMPUTE still runs py: the daemon routes to the py holders it owns, which embed, search, and
    store. The TS coordinator carries the verb across and nothing else. This surface holds nothing.

    A verb the daemon does not yet answer REFUSES. It never falls back to opening a store — a fallback
    puts a second writer on the palace, the one thing this wire stands to prevent.
    """

    # The verbs the @daemon answers today. The rest stay OWED node-side; each wants a verb that routes
    # to a holder the daemon already owns (worldline_io, structurepalace_io, form_encoder, content_io).
    ROUTED = {"recall"}

    def __init__(self, wing: str = "wing_default") -> None:
        self._wing = wing

    def _owed(self, verb: str):
        raise RuntimeError(
            f"lares_mcp: `{verb}` has no @daemon verb yet, and this surface holds no store of its own. "
            "Opening one would put a second writer on the palace (N sessions, N clients, one index). "
            f"Owed: a node verb for `{verb}` that routes to the holder the daemon already owns."
        )

    def recall(self, query: str, k: int = 8, *, wing: "str | None" = None,
               imago: "str | None" = None, sensorium_root: "str | None" = None,
               lens: str = "content", **_) -> dict:
        # The plane lenses (structure/form) ride the py engine directly; the daemon read-holder threads
        # the CONTENT lens today, so a plane lens over the routed wire OWES the routing generalization.
        if lens != "content":
            self._owed(f"recall --lens {lens}")
        args: dict = {"limit": k}
        if imago:
            args["imago"] = imago
        else:
            args["query"] = query
        if wing or self._wing != "wing_default":
            args["wing"] = wing or self._wing
        # The addressed sensorium (an AI names it; the tool resolved it to a root) — the @daemon recall
        # verb picks the holder by root up the cap-ladder. Absent → the memory default the daemon holds.
        if sensorium_root:
            args["sensoriumRoot"] = sensorium_root
        return uds.output("recall", args)

    def pour(self, *a, **k):             return self._owed("pour")
    def status(self, *a, **k):           return self._owed("status")
    def worldline(self, *a, **k):        return self._owed("worldline")
    def kapae(self, *a, **k):            return self._owed("kapae")
    def un_kapae(self, *a, **k):         return self._owed("un_kapae")
    def plane_record(self, *a, **k):     return self._owed("plane_record")


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="lares_mcp — the isomorphic /mcp surface over the lares sensorium")
    ap.add_argument("--sensorium", help="the sensorium dir (STANDALONE only — opens the stores directly; "
                                     "unsafe with more than one live session)")
    ap.add_argument("--wing", default="wing_default", help="the default wing for captures lacking one")
    ap.add_argument("--standalone", action="store_true",
                    help="open the stores directly instead of routing through the @daemon. ONE session only.")
    args = ap.parse_args()

    # ROUTED runs by default, and alone survives multiple sessions: the @daemon owns the holders, this
    # process owns nothing. `--standalone` opens the single-session escape hatch (a test-bed, a dead
    # node), and names its cost rather than pretending the direct open comes free.
    if args.standalone:
        if not args.sensorium:
            ap.error("--standalone needs --sensorium")
        coordinator = LaresCoordinator(args.sensorium, wing=args.wing)
    else:
        if not uds.available():
            raise SystemExit(
                f"lares_mcp: no lares daemon at {uds.socket_path()} — start one with `lares serve`.\n"
                "  This surface routes every verb through the @daemon so the palace keeps ONE owner.\n"
                "  For a single-session direct open, pass --standalone --sensorium <dir>."
            )
        coordinator = DaemonCoordinator(wing=args.wing)

    build_mcp(coordinator).run()   # stdio MCP serve


if __name__ == "__main__":
    main()
