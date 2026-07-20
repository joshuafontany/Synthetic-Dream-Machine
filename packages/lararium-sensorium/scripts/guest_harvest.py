"""guest_harvest — build the GUEST comparator from every harness transcript, through the vendored
miner's OWN vanilla path. The comparator lane lives here; `lares mempalace harvest` shells it.

The comparator holds the clean baseline the memory sensorium measures itself against. Its whole value
rests on carrying no Lares vocabulary: a store stamped with our own `lar_*` gradient stops measuring
and starts mirroring. So this mines with the plain

    mempalace --palace <guest> mine <stage>/<wing> --mode convos --wing <wing>

and NOTHING else. No `--source lares` (the adapter that declares the twenty `lar_*` fields gates
behind that flag, so omitting it cannot reach it). No @daemon capture verb, no worldline observer, no
telemetry writeback, no spirit route. The drawer carries only mempalace's native metadata.

The WALL: this writes ONLY `~/.mempalace` and its own stage tree, and carries ZERO `lar_*`. Discovery
rides the shared `session_discovery.discover_all` — it never re-rolls its own. The two island lanes
share the discovery and nothing else (the sovereign sweep decides its own sink + skip policy; this one
mines vanilla into the guest palace and applies no skip).
"""
import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys

import session_discovery as sd

#: The python discovery labels its copilot-cli surface `copilot`; the stage tree + normalizer keys
#: speak the TS `HarvestEntry.source` vocabulary (`copilot-cli`). Fold the one differing label; the
#: rest pass through identity.
_SOURCE = {
    "claude": "claude",
    "codex": "codex",
    "copilot": "copilot-cli",
    "copilot-vscode": "copilot-vscode",
}

#: Which sources carry a native-format reader (the vanilla miner consumes JSONL, not Copilot's two
#: native formats). A source listed here is adapted only for the guest comparator; a missing adapter
#: is a NAMED staging failure, never an opaque spawn error.
_NORMALIZER_SCRIPTS = {
    "copilot-vscode": "copilot_vscode_normalize.py",
    "copilot-cli": "copilot_sqlite_normalize.py",
}

_DRAWERS_FILED_RE = re.compile(r"Drawers filed:\s*(\d+)")


def guest_palace():
    """The guest palace, spelled LITERALLY — `~/.mempalace/palace`.

    NEVER an env override (no `MEMPALACE_PALACE_PATH`): an env var that can redirect the comparator can
    redirect it onto the sensorium, and this command may write exactly the one store the sovereign RUN
    may not."""
    return os.path.join(os.path.expanduser("~"), ".mempalace", "palace")


def mempalace_exe():
    """Resolve the mempalace executable, mirroring `harvest.ts` MP_EXE logic: prefer the user-installed
    CLI at `~/.local/bin` (`mempalace.exe` on win32), else the bare name on PATH."""
    exe = "mempalace.exe" if sys.platform == "win32" else "mempalace"
    local = os.path.join(os.path.expanduser("~"), ".local", "bin", exe)
    return local if os.path.exists(local) else exe


def _lar_state_home():
    """`$XDG_STATE_HOME/lares` (or a `LAR_ROOT` sandbox's `state/`). Mirrors `vessel-paths.ts::larStateHome`."""
    root = os.environ.get("LAR_ROOT")
    if root:
        return os.path.join(root, "state")
    xdg = (os.environ.get("XDG_STATE_HOME") or "").strip()
    base = xdg or os.path.join(os.path.expanduser("~"), ".local", "state")
    return os.path.join(base, "lares")


def default_stage_root():
    """The guest Mempalace lane beneath the one canonical stage root — mirrors
    `larHarvestStageDir()/mempalace`. The thin TS coordinator passes `--stage-root` explicitly; this
    default keeps the script runnable standalone."""
    return os.path.join(_lar_state_home(), "harvest-stage", "mempalace")


def _scripts_dir():
    return os.path.dirname(os.path.abspath(__file__))


def normalizer_for(source):
    """The absolute path to a source's normalizer script, or None when none exists."""
    script = _NORMALIZER_SCRIPTS.get(source)
    return os.path.join(_scripts_dir(), script) if script else None


def mempalace_stage_name(entry):
    """Stable, collision-resistant relative path inside the Mempalace stage — the mirror of TS
    `mempalaceStageName`: `<source>/<sha256(realpath(pointer))[:16]>/<name>`, where `name` is
    `<session_id>.jsonl` for copilot-cli (its pointer is the shared SQLite store) else the pointer's
    basename. Stays comparator-local: no `lar_*` metadata crosses the boundary."""
    pointer = entry["pointer"]
    source = _SOURCE.get(entry["surface"], entry["surface"])
    source_path = os.path.realpath(pointer)  # resolve symlinks, matching realpathSync
    key = hashlib.sha256(source_path.encode("utf-8")).hexdigest()[:16]
    session_id = entry.get("session_id")
    if source == "copilot-cli" and session_id:
        name = f"{session_id}.jsonl"
    else:
        name = os.path.basename(pointer)
    return os.path.join(source, key, name)


