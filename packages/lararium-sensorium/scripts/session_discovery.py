"""session_discovery — the ONE local operator-AI chat discovery, shared by both island lanes.

Walks each surface's worldline root and returns rich entries: a pointer with its DERIVED wing (the
wing_derive law, so backfill wings equal the live-hook wings), its capture surface, whether it carries
a tasked-spirit sub-session, and any native session selector. The SOVEREIGN sweep and the GUEST
comparator mine both read THIS; each lane decides its own sink (the lar_* planes vs vanilla
~/.mempalace) and its own skip policy. No discovery code crosses the guest/sovereign wall.

Entry = {"pointer": str, "wing": str, "surface": str, "spirit": bool, "session_id": str | None}
"""
import os
import re

from wing_derive import read_codex_cwd, resolve_transcript_wing, scrape_wing, wing_from_dir

_CLAUDE_ROOT = os.path.expanduser("~/.claude/projects")
_CODEX_ROOT = os.path.expanduser("~/.codex/sessions")
_COPILOT_CLI_STORE = os.path.expanduser("~/.copilot/session-store.db")
#: The VS Code workspace-storage roots the Copilot Chat extension keeps its transcripts under.
_COPILOT_VSCODE_WS = (
    "~/.vscode-server/data/User/workspaceStorage",
    "~/.vscode-server-insiders/data/User/workspaceStorage",
    "~/.config/Code/User/workspaceStorage",
    "~/.config/Code - Insiders/User/workspaceStorage",
)

_CODEX_UNSORTED = "wing_codex_unsorted"
_COPILOT_UNSORTED = "wing_copilot_unsorted"
_SPIRIT_RE = re.compile(r"^agent-.*\.jsonl$")


def _entry(pointer, wing, surface, *, spirit=False, session_id=None):
    return {"pointer": pointer, "wing": wing, "surface": surface,
            "spirit": spirit, "session_id": session_id}


def _jsonls(dirpath):
    try:
        return sorted(f for f in os.listdir(dirpath) if f.endswith(".jsonl"))
    except OSError:
        return []


