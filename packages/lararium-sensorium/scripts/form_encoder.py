#!/usr/bin/env python3
"""form_encoder — the @daemon's Lares-INTEGRATION side of the two-planes form-capture.

Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#two-planes (P2 of the
phased plan). This module COMPUTES the fuzzy-membership / sanction-degree FORM
vector; the mempalace base merely STORES it as a caller-supplied vector for the
"form" collection. It is the Lares-specific integration, never the base layer —
the shore ruling (living-grammar-palace#phased-plan): "the @daemon COMPUTES the
Lares-specifics and hands the base caller-vectors; the base STORES · SERVES · FUSES".

The CONTINUOUS plane of the two planes. The DISCRETE plane (the constructicon
basis) + the move-skeleton emitter live on the TS side
(packages/lararium-tw5/src/form-layer/). The @daemon SERIALIZES those TS
structures to JSON and hands them here; this module reads the JSON, indexes the
skeleton's moves against the basis, and emits a SPARSE fuzzy-membership vector.

=============================================================================
THE JSON CONTRACT  (the @daemon serializes the TS form-layer structures to this)
=============================================================================

INPUT  (one request object):

    {
      "op": "encode",
      "skeleton": {                         # the TS MoveSkeleton, JSON-serialized
        "stream": [                         #   linear MoveToken[]
          {"kind": "voice", "token": "council",
           "axisId": "voice:council", "offset": 12},
          {"kind": "content", "token": "_", "axisId": null, "offset": 20},
          ...
        ],
        "graph": [                          #   PlaceholderNode[] (recursive)
          {"kind": "sigil", "sigilName": "loulou", "family": "relation",
           "attrKeys": ["uri"], "recoveredAs": null, "standing": 18,
           "content": "_", "children": [ ... ]},
          ...
        ],
        "counts": {"tokens": N, "content": N, "water": N, "voices": N,
                   "wards": N, "phases": N, "sigils": N},
        "band": <opaque, carried through>
      },
      "basis": {                            # the TS ConstructiconBasis
        "axes": [
          {"id": "sigil:loulou", "category": "sigil", "label": "loulou",
           "layer": "x-memetic", "parentFamily": "relation", "sigilKind": "..."},
          ...
        ],
        "dimension": D                      # == len(axes); the vector length
        # ("index" is OPTIONAL — re-derived from axes order if absent)
      },

      # --- all OPTIONAL below ---
      "entrenchment": {"sigil:loulou": 412, "voice:council": 88, ...},
      "corpus": ["a move-stream string", ...],   # fits the unigram table for SLOR
      "curves": {"aperture": [10,11,12], "oodaha": [3,4]},  # HUD gauge series
      "tnorm": "product" | "min",           # structural t-norm (default product)
      "l2": false,                          # L2-normalize the sparse vector
      "prop_fraction": 0.5                  # upward/downward propagation weight
    }

OUTPUT  (the caller-vector for the base's "form" collection):

    {
      "ok": true,
      "result": {
        "dimension": D,
        "form_vector": {"indices": [..], "values": [..]},   # SPARSE, length D
        "turn_conformance": 0.83,                            # scalar [0,1]
        "axis_activation": {"sigil:loulou": 0.91, ...},      # the profile
        "ngram_features": {"uni:voice:council": 1,
                           "bi:voice:council|ward:sword": 1, ...},
        "trajectory": {"standing": {"mean":..,"std":..,"min":..,"max":..,
                                     "first":..,"last":..,"slope":..}, ...},
        "slor": {"live": true, "model": "distilgpt2", "reason": ""}
      }
    }

Each per-axis SANCTION-DEGREE ∈ [0,1] =
    structural-match  ×  SLOR-normalized-plausibility  ×  entrenchment-prior
held as INDEPENDENT fuzzy memberships (NOT softmax — true multi-membership).

GRACEFUL FALLBACK (load-bearing): if minicons/distilgpt2 cannot load/run (no
GPU, install fails, model won't load), the encoder FLAGS it precisely and falls
back to a degraded vector = structural-match × entrenchment (the SLOR factor
dropped). The encoder still ships; SLOR rides in later. It NEVER forces a broken
model.

Protocol mirrors structurepalace_io.py: NDJSON over stdin/stdout, ONE JSON object per
line; only JSON responses on stdout (banners/library noise → stderr).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter

# The serve cap-stack this sidecar #has — flock-singleton · idle-reap · NDJSON serve-loop ·
# ops-dispatch · the serve composition root — composed from the shared foundation, never inherited.
#
# `_fcntl`/`_select` re-export so the serve tests read them as MODULE ATTRIBUTES (`fe._fcntl is None`)
# to gate their POSIX skip markers. A linter reads them as unused — it cannot see a cross-module
# attribute read — so they carry the mark that says otherwise. Cutting them takes the skip markers with
# them, and the serve tests then FAIL on a platform they mean to skip.
from sidecar_caps import (
    _fcntl,  # noqa: F401 — read as `fe._fcntl` by the serve tests' POSIX skipif
    _select,  # noqa: F401 — read as `fe._select` by the idle-reap tests' skipif
    acquire_serve_lock,
    idle_ttl_seconds,
    make_dispatch,
    mine_busy_retry,
    release_lock,
    run_sidecar,
    serve_lock_path,
    serve_loop,
)

try:
    import numpy as _np
except ImportError:  # pragma: no cover - numpy is a hard dep of the mempalace venv
    _np = None

# The 3-layer grammar-stack tower (base → top), living-grammar-palace#grammar-stack.
# The "lower" layer for down-the-tower propagation reads off this order.
GRAMMAR_LAYERS = ["html", "wikitext", "x-memetic"]

# Logistic squash scale for the raw SLOR statistic → [0,1].
SLOR_SQUASH_SCALE = 2.0

# The SLOR factor is FLOORED before it modulates a sanction. The move-stream is a
# meta-language (move-token labels), off-distribution for an English LM, so a raw
# SLOR can sit near 0 for a perfectly well-formed turn; multiplying by it directly
# would ANNIHILATE the whole vector. Flooring turns SLOR into a soft turn-level
# PLAUSIBILITY MODULATOR (range [floor,1]) rather than a hard gate. The raw,
# un-floored slor value still rides in the result for transparency.
SLOR_FACTOR_FLOOR = 0.5

# A near-zero sanction is dropped from the sparse vector.
SPARSE_EPSILON = 1e-9

# A construction absent from a (non-empty) entrenchment table reads as count 0 →
# the log-formula yields a 0 prior, which would ANNIHILATE an otherwise well-formed
# move. The living grammar's evolvability-reservoir canon forbids that pruning:
# "low-membership constructions form the evolvability reservoir; the palace NEVER
# prunes them" (living-grammar-palace#ffz-binding, the affinity-maturation rhyme).
# So an unseen construction keeps this small toehold rather than vanishing.
ENTRENCHMENT_FLOOR = 0.05


# ---------------------------------------------------------------------------
# small math
# ---------------------------------------------------------------------------


def _logistic(x: float) -> float:
    """Numerically-stable logistic squash to (0,1)."""
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def _clamp01(x: float) -> float:
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


# ---------------------------------------------------------------------------
# SLOR — SLOR(S) = (1/|S|)(ln p_M(S) − Σ ln p_unigram(t)), logistic-squashed
# ---------------------------------------------------------------------------


def _tokenize(text: str) -> list[str]:
    """Whitespace tokenization — the move-stream is already space-joined labels."""
    return text.split()


class SlorScorer:
    """Holds the distilgpt2 LM (ln p_M) + a count-table unigram (ln p_u).

    Lazy + fail-soft: the LM load is attempted ONCE at construction; if minicons /
    transformers / torch / the model are unavailable, ``live`` stays False, the
    precise ``reason`` is captured, and ``slor()`` returns None so the encoder
    drops the SLOR factor (the documented graceful fallback). NEVER raises on a
    missing model.
    """

    def __init__(self, model_name: str = "distilgpt2", corpus: list[str] | None = None) -> None:
        self.model_name = model_name
        self.live = False
        self.reason = ""
        self._scorer = None
        self._unigram: Counter[str] = Counter()
        self._unigram_total = 0
        self._vocab = 0
        if corpus:
            self.fit_unigram(corpus)
        self._try_load(model_name)

    def _try_load(self, model_name: str) -> None:
        try:
            from minicons import scorer  # type: ignore

            # CPU-only; the daemon makes no GPU assumption.
            self._scorer = scorer.IncrementalLMScorer(model_name, "cpu")
            self.live = True
            self.reason = ""
        except Exception as exc:  # noqa: BLE001 — fail-soft, capture the precise reason
            self.live = False
            self._scorer = None
            self.reason = f"{type(exc).__name__}: {exc}"

    # --- the unigram count-table (add-1 / Laplace smoothing) ---

    def fit_unigram(self, corpus: list[str]) -> None:
        for line in corpus:
            self._unigram.update(_tokenize(line))
        self._unigram_total = sum(self._unigram.values())
        self._vocab = len(self._unigram)

    def unigram_logprob(self, token: str) -> float:
        """ln p_u(t) with add-1 smoothing over the corpus count-table.

        With an EMPTY table every token reads uniform — the SLOR statistic then
        reduces to a length-normalized pure LM logprob, still meaningful.
        """
        c = self._unigram.get(token, 0)
        denom = self._unigram_total + self._vocab + 1  # +1 for the unseen mass
        return math.log((c + 1) / denom)

    def _lm_total_logprob(self, text: str) -> float | None:
        """ln p_M(S) — the full-sequence log-prob from distilgpt2 via minicons."""
        if self._scorer is None:
            return None
        try:
            # reduction=sum → total sequence log-prob (not the per-token average).
            out = self._scorer.sequence_score([text], reduction=lambda x: x.sum().item())
            return float(out[0])
        except Exception as exc:  # noqa: BLE001 — a runtime LM failure also falls soft
            self.live = False
            self.reason = f"runtime {type(exc).__name__}: {exc}"
            return None

    def slor(self, text: str) -> float | None:
        """SLOR squashed to [0,1], or None when the LM is unavailable (fallback)."""
        tokens = _tokenize(text)
        if not tokens:
            return None
        lnpm = self._lm_total_logprob(text)
        if lnpm is None:
            return None
        lnpu = sum(self.unigram_logprob(t) for t in tokens)
        raw = (lnpm - lnpu) / len(tokens)
        return _logistic(raw / SLOR_SQUASH_SCALE)


# ---------------------------------------------------------------------------
# basis helpers
# ---------------------------------------------------------------------------


def _basis_axis_map(basis: dict) -> dict[str, dict]:
    """id → axis record. The axes' array ORDER is the vector index (matches the TS
    ConstructiconBasis: 'a coordinate's array position IS its vector index')."""
    return {ax["id"]: ax for ax in basis.get("axes", [])}


