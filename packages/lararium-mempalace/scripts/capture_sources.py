"""capture_sources — the multi-surface SOURCE-CAP family that LIGHTS the capture engine.

The engine (capture_stream.Pipeline) drives a source-cap: `callable(pointer) -> iterable of records
{seq, cid, text, metadata}`. This module supplies ONE cap per AI surface — **Claude Code · Codex ·
Copilot** — each reading its native transcript into the engine's record grain. The engine's crash-safe
re-derivation makes BULK and LIVE the SAME cap over one pointer: a re-pass re-reads the whole (growing)
source, is_landed skips the already-durable prefix, only the fresh tail lands. Main and sub-agent
sessions ride the same cap (a sub-agent transcript reads through the same parser, marked by surface).

THE SINGLE CID GATE (the W1.5d fix — dissolves the W9 divergence). ONE derivation mints every drawer id:
`cid = sha256(source_file)_<chunk_index>`, FULL sha256 hex (never py's old [:24] truncation), matching
`caller-vector-flush.ts`'s `drawerCid`. The `chunk_index` (the per-source exchange ordinal) makes
distinct same-source turns derive DISTINCT cids — so no turn clobbers another under one shared key
(the live turnKey-clobber the W9 note flagged). The `lar_turn_key` (the user turn's uuid) rides METADATA
for the worldline binding, NEVER the cid — the address stays pure content-identity, the turn-key keys
the kapae cascade. Idempotent by construction: the same (source_file, chunk) re-derives the same cid.

Meme: lar:///ha.ka.ba/@lararium/sensorium/capture-sources
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Callable, Iterable, Iterator

from copilot_sqlite_normalize import read_sessions as _copilot_read_sessions

# A record the engine lands: the dense pass seq, the single-gate cid, the drawer text, the schema meta.
Record = dict
SourceCap = Callable[[str], Iterable[Record]]


def derive_cid(source_file: str, chunk_index: int) -> str:
    """The SINGLE cid gate: `sha256(source_file)_<chunk>` — FULL hex.

    `source_file` now carries a SESSION + SURFACE-qualified key (`_source_key`, e.g. `claude:<session>`
    or `claude:<parent>.<agentId>`), NOT the bare basename — so two sessions sharing a basename never
    collide (QA C3). The chunk ordinal disambiguates distinct turns of one source into distinct cids (no
    clobber); the same (source_file, chunk) re-derives the same cid (idempotent re-derivation). The
    turn-key rides metadata, not here — the cid names content-identity, the turn-key names the worldline
    binding. NOTE: the qualified key diverges from caller-vector-flush.ts's bare-basename drawerCid — the
    TS side carries the same cross-session collision and wants the same qualification (a parity fork)."""
    src_hash = hashlib.sha256(source_file.encode("utf-8")).hexdigest()
    return f"{src_hash}_{chunk_index}"


def _sha16(s: str) -> str:
    """A 16-hex content hash — the turn-key FALLBACK when a surface turn carries no native uuid
    (matches the CLI `sha` / `turnKeyOf`)."""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def _turn_key(source_file: str, turn: dict, chunk_index: int) -> str:
    """The user turn's stable identity — its native uuid, else a content-hash fallback (turnKeyOf port).
    The kapae cascade + the rewind detector key on this SAME formula, so one gone uuid closes every leg.
    The fallback FOLDS `chunk_index`: two no-uuid turns (Codex user turns / Copilot) that share the same
    ts + text-prefix would otherwise collapse to ONE key and kapae would mute both together — the ordinal
    (stable across re-runs) keeps distinct turns distinct while staying idempotent."""
    return turn.get("uuid") or _sha16(f"{source_file}#{chunk_index}#" + turn.get("ts", "") + turn.get("text", "")[:64])


def _source_key(surface: str, pointer: str) -> str:
    """A SESSION + SURFACE-qualified source key — the unit the cid, the content-hash chain, and the rewind
    detector all key on. The BARE basename COLLIDES across sessions: two parent sessions each spawn an
    `agent-aaa.jsonl`, two projects each hold a like-named rollout — conflating distinct turns under one
    cid + kapae unit. Qualifying by surface + the session identity (a Claude sub-agent by its PARENT
    session + agent-id, so distinct parents never collide) keeps every session's drawers disjoint."""
    base = os.path.basename(pointer)
    if base.endswith(".jsonl"):
        base = base[: -len(".jsonl")]
    if surface == "claude":
        agent_id = _claude_agent_id(pointer)
        if agent_id is not None:
            # …/<session>/subagents/agent-<id>.jsonl — the parent session dir disambiguates the sub-agent.
            parent = os.path.basename(os.path.dirname(os.path.dirname(pointer)))
            base = f"{parent}.{agent_id}" if parent else base
    return f"{surface}:{base}"


