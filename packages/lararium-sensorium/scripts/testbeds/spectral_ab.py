#!/usr/bin/env python3
"""spectral_ab — the A/B harness over a real drawer corpus (the QA-hardened plan). Step 3.5 (the
snapshot-validity gate + concentration/hubness diagnostics) and Arm A (content) as an HONEST CONTROL:
the eigenmap is built FROM the cosine k-NN graph, so eigenmap≈cosine is near-tautological — it certifies
the pipeline runs (a positive control), never the model. It reads NULL-RELATIVE (beats the
label-permutation null), and reports concentration so a non-discriminating regime stays visible.

Arm B (the informative differential — SR-reachability vs cosine-NN on an ast-hash-recurrence task) lands
in a sibling pass once the transition-graph choice is made; this pass gates it.

    ~/.venv/bin/python spectral_ab.py [chroma_path] [sample_n]
"""
from __future__ import annotations

import sys

import numpy as np

import spectral_geometry as sg


def load_corpus(path: str, sample_n: int, seed: int = 7):
    import chromadb

    col = chromadb.PersistentClient(path=path).list_collections()[0]
    n = col.count()
    got = col.get(limit=n, include=["embeddings", "metadatas"])
    emb = np.asarray(got["embeddings"], dtype=float)
    metas = got["metadatas"]
    rng = np.random.default_rng(seed)
    take = rng.choice(emb.shape[0], size=min(sample_n, emb.shape[0]), replace=False)
    return emb[take], [metas[i] for i in take]


def validity_gate(emb: np.ndarray, metas) -> dict:
    """Broader corruption than the room-collapse: vectors present + non-degenerate, hashes populated."""
    norms = np.linalg.norm(emb, axis=1)
    uniq = np.unique(np.round(emb, 6), axis=0).shape[0]
    hashes = sum(1 for m in metas if m.get("lar_ast_hash"))
    gate = {
        "n": int(emb.shape[0]),
        "dim": int(emb.shape[1]),
        "zero_vectors": int(np.sum(norms < 1e-9)),
        "distinct_fraction": round(uniq / emb.shape[0], 4),
        "ast_hash_populated": round(hashes / len(metas), 4),
    }
    gate["pass"] = gate["zero_vectors"] == 0 and gate["distinct_fraction"] > 0.5 and gate["ast_hash_populated"] > 0.5
    return gate


def _unit(emb):
    return emb / np.clip(np.linalg.norm(emb, axis=1, keepdims=True), 1e-12, None)


def concentration_diagnostics(emb: np.ndarray, sample_pairs: int = 4000, seed: int = 11) -> dict:
    """std/mean of pairwise cosine distances (relative contrast) + two-NN intrinsic dim + hubness skew.
    A low std/mean ⇒ severe concentration ⇒ overlap@k loses discrimination (demote to subspace metric)."""
    U = _unit(emb)
    rng = np.random.default_rng(seed)
    n = U.shape[0]
    ii = rng.integers(0, n, sample_pairs)
    jj = rng.integers(0, n, sample_pairs)
    ok = ii != jj
    d = 1.0 - np.sum(U[ii[ok]] * U[jj[ok]], axis=1)
    rel_contrast = float(np.std(d) / np.mean(d)) if np.mean(d) > 0 else 0.0
    # two-NN intrinsic dimension (Facco et al.)
    sim = U @ U.T
    np.fill_diagonal(sim, -np.inf)
    part = np.sort(sim, axis=1)[:, -2:]           # top-2 similarities per point
    r1 = 1.0 - part[:, -1]
    r2 = 1.0 - part[:, -2]
    mu = r2 / np.clip(r1, 1e-12, None)
    mu = mu[np.isfinite(mu) & (mu > 1.0)]
    two_nn_id = float(len(mu) / np.sum(np.log(mu))) if len(mu) else float("nan")
    # hubness: skew of N_10 (times each point sits in others' top-10)
    k = 10
    nn = np.argsort(-sim, axis=1)[:, :k]
    counts = np.bincount(nn.reshape(-1), minlength=n).astype(float)
    m, s = counts.mean(), counts.std()
    hub_skew = float(np.mean(((counts - m) / s) ** 3)) if s > 0 else 0.0
    return {
        "rel_contrast_std_over_mean": round(rel_contrast, 4),
        "two_nn_intrinsic_dim": round(two_nn_id, 2),
        "hubness_Nk_skew": round(hub_skew, 3),
        "severe_concentration": rel_contrast < 0.15,
    }


def _knn_graph(U, k):
    sim = U @ U.T
    np.fill_diagonal(sim, -np.inf)
    nn = np.argsort(-sim, axis=1)[:, :k]
    n = U.shape[0]
    W = np.zeros((n, n))
    for i in range(n):
        for j in nn[i]:
            W[i, j] = W[j, i] = 1.0            # symmetrize → fn.sym
    return W, nn


def _overlap_at_k(nn_a, nn_b, k):
    return float(np.mean([len(set(a) & set(b)) / k for a, b in zip(nn_a, nn_b)]))


def arm_a_control(emb: np.ndarray, k: int = 10, d: int = 32, seed: int = 3) -> dict:
    """CONTROL: eigenmap-neighbors vs cosine-neighbors overlap@k, read against the label-permutation null.
    High overlap here proves the pipeline runs, NOT the model (the eigenmap is built from the cosine kNN)."""
    U = _unit(emb)
    W, cos_nn = _knn_graph(U, k)
    coords = sg.geometry(W, "fn.sym", "laplacian", d=d)
    C = _unit(coords)
    csim = C @ C.T
    np.fill_diagonal(csim, -np.inf)
    eig_nn = np.argsort(-csim, axis=1)[:, :k]
    overlap = _overlap_at_k(cos_nn, eig_nn, k)
    # label-permutation null: shuffle the eigenmap rows
    rng = np.random.default_rng(seed)
    perm = rng.permutation(U.shape[0])
    null = _overlap_at_k(cos_nn, eig_nn[perm], k)
    return {"overlap_at_k": round(overlap, 4), "null_overlap": round(null, 4),
            "beats_null": overlap > null * 3 + 0.05, "k": k, "d": d}


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "/home/joshu/.mempalace/palace"
    sample_n = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
    emb, metas = load_corpus(path, sample_n)
    print("validity_gate:", validity_gate(emb, metas))
    print("concentration:", concentration_diagnostics(emb))
    print("arm_a_control:", arm_a_control(emb))
