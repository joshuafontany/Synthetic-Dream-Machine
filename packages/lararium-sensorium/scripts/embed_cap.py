"""embed_cap — the EMBED-IN-ENGINE cap: text → vector, with the config embedder held warm in the
sensorium's OWN process (minilm/384, loaded once + process-cached). It CONSUMES the vendored
mempalace.embedding.get_embedding_function, so a vector here matches the mine-path's for the same text
(store-compatible by construction). The web2 model runs behind the causal-island (this process); the
sensorium sees only a text→vector callable. `embed_io` (the separate NDJSON holder) stands in place for
the parallel fan-out split; this in-engine cap serves the serial land-leg (fork-B: embed-in-engine —
the ~500ms budget forbids a cold per-hook embed, and the model rides warm here).
"""
from __future__ import annotations

from mempalace.embedding import current_model_name, get_embedding_function


def make_embed_cap():
    """Load the config embedder ONCE and return `(embed_one, model_name)`. `embed_one(text)` returns a
    dense vector; `model_name` rides back so the caller stamps `lar_embedder_model` (the model-name half
    of the embedder-identity floor). The model loads on the first call + caches for the holder's life.

    `embed_one` carries an `embed_many` attribute: it embeds a LIST of texts in ONE engine call, feeding the
    model's own internal batching (it sub-batches at 32) instead of starving it one text at a time. A caller
    that drains a window of records hands the whole window across at once — same vectors, order preserved,
    the GPU fed. The scalar `embed_one` stays the one-off door; `embed_many` serves the batched land-leg."""
    ef = get_embedding_function()
    model = current_model_name()

    def embed_many(texts: "list[str]") -> "list[list]":
        if not texts:
            return []
        vecs = ef(input=list(texts))
        return [[float(x) for x in v] for v in vecs]

    def embed_one(text: str) -> list:
        return embed_many([text])[0]

    embed_one.embed_many = embed_many   # the batched door rides alongside the scalar one
    return embed_one, model
