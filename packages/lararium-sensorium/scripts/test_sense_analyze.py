"""test_sense_analyze — the isomorphic instrument, DETECT-ONLY over a poured sensorium's stream.

  · Foote finds a PLANTED vocabulary boundary in a raw stream (MAUP-free — no lines, the detection works
    off the word stream and the right scale lands on the shore).
  · detect() reads a POURED sensorium: pour once, point the instrument, read the reconstructed stream.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_sense_analyze.py -q
"""
import os
import random
import tempfile

import numpy as np

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
    # two vocab regions, one planted shore at word ~300; the right Foote scale lands a cut ON it — detection
    # off the WORD STREAM, no line grain, so it reads any poured stream the same way.
    rng = random.Random(1)
    sea = " ".join(rng.choice(["wave", "tide", "shore", "salt", "deep", "reef", "foam", "current"]) for _ in range(300))
    sky = " ".join(rng.choice(["cloud", "star", "wind", "dawn", "light", "sky", "moon", "drift"]) for _ in range(300))
    toks = sa.stream_words(sea + " " + sky)
    cuts = sa.foote_sweep(toks, (16, 32, 64))
    # SOME scale lands a boundary within 15 words of the planted shore (the wide kernels nail it near-exactly)
    near = [p for arm in cuts.values() for p in arm if abs(p - 300) <= 15]
    assert near, f"no Foote scale found the planted boundary at ~300; cuts={cuts}"


def test_detect_reads_a_poured_sensorium_stream(tmp_path, monkeypatch):
    # pour the claude fixture into a sensorium, then POINT the instrument at its root — it reconstructs the
    # content stream (the same read rejim uses) and runs the sweep. The pour-then-point shore, end to end.
    from capture_session import capture_and_observe
    # monkeypatch, never a bare set: this ran as `os.environ[...] = ...` and leaked the salt into
    # every later test in the process. Latent only because `test_worldline_veil` defends itself
    # with `delenv` — a defence living in the victim rather than the source.
    monkeypatch.setenv("LAR_WORLDLINE_SALT", "sense-analyze-witness")
    root = str(tmp_path / ".mem")
    capture_and_observe(root, "claude", CLAUDE, wing="w", embed_factory=_stub_embed_factory())
    res = sa.detect(root, halves=(4, 8, 16))
    assert res["n_words"] > 0 and res["n_chars"] > 0        # the reconstructed stream carried words
    assert "boundaries" in res                              # the sweep ran (tiny fixture → only small scales)


def test_sequitur_and_entropy_arms_land_a_planted_boundary():
    # a grammar/vocabulary regime change at word 200; the adapted arms report WORD positions (owner=identity,
    # no line fold-back). At least one grammar arm and one entropy arm land a cut near the shore.
    a = ("the cat sat on the mat and the cat ran ".split()) * 20
    b = ("a bird flew over a hill then a bird dove ".split()) * 20
    toks = a + b
    seq = sa.sequitur_arms(toks)
    seq.pop("_grammar")
    ent = sa.branching_entropy(toks)
    grammar_hit = any(abs(p - 200) <= 25 for cuts in seq.values() for p in cuts)
    entropy_hit = any(abs(p - 200) <= 25 for cuts in ent.values() for p in cuts)
    assert grammar_hit, f"no grammar arm found the planted boundary; seq={seq}"
    assert entropy_hit, f"no entropy arm found the planted boundary; ent={ent}"


def test_mdl_arm_fires_on_a_compression_stall():
    # a tight refrain (folds to rules → flat cost) then all-novel vocabulary (sustained cost) — PELT over the
    # MDL series infers ONE cut, and it lands at the stall. The MDL count is inferred, never typed.
    refrain = ("the cat sat on the mat ".split()) * 30
    novel = [f"novelword{i}" for i in range(180)]
    growth = sa.mdl_growth(refrain + novel)
    assert np.count_nonzero(growth) > 0                          # the series carries signal
    cuts, n_inferred = sa.pelt_change_points(growth)
    assert all(isinstance(c, int) for c in cuts)                 # JSON-clean (no np.int32)
    assert any(abs(c - len(refrain)) <= 25 for c in cuts), f"MDL missed the stall at {len(refrain)}; cuts={cuts}"


def test_spectral_validity_gate_reads_any_corpus():
    # faithful distinct vectors pass on vector-health alone; the ast-hash fraction rides informational (prose
    # has none), never gating. A degenerate all-identical matrix fails on distinctness.
    rng = np.random.default_rng(0)
    faithful = rng.normal(size=(200, 384))
    gate = sa.validity_gate(faithful, [{} for _ in range(200)])   # no lar_ast_hash — prose-shaped metas
    assert gate["pass"] and gate["ast_hash_populated"] == 0.0
    degenerate = np.ones((200, 384))
    assert not sa.validity_gate(degenerate, [{}] * 200)["pass"]   # zero distinct fraction → fails


def test_spectral_control_beats_null_on_structured_vectors():
    # three well-separated gaussian blobs → the eigenmap recovers the cosine-kNN structure, so overlap@k
    # beats the label-permutation null. The positive control certifies the pipeline runs.
    rng = np.random.default_rng(1)
    centers = (np.eye(16)[0] * 5, np.eye(16)[1] * 5, np.eye(16)[2] * 5)
    blobs = np.vstack([rng.normal(loc, 0.1, size=(80, 16)) for loc in centers])
    ctrl = sa.spectral_control(blobs, k=10, d=8)
    assert ctrl["beats_null"], f"control failed to beat null on structured vectors; {ctrl}"


def test_detect_runs_the_full_arm_surface():
    # detect() over a stream carries every adapted arm — Foote scales, sequitur depth+shore, sequitur-mdl, and
    # the branching-entropy depths — each keyed in the boundary surface, each a list of word positions.
    a = ("alpha beta gamma delta epsilon ".split()) * 60
    b = ("one two three four five six seven ".split()) * 60
    words = a + b
    # drive detect() off an in-memory stream — patch the store door + stream read so no pour is needed
    shore = " ".join(words)
    orig_store, orig_stream, orig_resolve = sa.ContentStore, sa._content_stream, sa.resolve_content
    sa.resolve_content = lambda _s: "/dev/null/content"
    sa.ContentStore = lambda _c: None
    sa._content_stream = lambda _store: shore
    try:
        res = sa.detect("synthetic", halves=(16, 32, 64))
    finally:
        sa.ContentStore, sa._content_stream, sa.resolve_content = orig_store, orig_stream, orig_resolve
    arms = res["boundaries"]
    assert any(a.startswith("foote-") for a in arms)
    assert "sequitur-depth" in arms and "sequitur-shore" in arms
    assert "sequitur-mdl" in arms
    assert "branch-h1" in arms and "branch-h2" in arms
    assert all(isinstance(p, int) for cuts in arms.values() for p in cuts)   # every cut a plain-int position


def test_resolve_content_takes_a_name_or_a_root(tmp_path):
    # a NAME resolves through the sense-memory roster; an explicit root path passes through unchanged.
    root = str(tmp_path / ".mem")
    assert sa.resolve_content(root).endswith(os.path.join(".mem", "content"))   # root path → its content dir
    named = sa.resolve_content("memory")
    assert named.endswith(os.path.join("memory", "content"))                    # name → roster → content dir