def _stage_entry(entry, stage, stage_name):
    """Stage one transcript under `stage/<stage_name>`. Link (fallback copy) the JSONL surfaces; run the
    native normalizer for the two Copilot formats. Set the dst mtime from the source. Raises on any
    failure so the caller can NAME the drop."""
    dst = os.path.join(stage, stage_name)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    pointer = entry["pointer"]
    source = _SOURCE.get(entry["surface"], entry["surface"])

    if source in _NORMALIZER_SCRIPTS:
        norm = normalizer_for(source)
        if not norm or not os.path.exists(norm):
            raise RuntimeError(f"no normalizer for source '{source}' — its native format has no reader yet")
        if source == "copilot-cli":
            session_id = entry.get("session_id")
            if not session_id:
                raise RuntimeError("Copilot SQLite comparator entry lacks session_id")
            subprocess.run([sys.executable, norm, "--session", session_id, pointer, os.path.dirname(dst)],
                           check=True, capture_output=True, text=True)
            if not os.path.exists(dst):
                raise RuntimeError(f"Copilot SQLite session {session_id} did not export")
        else:
            out = subprocess.run([sys.executable, norm, pointer],
                                 check=True, capture_output=True, text=True)
            with open(dst, "w", encoding="utf-8") as fh:
                fh.write(out.stdout)
    else:
        try:
            os.link(pointer, dst)
        except OSError:
            shutil.copyfile(pointer, dst)

    src_stat = os.stat(pointer)
    os.utime(dst, (src_stat.st_atime, src_stat.st_mtime))
    return dst


def _run_mine(exe, palace, stage, wing, timeout):
    """The VANILLA mine — one invocation per wing over the staged tree, NOTHING but the native flags.
    Returns the miner's stdout. Isolated so a test can stub the subprocess."""
    return subprocess.run(
        [exe, "--palace", palace, "mine", stage, "--mode", "convos", "--wing", wing],
        check=True, capture_output=True, text=True, timeout=timeout,
    ).stdout


def _mine_timeout(item_count):
    """An item-scaled budget: 60s + 2s/transcript, floor 300s. This stands in for the TS `mineWithServo`
    adaptive servo — a simpler heuristic that still refuses to price a large wing at a small-wing mean
    and kill it as a hang."""
    return max(300, 60 + 2 * item_count)


def harvest(project=None, only_wing=None, dry_run=False, stage_root=None):
    """Mine every transcript surface into the guest palace, vanilla. `dry_run` enumerates without
    staging or mining; `only_wing` scopes to one wing. Returns a results dict."""
    palace = guest_palace()
    exe = mempalace_exe()
    stage_root = stage_root or default_stage_root()

    entries = [e for e in sd.discover_all(project)
               if only_wing is None or e["wing"] == only_wing]

    by_wing = {}
    for e in entries:
        by_wing.setdefault(e["wing"], []).append(e)

    results = []
    for wing in sorted(by_wing):
        es = by_wing[wing]
        if dry_run:
            # A dry-run predicts a missing comparator adapter without staging anything.
            will_drop = [
                {"pointer": e["pointer"],
                 "why": f"no normalizer for source '{_SOURCE.get(e['surface'], e['surface'])}'"
                        " — its native format has no reader yet"}
                for e in es
                if _SOURCE.get(e["surface"], e["surface"]) in _NORMALIZER_SCRIPTS
                and not normalizer_for(_SOURCE.get(e["surface"], e["surface"]))
            ]
            results.append({"wing": wing, "staged": len(es) - len(will_drop),
                            "dropped": will_drop, "filed": "dry-run"})
            continue

        stage = os.path.join(stage_root, wing)
        # This pass owns a complete snapshot of its wing — rebuild the staging tree so a vanished
        # source cannot linger as a stale mine input. The source-hash relative path stays stable across
        # runs, preserving the vanilla miner's (source_file, mtime) idempotency.
        shutil.rmtree(stage, ignore_errors=True)
        os.makedirs(stage, exist_ok=True)

        # A file that fails to stage is NAMED. A staging error leaves no trace on the next pass (the
        # file simply is not there), so a silent skip mines an empty stage and calls it success.
        dropped = []
        staged = 0
        for e in es:
            try:
                _stage_entry(e, stage, mempalace_stage_name(e))
                staged += 1
            except Exception as err:  # noqa: BLE001 — every failure NAMES its drop, never swallows
                dropped.append({"pointer": e["pointer"], "why": str(err)[:140]})

        try:
            out = _run_mine(exe, palace, stage, wing, _mine_timeout(staged))
            m = _DRAWERS_FILED_RE.search(out)
            filed = int(m.group(1)) if m else 0
        except Exception as err:  # noqa: BLE001
            filed = f"mine-failed: {str(err)[:100]}"

        results.append({"wing": wing, "staged": staged, "dropped": dropped, "filed": filed})

    total_staged = sum(r["staged"] for r in results)
    total_dropped = sum(len(r["dropped"]) for r in results)
    total_filed = sum(r["filed"] for r in results if isinstance(r["filed"], int))
    ok = all(not isinstance(r["filed"], str) or r["filed"] == "dry-run" for r in results)

    return {"palace": palace, "dry_run": dry_run, "wings": len(results),
            "staged": total_staged, "dropped": total_dropped, "filed": total_filed,
            "ok": ok, "results": results}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build the guest mempalace comparator, vanilla.")
    ap.add_argument("--project", default=None, help="narrow claude discovery to one project dir")
    ap.add_argument("--wing", default=None, help="scope the harvest to one wing")
    ap.add_argument("--dry-run", action="store_true", help="enumerate without staging or mining")
    ap.add_argument("--stage-root", default=None, help="the stage root (default: larHarvestStageDir/mempalace)")
    args = ap.parse_args(argv)

    report = harvest(project=args.project, only_wing=args.wing,
                     dry_run=args.dry_run, stage_root=args.stage_root)
    import json
    sys.stdout.write(json.dumps(report) + "\n")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
