#!/usr/bin/env python3
"""sense_analyze — the isomorphic ANALYSIS instrument. Point it at a POURED sensorium (one you poured into
sense-memory), read its content STREAM, and detect the boundaries the content's own structure holds. Pour
once (the pour machina); point the instrument at what you poured (this). One tool for any corpus — chant ·
prose · TW5 · pidgin — the per-corpus difference living in the poured data, never in bespoke code.

STREAM, not lines (MAUP-free): a poured sensorium holds a stream of blocks, not the scribe's line breaks, so
the tool reconstructs the stream the SAME way rejim pours it, then reads it word-grained (Foote/MDL find where
vocabulary and grammar change HANDS — a word-level signal). Boundaries report as STREAM POSITIONS (word-index),
never line indices. Two instruments over one pour: rejim reads recurrence/rhythm, this reads change-points.

DETECT-ONLY today — the instrument, blind to any ground-truth (the wall). It reports WHERE the content changes,
not whether it's "right". The scoring layer (a separate, ITERABLE truth spec, refined in feedback loops) rides
on top later; the detector never sees it.

Meme: lar:///ha.ka.ba/lararium/sensorium/sense-analyze
"""
from __future__ import annotations

import math
from collections import Counter, defaultdict

import numpy as np
import ruptures as rpt

import spectral_geometry as sg                # the eigenmap builder (spine) — the spectral arm's control rides it

from content_io import ContentStore
from rejim_io import _content_stream          # the canonical poured-sensorium stream read (rejim's own door)
from sensorium import sensorium_dir, sensorium_paths
from sequitur_grammar import induce           # the grammar inducer (spine) — the sequitur + MDL arms ride it

#: Foote kernel half-widths in WORDS — the scale prior in plain sight (how long a block must run to count as
#: one). Never a single width (that manufactures the finding); the sweep reports the surface across scales.
DEFAULT_HALVES = (4, 8, 16, 32, 64, 128)
#: Top-K peaks reported per scale — nobody types the boundary count; each scale offers its K strongest.
K_CUTS = 16


def resolve_content(sensorium: str) -> str:
    """A sensorium NAME (in sense-memory) OR an explicit root → its content-plane dir. `memory` and every
    poured bed resolve through the same roster the pour lands them in."""
    root = sensorium if "/" in sensorium or sensorium.startswith(".") else sensorium_dir(sensorium)
    return sensorium_paths(root).content


def stream_words(stream: str) -> "list[str]":
    """The content stream → words in reading order, lowercased + punctuation-stripped (a scribe's comma
    carries the scribe's decision, not the content's). The word INDEX is the MAUP-free position a cut reports
    at — a poured sensorium holds a stream, no lines, so there is nothing else to report against."""
    toks: list[str] = []
    for w in stream.split():
        w = "".join(c for c in w.lower() if c.isalnum() or c in "ʻ'-")
        if w:
            toks.append(w)
    return toks


def _rank_peaks(strength: np.ndarray, k: int, nms: int) -> "list[int]":
    """The k strongest positions, no two within `nms` — a burst around one seam must not harvest k slots.
    `nms` derives from k and the length (never from a look at the answer)."""
    order = np.argsort(-strength)
    out: list[int] = []
    for i in order:
        if all(abs(int(i) - j) >= nms for j in out):
            out.append(int(i))
            if len(out) == k:
                break
    return out


def foote_novelty(codes: np.ndarray, half: int) -> np.ndarray:
    """Correlate a Gaussian-tapered checkerboard down the diagonal of the EXACT-MATCH dotplot (Foote, ICME
    2000). The kernel factors rank-one and the dotplot is a one-hot Gram matrix, so the correlation collapses
    to novelty(i) = ‖ Σ_a u[a]·e_{i+a} ‖² — the squared norm of the u-weighted symbol histogram over the
    window. O(n·h), exact, which lets the sweep run to a wide kernel."""
    n = len(codes)
    a = np.arange(-half, half, dtype=np.float64)
    u = np.sign(a + 0.5) * np.exp(-0.5 * (a / (half / 2.0)) ** 2)
    nov = np.zeros(n)
    for i in range(n):
        acc: dict = {}
        lo, hi = max(0, i - half), min(n, i + half)
        for p in range(lo, hi):
            c = int(codes[p])
            acc[c] = acc.get(c, 0.0) + u[p - i + half]
        nov[i] = sum(v * v for v in acc.values())
    return nov