def _axis_index(basis: dict) -> dict[str, int]:
    return {ax["id"]: i for i, ax in enumerate(basis.get("axes", []))}


def _lower_layer(layer: str | None) -> str | None:
    """The grammar-layer beneath `layer` in the superset tower, or None at the floor."""
    if layer not in GRAMMAR_LAYERS:
        return None
    i = GRAMMAR_LAYERS.index(layer)
    return GRAMMAR_LAYERS[i - 1] if i > 0 else None


# ---------------------------------------------------------------------------
# structural-match — t-norm of the placeholdered-graph node standing
# ---------------------------------------------------------------------------

# A node carrying neither standing nor a recovery rung reads as a CLEAN
# construction → membership ~1.0. A `recoveredAs` rung with no graded standing
# reads degraded; a `water` kind reads strongly degraded. `standing` names the
# BACKWARD-earned recovery/manifestation measure (never a forward confidence vow).
_RECOVERED_DEFAULT = 0.5
_WATER_DEFAULT = 0.2


def _node_membership(node: dict) -> float:
    """One placeholdered-graph node → its [0,1] structural membership.

    A graded `standing` (0..20) divides to [0,1]; absent that, a recovered /
    water node degrades; a pristine node reads clean (1.0).
    """
    conf = node.get("standing")
    if isinstance(conf, (int, float)):
        return _clamp01(float(conf) / 20.0)
    kind = node.get("kind")
    if kind == "water":
        return _WATER_DEFAULT
    if node.get("recoveredAs"):
        return _RECOVERED_DEFAULT
    return 1.0


