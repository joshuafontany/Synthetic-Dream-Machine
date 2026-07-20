"""ephemeral — the EPHEMERAL skip verdict for the python capture path.

Witness-spirits, `LAR_ROOT` sandbox runs, and scratch sessions never enter the rhizome. A session
reads ephemeral when (a) its recorded cwd sits under a recognized scratch root (the OS tmpdir /
`/tmp` / `<larHome>/.corpus` / a `LAR_ROOT` sandbox), or (b) a `.ephemeral` sibling marker sits beside
the transcript, or a `.lar-ephemeral` marker sits in the session's recorded cwd. The verdict reads off
the transcript's CONTENT (grain a + the cwd half of b), so a staged copy carries the same verdict as
the original. The TS capture leg reads `ephemeral.ts`; this holds the same gate, so both skip alike.
"""
import os
import tempfile

from wing_derive import read_cwd_from_transcript  # the same cwd row the wing law reads


def _lar_home():
    """The `~/.lares` vessel home — `LAR_ROOT` (isolated instance) or `~/.lares`. Mirrors
    `vessel-paths.ts::larHome`."""
    return os.environ.get("LAR_ROOT") or os.path.join(os.path.expanduser("~"), ".lares")


def scratch_roots():
    """The recognized scratch roots — a session whose recorded cwd sits under one reads ephemeral.
    Mirrors `ephemeral.ts::scratchRoots` (abspath-normalized, deduped, no symlink follow)."""
    roots = [tempfile.gettempdir(), "/tmp", os.path.join(_lar_home(), ".corpus")]
    lar_root = os.environ.get("LAR_ROOT")
    if lar_root:
        roots.append(lar_root)  # a LAR_ROOT sandbox — the isolated-instance tree
    seen, out = set(), []
    for r in roots:
        rr = os.path.abspath(r)  # path.resolve twin: absolute + normalized, symlinks unfollowed
        if rr not in seen:
            seen.add(rr)
            out.append(rr)
    return out


def _under_root(dir_, root):
    """True when `dir_` sits at or under `root` (path-boundary-safe). Mirrors `ephemeral.ts::underRoot`."""
    d = os.path.abspath(dir_)
    return d == root or d.startswith(root + os.sep)


def session_ephemeral(transcript):
    """The ONE verdict the gates read: a skip `reason` string, or None for live. A non-`.jsonl` target
    (the copilot sqlite store) carries no per-session cwd — it reads live (its exported per-session
    jsonl gets its own verdict). Mirrors `ephemeral.ts::sessionEphemeral`."""
    if transcript.endswith(".jsonl"):
        marker = transcript[: -len(".jsonl")] + ".ephemeral"
        if os.path.exists(marker):
            return f"declared: {os.path.basename(marker)}"
    else:
        return None
    cwd = read_cwd_from_transcript(transcript)
    if not cwd:
        return None
    if os.path.exists(os.path.join(cwd, ".lar-ephemeral")):
        return f"declared: .lar-ephemeral in {cwd}"
    for root in scratch_roots():
        if _under_root(cwd, root):
            return f"derived: cwd {cwd} under scratch root {root}"
    return None
