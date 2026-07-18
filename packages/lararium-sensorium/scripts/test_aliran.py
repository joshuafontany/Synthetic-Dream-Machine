"""test_aliran — DETECT the nameless flows before naming them.

  · detection finds a real content-channel aliran in a refrain-bearing stream, emitted NAMELESS
    (name=None) with its capability record — the detect-before-name floor.
  · pure noise fabricates ZERO aliran — the anti-fabrication null (a flow must EARN detection).
  · the cepat⊥lambat coupling pairs a fast flow nested in a slower one.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_aliran.py -q
"""
import numpy as np

from aliran import CONTENT, couple_aliran, detect_aliran


def _refrain_text(n_reps: int = 140, seed: int = 11) -> str:
    """A stream carrying ONE planted content refrain (its >12-char phrase recurs every ~240 ticks) amid
    varied filler that never recurs — so only the refrain fires the recurrence channel."""
    rng = np.random.default_rng(seed)
    refrain = "and the wave returns to the shore once more "
    out = []
    for _ in range(n_reps):
        out.append(refrain)
        filler = ["".join("aeioukpnmhrstl"[int(c)] for c in rng.integers(0, 14, int(rng.integers(4, 9))))
                  for _ in range(int(rng.integers(22, 30)))]
        out.append(" ".join(filler) + " ")
    return "".join(out)


def _noise_text(n: int = 30000, seed: int = 7) -> str:
    rng = np.random.default_rng(seed)
    a = list("abcdefghijklmnop .\n,")
    return "".join(a[i] for i in rng.integers(0, len(a), n))


def test_detect_finds_a_nameless_aliran_in_a_refrain_stream():
    r = detect_aliran(_refrain_text(), channel=CONTENT, n_surrogates=3)
    assert r["n_ticks"] > 20000                       # a real, lock-scale stream (tens of thousands of ticks)
    assert r["aliran"], "detection found no flow in a stream with a planted refrain"
    for a in r["aliran"]:
        assert a["name"] is None                      # NAMELESS — detect before name
        assert a["scale"] >= 16                        # the smallest gateable scale
        assert a["channel"] == CONTENT                 # content-only — no sigils entered detection
        assert a["lock"].get("locked_frac", 0) > 0.5   # a real lock, not a flicker


def test_noise_stream_fabricates_no_aliran():
    # the anti-fabrication null: pour pure noise, detect NOTHING — a flow must earn detection over its
    # own block-shuffle null, so noise cannot manufacture a nameless entity out of nothing.
    r = detect_aliran(_noise_text(), channel=CONTENT, n_surrogates=3)
    assert r["aliran"] == []


def test_couple_nests_cepat_in_lambat():
    # the cepat⊥lambat structural coupling over a detected aliran-set (unit — no pour): a fast flow pairs
    # with every slower flow it nests in, ratio = how many fast periods sit in one slow, cepat-first.
    reading = {"aliran": [
        {"scale": 128, "channel": CONTENT, "name": None},
        {"scale": 512, "channel": CONTENT, "name": None},
        {"scale": 2048, "channel": CONTENT, "name": None},
    ]}
    couples = couple_aliran(reading)
    assert couples, "no cepat⊥lambat couple formed from three nested flows"
    assert all(c["lambat"] > c["cepat"] for c in couples)          # lambat is always the slower flow
    fast = next(c for c in couples if c["cepat"] == 128 and c["lambat"] == 512)
    assert fast["ratio"] == 4.0                                    # 512/128 — four fast periods per slow
    assert fast["modulation"] is None                              # v1 fills the amplitude-modulation witness