def _node_axis_ids(node: dict, axis_by_id: dict[str, dict]) -> list[str]:
    """The basis axis ids a placeholdered-graph node BINDS (only those present in
    the basis). A node may bind a sigil axis, a pranala-sugar sigil axis, a family
    axis, and — via the matched sigil axis's seat — its grammar-layer axis."""
    ids: list[str] = []
    bound_layers: set[str] = set()

    for key in ("sigilName", "sigil"):
        name = node.get(key)
        if isinstance(name, str) and name:
            aid = f"sigil:{name}"
            if aid in axis_by_id:
                ids.append(aid)
                lyr = axis_by_id[aid].get("layer")
                if lyr:
                    bound_layers.add(lyr)

    fam = node.get("family")
    if isinstance(fam, str) and fam:
        aid = f"family:{fam}"
        if aid in axis_by_id:
            ids.append(aid)

    # The node's grammar-layer axis (from the sigil seat it matched).
    for lyr in bound_layers:
        aid = f"layer:{lyr}"
        if aid in axis_by_id:
            ids.append(aid)

    return ids


def _walk_graph(graph, fn) -> None:
    """Pre-order DFS over the placeholdered forest, calling fn(node)."""
    for node in graph:
        if not isinstance(node, dict):
            continue
        fn(node)
        kids = node.get("children") or []
        _walk_graph(kids, fn)


def _collect_memberships(skeleton: dict, axis_by_id: dict[str, dict]) -> dict[str, list[float]]:
    """Per-axis list of structural memberships from BOTH planes of the skeleton.

    The GRAPH contributes graded node standing (the manifestation); the linear
    STREAM contributes clean-marker memberships (1.0) for any token already
    carrying a basis axisId (Route A: the marker emitted faithfully).
    """
    memberships: dict[str, list[float]] = {}

    def _add(aid: str, val: float) -> None:
        memberships.setdefault(aid, []).append(val)

    # plane (b): the placeholdered graph
    def _visit(node: dict) -> None:
        m = _node_membership(node)
        for aid in _node_axis_ids(node, axis_by_id):
            _add(aid, m)

    _walk_graph(skeleton.get("graph") or [], _visit)

    # plane (a): the linear marker stream
    for tok in skeleton.get("stream") or []:
        aid = tok.get("axisId")
        if isinstance(aid, str) and aid in axis_by_id:
            _add(aid, 1.0)

    return memberships


def _tnorm(values: list[float], kind: str) -> float:
    """The product (default) or min t-norm over a node's memberships. A clean
    construction → ~1.0; any degraded node drags the conjunction down."""
    if not values:
        return 0.0
    if kind == "min":
        return min(values)
    out = 1.0
    for v in values:
        out *= v
    return out


