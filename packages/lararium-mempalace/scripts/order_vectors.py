"""order_vectors — evidence-preserving adapters from sensorium ground to ordered vectors."""
from __future__ import annotations

import os
import numpy as np


def source_ordered_vectors(sensorium: str):
    """Read vectors in declared source/chunk order, never inventing cross-source history."""
    try:
        from mempalace.palace import get_collection
        col = get_collection(os.path.join(sensorium, "content"), _skip_identity_check=True)
        got = col.get(include=["embeddings", "metadatas"])
    except Exception as exc:  # noqa: BLE001 — a read adapter names its unavailable ground
        return [], [], f"bands-skipped: content readback ({type(exc).__name__})"
    rows = []
    for cid, embedding, meta in zip(got.get("ids", []), got.get("embeddings", []), got.get("metadatas", [])):
        if embedding is None:
            continue
        meta = meta or {}
        rows.append((meta.get("source_file", ""), meta.get("chunk_index", 1 << 30), cid,
                     np.asarray(embedding, dtype=float)))
    if len(rows) < 2:
        return [], [], f"bands-skipped: too few vectors ({len(rows)})"
    rows.sort(key=lambda row: (row[0], row[1] if row[1] is not None else 1 << 30, row[2]))
    return [row[2] for row in rows], np.vstack([row[3] for row in rows]), f"source-order: {len(rows)} vectors"
