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

from wing_derive import read_codex_cwd, resolve_transcript_wing, wing_from_dir

_CLAUDE_ROOT = os.path.expanduser("~/.claude/projects")
_CODEX_ROOT = os.path.expanduser("~/.codex/sessions")

_CODEX_UNSORTED = "wing_codex_unsorted"
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


#: The surfaces a full sweep walks when none is named — every local operator-AI chat source that
#: carries a per-project wing. (Copilot rides its own store lane, threaded per-session at capture.)
ALL_SURFACES = ("claude", "codex")

_DISCOVER = {"claude": discover_claude, "codex": discover_codex}


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