# ---------------------------------------------------------------------------
# entrenchment-prior — log(1+count)/log(1+max) from a frequency table
# ---------------------------------------------------------------------------


def _build_entrenchment(table: dict | None) -> tuple[dict[str, float], float]:
    """Normalize a raw {axisId|label: count} table → {key: log(1+c)/log(1+max)}.

    With no table the prior is neutral (1.0 everywhere) so it never zeroes the
    sanction — entrenchment then simply does not modulate (the stub case).
    """
    if not table:
        return {}, 0.0
    counts = {k: float(v) for k, v in table.items() if isinstance(v, (int, float))}
    if not counts:
        return {}, 0.0
    max_c = max(counts.values())
    if max_c <= 0:
        return {}, 0.0
    denom = math.log(1.0 + max_c)
    if denom <= 0:
        return {}, max_c
    norm = {k: math.log(1.0 + c) / denom for k, c in counts.items()}
    return norm, max_c


def _entrenchment_prior(axis: dict, norm: dict[str, float]) -> float:
    if not norm:
        return 1.0  # no entrenchment info → neutral (do not modulate)
    aid = axis.get("id")
    if aid in norm:
        return max(norm[aid], ENTRENCHMENT_FLOOR)
    label = axis.get("label")
    if label in norm:
        return max(norm[label], ENTRENCHMENT_FLOOR)
    # In a non-empty table but unseen → minimally entrenched, NEVER zero
    # (the evolvability reservoir, ENTRENCHMENT_FLOOR).
    return ENTRENCHMENT_FLOOR


# ---------------------------------------------------------------------------
# move n-grams (uni + bi + tri over the linear axisId stream)
# ---------------------------------------------------------------------------


def _stream_symbols(stream: list[dict]) -> list[str]:
    """The linear symbol sequence: the axisId where present, else `kind:token`
    (so content `_` and `~water` still register as ordering context)."""
    syms: list[str] = []
    for tok in stream:
        aid = tok.get("axisId")
        if isinstance(aid, str) and aid:
            syms.append(aid)
        else:
            syms.append(f"{tok.get('kind', '?')}:{tok.get('token', '_')}")
    return syms


def _stream_text(stream: list[dict]) -> str:
    """A natural-ish rendering of the move-stream for the LM: the move-token LABELS
    (council · hud · sword · oracle …), content/water placeholders dropped. Reads
    closer to language than the colon-joined axisIds the n-grams use, though it
    still sits off-distribution — hence the floored SLOR factor."""
    words: list[str] = []
    for tok in stream:
        kind = tok.get("kind")
        if kind in ("content", "water"):
            continue
        t = tok.get("token")
        if isinstance(t, str) and t and t != "_":
            words.append(t)
    return " ".join(words)


def _ngram_features(stream: list[dict]) -> dict[str, int]:
    syms = _stream_symbols(stream)
    feats: Counter[str] = Counter()
    for s in syms:
        feats[f"uni:{s}"] += 1
    for a, b in zip(syms, syms[1:]):
        feats[f"bi:{a}|{b}"] += 1
    for a, b, c in zip(syms, syms[1:], syms[2:]):
        feats[f"tri:{a}|{b}|{c}"] += 1
    return dict(feats)


# ---------------------------------------------------------------------------
# scalar-trajectory stats (mean/std/min/max/first/last/slope)
# ---------------------------------------------------------------------------


def _stats(series: list[float]) -> dict | None:
    if not series:
        return None
    if _np is not None:
        a = _np.asarray(series, dtype=float)
        n = len(a)
        slope = float(_np.polyfit(_np.arange(n), a, 1)[0]) if n >= 2 else 0.0
        return {
            "mean": float(a.mean()),
            "std": float(a.std()),
            "min": float(a.min()),
            "max": float(a.max()),
            "first": float(a[0]),
            "last": float(a[-1]),
            "slope": slope,
            "n": n,
        }
    # numpy-free fallback
    n = len(series)
    mean = sum(series) / n
    var = sum((x - mean) ** 2 for x in series) / n
    if n >= 2:
        xs = list(range(n))
        xmean = sum(xs) / n
        cov = sum((xs[i] - xmean) * (series[i] - mean) for i in range(n))
        xvar = sum((x - xmean) ** 2 for x in xs)
        slope = cov / xvar if xvar else 0.0
    else:
        slope = 0.0
    return {
        "mean": mean,
        "std": math.sqrt(var),
        "min": min(series),
        "max": max(series),
        "first": series[0],
        "last": series[-1],
        "slope": slope,
        "n": n,
    }


def _standing_series(graph) -> list[float]:
    """Per-node standing in pre-order traversal — the manifestation curve."""
    series: list[float] = []

    def _visit(node: dict) -> None:
        conf = node.get("standing")
        if isinstance(conf, (int, float)):
            series.append(float(conf))

    _walk_graph(graph, _visit)
    return series


def _trajectory(skeleton: dict, curves: dict | None) -> dict:
    traj: dict[str, dict] = {}
    conf = _standing_series(skeleton.get("graph") or [])
    s = _stats(conf)
    if s is not None:
        traj["standing"] = s
    if curves:
        for name in ("aperture", "oodaha"):
            series = curves.get(name)
            if isinstance(series, list) and series:
                cs = _stats([float(x) for x in series if isinstance(x, (int, float))])
                if cs is not None:
                    traj[name] = cs
    return traj


