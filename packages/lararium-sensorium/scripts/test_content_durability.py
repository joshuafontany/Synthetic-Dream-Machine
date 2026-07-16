"""Phase-0 BLOCKER witness (W0.1) — the durability barrier the whole capture-engine rests on:
a cid whose content_io.put RETURNED (the durable-commit ack) must survive a hard SIGKILL of the
holder AND still be SEARCHABLE after restart (the HNSW-split catch, B3). This is the empirical proof
behind HA's witnessed chroma journal=delete/synchronous=FULL — the ack-after-proof / re-derivation
crash-safety is a lie if it fails.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_content_durability.py -q
"""

import json
import os
import subprocess
import sys


_SCRIPTS = os.path.dirname(os.path.abspath(__file__))
_PY = sys.executable  # the venv interpreter running pytest (has chroma)


def _serve(palace: str) -> subprocess.Popen:
    env = dict(os.environ)
    # the serve sidecar imports mempalace.palace — PYTHONPATH must carry the vendored package
    repo = os.path.dirname(os.path.dirname(os.path.dirname(_SCRIPTS)))
    env["PYTHONPATH"] = os.path.join(repo, "mempalace") + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.Popen(
        [_PY, os.path.join(_SCRIPTS, "content_io.py"), "serve", "--palace", palace],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, cwd=_SCRIPTS, env=env,
    )


def _rpc(proc: subprocess.Popen, req: dict) -> dict:
    proc.stdin.write((json.dumps(req) + "\n").encode())
    proc.stdin.flush()
    line = proc.stdout.readline()
    if not line:
        raise AssertionError("serve holder closed the pipe (died) before replying")
    return json.loads(line)


def test_landed_cid_survives_kill9_and_stays_searchable(tmp_path):
    palace = str(tmp_path / ".durability")
    p1 = _serve(palace)
    try:
        assert _rpc(p1, {"id": 1, "op": "ping"})["ok"] is True
        # the put's ok-reply IS the durable-commit ack (ack-after-proof; content_io returns after upsert)
        r = _rpc(p1, {"id": 2, "op": "put", "cid": "c-kill", "text": "survive me",
                      "embedding": [0.1, 0.2, 0.3], "metadata": {"wing": "w"}})
        assert r["ok"] is True and r["result"]["cid"] == "c-kill"
    finally:
        p1.kill()          # SIGKILL — NO clean shutdown, no flush hook; only a durable commit survives
        p1.wait()

    p2 = _serve(palace)    # respawn on the SAME palace dir (the "restart")
    try:
        assert _rpc(p2, {"id": 1, "op": "ping"})["ok"] is True
        got = _rpc(p2, {"id": 2, "op": "get", "cid": "c-kill"})
        assert got["ok"] is True and got["result"] is not None, "content lost across kill-9 (sqlite barrier failed)"
        assert got["result"]["document"] == "survive me"
        # the HNSW-split catch (B3): the row survived — is it also SEARCHABLE, or index-lost?
        srch = _rpc(p2, {"id": 3, "op": "search", "embedding": [0.1, 0.2, 0.3], "k": 1})
        matches = srch["result"]["matches"]
        assert matches and matches[0]["cid"] == "c-kill", \
            "content survives get but NOT search after kill-9 — the HNSW index-lag split (R1-b); recall degrades until repair"
    finally:
        p2.kill()
        p2.wait()