def _project_dir_wing(dir_name):
    """The no-cwd fallback: slug the project DIR name, so a cwd-less project still files apart rather
    than lumping into one bucket. Strip leading dashes, non-alnum -> `_`, lower."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", re.sub(r"^-+", "", dir_name)).lower()
    return f"wing_{slug or 'unsorted'}"


def discover_claude(project=None):
    """Every claude session under ~/.claude/projects, each filed under its project's wing (resolved
    from the recorded cwd via the first-sibling law; the dir-name slug when no cwd is recorded). A
    session's tasked-spirit transcripts live at `<session>/subagents/agent-*.jsonl` and file under
    `<wing>__spirits`, so a spirit's work never blurs into the operator's and the two populations stay
    countable apart."""
    out = []
    if not os.path.isdir(_CLAUDE_ROOT):
        return out
    if project:
        proj_dirs = [os.path.join(_CLAUDE_ROOT, project)]
    else:
        proj_dirs = [os.path.join(_CLAUDE_ROOT, d) for d in sorted(os.listdir(_CLAUDE_ROOT))
                     if os.path.isdir(os.path.join(_CLAUDE_ROOT, d))]
    for pdir in proj_dirs:
        sessions = _jsonls(pdir)
        if not sessions:
            continue
        wing = resolve_transcript_wing(os.path.join(pdir, sessions[0])) or _project_dir_wing(os.path.basename(pdir))
        spirit_wing = f"{wing}__spirits"
        for name in sessions:
            out.append(_entry(os.path.join(pdir, name), wing, "claude"))
            spirit_dir = os.path.join(pdir, name[: -len(".jsonl")], "subagents")
            if not os.path.isdir(spirit_dir):
                continue
            try:
                spirits = sorted(f for f in os.listdir(spirit_dir) if _SPIRIT_RE.match(f))
            except OSError:
                spirits = []
            for sname in spirits:
                out.append(_entry(os.path.join(spirit_dir, sname), spirit_wing, "claude", spirit=True))
    return out


def discover_codex():
    """Every codex rollout under ~/.codex/sessions, filed under the wing its recorded cwd names."""
    out = []
    if not os.path.isdir(_CODEX_ROOT):
        return out
    found = []
    for dirpath, _dirs, files in os.walk(_CODEX_ROOT):
        for f in files:
            if f.startswith("rollout-") and f.endswith(".jsonl"):
                found.append(os.path.join(dirpath, f))
    for pointer in sorted(found, key=lambda p: os.path.getmtime(p)):
        cwd = read_codex_cwd(pointer)
        wing = wing_from_dir(cwd) if cwd else _CODEX_UNSORTED
        out.append(_entry(pointer, wing, "codex"))
    return out


def discover_copilot_cli():
    """Every session in the Copilot CLI's ONE global SQLite store, each filed under the wing its
    recorded cwd names (canonical in the `sessions` row). The pointer is the store; the entry carries
    the native session selector so capture narrows to that one session."""
    out = []
    db = _COPILOT_CLI_STORE
    if not os.path.isfile(db):
        return out
    try:
        from copilot_sqlite_normalize import read_sessions
        rows = read_sessions(db)
    except Exception:  # noqa: BLE001 — a broken store reports nothing rather than a partial wing
        return out
    for sid, cwd, _turns in rows:
        if not sid:
            continue
        wing = wing_from_dir(cwd) if cwd else _COPILOT_UNSORTED
        out.append(_entry(db, wing, "copilot", session_id=sid))
    return out


def discover_copilot_vscode():
    """Every VS Code Copilot Chat transcript, filed under the wing scraped from its tool-call paths
    (the transcripts carry no cwd)."""
    out = []
    for ws in _COPILOT_VSCODE_WS:
        wsp = os.path.expanduser(ws)
        if not os.path.isdir(wsp):
            continue
        for h in sorted(os.listdir(wsp)):
            tdir = os.path.join(wsp, h, "GitHub.copilot-chat", "transcripts")
            if not os.path.isdir(tdir):
                continue
            for name in sorted(f for f in os.listdir(tdir) if f.endswith(".jsonl")):
                f = os.path.join(tdir, name)
                out.append(_entry(f, scrape_wing(f) or _COPILOT_UNSORTED, "copilot-vscode"))
    return out


#: The surfaces a full sweep walks when none is named — every local operator-AI chat source on the
#: machine. Copilot CLI rides its ONE store threaded per-session; the rest are file-backed worldlines.
ALL_SURFACES = ("claude", "codex", "copilot", "copilot-vscode")

_DISCOVER = {
    "claude": discover_claude,
    "codex": discover_codex,
    "copilot": discover_copilot_cli,
    "copilot-vscode": discover_copilot_vscode,
}


def discover(surface, *, project=None):
    """The rich entries for one surface (`claude` narrows by `project`; the rest ignore it)."""
    fn = _DISCOVER.get(surface)
    if fn is None:
        raise ValueError(f"session_discovery: surface {surface!r} unknown (known: {sorted(_DISCOVER)})")
    return fn(project) if surface == "claude" else fn()


def discover_all(project=None):
    """Every surface folded, claude narrowed by `project` when given."""
    out = []
    for surface in ALL_SURFACES:
        out.extend(discover(surface, project=project) if surface == "claude" else discover(surface))
    return out


def run_bulk_sweep(capture_fn, *, surface="all", default_wing, project=None, limit=None,
                   room="conversations"):
    """The ONE bulk-sweep loop BOTH island lanes drive — the sovereign daemon holder
    (`CaptureSessionServer.sweep`) and the standalone MCP coordinator (`LaresCoordinator.sweep`) each pass
    their OWN warm stream's `.capture` as `capture_fn`, so the routing + ephemeral gate + tally live in
    ONE place and can never diverge (a daemon-DOWN re-pour captures identically to a daemon-UP one).

    Folds `ALL_SURFACES` (or the named `surface`), discovers each via `discover`, SKIPS a scratch/marked
    session (the `ephemeral.session_ephemeral` gate, one loud stderr line each), and per live entry calls
    `capture_fn(pointer, surface=e['surface'], wing=(e['wing'] or default_wing), room=room[, session_id])`.
    Each session files under its OWN per-project wing (the wing_derive law, so backfill wings equal the
    live-hook wings); `default_wing` rides only as the fallback for a cwd-less source; tasked-spirit
    sub-sessions land in `<wing>__spirits` and count into `spirits`. `session_id` rides ONLY when the entry
    carries one (copilot's ONE store narrows to that session). Idempotent: already-landed turns skip. A
    `ContentFloorError` fails LOUD (systemic — a wrong embedder poisons every session); any other
    per-session failure SKIPS to `failed` (one unreadable session never aborts the sweep). Returns the
    tally dict `{wing, sessions, landed, skipped, ephemeral, spirits, by_surface, failed}`; each lane
    stamps its own `embedder_model`/`root` and arms its own derived cadences."""
    import sys

    from content_io import ContentFloorError
    from ephemeral import session_ephemeral
    if not default_wing:
        raise ValueError("run_bulk_sweep requires a non-empty default_wing (the fallback for a cwd-less source)")
    surfaces = ALL_SURFACES if surface == "all" else (surface,)
    out: dict = {"wing": default_wing, "sessions": 0, "landed": 0, "skipped": 0,
                 "ephemeral": 0, "spirits": 0, "by_surface": {}, "failed": []}
    for surf in surfaces:
        entries = discover(surf, project=project)
        if limit is not None:
            entries = entries[: int(limit)]
        s_landed = s_skipped = s_eph = 0
        for e in entries:
            reason = session_ephemeral(e["pointer"])
            if reason is not None:                # a scratch/marked session never enters the rhizome
                s_eph += 1
                sys.stderr.write(f"[sweep] SKIP ephemeral {e['pointer']}: {reason}\n")
                continue
            cap_kwargs = {"surface": e["surface"], "wing": e["wing"] or default_wing, "room": room}
            if e.get("session_id"):               # copilot's ONE store narrows to this session
                cap_kwargs["session_id"] = e["session_id"]
            try:
                summary = capture_fn(e["pointer"], **cap_kwargs)
            except ContentFloorError:
                raise                          # systemic — a wrong embedder poisons every session; fail loud
            except Exception as exc:  # noqa: BLE001 — one unreadable session never aborts the sweep
                out["failed"].append({"surface": surf, "pointer": e["pointer"],
                                      "error": f"{type(exc).__name__}: {exc}"})
                continue
            out["sessions"] += 1
            if e["spirit"]:
                out["spirits"] += 1
            s_landed += int(summary.get("landed") or 0)
            s_skipped += int(summary.get("skipped") or 0)
        out["ephemeral"] += s_eph
        out["by_surface"][surf] = {"entries": len(entries), "landed": s_landed,
                                   "skipped": s_skipped, "ephemeral": s_eph}
        out["landed"] += s_landed
        out["skipped"] += s_skipped
    return out