# ---------------------------------------------------------------------------
# turn-conformance scalar — how fully the turn honored the exchange frame
# ---------------------------------------------------------------------------

# The chiasmus frame: lares aim · hud · ward(open) · content · oracle ·
# ward(sword close) · hud · lares yield (noosphere-boot#exchange-protocol).
_FRAME_WEIGHTS = {
    "aim": 1.0,
    "yield": 1.0,
    "hud": 1.0,
    "ward": 1.0,
    "oracle": 1.0,
    "voice": 1.0,
    "confidence": 0.5,
}


def _turn_conformance(skeleton: dict) -> float:
    stream = skeleton.get("stream") or []
    counts = skeleton.get("counts") or {}
    have = {
        "aim": any(t.get("kind") == "bearing" and t.get("token") == "aim" for t in stream),
        "yield": any(t.get("kind") == "bearing" and t.get("token") == "yield" for t in stream),
        "hud": any(t.get("kind") == "hud" for t in stream),
        "ward": any(t.get("kind") == "ward" for t in stream),
        "oracle": any(t.get("kind") == "oracle" for t in stream),
        "voice": int(counts.get("voices", 0)) > 0
        or any(t.get("kind") == "voice" for t in stream),
        "confidence": any(t.get("kind") == "confidence" for t in stream),
    }
    got = sum(w for k, w in _FRAME_WEIGHTS.items() if have[k])
    total = sum(_FRAME_WEIGHTS.values())
    base = got / total if total else 0.0

    # Water (unrecognized openers) attenuates conformance — degraded marker fidelity.
    tokens = max(1, int(counts.get("tokens", len(stream))))
    water = int(counts.get("water", 0))
    base *= 1.0 - (water / tokens)
    return _clamp01(base)


# ---------------------------------------------------------------------------
# encode_form — the pure P2 fold (the testable core)
# ---------------------------------------------------------------------------


def encode_form(
    skeleton: dict,
    basis: dict,
    *,
    entrenchment: dict | None = None,
    scorer: SlorScorer | None = None,
    tnorm: str = "product",
    l2: bool = False,
    prop_fraction: float = 0.5,
    curves: dict | None = None,
) -> dict:
    """Fold a serialized MoveSkeleton + ConstructiconBasis → the caller-vector.

    Each activated axis gets a sanction-degree = structural × SLOR × entrenchment,
    held as an INDEPENDENT membership. A degraded axis propagates fractional
    activation UPWARD (to its parent family) and DOWN the superset-tower (to the
    layer beneath it). n-gram + trajectory features ride alongside.
    """
    axis_by_id = _basis_axis_map(basis)
    index = _axis_index(basis)
    dimension = int(basis.get("dimension", len(index)))

    # --- structural-match (t-norm of the binding node memberships) ---
    memberships = _collect_memberships(skeleton, axis_by_id)
    structural = {aid: _tnorm(vals, tnorm) for aid, vals in memberships.items()}

    # --- SLOR (turn-level grammaticality of the move-stream), or fallback ---
    slor_live = False
    slor_value: float | None = None
    slor_reason = "no scorer supplied"
    slor_model = None
    if scorer is not None:
        slor_model = scorer.model_name
        stream_text = _stream_text(skeleton.get("stream") or [])
        slor_value = scorer.slor(stream_text)
        slor_live = scorer.live and slor_value is not None
        slor_reason = "" if slor_live else (scorer.reason or "scorer returned no score")
    # Live: floor the value into a soft modulator [floor,1]. Fallback (no value):
    # drop the SLOR factor entirely (1.0) → sanction = structural × entrenchment.
    if slor_value is not None:
        slor_factor = SLOR_FACTOR_FLOOR + (1.0 - SLOR_FACTOR_FLOOR) * slor_value
    else:
        slor_factor = 1.0

    # --- entrenchment-prior ---
    ent_norm, _max_c = _build_entrenchment(entrenchment)

    # --- per-axis sanction-degree (independent memberships; NOT softmax) ---
    sanction: dict[str, float] = {}
    for aid, sm in structural.items():
        axis = axis_by_id[aid]
        ent = _entrenchment_prior(axis, ent_norm)
        sanction[aid] = _clamp01(sm * slor_factor * ent)

    # --- upward + down-the-tower propagation (degradation never hard-faults) ---
    activation: dict[str, float] = dict(sanction)
    for aid, s in sanction.items():
        degradation = 1.0 - s
        if degradation <= 0.0:
            continue
        share = prop_fraction * degradation
        axis = axis_by_id[aid]
        # upward → the parent pranala family schema
        pf = axis.get("parentFamily")
        if pf:
            fam_id = f"family:{pf}"
            if fam_id in axis_by_id:
                activation[fam_id] = _clamp01(activation.get(fam_id, 0.0) + share)
        # downward → the grammar-layer beneath this construction
        lower = _lower_layer(axis.get("layer"))
        if lower:
            low_id = f"layer:{lower}"
            if low_id in axis_by_id:
                activation[low_id] = _clamp01(activation.get(low_id, 0.0) + share)

    # --- sparse form-vector (length == dimension) ---
    pairs = sorted(
        (
            (index[aid], val)
            for aid, val in activation.items()
            if aid in index and val > SPARSE_EPSILON
        ),
        key=lambda p: p[0],
    )
    indices = [i for i, _ in pairs]
    values = [v for _, v in pairs]

    if l2 and values:
        norm = math.sqrt(sum(v * v for v in values))
        if norm > 0:
            values = [v / norm for v in values]

    return {
        "dimension": dimension,
        "form_vector": {"indices": indices, "values": values},
        "turn_conformance": _turn_conformance(skeleton),
        "axis_activation": {aid: activation[aid] for aid in sorted(activation)},
        "ngram_features": _ngram_features(skeleton.get("stream") or []),
        "trajectory": _trajectory(skeleton, curves),
        "slor": {"live": slor_live, "model": slor_model, "reason": slor_reason},
    }