def _assemble_exchanges(turns: list) -> list:
    """The EXCHANGE-ASSEMBLER (readExchanges port): pair each user turn with the assistant response(s)
    that follow into ONE recall drawer — a bare "yes do it" or an answer shorn of its question recalls
    poorly. The user side carries a `>` quote prefix (the convo grain); orphans (a question with no
    answer, an answer with no question) flush alone. The paired drawer keeps the USER turn's uuid, so
    its turn-key names the exchange."""
    out: list = []
    q: dict | None = None
    for t in turns:
        if t["role"] == "user":
            if q is not None:
                out.append(q)                                     # a prior question never answered — flush alone
            q = {**t, "text": "> " + t["text"].replace("\n", "\n> ")}
        else:
            if q is not None:
                q = {**q, "text": q["text"] + "\n\n" + t["text"]}  # join the answer onto its question
                out.append(q)
                q = None
            else:
                out.append(t)                                      # an answer with no preceding question
    if q is not None:
        out.append(q)
    return out


def _drawers(source_file: str, turns: list, *, wing: str, room: str,
             extra: "dict | None" = None) -> Iterator[tuple]:
    """Yield (cid, text, metadata) per exchange — WITHOUT a seq (the caller assigns the dense pass seq,
    so a multi-session source runs one contiguous watermark). The metadata carries the schema floor
    (wing/room), the drawer provenance (source_file/chunk_index), the worldline binding (lar_turn_key),
    and `lar_chain` — a CONTENT-hash-chain (chain_i = sha16(text_i + chain_{i-1})) per source_file. The
    cid keys on source+index (content-INDEPENDENT), so an edited/truncated prefix keeps the same cid and
    is_landed would silently SKIP it; the chain binds each link to its text + predecessor, so a tampered
    prefix BREAKS the chain and a re-capture pass detects the rewind (worldline_observe.detect_rewind).
    `extra` folds in per-surface marks (lar_surface, lar_sidechain)."""
    prev_chain = ""
    for chunk, ex in enumerate(_assemble_exchanges(turns)):
        chain = _sha16(ex["text"] + prev_chain)   # each link binds its text + the predecessor's link
        prev_chain = chain
        meta = {
            "wing": wing,
            "room": room,
            "source_file": source_file,
            "chunk_index": chunk,
            "lar_turn_key": _turn_key(source_file, ex, chunk),
            "lar_chain": chain,
        }
        if extra:
            meta.update(extra)
        yield derive_cid(source_file, chunk), ex["text"], meta


def _seq_records(drawers: Iterable[tuple]) -> Iterator[Record]:
    """Stamp a DENSE 1-based pass seq onto each drawer — the drain-ledger's contiguous frontier (1..N)
    keys the trailing watermark, so a single running seq spans every source a pass reads."""
    for i, (cid, text, meta) in enumerate(drawers, start=1):
        yield {"seq": i, "cid": cid, "text": text, "metadata": meta}


# --- Claude Code -----------------------------------------------------------
# One session per `<slug>/<sessionId>.jsonl`; a sub-agent rides `<session>/subagents/agent-<id>.jsonl`.
# Each line carries `type` (user/assistant), `uuid`, `timestamp`, `sessionId`, `message` (text blocks).


def _claude_message_text(message) -> str:
    """Pull the readable text from a Claude message — a bare string or an array of `{type:text}` blocks
    (tool blocks drop from the recall text; the bearing leg reads them elsewhere)."""
    if isinstance(message, str):
        return message
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts = [b["text"] for b in content
             if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str)]
    return "\n".join(parts)


def _parse_claude(path: str) -> list:
    """Parse a Claude `.jsonl` transcript into turns (user/assistant only, non-empty text)."""
    turns: list = []
    # errors="replace": a lone non-UTF8 byte substitutes U+FFFD, never crashes the whole pass on one
    # line (matches structure_router's decode idiom); the bad line still JSON-parses or skips cleanly.
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            role = str(row.get("type", ""))
            if role not in ("user", "assistant"):
                continue
            text = _claude_message_text(row.get("message"))
            if not text.strip():
                continue
            turns.append({"uuid": str(row.get("uuid") or ""), "role": role,
                          "text": text, "ts": str(row.get("timestamp") or "")})
    return turns


def _claude_agent_id(path: str) -> "str | None":
    """Recover a sub-agent id from an `agent-<id>.jsonl` basename, else None (a main-session file)."""
    base = os.path.basename(path)
    if base.startswith("agent-") and base.endswith(".jsonl"):
        return base[len("agent-"):-len(".jsonl")]
    return None


