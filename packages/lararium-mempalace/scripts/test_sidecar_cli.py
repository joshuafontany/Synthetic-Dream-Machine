"""CLI round-trips proving each refactored sidecar's launched interface is unchanged.

These spawn the script EXACTLY as the TS callers do (same subcommands, same
request/response JSON, same serve protocol) and assert the byte-stable contract —
the load-bearing check that the composition refactor (importing sidecar_caps at
launch) left every CLI surface intact:

  drawer_io     export --wing W  ·  apply PATCHFILE      (telemetry-writeback.ts)
  kg_io         --palace P add PF · kapae --turn-key K   (worldline-kg.ts)
  astpalace_io  serve --palace D  + NDJSON ping/put/get   (astpalace.ts)
  form_encoder  serve             + NDJSON ping           (formpalace.ts)

Run under the mempalace venv:

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_sidecar_cli.py -q
"""

import json
import os
import subprocess
import sys

import pytest

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SCRIPTS_DIR)))
MEMPALACE_DIR = os.path.join(REPO_ROOT, "mempalace")

pytestmark = pytest.mark.skipif(
    not os.path.isdir(MEMPALACE_DIR), reason="mempalace package dir absent"
)


def _env(home):
    env = os.environ.copy()
    env["HOME"] = str(home)
    env["PYTHONPATH"] = MEMPALACE_DIR + os.pathsep + env.get("PYTHONPATH", "")
    return env


def _run(args, *, home, stdin=None, timeout=60):
    return subprocess.run(
        [sys.executable, os.path.join(SCRIPTS_DIR, args[0]), *args[1:]],
        input=stdin,
        capture_output=True,
        text=True,
        env=_env(home),
        timeout=timeout,
    )


def _json_lines(text):
    return [json.loads(x) for x in text.splitlines() if x.strip()]


# ---------------------------------------------------------------------------
# kg_io — add + kapae (clean, no ChromaDB)
# ---------------------------------------------------------------------------


def test_kg_io_add_then_kapae_round_trip(tmp_path):
    palace = tmp_path / "palace"
    palace.mkdir()
    recs = tmp_path / "recs.ndjson"
    recs.write_text(
        json.dumps({"subject": "agent:a", "predicate": "spawned", "object": "agent:b",
                    "turn_key": "t1"}) + "\n"
    )
    add = _run(["kg_io.py", "--palace", str(palace), "add", str(recs)], home=tmp_path)
    assert add.returncode == 0, add.stderr
    assert json.loads(add.stdout)["added"] == 1

    kapae = _run(
        ["kg_io.py", "--palace", str(palace), "kapae", "--turn-key", "t1"], home=tmp_path
    )
    assert kapae.returncode == 0, kapae.stderr
    res = json.loads(kapae.stdout)
    assert res["closed"] == 1 and res["turn_key"] == "t1"


# ---------------------------------------------------------------------------
# drawer_io — export + apply (ChromaDB collection at HOME/.mempalace/palace)
# ---------------------------------------------------------------------------


def test_drawer_io_export_then_apply_round_trip(tmp_path):
    from mempalace.palace import get_collection

    palace_path = os.path.join(str(tmp_path), ".mempalace", "palace")
    os.makedirs(palace_path, exist_ok=True)
    col = get_collection(palace_path, create=True, _skip_identity_check=True)
    col.upsert(
        ids=["d1"],
        documents=["hello shore"],
        metadatas=[{"wing": "w1", "lar_hv": 0, "source_file": "claude__x"}],
        embeddings=[[0.1] * 8],
    )

    exp = _run(["drawer_io.py", "export", "--wing", "w1"], home=tmp_path)
    assert exp.returncode == 0, exp.stderr
    lines = _json_lines(exp.stdout)
    assert lines == [{"id": "d1", "content": "hello shore", "source_file": "claude__x"}]

    patch = tmp_path / "patch.ndjson"
    patch.write_text(json.dumps({"id": "d1", "patch": {"lar_hv": 6}}) + "\n")
    app = _run(["drawer_io.py", "apply", str(patch)], home=tmp_path)
    assert app.returncode == 0, app.stderr
    out = json.loads(app.stdout)
    assert out["applied"] == 1 and out["hv"] == 6

    # The patch landed: re-export now skips the (now-current) drawer.
    exp2 = _run(["drawer_io.py", "export", "--wing", "w1"], home=tmp_path)
    assert _json_lines(exp2.stdout) == []


# ---------------------------------------------------------------------------
# astpalace_io serve — ping · put · get over NDJSON (real .astpalace ChromaDB)
# ---------------------------------------------------------------------------


def test_astpalace_io_serve_round_trip(tmp_path):
    palace = str(tmp_path / ".astpalace")
    h = "a" * 64  # the structural hash is sha256-hex (the cheap embed reads it as hex)
    reqs = "\n".join(
        json.dumps(r)
        for r in [
            {"id": 1, "op": "ping"},
            {"id": 2, "op": "put", "hash": h, "ast": "{\"k\":1}",
             "source_file": "f.md", "verbatim_sha": "V1"},
            {"id": 3, "op": "get", "hash": h},
        ]
    ) + "\n"
    proc = _run(["astpalace_io.py", "serve", "--palace", palace], home=tmp_path, stdin=reqs)
    assert proc.returncode == 0, proc.stderr
    lines = _json_lines(proc.stdout)
    by_id = {l["id"]: l for l in lines}
    assert by_id[1]["result"] == {"ready": True}
    assert by_id[2]["ok"] is True and by_id[2]["result"] == {"hash": h, "count": 1}
    assert by_id[3]["ok"] is True
    got = by_id[3]["result"]
    assert got["hash"] == h and got["ast"] == {"k": 1} and got["count"] == 1


# ---------------------------------------------------------------------------
# form_encoder serve — ping (encode-only holder, no --palace)
# ---------------------------------------------------------------------------


def test_form_encoder_serve_ping_round_trip(tmp_path):
    proc = _run(
        ["form_encoder.py", "serve"], home=tmp_path,
        stdin=json.dumps({"id": 1, "op": "ping"}) + "\n",
    )
    assert proc.returncode == 0, proc.stderr
    line = _json_lines(proc.stdout)[0]
    assert line["id"] == 1 and line["ok"] is True
    assert line["result"]["ready"] is True
    assert line["result"]["store"] is False  # no palace bound → encode-only