# ---------------------------------------------------------------------------
# the FORM palace store — the caller-vector "form" collection (mirrors structurepalace_io)
# ---------------------------------------------------------------------------

# The cross-graph join: the form entry is KEYED by the verbatim_sha (the content
# drawer's join key), so form-drawer.id == content-drawer.lar_verbatim_sha and the
# two graphs fuse on one key (living-grammar-palace#two-planes — the FORM side here,
# the CONTENT side stays the existing verbatim mempalace).
#
# Caller-vector pattern (the BASE multi-collection move): we open a SEPARATE "form"
# collection (a second collection beside the palace default), ALWAYS supply our own
# dense form-vector as the embedding, and skip the embedder-identity check — so the
# palace's configured embedding model is left attached but NEVER invoked (no model
# load, no download, no network), exactly as structurepalace_io does for the AST store.
#
# DIMENSION: ChromaDB pins a collection's vector length at the first insert. The
# form-vector is SPARSE {indices, values} of logical length == basis.dimension; we
# DENSIFY it to a fixed dense vector of that dimension (an O(D) scatter — negligible
# for D in the tens-to-low-hundreds the constructicon basis carries). A later store
# whose basis.dimension differs (the grammar grew new sigil/family axes) collides
# with the pinned length → ChromaDB raises and we surface it as a basis-drift flag
# (re-pin/migration is deferred to the P5 collapse).
PROVENANCE_CAP = 64
FORM_COLLECTION = "form"


def _densify(form_vector: dict, dimension: int) -> list[float]:
    """Scatter a sparse {indices, values} form-vector into a fixed dense vector of
    length ``dimension`` — the shape ChromaDB stores (one fixed length per collection)."""
    dense = [0.0] * dimension
    indices = form_vector.get("indices") or []
    values = form_vector.get("values") or []
    for i, v in zip(indices, values):
        if isinstance(i, int) and 0 <= i < dimension:
            dense[i] = float(v)
    return dense


def _unreliable_witness_timestamp() -> str:
    """A host-wall-clock reading — an UNRELIABLE WITNESS under no-global-now: island clocks skew, so
    this value NEVER compares across islands and NEVER orders anything. Provenance only; the logical/FFZ
    clock is the ordering authority once it lands py-side. Named to strip the false-clock authority.
    Routes through deep_time — the ONE island-local-wall-time provenance home."""
    from deep_time import island_local_now

    return island_local_now()


