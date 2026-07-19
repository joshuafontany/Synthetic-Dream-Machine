"""test_sense_analyze — the isomorphic instrument, DETECT-ONLY over a poured sensorium's stream.

  · Foote finds a PLANTED vocabulary boundary in a raw stream (MAUP-free — no lines, the detection works
    off the word stream and the right scale lands on the seam).
  · detect() reads a POURED sensorium: pour once, point the instrument, read the reconstructed stream.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_sense_analyze.py -q
"""
import os
import random
import tempfile

import sense_analyze as sa

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "capture")
CLAUDE = os.path.join(FIXTURES, "claude-main.jsonl")


def _stub_embed_factory(dim=4, model="stub/4"):
    def factory():
        def embed_one(text):
            h = abs(hash(text))
            return [float((h >> (8 * i)) & 0xFF) for i in range(dim)]
        return embed_one, model
    return factory


def test_foote_finds_a_planted_vocabulary_boundary():
    # two vocab regions, one planted seam at word ~300; the right Foote scale lands a cut ON it — detection
    # off the WORD STREAM, no line grain, so it reads any poured stream the same way.
    rng = random.Random(1)
    sea = " ".join(rng.choice(["wave", "tide", "shore", "salt", "deep", "reef", "foam", "current"]) for _ in range(300))
    sky = " ".join(rng.choice(["cloud", "star", "wind", "dawn", "light", "sky", "moon", "drift"]) for _ in range(300))
    toks = sa.stream_words(sea + " " + sky)
    cuts = sa.foote_sweep(toks, (16, 32, 64))
    # SOME scale lands a boundary within 15 words of the planted seam (the wide kernels nail it near-exactly)
    near = [p for arm in cuts.values() for p in arm if abs(p - 300) <= 15]
    assert near, f"no Foote scale found the planted boundary at ~300; cuts={cuts}"


def test_detect_reads_a_poured_sensorium_stream(tmp_path):
    # pour the claude fixture into a sensorium, then POINT the instrument at its root — it reconstructs the
    # content stream (the same read rejim uses) and runs the sweep. The pour-then-point seam, end to end.
    from capture_session import capture_and_observe
    os.environ["LAR_WORLDLINE_SALT"] = "sense-analyze-witness"
    root = str(tmp_path / ".mem")
    capture_and_observe(root, "claude", CLAUDE, wing="w", embed_factory=_stub_embed_factory())
    res = sa.detect(root, halves=(4, 8, 16))
    assert res["n_words"] > 0 and res["n_chars"] > 0        # the reconstructed stream carried words
    assert "boundaries" in res                              # the sweep ran (tiny fixture → only small scales)


def test_resolve_content_takes_a_name_or_a_root(tmp_path):
    # a NAME resolves through the sense-memory roster; an explicit root path passes through unchanged.
    root = str(tmp_path / ".mem")
    assert sa.resolve_content(root).endswith(os.path.join(".mem", "content"))   # root path → its content dir
    named = sa.resolve_content("memory")
    assert named.endswith(os.path.join("memory", "content"))                    # name → roster → content dir
