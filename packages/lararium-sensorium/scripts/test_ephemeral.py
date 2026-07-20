"""test_ephemeral — the EPHEMERAL skip gate, pinned against `ephemeral.ts`'s three grains."""
import json
import os

import ephemeral
from ephemeral import session_ephemeral


def _write(path, cwd=None):
    row = {"type": "user"}
    if cwd is not None:
        row["cwd"] = cwd
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")


def test_live_when_cwd_is_a_real_project(tmp_path, monkeypatch):
    monkeypatch.delenv("LAR_ROOT", raising=False)
    t = tmp_path / "s.jsonl"
    _write(t, cwd="/home/joshu/Real-Project")
    assert session_ephemeral(str(t)) is None


def test_declared_sibling_marker_skips(tmp_path):
    t = tmp_path / "s.jsonl"
    _write(t, cwd="/home/joshu/Real-Project")
    (tmp_path / "s.ephemeral").write_text("", encoding="utf-8")
    reason = session_ephemeral(str(t))
    assert reason and "declared" in reason


def test_cwd_under_a_scratch_root_skips(tmp_path, monkeypatch):
    # A recorded cwd under a LAR_ROOT sandbox reads ephemeral (grain a — derived).
    sandbox = tmp_path / "sandbox"
    sandbox.mkdir()
    monkeypatch.setenv("LAR_ROOT", str(sandbox))
    t = tmp_path / "s.jsonl"
    _write(t, cwd=str(sandbox / "wrk"))
    reason = session_ephemeral(str(t))
    assert reason and "derived" in reason


def test_lar_ephemeral_marker_in_cwd_skips(tmp_path, monkeypatch):
    monkeypatch.delenv("LAR_ROOT", raising=False)
    proj = tmp_path / "proj"
    proj.mkdir()
    (proj / ".lar-ephemeral").write_text("", encoding="utf-8")
    t = tmp_path / "s.jsonl"
    _write(t, cwd=str(proj))
    reason = session_ephemeral(str(t))
    assert reason and ".lar-ephemeral" in reason


def test_non_jsonl_target_reads_live(tmp_path):
    # A copilot sqlite store carries no per-session cwd — it reads live.
    db = tmp_path / "state.vscdb"
    db.write_text("", encoding="utf-8")
    assert session_ephemeral(str(db)) is None
