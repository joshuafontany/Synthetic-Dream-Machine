"""test_sweep_routing — the sweep files each session under its per-project wing, routes tasked spirits
to `<wing>__spirits`, skips ephemerals, and falls to the passed wing only when a source records no cwd.
Stubs the warm stream so the routing witness never pays the embedder/structure cost."""
import json

import session_discovery as sd
from capture_session import CaptureSessionServer


def _mk(path, cwd):
    path.write_text(json.dumps({"cwd": cwd, "type": "user"}) + "\n", encoding="utf-8")


class _FakeStream:
    def __init__(self):
        self.calls = []  # (pointer, surface, wing)

    def capture(self, pointer, *, surface, wing, room):
        self.calls.append((pointer, surface, wing))
        return {"landed": 1, "skipped": 0}


class _FakeServer:
    """Borrows the real sweep method over a stub stream — witnesses the routing, not the capture."""
    sweep = CaptureSessionServer.sweep

    def __init__(self):
        self._stream = _FakeStream()
        self._derived = []
        self._model = "stub-witness/4"
        self._clock = 0

    def _tick(self):
        self._clock += 1
        return self._clock


def _corpus(tmp_path, monkeypatch):
    root = tmp_path / "projects"
    p1 = root / "-home-joshu-Proj-One"
    p1.mkdir(parents=True)
    _mk(p1 / "a.jsonl", "/home/joshu/Proj-One")
    _mk(p1 / "b.jsonl", "/home/joshu/Proj-One")
    p2 = root / "-home-joshu-Proj-Two"
    p2.mkdir(parents=True)
    _mk(p2 / "c.jsonl", "/home/joshu/Proj-Two")
    spirits = p2 / "c" / "subagents"
    spirits.mkdir(parents=True)
    _mk(spirits / "agent-1.jsonl", "/home/joshu/Proj-Two")
    # an ephemeral session — its recorded cwd sits under a LAR_ROOT scratch sandbox
    sandbox = tmp_path / "sandbox"
    sandbox.mkdir()
    monkeypatch.setenv("LAR_ROOT", str(sandbox))
    pe = root / "-scratch"
    pe.mkdir()
    _mk(pe / "e.jsonl", str(sandbox / "wrk"))
    monkeypatch.setattr(sd, "_CLAUDE_ROOT", str(root))
    monkeypatch.setattr(sd, "_CODEX_ROOT", str(tmp_path / "no-codex"))
    return root


def test_sweep_routes_wings_splits_spirits_skips_ephemerals(tmp_path, monkeypatch):
    _corpus(tmp_path, monkeypatch)
    srv = _FakeServer()
    out = srv.sweep({"surface": "all", "wing": "wing_fallback"})

    wings = sorted({w for _p, _s, w in srv._stream.calls})
    assert wings == ["wing_proj_one", "wing_proj_two", "wing_proj_two__spirits"]
    assert out["sessions"] == 4         # 2 Proj-One + 1 Proj-Two + 1 spirit (ephemeral NOT captured)
    assert out["spirits"] == 1
    assert out["ephemeral"] == 1        # the scratch session skipped, never captured
    # the ephemeral pointer never reached the stream
    assert not any("scratch" in p for p, _s, _w in srv._stream.calls)


def test_sweep_requires_a_fallback_wing(tmp_path, monkeypatch):
    _corpus(tmp_path, monkeypatch)
    srv = _FakeServer()
    try:
        srv.sweep({"surface": "all", "wing": ""})
        assert False, "empty wing must raise"
    except ValueError:
        pass
