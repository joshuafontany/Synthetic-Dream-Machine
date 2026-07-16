"""The lares embed cap CONSUMES the mempalace embedder → store-compatible vectors BY CONSTRUCTION.
Pinned to `minilm` (local ONNX, no 300MB download, deterministic).

    MEMPALACE_EMBEDDING_MODEL=minilm PYTHONPATH=<repo>/mempalace \
      ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_embed_io.py -q
"""

import os

os.environ.setdefault("MEMPALACE_EMBEDDING_MODEL", "minilm")  # local, fast, deterministic

import embed_io  # noqa: E402


def test_embed_yields_384dim_vectors():
    r = embed_io.Embedder().embed(["hello world", "the verb leads"])
    assert r["dim"] == 384
    assert len(r["vectors"]) == 2
    assert all(len(v) == 384 for v in r["vectors"])
    assert all(isinstance(x, float) for x in r["vectors"][0])


def test_empty_batch_is_empty():
    r = embed_io.Embedder().embed([])
    assert r["vectors"] == []
    assert r["dim"] == 0


def test_vector_matches_the_mine_embedder_byte_for_byte():
    # The lift's whole promise: the cap's vector == the mine path's vector for the same text,
    # because both call get_embedding_function() (process-cached, same model). So a caller-vector
    # put lands store-compatible with a mine-built collection — no drift, no silent recall loss.
    from mempalace.embedding import get_embedding_function

    direct = get_embedding_function()(input=["same exact text"])[0]
    capd = embed_io.Embedder().embed(["same exact text"])["vectors"][0]
    assert len(capd) == len(direct) == 384
    assert max(abs(float(a) - float(b)) for a, b in zip(capd, direct)) < 1e-6


def test_model_name_rides_on_the_result(monkeypatch=None):
    r = embed_io.Embedder().embed(["x"])
    assert r["model"]  # the config model name for the EmbedderIdentity contract