class FormPalaceStore:
    """One open "form" collection; store (RMW count) + query (form-similarity) + get."""

    def __init__(self, palace_path: str) -> None:
        from mempalace.palace import get_collection

        # create-or-open the SECOND ("form") collection; identity check skipped — we
        # never run the embedder (we always pass our own dense form-vector).
        self._col = get_collection(
            palace_path, collection_name=FORM_COLLECTION, create=True, _skip_identity_check=True
        )

    def _get_raw(self, key: str) -> dict | None:
        got = self._col.get(ids=[key], include=["documents", "metadatas"])
        ids = got.get("ids") or []
        if not ids:
            return None
        docs = got.get("documents") or [None]
        metas = got.get("metadatas") or [None]
        return {"id": ids[0], "document": docs[0], "metadata": metas[0] or {}}

    def store(self, key: str, form_vector: dict, dimension: int, metadata: dict) -> dict:
        """Upsert one form-vector keyed by ``key`` (the verbatim_sha). Recurrence on the
        same key (a re-mined turn) bumps ``count`` and refreshes ``last_sighting``."""
        if not key:
            raise ValueError("form store requires a non-empty key (the verbatim_sha)")
        dense = _densify(form_vector, dimension)
        sighting = _unreliable_witness_timestamp()  # a PURE unreliable-witness sighting — provenance only
        # Flat, chroma-legal metadata (str/int/float/bool only — never None).
        meta: dict[str, object] = {
            "kind": "form",
            "lar_verbatim_sha": str(metadata.get("verbatim_sha", key)),
            "register": str(metadata.get("register", "")),
            "grammar_layer": str(metadata.get("grammar_layer", "")),
            "struct_hash": str(metadata.get("struct_hash", "")),
            "conformance": float(metadata.get("conformance", 0.0)),
            "dimension": int(dimension),
        }
        existing = self._get_raw(key)
        count = 1
        if existing is not None:
            try:
                count = int(existing["metadata"].get("count", 1)) + 1
            except (ValueError, TypeError):
                count = 1
            meta["first_sighting"] = existing["metadata"].get("first_sighting", sighting)
        else:
            meta["first_sighting"] = sighting
        meta["count"] = count
        meta["last_sighting"] = sighting
        # Carry the bearing facets (bearing_w1/w2/w3/root/path/frag/grade) through to chroma
        # metadata — the aim/yield bearing descended to flat scalars (bearing-ast#bearingFacets),
        # where-filterable for the structured bearing recall path. Flat str/int/float/bool only.
        for bk, bv in metadata.items():
            if isinstance(bk, str) and bk.startswith("bearing_") and isinstance(bv, (str, int, float, bool)):
                meta[bk] = bv
        document = json.dumps(
            {
                # The TRUE dense basis — sparse {indices, values} the encoder already
                # computes. Persisting it hands the node reader (parse-form-vector, which
                # PREFERS form_vector when present) the real basis, rather than forcing it
                # to reconstruct indices from the ID-keyed axis_activation profile alone.
                "form_vector": form_vector,
                "axis_activation": metadata.get("axis_activation", {}),
                "turn_conformance": meta["conformance"],
            }
        )
        try:
            mine_busy_retry(lambda: self._col.upsert(
                ids=[key], documents=[document], metadatas=[meta], embeddings=[dense]
            ))
        except Exception as exc:  # noqa: BLE001 — surface dimension drift precisely
            raise ValueError(
                f"form store upsert failed (dimension={dimension}; a basis-dimension "
                f"drift re-pins the collection — see P5): {type(exc).__name__}: {exc}"
            ) from exc
        return {"key": key, "dimension": dimension, "count": count, "conformance": meta["conformance"]}

    def query(self, form_vector: dict, dimension: int, n_results: int, where: dict | None) -> dict:
        """Nearest form-vectors by similarity, optionally narrowed by a metadata where-filter."""
        dense = _densify(form_vector, dimension)
        res = self._col.query(
            query_embeddings=[dense],
            n_results=n_results,
            where=where,
            include=["metadatas", "distances"],
        )
        ids = (getattr(res, "ids", None) or [[]])[0]
        metas = (getattr(res, "metadatas", None) or [[]])[0]
        dists = (getattr(res, "distances", None) or [[]])[0]
        matches = [
            {"key": ids[i], "distance": dists[i] if i < len(dists) else None,
             "metadata": metas[i] if i < len(metas) else {}}
            for i in range(len(ids))
        ]
        return {"matches": matches}

    def filter(self, where: dict | None, n_results: int) -> dict:
        """METADATA-ONLY filter (NO vector) — chroma `.get(where=…)`. The structured bearing /
        keyword recall path: match by metadata alone, no query skeleton encoded. `distance` is
        null (a where-match carries no similarity ranking). A null/empty where returns up to
        n_results of the collection; a where matching nothing returns []."""
        kwargs = {"limit": n_results, "include": ["metadatas"]}
        if where:
            kwargs["where"] = where
        got = self._col.get(**kwargs)
        ids = got.get("ids") or []
        metas = got.get("metadatas") or []
        matches = [
            {"key": ids[i], "distance": None,
             "metadata": metas[i] if i < len(metas) else {}}
            for i in range(len(ids))
        ]
        return {"matches": matches}

    def get(self, key: str) -> dict | None:
        raw = self._get_raw(key)
        if raw is None:
            return None
        return {"key": raw["id"], "metadata": raw["metadata"], "document": raw["document"]}


# ---------------------------------------------------------------------------
# serve cap-stack (composed from sidecar_caps — one holder per palace)
# ---------------------------------------------------------------------------

IDLE_TTL_ENV = "FORM_ENCODER_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0

# The sidecar's identity in the lock namespace — its per-palace singleton prefix.
_LOCK_PREFIX = "form_encoder_serve"


def _serve_lock_path(palace_path: str) -> str:
    return serve_lock_path(palace_path, _LOCK_PREFIX)


def _acquire_serve_lock(palace_path: str):
    return acquire_serve_lock(palace_path, _LOCK_PREFIX)


def _release_lock(fh) -> None:
    release_lock(fh)


def _idle_ttl_seconds() -> float:
    return idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS)


# ---------------------------------------------------------------------------
# the OPS this sidecar declares (its #has-stack made literal)
# ---------------------------------------------------------------------------


def _ensure_scorer(holder: dict, model: str | None, corpus: list | None) -> "SlorScorer":
    sc = holder.get("scorer")
    if sc is None:
        sc = SlorScorer(model or "distilgpt2", corpus=corpus)
        holder["scorer"] = sc
    elif corpus:
        sc.fit_unigram(corpus)
    return sc


