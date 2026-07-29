#!/usr/bin/env python3
"""embed_io — the lares EMBED cap: text → vector, the LIFT-AS-CONSUME of the vendored mempalace
embedder. It CONSUMES `mempalace.embedding.get_embedding_function` (does NOT reimplement it), so the
vectors are byte-COMPATIBLE with the mempalace chroma store BY CONSTRUCTION (same config-selected
model, same 384-dim, same L2-norm, same cosine space) and upstream embed releases flow back through
the submodule. The web3-only law holds: their web2 code runs behind the causal-island boundary (this
holder); the lares stack proper speaks only the dumb NDJSON `embed` op.

This is the EMBED half of the single-writer split — the embed fans out here (parallel, stateless),
`content_io.put` commits the caller-vector (serial). A PALACE-LESS encode-only holder: the model
loads once per process (get_embedding_function is process-cached), no store, no lock.

Protocol — NDJSON over stdin/stdout:
    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true,"model":"minilm","dim":384}}

    -> {"id":2,"op":"embed","texts":["a turn","another"]}
    <- {"id":2,"ok":true,"result":{"vectors":[[...],[...]],"model":"minilm","dim":384}}

Run under the mempalace interpreter (it has the package + the ONNX embedder):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 embed_io.py serve
"""
from __future__ import annotations

import argparse

from mempalace.embedding import current_model_name, get_embedding_function

from holder_caps import idle_ttl_seconds, make_dispatch, run_holder

IDLE_TTL_ENV = "EMBED_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0


class Embedder:
    """One loaded embedding function (the config-selected model), cached for the holder's life.
    CONSUMES the vendored factory — a vector here is identical to the mine path's for the same
    text + same model (both call get_embedding_function()), so a caller-vector put stays
    store-compatible. The `model` name rides on every result so a consumer can record/verify the
    EmbedderIdentity (name+dim) and fail loud on a later model swap."""

    def __init__(self) -> None:
        self._ef = get_embedding_function()   # config model + device; process-cached in _EF_CACHE
        self._model = current_model_name()    # the config name (NOT the spoofed EF name())

    def embed(self, texts: list) -> dict:
        items = list(texts)
        if not items:   # the ONNX EF cannot concatenate an empty batch — short-circuit
            return {"vectors": [], "model": self._model, "dim": 0}
        vecs = self._ef(input=items)
        out = [[float(x) for x in v] for v in vecs]
        return {"vectors": out, "model": self._model, "dim": (len(out[0]) if out else 0)}


def _build_ops(e: Embedder) -> dict:
    return {
        "ping": lambda req: {"ready": True, "model": e._model},
        "embed": lambda req: e.embed(req.get("texts", [])),
    }


def _serve() -> None:
    run_holder(
        palace=None,   # encode-only: no store, no per-palace lock (the model IS the resource)
        lock_prefix="embed_serve",
        build_dispatch=lambda: make_dispatch(_build_ops(Embedder())),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="embed_io: palace-less holder (no singleton lock)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="lares embed cap — text→vector via the mempalace embedder (consume-not-copy)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON embed holder (the model loads once)")
    s.set_defaults(fn=lambda a: _serve())
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