def claude_source(*, wing: str, room: str = "conversations") -> SourceCap:
    """The Claude-Code source-cap. `pointer` names ONE transcript — a main session OR a sub-agent
    `agent-<id>.jsonl` (the parser eats both; a sub-agent file marks lar_sidechain)."""
    def source(pointer: str) -> Iterator[Record]:
        agent_id = _claude_agent_id(pointer)
        extra = {"lar_surface": "claude"}
        if agent_id is not None:
            extra.update({"lar_sidechain": 1, "lar_agent": agent_id})  # int, isomorphic with the TS stamp (Q3)
        yield from _seq_records(_drawers(_source_key("claude", pointer), _parse_claude(pointer),
                                         wing=wing, room=room, extra=extra))
    return source


# --- Codex -----------------------------------------------------------------
# One rollout per `~/.codex/sessions/**/rollout-<ts>-<uuid>.jsonl`; the transcript rides `response_item`
# lines whose `payload.type == "message"` and role ∈ {user, assistant} (developer/base-instructions skip).


def _codex_message_text(content) -> str:
    """Pull the text from a Codex message payload's `content` blocks (input_text / output_text)."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts = [b["text"] for b in content
             if isinstance(b, dict) and isinstance(b.get("text"), str)
             and b.get("type") in ("input_text", "output_text")]
    return "\n".join(parts)


def _parse_codex(path: str) -> list:
    """Parse a Codex rollout `.jsonl` into turns (message response_items, user/assistant only). An
    assistant message carries a stable `id`; a user message carries none (the turn-key falls back to
    the content hash)."""
    turns: list = []
    # errors="replace": one non-UTF8 byte never crashes the pass (matches _parse_claude / structure_router).
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("type") != "response_item":
                continue
            p = row.get("payload") or {}
            if p.get("type") != "message":
                continue
            role = str(p.get("role", ""))
            if role not in ("user", "assistant"):
                continue
            text = _codex_message_text(p.get("content"))
            if not text.strip():
                continue
            turns.append({"uuid": str(p.get("id") or ""), "role": role,
                          "text": text, "ts": str(row.get("timestamp") or "")})
    return turns


def codex_source(*, wing: str, room: str = "conversations") -> SourceCap:
    """The Codex source-cap. `pointer` names one rollout `.jsonl`."""
    def source(pointer: str) -> Iterator[Record]:
        yield from _seq_records(_drawers(_source_key("codex", pointer), _parse_codex(pointer),
                                         wing=wing, room=room, extra={"lar_surface": "codex"}))
    return source


# --- Copilot ---------------------------------------------------------------
# The Copilot CLI format DRIFTED: the per-session events.jsonl VANISHED (CLI 1.0.6x); the conversation
# now lives in the global SQLite store `~/.copilot/session-store.db`. This cap reads THAT store (via
# copilot_sqlite_normalize.read_sessions) — never the deleted events.jsonl (the green-in-disguise trap).


def copilot_source(*, wing: "str | None" = None, room: str = "conversations") -> SourceCap:
    """The Copilot source-cap. `pointer` names the SQLite store (`session-store.db`). One store holds
    MANY sessions — each rides its own `<session-id>.jsonl` source_file (distinct cids), all under ONE
    dense pass seq. Reads the SQLite ONLY (asserts nothing off events.jsonl)."""
    def source(pointer: str) -> Iterator[Record]:
        def all_drawers() -> Iterator[tuple]:
            for sid, cwd, turns in _copilot_read_sessions(pointer):
                w = wing or "wing_copilot_unsorted"
                yield from _drawers(f"copilot:{sid}", turns, wing=w, room=room,
                                    extra={"lar_surface": "copilot-cli"})
        yield from _seq_records(all_drawers())
    return source


# --- the surface dispatcher ------------------------------------------------

_SURFACES: dict = {
    "claude": claude_source,
    "codex": codex_source,
    "copilot": copilot_source,
}


def resolve_source(surface: str, *, wing: "str | None" = None, room: str = "conversations") -> SourceCap:
    """Compose the source-cap for a named surface (claude · codex · copilot). Copilot derives its wing
    per-session when none rides in; the file surfaces require an explicit wing (the schema floor)."""
    make = _SURFACES.get(surface)
    if make is None:
        raise ValueError(f"resolve_source: unknown surface {surface!r} (known: {sorted(_SURFACES)})")
    if surface == "copilot":
        return copilot_source(wing=wing, room=room)
    if not wing:
        raise ValueError(f"resolve_source[{surface}]: a wing is required (the schema floor)")
    return make(wing=wing, room=room)
