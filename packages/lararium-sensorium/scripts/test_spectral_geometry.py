"""The functor `geometry` — its three certifying tests: engine-identity (F4 at engine level), H⁰ =
connected components (Hansen-Ghrist), and the naturality square (commutes for a structure-preserving
quotient — a functor, not just a function). Plus the eff.dir refusal.

    ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_spectral_geometry.py -q
"""

import numpy as np
import pytest

import spectral_geometry as sg
import spectral_keel as sk


def test_geometry_refuses_eff_dir():
    W = sk.ring_graph(12)
    for kind in ("fn.sym", "tr.dir"):
        assert sg.geometry(W, kind, "laplacian", d=3).shape == (12, 3)
    with pytest.raises(ValueError, match="geometry refuses 'eff.dir'"):
        sg.geometry(W, "eff.dir", "laplacian", d=3)


def test_engine_identity_laplacian_and_sr_share_subspace():
    # one engine, two modes: the bottom-d Laplacian subspace == the top-d SR subspace (F4 at engine level)
    W = sk.ring_graph(12)
    lap = sg.geometry(W, "fn.sym", "laplacian", d=3)   # block-complete cutoff
    sr = sg.geometry(W, "fn.sym", "sr", d=3)
    assert sk.principal_angle_deg(lap, sr) < 1.0


def test_h0_equals_connected_components():
    assert sg.h0_dim(sk.ring_graph(12)) == 1            # one connected ring
    two = np.zeros((10, 10))                            # two disjoint paths → two components
    for i in range(4):
        two[i, i + 1] = two[i + 1, i] = 1.0
    for i in range(5, 9):
        two[i, i + 1] = two[i + 1, i] = 1.0
    assert sg.h0_dim(two) == 2


def test_naturality_square_commutes_for_structure_preserving_quotient():
    # geometry respects a structure-preserving morphism (merge adjacent ring-pairs → a coarser ring):
    # the square commutes near-exactly; a structure-BREAKING quotient (merge opposite nodes) diverges.
    W = sk.ring_graph(12)
    good = [[2 * i, 2 * i + 1] for i in range(6)]       # adjacent pairs → structure-preserving
    bad = [[i, i + 6] for i in range(6)]                # antipodal pairs → structure-breaking
    good_angle = sg.naturality_angle(W, good, d=3)
    bad_angle = sg.naturality_angle(W, bad, d=3)
    assert good_angle < 1.0                             # a functor: commutes for the honest quotient
    assert bad_angle > good_angle                       # respects structure, not arbitrary merges
