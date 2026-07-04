"""Unit witness for capture_drain.DrainLedger — the trailing-watermark ordering cap (py twin of
capture-drain.ts). Mirrors the TS drain tests: accept!=land, the contiguous-frontier watermark
(a gap blocks), backlog, reclaimable, replay-set, and the exactly-once (Landauer) audit.

    ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_capture_drain.py -q
"""

import pytest

from capture_drain import DrainLedger


def test_empty_ledger():
    d = DrainLedger()
    assert d.watermark() == 0
    assert d.backlog() == []
    assert d.reclaimable() == []
    assert d.replay_set() == []
    assert d.exactly_once_audit() == {"committed": 0, "distinct_keys": 0, "ok": True, "duplicates": []}


def test_stage_never_advances_watermark():
    d = DrainLedger()
    d.stage(1, "k1")
    d.stage(2, "k2")
    assert d.watermark() == 0          # accept != land: staging alone never advances
    assert d.backlog() == [1, 2]       # both pending


def test_commit_advances_the_contiguous_frontier():
    d = DrainLedger()
    for s, k in ((1, "k1"), (2, "k2"), (3, "k3")):
        d.stage(s, k)
    d.commit(1)
    assert d.watermark() == 1
    d.commit(3)                        # a gap at 2 BLOCKS advance past 1
    assert d.watermark() == 1
    assert d.backlog() == [2]
    d.commit(2)                        # gap filled → frontier jumps to 3
    assert d.watermark() == 3
    assert d.backlog() == []


def test_stage_idempotent_and_mis_key_raises():
    d = DrainLedger()
    d.stage(1, "k1")
    d.stage(1, "k1")                   # idempotent no-op
    assert d.backlog() == [1]
    with pytest.raises(ValueError):    # a mis-keyed replay is refused, not hidden
        d.stage(1, "different")


def test_commit_unstaged_raises_and_commit_idempotent():
    d = DrainLedger()
    with pytest.raises(ValueError):    # the store can't confirm what never arrived
        d.commit(1)
    d.stage(1, "k1")
    d.commit(1)
    d.commit(1)                        # idempotent
    assert d.watermark() == 1


def test_reclaimable_and_replay_set_split_at_the_watermark():
    d = DrainLedger()
    for s, k in ((1, "k1"), (2, "k2"), (3, "k3")):
        d.stage(s, k)
    d.commit(1)
    d.commit(2)                        # watermark 2; 3 staged-not-committed
    assert d.reclaimable() == ["k1", "k2"]          # at/below the watermark, safe to drop
    assert d.replay_set() == [(3, "k3")]            # above the watermark, re-run on restart


def test_exactly_once_audit_flags_a_double_landed_key():
    d = DrainLedger()
    d.stage(1, "same")
    d.stage(2, "same")                 # two seqs, one content-key (a real-world duplicate)
    d.commit(1)
    d.commit(2)
    audit = d.exactly_once_audit()
    assert audit["committed"] == 2
    assert audit["distinct_keys"] == 1
    assert audit["ok"] is False
    assert audit["duplicates"] == ["same"]
