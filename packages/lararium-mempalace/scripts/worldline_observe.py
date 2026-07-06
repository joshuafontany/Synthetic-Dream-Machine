#!/usr/bin/env python3
"""worldline_observe — the DEMUX step 1b: read a captured transcript, build its worldline fork-DAG.

capture_session lands turns FLAT into content_io; nothing yet stands the braid the demux climbs. This
observer reads the transcript PROVENANCE and feeds worldline_io the edges that reconstruct the rhizome:

  · the MAIN linear chain — each turn links to its `parentUuid` predecessor, so `worldline_of` climbs
    the main session up to its root. A turn whose `parentUuid` reads null roots at the RUN node (the
    session id) — the braid-anchor.
  · the SPAWN fork      — a session's `<session>/subagents/agent-<id>.jsonl` names a spirit's whole
    worldline. Each spirit forks `run -> <run>.<agentId>` (the handle deriveHandle mints); the spirit's
    own turns chain UNDER that handle, so a spirit turn climbs handle -> run -> the session root.
  · the HANDBACK close  — the twin-reunion joins `<run>.<agentId> -> run` and closes the fork interval.

PORTED from worldline-observe.ts (`deriveSubagentEdges` / `observeSubagentWorldlines`): the law holds —
SPAWN keys to the spirit's first turn, HANDBACK closes at its last turn. TWO ports diverge by design:

  1. NODE SPACE. The TS observer emits prov:Delegation triples for the KG (handle-space, valid_from =
     ISO ts). This port lives in worldline_io's TURN-KEY space so `worldline_of` / `roots` / kapae read
     the SAME keys content_io lands under (lar_turn_key). The fork still runs `run -> handle` (the task's
     edge); the spirit's own turns then chain under the handle so the demux reaches them.
  2. CLOCK. The TS observer stamps valid_from = first ts, ended = last ts. This port rides worldline_io's
     tick discipline: a caller LOGICAL ORDINAL, monotonic in transcript read-order. NO host wall-time
     touches the edge path (clock-purity, the sighting ward) — this module imports no clock, and the
     transcript's own timestamps never reach an edge.

INJECT (prov:Communication) stays UNBUILT — the one-handoff / run-to-completion subagent model carries
no reliable mid-flight injection signal (see the TS note). The hook (`_derive_injections`) stands ready;
it returns nothing until a SendMessage-continue lifecycle lands a distinguishable signal.

The worldline stays LOCAL — a py-local worldline_io fork-DAG, never a federated/meshed doc.

Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#attribution
"""
from __future__ import annotations

import itertools
import json
import os
import re
from dataclasses import dataclass, field

from worldline_veil import veiled_root


# --- transcript provenance readers (ported from subagent-mine.ts) -----------


def run_id_of(transcript_path: str) -> str:
    """The worldline RUN-root for a session transcript — its basename minus `.jsonl` (the session id)."""
    return re.sub(r"\.jsonl$", "", os.path.basename(transcript_path))


def agent_id_of(agent_file: str) -> str:
    """The agent id an `agent-<id>.jsonl` basename carries, else `unknown`."""
    m = re.match(r"^agent-(.+)\.jsonl$", os.path.basename(agent_file))
    return m.group(1) if m else "unknown"


def spirit_subagent_dir(transcript_path: str) -> str:
    """The `<session>/subagents` directory that holds a session's tasked-spirit transcripts."""
    return re.sub(r"\.jsonl$", "", transcript_path) + "/subagents"


def list_spirit_files(transcript_path: str) -> list:
    """Every `agent-*.jsonl` tasked-spirit transcript a session spawned (absolute paths, sorted), else []."""
    d = spirit_subagent_dir(transcript_path)
    if not os.path.isdir(d):
        return []
    try:
        return sorted(os.path.join(d, f) for f in os.listdir(d)
                      if re.match(r"^agent-.*\.jsonl$", f))
    except OSError:
        return []


def derive_handle(run: str, agent_id: str) -> str:
    """The lineage HANDLE `<root>.<agentId>` — `run` here reads the VEILED worldline-root (`wl-<hash>`,
    worldline_veil, C1b), so the handle rides opaque too. The cross-system worldline binding rides
    `lar_turn_key` (the turn uuid, unchanged), NOT this handle string — so veiling the root leaks nothing
    while the demux still joins a landed drawer to its braid by turn-key."""
    return f"{run}.{agent_id}"


@dataclass
class TurnLink:
    """One transcript turn's braid position — its own uuid + the parentUuid it descends from (or None)."""
    uuid: str
    parent: "str | None"


def read_chain(path: str) -> list:
    """Read a transcript's user/assistant turns into a `parentUuid` chain (in file order).

    Keeps every row carrying a `uuid` (text-empty tool rows included) so a chain never breaks where a
    later turn descends from a bodyless predecessor. Reads no timestamp — the edge path stays clock-pure."""
    out: list = []
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("type") not in ("user", "assistant"):
                    continue
                uuid = row.get("uuid")
                if not uuid:
                    continue
                parent = row.get("parentUuid")
                out.append(TurnLink(uuid=str(uuid), parent=(str(parent) if parent else None)))
    except OSError:
        return []
    return out


@dataclass
class SpiritEdges:
    """A spirit's derived worldline shape — the handle it forks into + its own turn chain."""
    handle: str
    agent_id: str
    agent_file: str
    chain: list = field(default_factory=list)


