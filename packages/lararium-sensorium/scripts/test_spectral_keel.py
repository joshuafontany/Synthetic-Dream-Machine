"""F4 — the SR/graph-Laplacian shared-eigenbasis keel. Symmetric arm MUST hold (crown jewel);
the directed arm MUST show departure-from-normality (the QA-Breaker's strike #2, made visible).

    ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_spectral_keel.py -q
"""

import numpy as np

import spectral_keel as sk


def test_symmetric_ring_shares_eigenbasis():
    # the crown-jewel claim: bottom-d Laplacian subspace == top-d SR subspace, on a reversible RW.
    # d=3 completes the ring's degenerate blocks ({k=0} + the k=±1 pair) — splitting a degenerate pair
    # (e.g. d=4) inflates the subspace angle by a few degrees (the R2 warning: group degenerate blocks),
    # which is a cutoff artifact, NOT a math failure. shares_eigenbasis (<5°) is the real criterion.
    r = sk.shared_eigenbasis(sk.ring_graph(24), gamma=0.95, d=3)
    assert r["shares_eigenbasis"], f"F4 FAILED — model void: principal angle {r['angle_deg']:.2f}° ≥ 5°"
    assert r["angle_deg"] < 1.0        # block-complete cutoff → near-exact shared eigenbasis
    # and even a block-SPLITTING cutoff still shares within the 5° criterion (artifact, not failure)
    assert sk.shared_eigenbasis(sk.ring_graph(24), gamma=0.95, d=4)["shares_eigenbasis"]


def test_symmetric_grid_shares_eigenbasis_across_gamma():
    W = sk.grid_knn(6)
    for gamma in (0.9, 0.95, 0.99):
        r = sk.shared_eigenbasis(W, gamma=gamma, d=6)
        assert r["shares_eigenbasis"], f"gamma={gamma}: angle {r['angle_deg']:.2f}°"


def test_symmetric_graph_is_normal_directed_is_not():
    # symmetric W → random-walk T is (D-)normal → departure ~ 0; a directed graph → large departure,
    # so the shared-eigenbasis identity does NOT apply to the directed arm (Breaker strike #2, shown).
    sym = sk.departure_from_normality(sk.ring_graph(24))
    directed = np.zeros((5, 5))
    for i in range(4):
        directed[i, i + 1] = 1.0        # a pure chain 0->1->2->3->4 (maximally non-reversible)
    directed[4, 4] = 1.0
    dep = sk.departure_from_normality(directed)
    assert sym < 1e-6                    # symmetric RW is normal in the D-inner-product basis
    assert dep > sym                     # directed is non-normal → identity degrades (honest caveat holds)