def foote_sweep(toks: "list[str]", halves, k: int = K_CUTS) -> dict:
    """Sweep the Foote kernel across scales — each half-width offers its K strongest change-points as WORD
    positions in the stream. The per-scale surface, never one manufactured width."""
    vocab = {w: i for i, w in enumerate(dict.fromkeys(toks))}
    codes = np.fromiter((vocab[w] for w in toks), dtype=np.int32, count=len(toks))
    n = len(codes)
    nms = max(1, n // (2 * k))
    out = {}
    for h in halves:
        if 2 * h >= n:
            continue                                    # a kernel wider than the stream reads nothing
        nov = foote_novelty(codes, h)
        out[f"foote-{2 * h}"] = sorted(_rank_peaks(nov, k, nms))
    return out


def sequitur_arms(toks: "list[str]", k: int = K_CUTS) -> dict:
    """Induce the SEQUITUR grammar once over the whole stream, read two boundary signals off its hierarchy —
    the DEPTH CLIFF (|Δ nesting-depth|, where the grammar's reach changes hands) and the SEAM (the ends of the
    longest top-level spans, where one repeated structure yields to the next). Adapted to the stream machina:
    the induced positions ARE word positions (no line owner to fold back through), so they report as-is."""
    g = induce(toks)
    _terms, depths, _tops = g.expand_depth()
    d = np.asarray(depths, dtype=np.float64)
    n = len(d)
    if n == 0:
        return {"sequitur-depth": [], "sequitur-seam": [], "_grammar": None}
    nms = max(1, n // (2 * k))
    cliff = np.abs(np.diff(d, prepend=d[0]))
    depth_idx = sorted(_rank_peaks(cliff, k, nms))
    seam_idx: list[int] = []
    for _len, e in sorted(((e - s, e) for s, e, _r in g.top_spans()), reverse=True):
        if 0 < e < n and all(abs(e - j) >= nms for j in seam_idx):
            seam_idx.append(e)
        if len(seam_idx) == k:
            break
    grammar = {"rules": len(g.rules()), "size": g.grammar_size(),
               "mean_depth": round(float(d.mean()), 3), "max_depth": int(d.max())}
    return {"sequitur-depth": depth_idx, "sequitur-seam": sorted(seam_idx), "_grammar": grammar}


def mdl_growth(toks: "list[str]") -> np.ndarray:
    """The description length the grammar pays per word as the stream feeds in one word at a time — high where
    the content turns to matter the grammar has no rule for yet (compression STALLS). A regime change stalls
    compression; a refrain does not. The per-word cost series is the signal PELT then reads."""
    g = induce([])
    seen: set = set()
    out = np.zeros(len(toks))
    prev = g._idx                    # rules MINTED so far — a monotone counter, so the pour stays linear
    for i, w in enumerate(toks):
        g.append(w)
        out[i] = (0 if w in seen else 1) + (g._idx - prev)
        seen.add(w)
        prev = g._idx
    return out


def pelt_change_points(sig: np.ndarray) -> "tuple[list[int], int]":
    """PELT under a BIC/Schwarz penalty over a scalar signal — the cut COUNT inferred from the penalty (pen =
    2σ²·log n, the Schwarz criterion for a mean-shift model), never typed. Returns the inferred cuts ranked by
    step magnitude as stream positions + the count. Adapted to the stream: word positions, no line fold-back,
    and no k-cap — PELT already decides how many cuts pay for themselves, so the tool never overrides it."""
    n = len(sig)
    if n < 4:
        return [], 0
    sigma2 = float(np.var(sig)) or 1e-9
    pen = 2.0 * sigma2 * math.log(n)
    algo = rpt.KernelCPD(kernel="linear", min_size=2).fit(sig.reshape(-1, 1))
    cps = [c for c in algo.predict(pen=pen) if 0 < c < n]
    strength = np.abs(np.diff(sig, prepend=sig[0]))
    ranked = sorted(cps, key=lambda c: -float(strength[min(c, n - 1)]))
    return sorted(int(c) for c in ranked), len(cps)   # coerce off np.int32 so the JSON verb path serializes


def branching_entropy(toks: "list[str]", depths=(1, 2), k: int = K_CUTS) -> dict:
    """Harris's successor variety carried to entropy: cut where what-comes-NEXT grows unpredictable (Harris,
    Language 31(2):190, 1955; Zhikov et al., EMNLP 2010, who pick the count by MDL not a typed threshold). The
    n-gram depth stands as a scale prior and sweeps, exactly as the Foote kernel width does. Word positions."""
    out = {}
    n = len(toks)
    if n == 0:
        return {f"branch-h{d}": [] for d in depths}
    nms = max(1, n // (2 * k))
    for depth in depths:
        succ = defaultdict(Counter)
        for i in range(n - depth):
            succ[tuple(toks[i:i + depth])][toks[i + depth]] += 1
        h = np.zeros(n)
        for i in range(n - depth):
            c = succ[tuple(toks[i:i + depth])]
            tot = sum(c.values())
            h[i + depth] = -sum((v / tot) * math.log2(v / tot) for v in c.values()) if tot else 0.0
        out[f"branch-h{depth}"] = sorted(_rank_peaks(h, k, nms))
    return out


# ── the spectral arm: the embedding GEOMETRY surface (not stream positions) ──────────────────────────
def _load_vectors(sensorium: str, sample_n: int = 2000, seed: int = 7) -> "tuple[np.ndarray, list]":
    """Page the poured sensorium's OWN vectors out through ContentStore.scan (the machina's bulk-vector door,
    no raw chroma) → the embedding matrix + metadatas, sub-sampled to sample_n. The chunker makes these
    FAITHFUL now — before it, a whole-file record's vector represented only its opening (the window-fit gap)."""
    store = ContentStore(resolve_content(sensorium))
    embs: list = []
    metas: list = []
    off = 0
    while True:
        page = store.scan(offset=off, limit=512)
        for r in page["records"]:
            if r.get("embedding"):
                embs.append(r["embedding"])
                metas.append(r.get("metadata") or {})
        nxt = page.get("next")
        if nxt is None:
            break
        off = nxt
    emb = np.asarray(embs, dtype=float)
    if emb.shape[0] > sample_n:
        take = np.random.default_rng(seed).choice(emb.shape[0], size=sample_n, replace=False)
        emb, metas = emb[take], [metas[i] for i in take]
    return emb, metas


def validity_gate(emb: np.ndarray, metas) -> dict:
    """Vectors present + non-degenerate + distinct. Adapted off the code-corpus original: the AST-hash
    populated-fraction rides along as an INFORMATIONAL field (prose has no ast-hash), never a gate term, so
    the gate reads any corpus — the gate passes on vector health alone."""
    if emb.size == 0:
        return {"n": 0, "pass": False, "note": "no embeddings — is this sensorium poured?"}
    norms = np.linalg.norm(emb, axis=1)
    uniq = np.unique(np.round(emb, 6), axis=0).shape[0]
    hashes = sum(1 for m in metas if m.get("lar_ast_hash"))
    gate = {
        "n": int(emb.shape[0]),
        "dim": int(emb.shape[1]),
        "zero_vectors": int(np.sum(norms < 1e-9)),
        "distinct_fraction": round(uniq / emb.shape[0], 4),
        "ast_hash_populated": round(hashes / len(metas), 4) if metas else 0.0,   # informational, not gated
    }
    gate["pass"] = gate["zero_vectors"] == 0 and gate["distinct_fraction"] > 0.5
    return gate


def _unit(emb):
    return emb / np.clip(np.linalg.norm(emb, axis=1, keepdims=True), 1e-12, None)


def concentration_diagnostics(emb: np.ndarray, sample_pairs: int = 4000, seed: int = 11) -> dict:
    """std/mean of pairwise cosine distances (relative contrast) + two-NN intrinsic dim (Facco et al.) +
    hubness skew. Low rel-contrast ⇒ severe concentration ⇒ neighbor overlap loses discrimination. Pure —
    corpus-agnostic, carried across from the original unchanged."""
    U = _unit(emb)
    rng = np.random.default_rng(seed)
    n = U.shape[0]
    ii = rng.integers(0, n, sample_pairs)
    jj = rng.integers(0, n, sample_pairs)
    ok = ii != jj
    d = 1.0 - np.sum(U[ii[ok]] * U[jj[ok]], axis=1)
    rel_contrast = float(np.std(d) / np.mean(d)) if np.mean(d) > 0 else 0.0
    sim = U @ U.T
    np.fill_diagonal(sim, -np.inf)
    part = np.sort(sim, axis=1)[:, -2:]
    r1 = 1.0 - part[:, -1]
    r2 = 1.0 - part[:, -2]
    mu = r2 / np.clip(r1, 1e-12, None)
    mu = mu[np.isfinite(mu) & (mu > 1.0)]
    two_nn_id = float(len(mu) / np.sum(np.log(mu))) if len(mu) else float("nan")
    k = 10
    nn = np.argsort(-sim, axis=1)[:, :k]
    counts = np.bincount(nn.reshape(-1), minlength=n).astype(float)
    m, s = counts.mean(), counts.std()
    hub_skew = float(np.mean(((counts - m) / s) ** 3)) if s > 0 else 0.0
    return {
        "rel_contrast_std_over_mean": round(rel_contrast, 4),
        "two_nn_intrinsic_dim": round(two_nn_id, 2),
        "hubness_Nk_skew": round(hub_skew, 3),
        "severe_concentration": bool(rel_contrast < 0.15),
    }


def _knn_graph(U, k):
    sim = U @ U.T
    np.fill_diagonal(sim, -np.inf)
    nn = np.argsort(-sim, axis=1)[:, :k]
    n = U.shape[0]
    W = np.zeros((n, n))
    for i in range(n):
        for j in nn[i]:
            W[i, j] = W[j, i] = 1.0
    return W, nn


def _overlap_at_k(nn_a, nn_b, k):
    return float(np.mean([len(set(a) & set(b)) / k for a, b in zip(nn_a, nn_b)]))


def spectral_control(emb: np.ndarray, k: int = 10, d: int = 32, seed: int = 3) -> dict:
    """POSITIVE CONTROL: eigenmap-neighbors vs cosine-neighbors overlap@k, against a label-permutation null.
    High overlap proves the PIPELINE runs (the eigenmap is built FROM the cosine kNN — near-tautological),
    never the model. Reads null-relative so a non-discriminating regime stays visible."""
    n = emb.shape[0]
    if n < max(k + 1, d + 1):
        return {"note": f"too few vectors ({n}) for k={k}, d={d}", "beats_null": False}
    U = _unit(emb)
    W, cos_nn = _knn_graph(U, k)
    coords = sg.geometry(W, "fn.sym", "laplacian", d=d)
    C = _unit(coords)
    csim = C @ C.T
    np.fill_diagonal(csim, -np.inf)
    eig_nn = np.argsort(-csim, axis=1)[:, :k]
    overlap = _overlap_at_k(cos_nn, eig_nn, k)
    perm = np.random.default_rng(seed).permutation(n)
    null = _overlap_at_k(cos_nn, eig_nn[perm], k)
    return {"overlap_at_k": round(overlap, 4), "null_overlap": round(null, 4),
            "beats_null": bool(overlap > null * 3 + 0.05), "k": k, "d": d}


def spectral(sensorium: str, *, sample_n: int = 2000) -> dict:
    """The EMBEDDING-geometry surface of a poured sensorium (distinct from the stream-boundary surface): read
    the faithful chunk vectors through the machina's own door, gate their health, diagnose concentration, and
    run the eigenmap positive control. Blind to any ground-truth — it reports the geometry, not a verdict."""
    emb, metas = _load_vectors(sensorium, sample_n=sample_n)
    gate = validity_gate(emb, metas)
    out = {"sensorium": sensorium, "validity": gate}
    if gate["pass"]:
        out["concentration"] = concentration_diagnostics(emb)
        out["control"] = spectral_control(emb)
    return out


def detect(sensorium: str, *, halves=DEFAULT_HALVES) -> dict:
    """DETECT-ONLY over a poured sensorium: reconstruct its content stream → words → the full arm surface,
    every cut reported as a word position. The arms adapt four segmenters to the one stream — Foote novelty
    (vocabulary turnover), sequitur depth+seam (grammar hierarchy), sequitur-MDL (compression stall), and
    branching entropy (successor unpredictability). Blind to any ground-truth (the wall). Retains the words
    in-memory for context snippets (not persisted)."""
    content = resolve_content(sensorium)
    stream = _content_stream(ContentStore(content))
    toks = stream_words(stream)
    boundaries: dict = {}
    grammar = None
    mdl_inferred = 0
    if toks:
        boundaries.update(foote_sweep(toks, halves))
        seq = sequitur_arms(toks)
        grammar = seq.pop("_grammar")
        boundaries.update(seq)
        mdl_cuts, mdl_inferred = pelt_change_points(mdl_growth(toks))
        boundaries["sequitur-mdl"] = mdl_cuts
        boundaries.update(branching_entropy(toks))
    return {"sensorium": sensorium, "n_chars": len(stream), "n_words": len(toks),
            "boundaries": boundaries, "grammar": grammar, "mdl_inferred_cuts": mdl_inferred, "_words": toks}


def context(words: "list[str]", pos: int, span: int = 6) -> str:
    """The stream around a boundary word-position — the words just before and after the cut, for the eye to
    read what changed hands. A ⟂ marks the cut."""
    lo, hi = max(0, pos - span), min(len(words), pos + span)
    return " ".join(words[lo:pos]) + "  ⟂  " + " ".join(words[pos:hi])


def main() -> None:
    import argparse
    import json
    ap = argparse.ArgumentParser(description="sense_analyze — detect boundaries in a POURED sensorium's stream")
    ap.add_argument("sensorium", help="a sensorium NAME in sense-memory (or an explicit root path)")
    ap.add_argument("--halves", default=None, help="Foote kernel half-widths (words), comma-separated")
    ap.add_argument("--span", type=int, default=6, help="context words each side of a reported boundary")
    ap.add_argument("--spectral", action="store_true", help="run the embedding-geometry surface instead of boundaries")
    ap.add_argument("--sample", type=int, default=2000, help="spectral: max vectors to sample")
    ap.add_argument("--json", action="store_true", help="emit the surface as JSON")
    args = ap.parse_args()
    halves = tuple(int(h) for h in args.halves.split(",")) if args.halves else DEFAULT_HALVES

    if args.spectral:
        res = spectral(args.sensorium, sample_n=args.sample)
        if args.json:
            print(json.dumps(res, indent=2))
            return
        print(f"\n  {args.sensorium} · embedding geometry\n")
        for surface, body in res.items():
            if surface == "sensorium":
                continue
            print(f"  {surface}:")
            for k, v in body.items():
                print(f"      {k:>26} · {v}")
        return

    res = detect(args.sensorium, halves=halves)
    if args.json:
        print(json.dumps({k: v for k, v in res.items() if not k.startswith("_")}, indent=2))
        return
    words = res["_words"]
    print(f"\n  {args.sensorium} · {res['n_words']:,} words · {res['n_chars']:,} chars\n")
    if not words:
        print("  (empty stream — is this sensorium poured?)")
        return
    for arm, cuts in res["boundaries"].items():
        print(f"  {arm:>10} · {len(cuts)} boundaries: {cuts}")
        for c in cuts[:8]:
            print(f"      @{c:>6}   {context(words, c, args.span)}")


if __name__ == "__main__":
    main()
