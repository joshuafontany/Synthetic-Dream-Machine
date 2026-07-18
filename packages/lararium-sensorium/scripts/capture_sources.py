"""capture_sources — the multi-surface SOURCE-CAP family that LIGHTS the capture engine.

The engine (capture_stream.Pipeline) drives a source-cap: `callable(pointer) -> iterable of records
{seq, cid, text, metadata}`. This module supplies ONE cap per surface — **Claude Code · Codex ·
Copilot** each reading its native transcript into the engine's record grain, plus the **curated
human-text corpus** cap (markdown/text trees — the test-bed ground). The engine's crash-safe
re-derivation makes BULK and LIVE the SAME cap over one pointer: a re-pass re-reads the whole (growing)
source, is_landed skips the already-durable prefix, only the fresh tail lands. Main and sub-agent
sessions ride the same cap (a sub-agent transcript reads through the same parser, marked by surface).

THE ATOM GRAIN. A source reads as a stream of typed ATOMS, not merged exchanges: each content-block
lands 1:1, carrying WHO authored the bytes (`lar_speaker`) × WHAT MOVE it carries (`lar_move`). The
operator's steering, the agent's surface/thinking/action, and the harness's result/scaffold each ride
as their own atom — so content keeps the operator/agent boundary the eidetic ground demands, and recall
pairs atoms into exchanges as a derived VIEW. The three native encodings normalize into this one grain:
Claude's DAG-linked JSONL and Codex's flat response_items already atomize per message; Copilot's SQLite
`turns` row splits its user_message ⊥ assistant_response columns into two atoms.

THE SINGLE CID GATE. ONE derivation mints every atom id: `cid = sha256(source_file)_<chunk_index>`, FULL
sha256 hex, matching `caller-vector-flush.ts`'s `drawerCid`. The `chunk_index` (the per-source atom
ordinal) makes distinct same-source atoms derive DISTINCT cids — so none clobbers another under a shared
key. Two identity keys ride METADATA, never the cid (the address stays pure content-identity): the
`lar_turn_key` (the heading operator atom, worldline binding + kapae cascade) and the `lar_atom_key`
(this atom's own identity, the dedup key across a re-carry). Idempotent by construction: the same
(source_file, chunk) re-derives the same cid.

Meme: lar:///ha.ka.ba/lararium/sensorium/capture-sources
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Callable, Iterable, Iterator

from copilot_sqlite_normalize import read_sessions as _copilot_read_sessions
from copilot_vscode_normalize import normalize as _normalize_copilot_vscode

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
    # The daemon may hand a stable staged filename (`claude__<session>.jsonl`)
    # while a direct source-stream pass sees `<session>.jsonl`. Staging belongs
    # to ingress, never to identity: collapse the spelling before CID derivation.
    prefix = f"{surface}__"
    if base.startswith(prefix):
        base = base[len(prefix):]
    if surface == "claude":
        agent_id = _claude_agent_id(pointer)
        if agent_id is not None:
            # …/<session>/subagents/agent-<id>.jsonl — the parent session dir disambiguates the sub-agent.
            parent = os.path.basename(os.path.dirname(os.path.dirname(pointer)))
            base = f"{parent}.{agent_id}" if parent else base
    return f"{surface}:{base}"


def _atom_key(source_file: str, atom: dict, chunk_index: int) -> str:
    """THIS atom's stable identity — the DEDUP key across a re-carry. A native uuid folds the block
    ordinal (`bi`), so two atoms from one message (a thinking block + its utterance share the record's
    uuid) still get DISTINCT keys, while a resumed transcript re-carries each atom under the SAME
    key (uuid + bi stay stable across the resume). A surface with no native id (a Codex user message,
    a Copilot column) falls back to a source+chunk-folded content hash — distinct atoms stay distinct."""
    uuid = atom.get("uuid")
    if uuid:
        return f"{uuid}#{atom.get('bi', 0)}"
    return _sha16(f"{source_file}#{chunk_index}#" + atom.get("ts", "") + (atom.get("text") or "")[:64])


def _atoms(source_file: str, atoms: list, *, wing: str, room: str,
           extra: "dict | None" = None) -> Iterator[tuple]:
    """Yield (cid, text, metadata) per ATOM — content's 1:1 grain, NO exchange merge. The operator's
    steering and the agent's surface land as DISTINCT atoms, each its own cid; recall pairs them into
    exchanges as a derived VIEW (grouped by lar_turn_key), so the operator's steering stays its own
    recallable speaker instead of fusing into the agent's stream the way a merged drawer fused them.

    Each atom carries: `lar_speaker`/`lar_move` (the taxonomy axes — who authored the bytes, what move
    they carry); `lar_atom_key` (this atom's identity, the dedup key across a re-carry); `lar_turn_key`
    (the turn it HEADS — an operator atom — or JOINS — the atoms that follow, until the next operator
    atom; the exchange-view groups on it, the kapae cascade mutes on it); `lar_parent` (the source DAG
    link, e.g. Claude's parentUuid, the view may walk); `lar_chain` (the per-source content-hash chain —
    an edited prefix keeps its content-INDEPENDENT cid but BREAKS the chain, so a re-capture detects the
    rewind). An atom carrying a bare `role` but no (speaker, move) — a surface with no block detail, e.g.
    a Copilot column — gets classified here. The caller assigns the dense pass seq; `extra` folds in the
    per-surface marks (lar_surface, lar_sidechain)."""
    prev_chain = ""
    turn_key = ""
    for chunk, a in enumerate(atoms):
        text = a.get("text") or ""
        speaker, move = a.get("speaker"), a.get("move")
        if speaker is None or move is None:
            speaker, move = _classify(str(a.get("role", "")), text)
        atom_key = _atom_key(source_file, a, chunk)
        # An operator atom HEADS a new turn; the atoms after it inherit its turn-key. A session opening
        # on agent/harness atoms (no operator yet) lets the first atom head, so nothing rides keyless.
        if speaker == "operator" or not turn_key:
            turn_key = _turn_key(source_file, a, chunk) if speaker == "operator" else atom_key
        chain = _sha16(text + prev_chain)   # each link binds its text + the predecessor's link
        prev_chain = chain
        meta = {
            "wing": wing,
            "room": room,
            "source_file": source_file,
            "chunk_index": chunk,
            "lar_turn_key": turn_key,
            "lar_atom_key": atom_key,
            "lar_parent": a.get("parent") or "",
            "lar_chain": chain,
            # AI-operator chat IS native memetic-wikitext — a turn that invokes no sigil holds a
            # DEGRADED state of the same grammar, never a foreign one. One stamp lets the structure
            # plane parse it down the graceful gradient rather than skip it for want of an extension.
            "lar_kind": "memetic-wikitext",
            # The taxonomy axes + the volume the move sounds at. Content holds every move (eidetic
            # ground); a derived plane reads the loud voices (steering + surface) without the murmur.
            "lar_speaker": speaker,
            "lar_move": move,
            "lar_stratum": _MOVE_STRATUM.get(move, "authored"),
            "lar_volume": _MOVE_VOLUME.get(move, "normal"),
        }
        if extra:
            meta.update(extra)
        yield derive_cid(source_file, chunk), text, meta


def _seq_records(drawers: Iterable[tuple]) -> Iterator[Record]:
    """Stamp a DENSE 1-based pass seq onto each drawer — the drain-ledger's contiguous frontier (1..N)
    keys the trailing watermark, so a single running seq spans every source a pass reads."""
    for i, (cid, text, meta) in enumerate(drawers, start=1):
        yield {"seq": i, "cid": cid, "text": text, "metadata": meta}


# --- Claude Code -----------------------------------------------------------
# One session per `<slug>/<sessionId>.jsonl`; a sub-agent rides `<session>/subagents/agent-<id>.jsonl`.
# Each line carries `type` (user/assistant), `uuid`, `timestamp`, `sessionId`, `message` (text blocks).


# The atom taxonomy — WHO authored the bytes × WHAT MOVE the atom carries. A source reads as a stream
# of typed atoms; content holds each 1:1 (eidetic ground), and recall pairs them into exchanges as a
# derived VIEW, so the operator's steering rides as its own recallable speaker rather than fusing into
# the agent's stream the way a merged drawer fused them.
#   speaker: operator (the human hand) · agent (the Lares) · harness (the machinery — it injects
#            tool-results, caveats, notifications on the `user` channel, but no human authored them)
#   move:    steering (an operator directive) · surface (the agent's uttered text) · thinking (the
#            agent's inner speech) · action (an agent tool-call) · result (a harness tool-return) ·
#            scaffold (harness boilerplate — caveats, reminders, IDE marks)
# Content keeps every move (nothing drops); VOLUME marks how loudly each sounds, so a derived plane
# reads the loud voices (steering + surface) without the low murmur beneath.
_MOVE_VOLUME = {
    "steering": "normal", "surface": "normal",
    "thinking": "low", "action": "low", "result": "low", "scaffold": "low",
}
# The coarse stratum a move rolls up to — provenance only (the derived plane reads by VOLUME above,
# never this). Kept so a reader of lar_stratum still resolves.
_MOVE_STRATUM = {
    "steering": "authored", "surface": "authored",
    "thinking": "thinking", "action": "action", "result": "harness", "scaffold": "harness",
}

# Harness-injected openers. These arrive on the `user` role but no operator authored them; left
# unmarked they would manufacture the corpus's strongest false structural recurrence (one opener
# repeats hundreds of times).
_HARNESS_OPENERS = (
    "<task-notification>", "<local-command-caveat>", "<command-name>", "<command-message>",
    "<local-command-stdout>", "<ide_opened_file>", "<ide_selection>", "<bash-input>",
    "<bash-stdout>", "<system-reminder>",
    "[Request interrupted by user]", "[Request interrupted by user for tool use]",
    "Caveat: The messages below were generated by the user while running local commands.",
    "This session is being continued from a previous conversation",
    # The Codex/agentic openers — machine text arriving on the user channel across every session, so left
    # authored they manufacture the corpus's loudest false recurrence (one preamble repeats hundreds of
    # times). `<turn_aborted>` marks an interrupt; `<environment_context>` injects the cwd/shell; the
    # `# AGENTS.md` preamble carries the boot instructions into every Codex turn.
    "<turn_aborted>", "<environment_context>", "# AGENTS.md instructions",
)


def _render_tool_use(b: dict) -> str:
    """An agent ACTION atom's verbatim — the tool name + its input args (the move the agent took)."""
    name = b.get("name") or "?"
    inp = b.get("input")
    try:
        args = json.dumps(inp, ensure_ascii=False)
    except (TypeError, ValueError):
        args = str(inp)
    return f"{name}({args})"


def _render_tool_result(b: dict) -> str:
    """A harness RESULT atom's verbatim — the tool return, a bare string or joined text blocks."""
    c = b.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(x["text"] for x in c
                         if isinstance(x, dict) and isinstance(x.get("text"), str))
    return "" if c is None else str(c)


def _claude_blocks(rtype: str, message) -> Iterator[tuple]:
    """Yield (speaker, move, text, bi) atoms from one Claude message, in document order — `bi` names the
    block ordinal within the record (stable across a re-carry), so atoms sharing the record's uuid still
    get distinct atom-keys. A user record's content is a bare string (operator steering, unless a harness
    opener) or a list mixing text (operator steering) and tool_result (harness result); an assistant
    record's content lists text (agent surface), thinking (agent inner speech), and tool_use (agent
    action) blocks. Thinking precedes the utterance it thought toward, in its native block order."""
    content = message.get("content") if isinstance(message, dict) else message
    if isinstance(content, str):
        speaker, move = _classify("user", content) if rtype == "user" else ("agent", "surface")
        yield speaker, move, content, 0
        return
    if not isinstance(content, list):
        return
    for bi, b in enumerate(content):
        if not isinstance(b, dict):
            continue
        t = b.get("type")
        if t == "text" and isinstance(b.get("text"), str):
            speaker, move = _classify("user", b["text"]) if rtype == "user" else ("agent", "surface")
            yield speaker, move, b["text"], bi
        elif t == "thinking" and isinstance(b.get("thinking"), str):
            yield "agent", "thinking", b["thinking"], bi
        elif t == "tool_use":
            yield "agent", "action", _render_tool_use(b), bi
        elif t == "tool_result":
            yield "harness", "result", _render_tool_result(b), bi


def _classify(role: str, text: str) -> tuple:
    """The (speaker, move) of a bare role+text turn — SURFACE-AGNOSTIC, the fallback for a surface with
    no block-level detail (a Copilot user_message / assistant_response column). A `user`-channel turn
    opening with a harness marker carries machine text, never the operator's hand (the channel says
    `user`, the speaker says harness). The markers repeat identically across Claude · Codex · Copilot,
    so one opener-set classifies them all — a surface that never ran this left its boilerplate authored."""
    if role == "user":
        if text.lstrip().startswith(_HARNESS_OPENERS):
            return "harness", "scaffold"
        return "operator", "steering"
    if role == "assistant":
        return "agent", "surface"
    return "harness", "scaffold"


def _parse_claude(path: str) -> list:
    """Parse a Claude `.jsonl` transcript into ATOMS — one per message content-block, each carrying its
    speaker and move (operator steering · agent surface/thinking/action · harness result/scaffold), its
    record uuid + block ordinal, and the parentUuid DAG link."""
    atoms: list = []
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
            rtype = str(row.get("type", ""))
            if rtype not in ("user", "assistant"):
                continue
            uuid = str(row.get("uuid") or "")
            parent = str(row.get("parentUuid") or "")
            ts = str(row.get("timestamp") or "")
            for speaker, move, text, bi in _claude_blocks(rtype, row.get("message")):
                if not text.strip():
                    continue
                atoms.append({"uuid": uuid, "bi": bi, "parent": parent, "speaker": speaker,
                              "move": move, "text": text, "ts": ts})
    return atoms


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
        yield from _seq_records(_atoms(_source_key("claude", pointer), _parse_claude(pointer),
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


def _codex_reasoning_text(p: dict) -> str:
    """Plaintext reasoning from a Codex `reasoning` item — its summary blocks and any content; the
    encrypted_content stays opaque (skipped). Often empty → the atom drops upstream."""
    parts: list = []
    for field in ("summary", "content"):
        v = p.get(field)
        if isinstance(v, str):
            parts.append(v)
        elif isinstance(v, list):
            parts += [b.get("text", "") for b in v
                      if isinstance(b, dict) and isinstance(b.get("text"), str)]
    return "\n".join(x for x in parts if x)


def _render_codex_call(p: dict) -> str:
    """An agent ACTION atom's verbatim across the Codex tool payloads — function_call (name+arguments),
    custom_tool_call (name+input), web_search_call (the search action)."""
    if p.get("type") == "web_search_call":
        return f"web_search({json.dumps(p.get('action'), ensure_ascii=False)})"
    name = p.get("name") or "?"
    args = p.get("arguments")
    if args is None:
        args = p.get("input") or ""
    if not isinstance(args, str):
        try:
            args = json.dumps(args, ensure_ascii=False)
        except (TypeError, ValueError):
            args = str(args)
    return f"{name}({args})"


def _parse_codex(path: str) -> list:
    """Parse a Codex rollout `.jsonl` into ATOMS. A `response_item` payload maps to the taxonomy: a
    message (user→operator/steering · assistant→agent/surface · developer→harness/scaffold), a reasoning
    item (agent/thinking), a function_call / custom_tool_call / web_search_call (agent/action), a
    *_output (harness/result). A user message and the tool items often carry no native id → a content-hash
    atom-key. Codex atoms carry no per-record block split (bi stays 0; each item is one atom)."""
    atoms: list = []
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
            pt = p.get("type")
            ts = str(row.get("timestamp") or "")
            iid = str(p.get("id") or p.get("call_id") or "")
            if pt == "message":
                role = str(p.get("role", ""))
                text = _codex_message_text(p.get("content"))
                if role == "developer":
                    speaker, move = "harness", "scaffold"
                elif role == "user":
                    speaker, move = _classify("user", text)
                elif role == "assistant":
                    speaker, move = "agent", "surface"
                else:
                    continue
            elif pt == "reasoning":
                text, (speaker, move) = _codex_reasoning_text(p), ("agent", "thinking")
            elif pt in ("function_call", "custom_tool_call", "web_search_call"):
                text, (speaker, move) = _render_codex_call(p), ("agent", "action")
            elif pt in ("function_call_output", "custom_tool_call_output"):
                out = p.get("output")
                text = out if isinstance(out, str) else ("" if out is None else json.dumps(out, ensure_ascii=False))
                speaker, move = "harness", "result"
            else:
                continue
            if not text.strip():
                continue
            atoms.append({"uuid": iid, "bi": 0, "parent": "", "speaker": speaker,
                          "move": move, "text": text, "ts": ts})
    return atoms


def codex_source(*, wing: str, room: str = "conversations") -> SourceCap:
    """The Codex source-cap. `pointer` names one rollout `.jsonl`."""
    def source(pointer: str) -> Iterator[Record]:
        yield from _seq_records(_atoms(_source_key("codex", pointer), _parse_codex(pointer),
                                         wing=wing, room=room, extra={"lar_surface": "codex"}))
    return source


# --- Copilot ---------------------------------------------------------------
# The Copilot CLI format DRIFTED: the per-session events.jsonl VANISHED (CLI 1.0.6x); the conversation
# now lives in the global SQLite store `~/.copilot/session-store.db`. This cap reads THAT store (via
# copilot_sqlite_normalize.read_sessions) — never the deleted events.jsonl (the green-in-disguise trap).


def copilot_source(*, wing: "str | None" = None, room: str = "conversations",
                   session_id: "str | None" = None) -> SourceCap:
    """The Copilot source-cap. `pointer` names the SQLite store (`session-store.db`). One store holds
    MANY sessions — each rides its own `<session-id>.jsonl` source_file (distinct cids), all under ONE
    dense pass seq. Reads the SQLite ONLY (asserts nothing off events.jsonl)."""
    def source(pointer: str) -> Iterator[Record]:
        def all_drawers() -> Iterator[tuple]:
            for sid, cwd, turns in _copilot_read_sessions(pointer):
                if session_id is not None and sid != session_id:
                    continue
                w = wing or "wing_copilot_unsorted"
                yield from _atoms(f"copilot:{sid}", turns, wing=w, room=room,
                                    extra={"lar_surface": "copilot-cli"})
        yield from _seq_records(all_drawers())
    return source


def _parse_copilot_vscode(pointer: str) -> tuple[str, list]:
    """Read one VS Code event stream natively, without a JSONL staging rewrite.

    The event stream's session.start supplies the stable source identity.  A
    malformed or truncated event is delegated to the established pure adapter
    and skipped there; its prose rows retain their native event ids and times.
    """
    try:
        with open(pointer, encoding="utf-8", errors="replace") as fh:
            rows = list(_normalize_copilot_vscode(fh))
    except OSError:
        return "", []
    session_id = next((str(row.get("sessionId")) for row in rows if row.get("sessionId")), "")
    turns = [
        {
            "uuid": str(row.get("uuid") or ""),
            "role": str(row.get("type") or ""),
            "text": str((row.get("message") or {}).get("content") or ""),
            "ts": str(row.get("timestamp") or ""),
        }
        for row in rows
        if row.get("type") in ("user", "assistant")
    ]
    return session_id, turns


def copilot_vscode_source(*, wing: str, room: str = "conversations") -> SourceCap:
    """The VS Code Copilot source-cap. Its event stream remains native through Python.

    The filename is only a last-resort identity when a damaged stream lacks its
    session.start record; normal streams key on the authored session id.
    """
    def source(pointer: str) -> Iterator[Record]:
        session_id, turns = _parse_copilot_vscode(pointer)
        source_file = f"copilot-vscode:{session_id}" if session_id else _source_key("copilot-vscode", pointer)
        yield from _seq_records(_atoms(source_file, turns, wing=wing, room=room,
                                         extra={"lar_surface": "copilot-vscode"}))
    return source


# --- curated human-text corpus (the RUN-arc test-bed surface) ---------------
# Reads a directory tree (or an os.pathsep-joined list of trees/files) of markdown/
# text files — the ephemeral human-text test-bed's frozen ground (RUN-ARC #2). Each
# file lands as ONE record riding the same single-cid-gate + chain discipline as the
# AI surfaces, so the rewind guard + kapae legs cover a re-curated corpus too.

# The human-text extensions this cap eats; other kinds (code/json/toml) wait for a
# later arc — the test-bed proves the rails on prose-rich memes. `.mem` carries the
# memetic-wikitext memes (the registered carrier extension) — the corpus of the house
# rides it, and a filter without it silently empties every meme bed.
_CORPUS_EXTS = (".md", ".markdown", ".txt", ".text", ".mem", ".tid")
# One file lands as one record; a file past this ceiling skips (a curated corpus
# holds prose memes, never blobs).
_CORPUS_MAX_BYTES = 512_000
# Directories that carry no curated-corpus signal (mirrors structure_router._SKIP_DIRS).
_CORPUS_SKIP_DIRS = {".git", "node_modules", "dist", "__pycache__", ".venv"}


def _mtime_sighting(path: str) -> str:
    """The file's host mtime as a SIGHTING — an unreliable-witness provenance mark under
    no-global-now (island clocks skew): it never orders anything, never rides a worldline
    path; the cid + chain carry the identity, this only testifies when the host saw the file."""
    import datetime

    try:
        ts = os.stat(path).st_mtime
    except OSError:
        return ""
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).isoformat()


def _iter_corpus_files(pointer: str) -> Iterator[tuple]:
    """Yield (source_key_path, abs_path) over the pointer's roots, SORTED for a stable
    dense seq across re-runs. `pointer` names one or more os.pathsep-joined paths; a
    directory walks recursively (skip-dirs pruned), a file rides alone. The key path =
    `<root-basename>/<relpath>` — stable across machines (never an absolute path). Two
    roots whose key paths collide FAIL LOUD (designation carries authority; a silent
    merge would fuse two distinct files under one cid)."""
    seen: dict = {}
    for root in pointer.split(os.pathsep):
        root = root.strip()
        if not root:
            continue
        if os.path.isfile(root):
            candidates = [(os.path.basename(root), root)]
        else:
            candidates = []
            for dirpath, dirnames, filenames in os.walk(root):
                dirnames[:] = sorted(d for d in dirnames
                                     if d not in _CORPUS_SKIP_DIRS and not d.startswith("."))
                for fn in sorted(filenames):
                    fp = os.path.join(dirpath, fn)
                    rel = os.path.relpath(fp, root)
                    candidates.append((os.path.join(os.path.basename(root.rstrip(os.sep)), rel), fp))
        for key_path, fp in sorted(candidates):
            if os.path.splitext(fp)[1].lower() not in _CORPUS_EXTS:
                continue
            prior = seen.get(key_path)
            if prior is not None and prior != fp:
                raise ValueError(
                    f"corpus_source: source-key collision — {key_path!r} names both "
                    f"{prior!r} and {fp!r}; point at roots whose basename+relpath stay disjoint")
            if prior is None:
                seen[key_path] = fp
                yield key_path, fp


def corpus_source(*, wing: str, room: str = "corpus") -> SourceCap:
    """The curated human-text corpus source-cap. One file → one record: cid rides the
    single gate (`derive_cid('corpus:<key-path>', 0)`), `lar_chain` binds the text (an
    edited file keeps its cid, breaks its chain → the rewind guard re-lands, never
    silent-skips), `lar_kind` carries the structure-router kind so the structure plane
    parses without re-sniffing, and the host mtime rides the sighting register only."""
    from structure_router import detect_kind  # kind-detection borrowed (RUN-ARC #2); module import stays light

    def source(pointer: str) -> Iterator[Record]:
        def all_drawers() -> Iterator[tuple]:
            for key_path, fp in _iter_corpus_files(pointer):
                try:
                    if os.path.getsize(fp) > _CORPUS_MAX_BYTES:
                        continue
                    with open(fp, encoding="utf-8", errors="replace") as fh:
                        text = fh.read()
                except OSError:
                    continue
                if not text.strip():
                    continue
                source_file = f"corpus:{key_path}"
                chain = _sha16(text)  # a one-link chain: the file IS the whole source
                meta = {
                    "wing": wing,
                    "room": room,
                    "source_file": source_file,
                    "chunk_index": 0,
                    "lar_turn_key": _turn_key(source_file, {"text": text}, 0),
                    "lar_chain": chain,
                    "lar_surface": "corpus",
                    "lar_kind": detect_kind(fp, text) or "",
                    "lar_mtime_sighting": _mtime_sighting(fp),
                }
                yield derive_cid(source_file, 0), text, meta

        landed = 0
        for rec in _seq_records(all_drawers()):
            landed += 1
            yield rec
        if landed == 0:
            # A named corpus yielding nothing refuses LOUD — a silent empty bed
            # builds "successfully" and reads as a finding downstream.
            raise SystemExit(
                f"corpus_source: the corpus at {pointer!r} yielded ZERO records — "
                f"wrong path, or every file filtered (exts {_CORPUS_EXTS}, "
                f"ceiling {_CORPUS_MAX_BYTES} bytes). Name a corpus that holds "
                "records, or stop."
            )
    return source


def corpus_sectioned_source(*, wing: str, room: str = "corpus", extract: bool = False) -> SourceCap:
    """The SECTIONED corpus source-cap — one record per wa/section per logical source,
    the chunk ordinal carrying the section index (`derive_cid('corpus:<source>', n)`):
    the grain the cid gate reserved for exactly this.

    `kumulipo_sections.section_corpus_file` names the cut: a known meme splits at its
    OWN native wa markers into one or more logical sources (the Beckwith carrier yields
    both its translation AND the Kalakaua appendix under `corpus:kumulipo/kalakaua-appendix`);
    a file no rule names lands whole at chunk 0 (the plain corpus grain).

    THE DUAL-RUN ABLATION RIDES `extract`: wrapped mode (default) sections the memetic
    wikitext as it stands AND stamps `lar_kind` off the WHOLE carrier text — the sigil
    envelope keeps routing the sections to the memetic grammar, as a whole-file capture
    would; extracted mode sections the `#source-text` interior only and stamps the kind
    off each bare section. Same marker boundaries, same cids both modes — the beds hold
    aligned units and the sweep delta reads the red channel alone.

    Every record keeps the corpus disciplines: `lar_chain` links each section to its
    predecessor within its logical source (a re-cut breaks the chain, the rewind guard
    re-lands), the host mtime rides the sighting register only, and two files claiming
    one logical source fail LOUD (designation carries authority)."""
    from structure_router import detect_kind
    from kumulipo_sections import extract_source_text, section_corpus_file

    mode = "extracted" if extract else "wrapped"

    def source(pointer: str) -> Iterator[Record]:
        def all_drawers() -> Iterator[tuple]:
            claimed: dict = {}
            for key_path, fp in _iter_corpus_files(pointer):
                try:
                    if os.path.getsize(fp) > _CORPUS_MAX_BYTES:
                        continue
                    with open(fp, encoding="utf-8", errors="replace") as fh:
                        text = fh.read()
                except OSError:
                    continue
                if not text.strip():
                    continue
                logical = section_corpus_file(os.path.basename(fp), text, extract=extract)
                if logical is None:
                    body = extract_source_text(text) if extract else text
                    logical = [{"source": key_path, "sections": [("whole", body)]}]
                sighting = _mtime_sighting(fp)
                for src in logical:
                    name = src["source"]
                    prior = claimed.get(name)
                    if prior is not None and prior != fp:
                        raise ValueError(
                            f"corpus_sectioned_source: logical source {name!r} claimed by both "
                            f"{prior!r} and {fp!r} — one rendering keeps one carrier")
                    claimed[name] = fp
                    source_file = f"corpus:{name}"
                    prev_chain = ""
                    for chunk, (label, body) in enumerate(src["sections"]):
                        if not body.strip():
                            continue
                        chain = _sha16(body + prev_chain)   # each section binds its text + predecessor
                        prev_chain = chain
                        meta = {
                            "wing": wing,
                            "room": room,
                            "source_file": source_file,
                            "chunk_index": chunk,
                            "lar_turn_key": _turn_key(source_file, {"text": body}, chunk),
                            "lar_chain": chain,
                            "lar_surface": "corpus",
                            # Wrapped: the carrier's whole text picks the grammar (the sigil
                            # envelope routes every section memetic); extracted: the bare
                            # section picks its own — the ablation's single code asymmetry.
                            # An extracted body the sniffer abstains on still IS text — the
                            # sectioner pulled it out of #source-text by construction, so the
                            # designation falls to prose rather than a kindless silent skip
                            # (bare verse under a .mem path landed structure-less otherwise).
                            "lar_kind": (detect_kind(fp, text) or "") if not extract
                                        else (detect_kind(fp, body) or "prose"),
                            "lar_mtime_sighting": sighting,
                            "lar_section": label,
                            "lar_section_mode": mode,
                        }
                        yield derive_cid(source_file, chunk), body, meta
        yield from _seq_records(all_drawers())
    return source


# --- the surface dispatcher ------------------------------------------------

_SURFACES: dict = {
    "claude": claude_source,
    "codex": codex_source,
    "copilot": copilot_source,
    "copilot-vscode": copilot_vscode_source,
    "corpus": corpus_source,
}


def resolve_source(surface: str, *, wing: "str | None" = None, room: str = "conversations",
                   session_id: "str | None" = None) -> SourceCap:
    """Compose a named source-cap. SQLite Copilot may derive its wing per session; every file surface
    (including VS Code Copilot) requires the caller's explicit wing."""
    make = _SURFACES.get(surface)
    if make is None:
        raise ValueError(f"resolve_source: unknown surface {surface!r} (known: {sorted(_SURFACES)})")
    if surface == "copilot":
        return copilot_source(wing=wing, room=room, session_id=session_id)
    if not wing:
        raise ValueError(f"resolve_source[{surface}]: a wing is required (the schema floor)")
    return make(wing=wing, room=room)
