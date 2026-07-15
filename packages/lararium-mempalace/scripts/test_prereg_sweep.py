"""prereg_sweep — the null twin stays seeded-deterministic and the readings honest."""

import pytest

import prereg_sweep as ps


def test_shuffle_twin_preserves_alphabet_and_length_kills_sequence():
    streams = [list("abcabcabcabc"), list("xyzxyz")]
    twin = ps.shuffle_twin(streams)
    for s, t in zip(streams, twin):
        assert sorted(s) == sorted(t)  # alphabet + multiplicity survive
        assert len(s) == len(t)
    assert twin != streams  # the sequence died
    assert ps.shuffle_twin(streams) == twin  # seeded: a double run emits the same twin


def test_c1_reads_real_above_twin_on_sequenced_text():
    # a strongly sequenced corpus: the real streams pay far more than their shuffle
    streams = [(["aim", "hud", "ward", "content"] * 12) for _ in range(4)]
    out = ps.c1_reading(streams, min_support=2, max_candidates=96)
    assert out["real"]["saved_bits"] > 0
    assert out["sequence_only_bits"] > 0  # meaning-in-sequence carries the savings
    if out["meaning_ratio"] is not None:
        assert out["meaning_ratio"] > 1.0


def test_sweep_refuses_loud_when_no_sensorium_named():
    with pytest.raises(SystemExit, match="no sensorium named"):
        ps.main([])
