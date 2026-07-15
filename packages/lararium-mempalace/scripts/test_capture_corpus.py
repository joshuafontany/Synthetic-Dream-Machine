"""The production corpus pointer pipe shares the test-bed cap stack without test-bed ownership."""
from capture_corpus import compose_corpus_stream_sensorium, write_corpus_manifest


def _embed_factory():
    return (lambda text: [float(len(text)), 0.0, 1.0, 0.0]), "stub-corpus/4"


def test_corpus_pointer_pipe_lands_and_rederives_idempotently(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    (source / "one.md").write_text("# One\n\nA durable corpus pointer.\n", encoding="utf-8")
    root = tmp_path / "sensorium"
    stream, _store, paths = compose_corpus_stream_sensorium(
        str(root), wing="wing_corpus", embed_factory=_embed_factory)
    first = stream.capture(str(source))
    second = stream.capture(str(source))
    assert first["landed"] == 1 and second["landed"] == 0 and second["skipped"] == 1
    assert paths.content == str(root / "content")
    assert stream._persistence.path == str(root / "persistence")
    assert stream._persistence.active is False
    assert not (root / "persistence").exists()


def test_production_manifest_is_not_ephemeral(tmp_path):
    path = write_corpus_manifest(str(tmp_path), name="production")
    import json
    with open(path, encoding="utf-8") as fh:
        manifest = json.load(fh)
    assert manifest["sensorium"] == "production" and manifest["ephemeral"] is False


def test_bands_fault_keeps_the_durable_capture(monkeypatch, tmp_path):
    import capture_corpus
    import bands_sidecar
    import corpus_worldline

    class Stream:
        def capture(self, _pointer):
            return {"landed": 1, "planes": {"structure": {"landed": 1}, "form": {"forms": 2}}}

    paths = type("Paths", (), {"root": str(tmp_path)})()
    monkeypatch.setattr(capture_corpus, "compose_corpus_stream_sensorium", lambda *_args, **_kwargs: (Stream(), None, paths))
    monkeypatch.setattr(bands_sidecar, "analyze_sensorium", lambda _root: (_ for _ in ()).throw(RuntimeError("no aperture")))
    monkeypatch.setattr(corpus_worldline, "backfill", lambda _root: {"edges": 0})

    out = capture_corpus.capture("pointer", str(tmp_path), wing="wing_corpus")
    assert out["drawers"] == 1 and out["bands"] == 0
    assert "bands-skipped: analyzer fault (RuntimeError)" in out["note"]
