#!/usr/bin/env python3
"""spectral_geometry — the functor `geometry`: a Ki-flow graph → its Li-spectral-embedding. ONE engine,
two modes — laplacian (bottom-d, the smooth content coordinates) and sr (top-d, the transition/
reconstruction landscape) — both read off the SAME operator S; the INPUT GRAPH swaps, never the engine.

It REFUSES eff.dir (transfer-entropy never generates geometry — the edge-kind guard, python side). The
three functor tests live beside it: engine-identity (the two modes share a subspace, F4), H⁰ = connected
components (Hansen-Ghrist: dim ker L = the constant-sheaf sections), and the naturality square (geometry
respects a structure-preserving quotient — a functor, not merely a function). Corpus-independent, numpy.

Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
"""
from __future__ import annotations

import numpy as np

import spectral_keel as sk

GEOMETRY_KINDS = frozenset({"fn.sym", "tr.dir"})


def geometry(W, kind: str, mode: str = "laplacian", d: int = 4, gamma: float = 0.95) -> np.ndarray:
    """The functor: a graph + its edge-kind → d-dim spectral coordinates. `laplacian` reads the bottom-d
    (smoothest) modes; `sr` reads the top-d of (I-gamma*S)^-1 (the landscape). Both from the same S.
    Refuses eff.dir — an effective/TE edge never generates geometry."""
    if kind not in GEOMETRY_KINDS:
        raise ValueError(f"geometry refuses '{kind}' — only fn.sym|tr.dir generate geometry (eff.dir/TE never does)")
    S = sk.sym_normalized(np.asarray(W, dtype=float))
    n = S.shape[0]
    if mode == "laplacian":
        _, V = np.linalg.eigh(np.eye(n) - S)          # ascending → bottom-d = smoothest
        return V[:, :d]
    if mode == "sr":
        _, V = np.linalg.eigh(np.linalg.inv(np.eye(n) - gamma * S))  # ascending → top-d = landscape
        return V[:, -d:]
    raise ValueError(f"geometry: unknown mode '{mode}' (laplacian|sr)")


def h0_dim(W, tol: float = 1e-9) -> int:
    """H⁰ = dim ker(L) = the number of connected components (Hansen-Ghrist: the graph Laplacian is the
    constant-sheaf Laplacian; ker = locally-constant sections). Uses the combinatorial Laplacian."""
    W = np.asarray(W, dtype=float)
    L = np.diag(W.sum(axis=1)) - W
    return int(np.sum(np.linalg.eigvalsh(L) < tol))


def _quotient(W, groups) -> np.ndarray:
    """The merge-quotient graph G': one super-node per group, edge weights summed, self-loops dropped."""
    W = np.asarray(W, dtype=float)
    k = len(groups)
    idx = {node: gi for gi, g in enumerate(groups) for node in g}
    Wq = np.zeros((k, k))
    nz = np.argwhere(W != 0.0)
    for i, j in nz:
        Wq[idx[i], idx[j]] += W[i, j]
    np.fill_diagonal(Wq, 0.0)
    return Wq


def naturality_angle(W, groups, mode: str = "laplacian", d: int = 3, gamma: float = 0.95) -> float:
    """The naturality square: geometry(G) pushed through the quotient q (average coords per group) vs
    geometry(G') computed directly. Returns the principal angle (deg) between the two d-subspaces —
    small ⇒ geometry commutes with the structure-preserving morphism (a functor, not just a function)."""
    coords_g = geometry(W, "fn.sym", mode, d, gamma)
    pushed = np.array([coords_g[g].mean(axis=0) for g in groups])
    coords_gq = geometry(_quotient(W, groups), "fn.sym", mode, d, gamma)
    return sk.principal_angle_deg(pushed, coords_gq)
