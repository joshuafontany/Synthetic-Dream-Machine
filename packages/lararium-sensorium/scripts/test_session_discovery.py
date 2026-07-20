"""test_session_discovery — the shared discovery files each session under its project wing, and routes
tasked-spirit sub-sessions to `<wing>__spirits`, so the sovereign sweep and the guest mine both read
one discovery without crossing the wall."""
import json
import os

import session_discovery as sd


def _mk(path, cwd):
    path.write_text(json.dumps({"cwd": cwd}) + "\n", encoding="utf-8")


def test_claude_files_per_project_wing_and_splits_spirits(tmp_path, monkeypatch):
    root = tmp_path / "projects"
    proj = root / "-home-joshu-Proj-One"
    proj.mkdir(parents=True)
    _mk(proj / "sessA.jsonl", "/home/joshu/Proj-One")
    _mk(proj / "sessB.jsonl", "/home/joshu/Proj-One")
    # sessA carries a tasked spirit at <session>/subagents/agent-*.jsonl
    spirits = proj / "sessA" / "subagents"
    spirits.mkdir(parents=True)
    _mk(spirits / "agent-xyz.jsonl", "/home/joshu/Proj-One")
    monkeypatch.setattr(sd, "_CLAUDE_ROOT", str(root))

    entries = sd.discover_claude()
    by_wing = {}
    for e in entries:
        by_wing.setdefault(e["wing"], []).append(e)
    assert set(by_wing) == {"wing_proj_one", "wing_proj_one__spirits"}
    assert len(by_wing["wing_proj_one"]) == 2          # both sessions
    spirit_entries = by_wing["wing_proj_one__spirits"]
    assert len(spirit_entries) == 1 and spirit_entries[0]["spirit"] is True
    assert all(e["surface"] == "claude" for e in entries)


def test_claude_falls_to_dir_name_wing_without_a_cwd(tmp_path, monkeypatch):
    root = tmp_path / "projects"
    proj = root / "-home-joshu-No-Cwd"
    proj.mkdir(parents=True)
    (proj / "s.jsonl").write_text(json.dumps({"type": "summary"}) + "\n", encoding="utf-8")
    monkeypatch.setattr(sd, "_CLAUDE_ROOT", str(root))
    entries = sd.discover_claude()
    assert entries and entries[0]["wing"] == "wing_home_joshu_no_cwd"


def test_codex_wing_from_recorded_cwd(tmp_path, monkeypatch):
    root = tmp_path / "sessions"
    root.mkdir()
    t = root / "rollout-2026.jsonl"
    t.write_text(json.dumps({"type": "session_meta", "payload": {"cwd": "/home/joshu/Codex-Proj"}}) + "\n",
                 encoding="utf-8")
    monkeypatch.setattr(sd, "_CODEX_ROOT", str(root))
    entries = sd.discover_codex()
    assert entries and entries[0]["wing"] == "wing_codex_proj" and entries[0]["surface"] == "codex"
