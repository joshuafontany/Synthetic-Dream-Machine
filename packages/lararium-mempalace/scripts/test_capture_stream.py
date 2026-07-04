"""Ephemeral dry-run witness for capture_stream.Pipeline — the composable capture engine over a REAL
content_io ContentStore in a tmp palace (the operator's "run against a small corpus into an ephemeral
sensorium first"). Proves: compose -> land; idempotent re-run (the crash-safe re-derivation, no wal.py);
a partial->full crash-recovery pass lands the tail.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_capture_stream.py -q
"""

import content_io as cio
from capture_stream import ContentStoreLandCap, compose_pipeline


def _records(n, start=1):
    # a small synthetic stream: dense 1-based seq, a stable content-hash cid, text, mempalace-schema metadata.
    return [{"seq": start + i, "cid": f"c-{start + i}", "text": f"turn {start + i}",
             "metadata": {"wing": "w", "room": "r"}} for i in range(n)]


def _fake_embed(text):
    return [float(len(text)), 0.0]   # a deterministic 2-dim vector (embed-in-engine stand-in)


def _pipeline(tmp_path):
    store = cio.ContentStore(str(tmp_path / ".sess"))
    pipe = compose_pipeline(source=lambda recs: recs, land=ContentStoreLandCap(store), embed=_fake_embed)
    return pipe, store


def test_dry_run_lands_the_stream(tmp_path):
    pipe, store = _pipeline(tmp_path)
    res = pipe.run_pass(_records(5))
    assert res["landed"] == 5 and res["skipped"] == 0
    assert res["watermark"] == 5 and res["audit"]["ok"]
    assert store.get("c-3")["document"] == "turn 3"          # round-trip through the real store
    assert store.get("c-3")["metadata"]["wing"] == "w"


def test_re_run_is_idempotent_the_crash_cure(tmp_path):
    pipe, store = _pipeline(tmp_path)
    recs = _records(5)
    pipe.run_pass(recs)
    res2 = pipe.run_pass(recs)                               # re-derive: every cid already landed
    assert res2["landed"] == 0 and res2["skipped"] == 5      # idempotent — nothing re-landed
    assert res2["watermark"] == 5 and res2["audit"]["ok"]


def test_partial_then_full_recovers_the_tail(tmp_path):
    # crash sim: a pass landed only the first 3 (the "crash" left 4,5 un-landed); a re-run over the
    # FULL source re-derives + lands the tail — the no-wal.py crash-safety.
    pipe, store = _pipeline(tmp_path)
    pipe.run_pass(_records(3))
    res = pipe.run_pass(_records(5))
    assert res["landed"] == 2 and res["skipped"] == 3        # the tail lands, the first 3 skipped
    assert store.get("c-5")["document"] == "turn 5"
    assert res["audit"]["ok"] and res["watermark"] == 5
