"""capture_wal — every crash state the design claims to survive, simulated and witnessed."""

import os

import pytest

import capture_wal as cw


def _wal(tmp_path, sub="w"):
    return cw.CaptureWal(str(tmp_path / sub))


def test_append_replay_round_trip_preserves_order(tmp_path):
    wal = _wal(tmp_path)
    recs = [{"cid": f"c{i}", "seq": i} for i in range(5)]
    for r in recs:
        wal.append(r)
    assert list(wal.replay()) == recs
    assert wal.last_truncated == 0
    wal.close()


def test_a_torn_tail_truncates_quietly(tmp_path):
    wal = _wal(tmp_path)
    wal.append({"cid": "a"})
    wal.append({"cid": "b"})
    # the crash: a partial frame lands at the tail (size persisted, bytes garbage)
    with open(wal._segment_path(wal._gen), "ab") as fh:
        fh.write(cw.pack_frame({"cid": "lost"})[:9])
    assert list(wal.replay()) == [{"cid": "a"}, {"cid": "b"}]
    assert wal.last_truncated == 9
    wal.close()


def test_garbage_at_the_tail_never_parses_as_a_record(tmp_path):
    wal = _wal(tmp_path)
    wal.append({"cid": "a"})
    with open(wal._segment_path(wal._gen), "ab") as fh:
        fh.write(b"\x00\xffnonsense with a\nnewline inside\n")
    assert list(wal.replay()) == [{"cid": "a"}]
    wal.close()


def test_mid_log_corruption_quarantines_the_segment_and_raises(tmp_path):
    wal = _wal(tmp_path)
    for i in range(4):
        wal.append({"cid": f"c{i}"})
    path = wal._segment_path(wal._gen)
    # the crash nobody expects: a byte flips INSIDE the second frame's payload
    with open(path, "r+b") as fh:
        data = fh.read()
        second = len(cw.pack_frame({"cid": "c0"}))  # frames run equal-sized here
        fh.seek(second + cw._HEADER.size + 2)
        fh.write(b"\xff")
    out = []
    with pytest.raises(cw.MidLogCorruption, match="mid-log corruption"):
        for rec in wal.replay():
            out.append(rec)
    assert out == [{"cid": "c0"}]  # the valid prefix replayed before the alarm
    assert not os.path.exists(path)  # the segment moved whole...
    branded = [f for f in os.listdir(wal.dir) if f.startswith("quarantine.midlog")]
    assert len(branded) == 1  # ...into a branded quarantine file for the operator's eye
    wal.close()


def test_a_second_writer_refuses_loud(tmp_path):
    wal = _wal(tmp_path)
    with pytest.raises(cw.WalLocked, match="another writer"):
        cw.CaptureWal(wal.dir)
    wal.close()


def test_compact_rotates_and_a_missed_unlink_still_replays_both(tmp_path):
    wal = _wal(tmp_path)
    wal.append({"cid": "old"})
    wal.compact()
    # after a clean rotation the old segment is gone; new appends land in the new gen
    assert wal._generations() == [wal._gen]
    wal.append({"cid": "new"})
    assert list(wal.replay()) == [{"cid": "new"}]
    # crash-between-steps picture: BOTH segments present → replay reads generation order
    with open(wal._segment_path(wal._gen - 1), "wb") as fh:
        fh.write(cw.pack_frame({"cid": "old"}))
    assert list(wal.replay()) == [{"cid": "old"}, {"cid": "new"}]  # the sink dedups
    wal.close()


def test_quarantine_is_durable_framed_and_never_replayed(tmp_path):
    wal = _wal(tmp_path)
    wal.append({"cid": "live"})
    wal.quarantine([{"cid": "poison", "why": "bad vector"}])
    assert list(wal.replay()) == [{"cid": "live"}]  # dead letters never re-enter
    with open(os.path.join(wal.dir, "quarantine.wal"), "rb") as fh:
        rec, _ = cw._frame_at(fh.read(), 0)
    assert rec == {"cid": "poison", "why": "bad vector"}
    wal.close()


def test_reopen_after_close_resumes_the_same_generation(tmp_path):
    wal = _wal(tmp_path)
    wal.append({"cid": "before"})
    gen = wal._gen
    wal.close()
    again = cw.CaptureWal(wal.dir)
    assert again._gen == gen
    again.append({"cid": "after"})
    assert list(again.replay()) == [{"cid": "before"}, {"cid": "after"}]
    again.close()


def test_an_insane_length_reads_as_garbage_not_a_record(tmp_path):
    wal = _wal(tmp_path)
    wal.append({"cid": "a"})
    with open(wal._segment_path(wal._gen), "ab") as fh:
        fh.write(cw._HEADER.pack(cw.MAGIC, cw.MAX_FRAME_BYTES + 1, 0) + b"xx")
    assert list(wal.replay()) == [{"cid": "a"}]
    wal.close()
