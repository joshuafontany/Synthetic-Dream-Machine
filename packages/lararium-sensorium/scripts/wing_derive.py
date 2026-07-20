"""wing_derive — the ONE per-project wing derivation for the python capture path.

The wing names the AI PROJECT a transcript belongs to, derived from the transcript's RECORDED cwd
(the rows carry it), never the live payload cwd (it drifts with every agent `cd`). The live ingest
hook and every TS consumer read the same slug law from `wing-law.ts`; this holds it identically, so a
swept transcript files under the SAME wing the hook assigns — the two agree by construction, and
`test_wing_derive.py` guards that agreement against the shared fixtures.
"""
import json
import os
import re

_SLUG_SEP = re.compile(r"[ -]")          # wingFromDir step 1: space + hyphen -> "_"
_SLUG_DROP = re.compile(r"[^a-z0-9_]")   # wingFromDir step 2: drop everything else
_SCRAPE_DROP = re.compile(r"[^a-z0-9]+")  # scrapeWing's own (different) slug rule
_SCRAPE_EDGE = re.compile(r"^_|_$")


def wing_from_dir(cwd):
    """Slug a directory/cwd basename into a wing. Mirrors `wing-law.ts::wingFromDir`."""
    base = os.path.basename(cwd.rstrip("/")) if cwd else ""
    slug = _SLUG_DROP.sub("", _SLUG_SEP.sub("_", base.lower()))
    return f"wing_{slug or 'unsorted'}"


def read_cwd_from_transcript(jsonl):
    """First `cwd` string in the transcript's early rows (60-line window). Mirrors
    `wing-law.ts::readCwdFromTranscript` (and `ephemeral.ts::transcriptCwd`, the same reader)."""
    try:
        with open(jsonl, "r", encoding="utf-8") as fh:
            for i, line in enumerate(fh):
                if i >= 60:
                    break
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                except Exception:  # noqa: BLE001 — skip a torn line, keep scanning
                    continue
                cwd = r.get("cwd") if isinstance(r, dict) else None
                if isinstance(cwd, str) and cwd:
                    return cwd
    except OSError:
        pass
    return None


def read_codex_cwd(file):
    """Codex rollout cwd — the first `session_meta` line's `payload.cwd` (5-line window).
    Mirrors `harvest.ts::readCodexCwd`."""
    try:
        with open(file, "r", encoding="utf-8") as fh:
            for i, line in enumerate(fh):
                if i >= 5:
                    break
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                except Exception:  # noqa: BLE001
                    continue
                if isinstance(r, dict) and r.get("type") == "session_meta":
                    payload = r.get("payload")
                    if isinstance(payload, dict):
                        cwd = payload.get("cwd")
                        if isinstance(cwd, str) and cwd:
                            return cwd
    except OSError:
        pass
    return None


def resolve_transcript_wing(transcript):
    """The hook's project-cwd law: read the recorded cwd from the FIRST sibling `.jsonl` in the
    project dir (the dir's stable identity), then from the transcript itself; None when neither
    carries one. Mirrors `wing-law.ts::resolveTranscriptWing` — parity with the LIVE ingest hook."""
    d = os.path.dirname(transcript)
    first_sibling = []
    try:
        sibs = sorted(f for f in os.listdir(d) if f.endswith(".jsonl"))
        if sibs:
            first_sibling = [os.path.join(d, sibs[0])]
    except OSError:
        pass
    for p in first_sibling + [transcript]:
        cwd = read_cwd_from_transcript(p)
        if cwd:
            return wing_from_dir(cwd)
    return None


def scrape_wing(file):
    """Copilot transcripts carry no cwd — scrape the most-frequent `<home>/<seg>` from tool-call
    paths. Mirrors `harvest.ts::scrapeWing` (its own slug rule, distinct from wingFromDir)."""
    try:
        with open(file, "r", encoding="utf-8") as fh:
            content = fh.read()
    except OSError:
        return None
    home = os.path.expanduser("~").replace("\\", "/")
    pat = re.compile(re.escape(home) + r"/([A-Za-z0-9][A-Za-z0-9._-]*)")
    counts = {}
    for seg in pat.findall(content):
        if seg.startswith("."):  # skip ~/.config, ~/.vscode-server, dotfiles
            continue
        counts[seg] = counts.get(seg, 0) + 1
    if not counts:
        return None
    best = max(counts, key=counts.get)  # first-inserted max on ties, mirroring the TS strict `>`
    slug = _SCRAPE_EDGE.sub("", _SCRAPE_DROP.sub("_", best.lower()))
    return f"wing_{slug}" if slug else None
