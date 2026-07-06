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


def _chained(texts):
    # records whose cid is content-INDEPENDENT (c-0,c-1,c-2 — STABLE across passes) yet whose lar_chain
    # binds each link's text + its predecessor (the capture_sources content-hash-chain grain). An edited
    # text keeps its cid but BREAKS the chain — the exact SILENT-CORRUPT surface.
    from capture_sources import _sha16
    prev, out = "", []
    for i, t in enumerate(texts):
        chain = _sha16(t + prev)
        prev = chain
        out.append({"seq": i + 1, "cid": f"c-{i}", "text": t,
                    "metadata": {"wing": "w", "room": "r", "lar_turn_key": f"t{i}", "lar_chain": chain}})
    return out


def test_rewind_is_detected_not_silent_skipped_mutable(tmp_path):
    # THE CROWN (KA/BA/YIN): a turn's text changes between passes. is_landed alone would silent-skip the
    # edited cid (content-INDEPENDENT) and keep serving the stale. The chain-compare DETECTS the rewind;
    # a mutable store re-lands the new text (the overwrite supersedes) — never a silent skip.
    store = cio.ContentStore(str(tmp_path / ".sess"))       # MUTABLE (append_only off)
    pipe = compose_pipeline(source=lambda recs: recs, land=ContentStoreLandCap(store), embed=_fake_embed)

    pipe.run_pass(_chained(["a", "b", "c"]))
    assert store.get("c-1")["document"] == "b"

    res = pipe.run_pass(_chained(["a", "B!", "c"]))         # turn-1 edited → its chain + turn-2's diverge
    assert res["skipped"] == 1                               # c-0 ("a") holds — the cheap no-op
    assert res["relanded"] == 2 and res["retracted"] == 0   # c-1 + c-2 re-landed (NOT silent-skipped)
    assert store.get("c-1")["document"] == "B!"             # the new content LANDS over the stale
    assert res["audit"]["ok"] and res["watermark"] == 3


class _PoisonLandCap(ContentStoreLandCap):
    """A land-cap that THROWS on a chosen set of cids (a store reject / poison record stand-in). Clearing
    the set heals the poison, so a re-run can re-attempt (the transient-poison path)."""

    def __init__(self, store, poison: set) -> None:
        super().__init__(store)
        self.poison = poison

    def land(self, cid, text, vector, metadata) -> None:
        if cid in self.poison:
            raise ValueError(f"poison record {cid}")
        super().land(cid, text, vector, metadata)


def test_poison_record_does_not_abort_the_tail(tmp_path):
    # C2: one un-landable record (seq 3) must NOT swallow the tail. The tail past it still lands; the
    # watermark HOLDS below the poison (the gap blocks the frontier); backlog + failed surface the stall.
    store = cio.ContentStore(str(tmp_path / ".sess"))
    pipe = compose_pipeline(source=lambda recs: recs,
                            land=_PoisonLandCap(store, {"c-3"}), embed=_fake_embed)
    res = pipe.run_pass(_records(5))

    assert res["landed"] == 4                                 # the tail (c-4, c-5) still landed
    assert res["failed"] == [{"seq": 3, "cid": "c-3",
                              "error": "ValueError: poison record c-3"}]
    assert res["watermark"] == 2                              # holds below the poison — never leaps the gap
    assert res["backlog"] == [3]                              # the stall reads legible
    assert store.get("c-3") is None                           # the poison never landed
    assert store.get("c-5")["document"] == "turn 5"           # the tail past the poison IS durable
    assert res["audit"]["ok"]


def test_re_run_cleanly_re_attempts_the_poison(tmp_path):
    # a re-run over the FULL source re-attempts: a HEALED poison lands and the watermark advances past it,
    # the already-durable tail skips (idempotent). The stall clears without a special replay path.
    store = cio.ContentStore(str(tmp_path / ".sess"))
    land = _PoisonLandCap(store, {"c-3"})
    pipe = compose_pipeline(source=lambda recs: recs, land=land, embed=_fake_embed)

    pipe.run_pass(_records(5))                                # c-3 poisons; 1,2,4,5 land
    land.poison.clear()                                       # the poison heals (e.g. a fixed record)
    res = pipe.run_pass(_records(5))

    assert res["landed"] == 1 and res["skipped"] == 4         # only the healed c-3 lands; the rest skip
    assert res["failed"] == []                                # the stall cleared
    assert res["watermark"] == 5 and res["backlog"] == []     # the frontier caught up past the old gap
    assert store.get("c-3")["document"] == "turn 3"
    assert res["audit"]["ok"]


def test_systemic_floor_violation_propagates_loud_not_poison_swallowed(tmp_path):
    # C2 boundary: a SYSTEMIC embedder-identity floor (wrong model) poisons EVERY record's recall — it
    # MUST fail the pass LOUD, never hide behind `failed`/backlog. The poison-guard re-raises ContentFloorError
    # (a per-record data poison would instead ride `failed`); the store's model-floor pins the contract.
    import pytest

    from content_io import ContentFloorError
    store = cio.ContentStore(str(tmp_path / ".mem"), required_keys={"wing", "room"},
                             expected_dim=2, expected_model="model-A/2")
    pipe = compose_pipeline(source=lambda recs: recs, land=ContentStoreLandCap(store), embed=_fake_embed)
    poisoned = [{"seq": 1, "cid": "c-1", "text": "t",
                 "metadata": {"wing": "w", "room": "r", "lar_embedder_model": "model-B/2"}}]
    with pytest.raises(ContentFloorError):
        pipe.run_pass(poisoned)                              # a wrong-embedder pass aborts loud, not silent


def test_rewind_retracts_on_the_immutable_ground(tmp_path):
    # on the IMMUTABLE Memory ground a committed atom never overwrites — the rewind RETRACTS (kapae-mutes)
    # the stale so recall stops serving it (the fresh-cid append-vector re-land rides a later commit).
    store = cio.ContentStore(str(tmp_path / ".mem"), required_keys={"wing", "room"}, append_only=True)
    pipe = compose_pipeline(source=lambda recs: recs, land=ContentStoreLandCap(store), embed=_fake_embed)

    pipe.run_pass(_chained(["a", "b", "c"]))
    res = pipe.run_pass(_chained(["a", "B!", "c"]))
    assert res["skipped"] == 1                               # c-0 holds
    assert res["retracted"] == 2 and res["relanded"] == 0   # the immutable ground retracts, never overwrites
    assert store.get("c-1")["metadata"].get("lar_kapae") == "1"   # the stale is muted — recall excludes it
    assert store.get("c-1")["document"] == "b"             # move-not-delete: the committed atom stays, muted
    assert res["audit"]["ok"]
