#!/usr/bin/env python
"""spectral_parity — the OFFLINE parity oracle behind the causal-island boundary.

The web3-only law keeps Python OUT of the TS runtime: this script never runs in-process. It stands
behind the causal-island as a trusted REFERENCE — it emits a data fixture (as-of-its-last-sync), and
the TS parity test reads that fixture as plain data, recomputes its own principal angles, and asserts
they match scipy's. The crossing carries DATA (the JSON), never a live Python call — fixtures-as-data
across the boundary.

It validates the TS `principalAngles` (the keel's subspace-distance / TS↔Python parity instrument)
against the trusted lineage: scipy.linalg.subspace_angles → Knyazev & Argentati 2002 → Björck & Golub
1973 — the SAME math the TS hand-roll ports, an independent implementation, so agreement certifies the
port. DETERMINISTIC (a seeded numpy Generator), never a wall clock — reproducible, re-runnable.

Run (from the repo root, the .venv python):
    ./.venv/bin/python packages/lararium-mesh/scripts/spectral_parity.py
"""
import json
import os

import numpy as np
from scipy.linalg import subspace_angles


def rand_orthonormal(rng: np.random.Generator, n: int, k: int) -> np.ndarray:
    """A random n×k orthonormal basis (columns) via QR of Gaussian noise."""
    q, _ = np.linalg.qr(rng.standard_normal((n, k)))
    return q[:, :k]


def build_cases() -> list[dict]:
    rng = np.random.default_rng(20260703)
    cases: list[dict] = []

    # random basis pairs across small n, k (the mesh's plane-count scale)
    for _ in range(8):
        n = int(rng.integers(4, 9))
        k = int(rng.integers(1, min(3, n) + 1))
        a = rand_orthonormal(rng, n, k)
        b = rand_orthonormal(rng, n, k)
        angles = np.sort(np.asarray(subspace_angles(a, b), dtype=float))  # ascending, radians
        cases.append({"note": "random", "A": a.tolist(), "B": b.tolist(), "anglesRad": angles.tolist()})

    # an identical subspace → all angles 0
    a = rand_orthonormal(rng, 6, 2)
    cases.append({"note": "identical", "A": a.tolist(), "B": a.tolist(),
                  "anglesRad": np.sort(np.asarray(subspace_angles(a, a), dtype=float)).tolist()})

    # an orthogonal pair (disjoint coordinate blocks) → a right angle
    a = np.array([[1.0, 0.0], [0.0, 1.0], [0.0, 0.0], [0.0, 0.0]])
    b = np.array([[0.0, 0.0], [0.0, 0.0], [1.0, 0.0], [0.0, 1.0]])
    cases.append({"note": "orthogonal", "A": a.tolist(), "B": b.tolist(),
                  "anglesRad": np.sort(np.asarray(subspace_angles(a, b), dtype=float)).tolist()})

    return cases


def main() -> None:
    out = {
        "oracle": "scipy.linalg.subspace_angles (Knyazev-Argentati 2002 / Bjorck-Golub 1973)",
        "scipy": __import__("scipy").__version__,
        "cases": build_cases(),
    }
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "..", "tests", "fixtures", "subspace-angles-parity.json")
    with open(os.path.abspath(path), "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {os.path.abspath(path)} — {len(out['cases'])} cases")


if __name__ == "__main__":
    main()
