"""test_guest_harvest — the guest lane mirrors the TS stage-name key, carries ZERO lar_* to the vanilla
miner (the comparator wall), targets the LITERAL guest palace, and a dry-run enumerates without staging
or mining. Stubs the mempalace subprocess so the witness never pays a real mine."""
import json
import re
import types

import guest_harvest as gh
import session_discovery as sd


def _mk(path, cwd):
    path.write_text(json.dumps({"cwd": cwd, "type": "user"}) + "\n", encoding="utf-8")


# ── the stage-name mirror (parity with TS mempalaceStageName) ────────────────────────────────────

def test_stage_name_keeps_same_named_transcripts_from_separate_roots_distinct():
    a = gh.mempalace_stage_name({"pointer": "/one/workspace/transcript.jsonl",
                                 "surface": "copilot-vscode", "session_id": None})
    b = gh.mempalace_stage_name({"pointer": "/two/workspace/transcript.jsonl",
                                 "surface": "copilot-vscode", "session_id": None})
    assert a != b
    assert re.match(r"^copilot-vscode/[0-9a-f]{16}/transcript\.jsonl$", a)


def test_stage_name_copilot_cli_uses_session_id_under_the_folded_source():
    e = {"pointer": "/home/op/.copilot/session-store.db", "surface": "copilot", "session_id": "sid123"}
    name = gh.mempalace_stage_name(e)
    assert re.match(r"^copilot-cli/[0-9a-f]{16}/sid123\.jsonl$", name)


def test_stage_name_claude_uses_basename_and_is_stable():
    e = {"pointer": "/x/y/sessA.jsonl", "surface": "claude", "session_id": None}
    assert re.match(r"^claude/[0-9a-f]{16}/sessA\.jsonl$", gh.mempalace_stage_name(e))
    assert gh.mempalace_stage_name(e) == gh.mempalace_stage_name(e)


# ── the corpus + subprocess stub ─────────────────────────────────────────────────────────────────

def _corpus(tmp_path, monkeypatch):
    root = tmp_path / "projects"
    p1 = root / "-home-joshu-Proj-One"
    p1.mkdir(parents=True)
    _mk(p1 / "a.jsonl", "/home/joshu/Proj-One")
    _mk(p1 / "b.jsonl", "/home/joshu/Proj-One")
    monkeypatch.setattr(sd, "_CLAUDE_ROOT", str(root))
    monkeypatch.setattr(sd, "_CODEX_ROOT", str(tmp_path / "no-codex"))
    monkeypatch.setattr(sd, "_COPILOT_CLI_STORE", str(tmp_path / "no-copilot.db"))
    monkeypatch.setattr(sd, "_COPILOT_VSCODE_WS", ())
    return root


class _FakeRun:
    """Records every subprocess.run argv, returns a canned mine report — never a real mine."""
    def __init__(self):
        self.calls = []

    def __call__(self, argv, **kw):
        self.calls.append(argv)
        return types.SimpleNamespace(stdout="Drawers filed: 2\n", returncode=0)


def test_dry_run_enumerates_without_staging_or_mining(tmp_path, monkeypatch):
    _corpus(tmp_path, monkeypatch)
    fake = _FakeRun()
    monkeypatch.setattr(gh.subprocess, "run", fake)
    stage_root = tmp_path / "stage"

    report = gh.harvest(dry_run=True, stage_root=str(stage_root))

    assert report["dry_run"] is True
    assert [r["wing"] for r in report["results"]] == ["wing_proj_one"]
    assert report["results"][0]["filed"] == "dry-run"
    assert report["results"][0]["staged"] == 2
    assert fake.calls == []            # nothing mined
    assert not stage_root.exists()     # nothing staged


def test_harvest_stages_and_mines_vanilla_into_the_literal_guest_palace(tmp_path, monkeypatch):
    _corpus(tmp_path, monkeypatch)
    fake = _FakeRun()
    monkeypatch.setattr(gh.subprocess, "run", fake)
    stage_root = tmp_path / "stage"

    report = gh.harvest(dry_run=False, stage_root=str(stage_root))

    # the wing filed, both sessions staged, the canned mine parsed
    assert report["ok"] is True
    r = report["results"][0]
    assert r["wing"] == "wing_proj_one" and r["staged"] == 2 and r["filed"] == 2
    assert report["dropped"] == 0

    # the stage tree was built under the source-hash key
    staged_files = list((stage_root / "wing_proj_one" / "claude").glob("*/a.jsonl"))
    assert len(staged_files) == 1

    # THE WALL: exactly one mine call, targeting the LITERAL guest palace, carrying ZERO lar_*
    assert len(fake.calls) == 1
    argv = fake.calls[0]
    assert argv[1] == "--palace" and argv[2] == gh.guest_palace()
    assert argv[2].endswith("/.mempalace/palace")
    assert "mine" in argv and "--mode" in argv and "convos" in argv
    assert "--source" not in argv            # no RFC-002 lar_* adapter
    assert not any("lar_" in tok for tok in argv)


def test_guest_palace_is_literal_never_an_env_override(monkeypatch):
    monkeypatch.setenv("MEMPALACE_PALACE_PATH", "/tmp/decoy/sensorium")
    assert gh.guest_palace().endswith("/.mempalace/palace")
    assert "decoy" not in gh.guest_palace()
