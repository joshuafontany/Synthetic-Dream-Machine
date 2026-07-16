"""spectral_ab — smoke tests for the pure harness functions (synthetic vectors; no chroma/corpus).
The empirical witness is the live run against ~/.mempalace/palace; these guard the plumbing.

    ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_spectral_ab.py -q
"""

import numpy as np

import spectral_ab as ab


def _clustered(n=120, d=384, seed=1):
    rng = np.random.default_rng(seed)
    centers = rng.normal(size=(4, d))
    x = np.repeat(centers, n // 4, axis=0) + 0.1 * rng.normal(size=(n, d))
    return x


def test_validity_gate_passes_clean_fails_degenerate():
    emb = _clustered()
    metas = [{"lar_ast_hash": f"h{i}"} for i in range(emb.shape[0])]
    assert ab.validity_gate(emb, metas)["pass"]
    zero = np.zeros_like(emb)
    assert not ab.validity_gate(zero, metas)["pass"]      # all-zero → fails


def test_concentration_diagnostics_shape():
    diag = ab.concentration_diagnostics(_clustered())
    assert diag["rel_contrast_std_over_mean"] > 0
    assert diag["two_nn_intrinsic_dim"] > 0
    assert "severe_concentration" in diag


def test_arm_a_control_beats_null_on_clustered():
    # clustered data → eigenmap recovers cosine neighbors far above the permutation null (pipeline works)
    r = ab.arm_a_control(_clustered(), k=5, d=8)
    assert r["overlap_at_k"] > r["null_overlap"]
    assert r["beats_null"]