def derive_subagent_edges(transcript: str, run: str) -> list:
    """Derive every spirit's fork shape from a session transcript — PURE (reads files, writes nothing).
    `run` = the VEILED worldline-root the caller minted; each spirit's handle = `<run>.<agentId>`. Empty
    when none spawned."""
    out: list = []
    for af in list_spirit_files(transcript):
        agent_id = agent_id_of(af)
        chain = read_chain(af)
        if not chain:
            continue  # a spirit with no readable turns anchors no edge
        out.append(SpiritEdges(handle=derive_handle(run, agent_id), agent_id=agent_id,
                               agent_file=af, chain=chain))
    return out


def _derive_injections(run: str, handle: str, chain: list) -> list:
    """INJECT hook (prov:Communication) — UNBUILT. The one-handoff / run-to-completion model carries no
    reliable mid-flight injection signal, so this returns nothing. It stands ready for the day a
    SendMessage-continue lifecycle lands a distinguishable re-entry mark."""
    return []


# --- the wire: feed the derived shape into worldline_io ---------------------


def _add_chain(store, chain: list, root_anchor: str, tick) -> int:
    """Add a transcript's linear chain to the rhizome, rooting a null-parent turn at `root_anchor`
    (the RUN for a main chain, the HANDLE for a spirit chain). Returns the edges added-or-seen count.

    Every turn links `parent -> uuid`; a null parentUuid links `root_anchor -> uuid`, so the chain hangs
    off the braid-anchor and `worldline_of` climbs to ONE session root. `tick` = the caller ordinal.

    PHANTOM-ROOT GUARD: a first turn whose `parentUuid` points OUTSIDE this transcript's own uuid-set
    (a RESUMED session descending from a prior-session turn NOT in this file) ALSO roots at `root_anchor`
    — else that phantom parent, never a `to` of any edge, would surface as a spurious braid-root in
    `roots()`. Descent stays local: a parent counts only when it names a turn this transcript carries."""
    own = {link.uuid for link in chain}   # the transcript's OWN uuids — a parent outside them phantoms
    added = 0
    for link in chain:
        frm = link.parent if (link.parent and link.parent in own) else root_anchor
        store.linear(frm, link.uuid, next(tick))
        added += 1
    return added


def observe_worldline(store, transcript: str, *, tick0: int = 1, veil_secret: "bytes | str | None" = None,
                      veil_context: str = "", identity_dir: "str | None" = None) -> dict:
    """Read `transcript` and build its whole worldline into `store` (a worldline_io.WorldlineStore).

    The braid-anchor rides the VEILED worldline-root (`wl-<hash>`, worldline_veil C1b), NEVER the bare
    session basename — so the graph carries an opaque, owner-recomputable root. `veil_secret` injects the
    local secret (a witness passes an explicit test salt; None resolves the on-disk persona/worldline-salt).

    Order: the main linear chain (rooted at the RUN node) · then per spirit — the SPAWN fork
    (`run -> handle`), the spirit's own chain (rooted at the HANDLE), the HANDBACK close. Every edge
    takes a caller LOGICAL ORDINAL tick (monotonic in read-order), so a re-run mints the identical
    (frm, to, relation, tick) tuples and worldline_io's sink-idempotence dedups them — no duplicate edges.

    Returns a summary: the veiled run-root, the main-chain length, and the observed spirit handles."""
    tick = itertools.count(tick0)  # the pure logical ordinal — no host clock rides the edge path
    run = veiled_root(run_id_of(transcript), veil_context, secret=veil_secret, identity_dir=identity_dir)

    # 1. the MAIN linear chain — a null-parent main turn roots at the RUN node (the session braid-anchor).
    main_chain = read_chain(transcript)
    main_edges = _add_chain(store, main_chain, run, tick)

    # 2. per spirit — the SPAWN fork, the spirit chain under the handle, the HANDBACK close.
    observed: list = []
    for spirit in derive_subagent_edges(transcript, run):
        store.fork(run, spirit.handle, next(tick))            # SPAWN: run -> <run>.<agentId>
        _add_chain(store, spirit.chain, spirit.handle, tick)  # the spirit's turns chain under the handle
        _derive_injections(run, spirit.handle, spirit.chain)  # INJECT hook — unbuilt (one-handoff model)
        store.handback(run, spirit.handle, next(tick))        # HANDBACK: join handle->run + close the fork
        observed.append(spirit.handle)

    return {"run": run, "main_turns": main_edges, "spirits": observed}


def detect_rewind(store, drawers) -> "str | None":
    """Compare a re-derived transcript's content-hash-chain to the STORED drawers' `lar_chain`, returning
    the first turn-key where they DIVERGE — the rewind-point (an edited or diverged prefix); None when the
    chain holds. The cid keys on source+index (content-INDEPENDENT), so an edit re-derives the SAME cid and
    `is_landed` would skip it silently; the chain surfaces the tamper, so the caller kāpae-prunes from the
    rewind-point (the retraction — the cascade re-projects downstream). `drawers` = the freshly re-derived
    (cid, text, metadata) tuples for one source; a genuinely new tail turn (no stored drawer) reads as
    growth, not a rewind."""
    for cid, _text, meta in drawers:
        stored = store.get(cid)
        if stored is None:
            continue                                       # a new tail turn — growth, not a rewind
        if (stored.get("metadata") or {}).get("lar_chain") != meta.get("lar_chain"):
            return meta.get("lar_turn_key")                # the chain diverged here — the rewind-point
    return None
