#!/usr/bin/env python3
"""spectral_keel — the F4 math unit-test for the SR/graph-Laplacian UNIFICATION keel (the hoike's
"crown jewel"), validated BEFORE any corpus. Corpus-independent, numpy-only.

THE CLAIM (symmetric arm, must hold): for a reversible random walk on a symmetric graph, the
normalized operator S = D^-1/2 W D^-1/2, its Laplacian L = I - S, and the successor operator
M = (I - gamma*S)^-1 SHARE an eigenbasis; the eigenvalue maps are monotone in lambda —
  L: lambda -> 1 - lambda   (smallest L  = largest lambda)
  M: lambda -> 1/(1 - gamma*lambda)  (largest M = largest lambda)
so the BOTTOM-d Laplacian subspace = the TOP-d SR subspace. "The graph generates the geometry."

THE HONEST DIRECTED CAVEAT (the QA-Breaker's strike #2, confirmed here): for a DIRECTED graph the
random-walk operator is generically NON-NORMAL — no shared orthonormal eigenbasis; the identity
degrades. We measure departure-from-normality so a fragile directed arm stays VISIBLE, never hidden.
The directed arm must use a directed/reversibilized Laplacian + subspace comparison, not this identity.
"""
from __future__ import annotations

import numpy as np


def sym_normalized(W: np.ndarray) -> np.ndarray:
    """S = D^-1/2 W D^-1/2 — symmetric normalized adjacency (reversible-RW basis)."""
    d = np.asarray(W).sum(axis=1)
    dm12 = 1.0 / np.sqrt(np.where(d > 0, d, 1.0))
    return (W * dm12[:, None]) * dm12[None, :]


def principal_angle_deg(A: np.ndarray, B: np.ndarray) -> float:
    """Largest principal angle (degrees) between the column-spans of A and B (subspace distance)."""
    Qa, _ = np.linalg.qr(A)
    Qb, _ = np.linalg.qr(B)
    s = np.linalg.svd(Qa.T @ Qb, compute_uv=False)
    return float(np.degrees(np.arccos(np.clip(s.min(), -1.0, 1.0))))


def shared_eigenbasis(W: np.ndarray, gamma: float = 0.95, d: int = 4) -> dict:
    """Build S, L=I-S, M=(I-gamma*S)^-1 as SEPARATE matrices; eigendecompose each; compare the
    bottom-d Laplacian subspace to the top-d SR subspace. Returns the principal angle + a pass flag."""
    n = W.shape[0]
    S = sym_normalized(W)
    L = np.eye(n) - S
    M = np.linalg.inv(np.eye(n) - gamma * S)

    _, VL = np.linalg.eigh(L)              # ascending eigenvalues → bottom-d = first d columns
    L_bottom = VL[:, :d]
    Mvals, VM = np.linalg.eigh(M)          # ascending → top-d = LAST d columns
    M_top = VM[:, -d:]

    angle = principal_angle_deg(L_bottom, M_top)
    return {"angle_deg": angle, "shares_eigenbasis": angle < 5.0, "d": d, "gamma": gamma, "n": n}


def departure_from_normality(W: np.ndarray) -> float:
    """||T^T T - T T^T||_F / ||T||_F^2 for the random-walk T = D^-1 W — 0 iff normal (symmetric case);
    large ⇒ the shared-eigenbasis identity does NOT apply (directed/non-reversible)."""
    d = np.asarray(W).sum(axis=1)
    T = W / np.where(d > 0, d, 1.0)[:, None]
    comm = T.T @ T - T @ T.T
    denom = np.linalg.norm(T, "fro") ** 2
    return float(np.linalg.norm(comm, "fro") / denom) if denom > 0 else 0.0


def ring_graph(n: int = 24) -> np.ndarray:
    """A symmetric ring adjacency (each node linked to its 2 neighbors) — a clean reversible RW."""
    W = np.zeros((n, n))
    for i in range(n):
        W[i, (i + 1) % n] = 1.0
        W[i, (i - 1) % n] = 1.0
    return W


def grid_knn(n_side: int = 6) -> np.ndarray:
    """A symmetric 2D-grid adjacency (4-neighbor) — the Constantinescu-style 2D navigable space."""
    n = n_side * n_side
    W = np.zeros((n, n))
    for r in range(n_side):
        for c in range(n_side):
            i = r * n_side + c
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < n_side and 0 <= cc < n_side:
                    W[i, rr * n_side + cc] = 1.0
    return W
