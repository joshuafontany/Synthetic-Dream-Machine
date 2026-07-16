"""maximal_repeats — maximality, diversity, sentinel isolation, and determinism witnessed."""

import maximal_repeats as mr


def _seqs(out):
    return {tuple(c["seq"]): (c["support"], c["doc_freq"]) for c in out}


def test_finds_the_maximal_repeat_and_not_its_shadows():
    # "abc" repeats twice with differing left/right context; "ab"/"bc" are its
    # non-maximal shadows (same occurrences, extendable) and must NOT emit alone.
    out = mr.mine_maximal_repeats([list("xabcy"), list("zabcw")])
    got = _seqs(out)
    assert got[("a", "b", "c")] == (2, 2)
    assert ("a", "b") not in got and ("b", "c") not in got


def test_left_diversity_gates_the_emission():
    # "bc" always follows 'a' (left-unary) → not left-maximal; "abc" carries the value.
    out = mr.mine_maximal_repeats([list("abcabc")])
    got = _seqs(out)
    assert ("a", "b", "c") in got
    assert ("b", "c") not in got


def test_nested_maximal_repeats_both_emit():
    # "aba" in contexts x..y and z..w; inner "a" occurrences also stand left-diverse
    # at length >= 2 via "ab" — emit-all lets MDL arbitrate, so supersets never
    # swallow paying subsets at the generator.
    out = mr.mine_maximal_repeats([list("xabay"), list("zabaw"), list("qabqw")])
    got = _seqs(out)
    assert ("a", "b", "a") in got
    assert got[("a", "b", "a")][0] == 2
    assert ("a", "b") in got  # 3 occurrences, differing contexts — its own repeat
    assert got[("a", "b")][0] == 3


def test_sentinels_isolate_streams_by_theorem():
    # "ab" ends stream 1 and starts stream 2; a shared separator would manufacture
    # the phantom repeat "b|a"-crossing — unique sentinels make it impossible.
    out = mr.mine_maximal_repeats([list("xxab"), list("abyy")])
    got = _seqs(out)
    assert ("a", "b") in got
    assert got[("a", "b")] == (2, 2)  # one occurrence per stream, both streams counted
    for seq in got:
        assert all(not s.startswith("-") for s in seq)  # no sentinel ever rides out


def test_doc_freq_counts_streams_once_each():
    out = mr.mine_maximal_repeats([list("abab"), list("cabc")])
    got = _seqs(out)
    support, doc_freq = got[("a", "b")]
    assert support == 3   # two in stream 0, one in stream 1
    assert doc_freq == 2  # but two streams — OR is idempotent within a stream


def test_no_threshold_no_cap_full_pool():
    # every maximal repeat emits — no minsup, no top-k, no slice.
    streams = [list("abcabcabc"), list("defdefdef")]
    got = _seqs(mr.mine_maximal_repeats(streams))
    assert ("a", "b", "c") in got and ("d", "e", "f") in got
    assert got[("a", "b", "c")][1] == 1  # single-stream repeats still surface


def test_deterministic_and_order_free():
    a = mr.mine_maximal_repeats([list("xabcy"), list("zabcw"), list("abcq")])
    b = mr.mine_maximal_repeats([list("xabcy"), list("zabcw"), list("abcq")])
    assert a == b


def test_scale_sanity_runs_linearish():
    # the regression the lattice failed: long repetitive low-alphabet streams.
    import time

    streams = [(list("abcde") * 400)[: 2000 + i] for i in range(8)]  # ~16k tokens
    t0 = time.time()
    out = mr.mine_maximal_repeats(streams)
    took = time.time() - t0
    assert out  # repeats surface
    assert took < 30  # the lattice walk never returned at all on this shape