def _ensure_store(holder: dict) -> FormPalaceStore:
    store = holder.get("store")
    if store is None:
        palace = holder.get("palace")
        if not palace:
            raise ValueError("no --palace configured: store/query/get unavailable (encode still works)")
        store = FormPalaceStore(palace)
        holder["store"] = store
    return store


def _do_encode(req: dict, scorer_holder: dict) -> dict:
    sc = _ensure_scorer(scorer_holder, req.get("model"), req.get("corpus"))
    return encode_form(
        req["skeleton"],
        req["basis"],
        entrenchment=req.get("entrenchment"),
        scorer=sc,
        tnorm=req.get("tnorm", "product"),
        l2=bool(req.get("l2", False)),
        prop_fraction=float(req.get("prop_fraction", 0.5)),
        curves=req.get("curves"),
    )


def _op_ping(req: dict, holder: dict) -> dict:
    sc = holder.get("scorer")
    return {
        "ready": True,
        "slor_live": sc is not None and sc.live,
        "store": holder.get("palace") is not None,
    }


def _op_encode_store(req: dict, holder: dict) -> dict:
    # The end-to-end form-graph wire: encode the skeleton → store the vector,
    # keyed by the verbatim_sha, joined to the content drawer.
    enc = _do_encode(req, holder)
    store = _ensure_store(holder)
    meta = dict(req.get("metadata") or {})
    meta["conformance"] = enc["turn_conformance"]
    meta["axis_activation"] = enc["axis_activation"]
    stored = store.store(req["key"], enc["form_vector"], int(enc["dimension"]), meta)
    return {**stored, "slor": enc["slor"], "form_vector": enc["form_vector"]}


def _op_store(req: dict, holder: dict) -> dict:
    # Store a PRECOMPUTED form-vector (no encode) — the caller-vector base path.
    store = _ensure_store(holder)
    return store.store(
        req["key"], req["form_vector"], int(req["dimension"]), dict(req.get("metadata") or {})
    )


def _op_query(req: dict, holder: dict) -> dict:
    store = _ensure_store(holder)
    # Query by an encoded skeleton (encode then search) OR by a precomputed vector.
    if "form_vector" in req:
        fv = req["form_vector"]
        dim = int(req["dimension"])
    else:
        enc = _do_encode(req, holder)
        fv = enc["form_vector"]
        dim = int(enc["dimension"])
    return store.query(fv, dim, int(req.get("n_results", 10)), req.get("where"))


def _build_ops(holder: dict) -> dict:
    """The verb → handler registry — this sidecar's #has-stack made literal. Each
    handler closes over the warm ``holder`` (scorer + store, both lazily opened)."""
    return {
        "ping": lambda req: _op_ping(req, holder),
        "encode": lambda req: _do_encode(req, holder),
        "encode_store": lambda req: _op_encode_store(req, holder),
        "store": lambda req: _op_store(req, holder),
        "query": lambda req: _op_query(req, holder),
        "filter": lambda req: _ensure_store(holder).filter(
            req.get("where"), int(req.get("n_results", 10))
        ),
        "get": lambda req: _ensure_store(holder).get(req["key"]),
    }


def _handle_request(req: dict, holder: dict, out) -> None:
    """Dispatch one NDJSON request against the holder's ops (kept as a named entry
    for the unit tests; the serve loop wires the same registry once, up front)."""
    make_dispatch(_build_ops(holder))(req, out)


def _serve_loop(holder: dict, in_fd: int, out) -> None:
    """Wire this sidecar's ops into the shared NDJSON serve-loop cap (raw-fd read +
    idle-reap). The TTL reads fresh from the env so a test/operator can override it."""
    serve_loop(make_dispatch(_build_ops(holder)), in_fd, out, idle_ttl=_idle_ttl_seconds())


def _serve(palace: str | None, preload: bool) -> None:
    holder: dict = {"scorer": None, "store": None, "palace": palace}

    def build_dispatch():
        if preload:
            holder["scorer"] = SlorScorer()
            if not holder["scorer"].live:
                sys.stderr.write(
                    f"form_encoder: SLOR unavailable, running degraded "
                    f"(structural × entrenchment): {holder['scorer'].reason}\n"
                )
        return make_dispatch(_build_ops(holder))

    # Compose: the serve root holds the per-palace singleton (only meaningful when a
    # palace is bound — an encode-only holder needs no store lock, so require_lock keys
    # on the palace presence). build_dispatch runs only AFTER the lock, mirroring
    # structurepalace_io's reap-don't-pile invariant.
    run_sidecar(
        palace=palace,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=build_dispatch,
        idle_ttl=_idle_ttl_seconds(),
        require_lock=palace is not None,
        singleton_msg="form_encoder: another holder already serves this form palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="form_encoder (the @daemon's fuzzy-form-vector integration)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC encoder + form-vector store")
    s.add_argument(
        "--palace",
        default=None,
        help="the form palace dir (enables store/query/get; absent → encode-only)",
    )
    s.add_argument(
        "--preload",
        action="store_true",
        help="load distilgpt2 at startup (else lazy on first encode)",
    )
    s.set_defaults(fn=lambda a: _serve(a.palace, a.preload))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
