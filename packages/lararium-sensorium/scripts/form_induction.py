#!/usr/bin/env python3
"""form_induction — the FORM cap: the corpus's OWN grammar, induced BLIND.

corpus.md #the-form-induction. The COARSEST of the corpus planes (Content ↠ Structure
↠ FORM — the chain of coarsenings; bands dissolved into the stored address). Where
`form_encoder.py` scores a turn against a KNOWN constructicon
(the fuzzy-membership plane, P2 of living-grammar-palace), THIS sidecar LEARNS the
constructicon a corpus never told us it had — the nameless learner: miners surface the
shape, description-length keeps only what pays, and the LLM names LAST (never inside the
loop).

An OFFLINE BATCH over the accumulated STRUCTURE plane (the structurepalace of content-free
trees the structure router filed under <corpus>/structure), NOT a per-turn hot-path move. One
`induce` command reads the forest back, mines it, and writes the corpus's constructicon
keyed by structural hash.

THE STACK (corpus.md #the-form-induction)
=========================================
  TreeMiner      — frequent EMBEDDED ordered CLOSED subtrees (the template surfacer;
                   Zaki's rightmost-extension enumeration, ported ~native so no dep;
                   CLOSED-filtered so a sub-pattern of an equally-frequent super-pattern
                   never spams the output).
  MaximalRepeats — every recurring CONTIGUOUS run of the pre-order node-type streams,
                   surfaced linearly over the FULL streams (maximal_repeats.py: suffix
                   array + LCP intervals; the pool bounds by the string, never a knob).
  ΔP association — usage-based construction candidates by the c2xg association measure
                   (candidate → identify(ΔP) → evaluate(MDL)). c2xg-the-PACKAGE targets
                   raw NL words + a gensim word2vec basis; our units are content-free
                   node-type / sigil labels, so we port its ΔP METHOD natively over OUR
                   streams rather than import a word-oriented stack (the on-target learner
                   applied to the corpus's own units).

THE STOP IS MDL. Every surfaced candidate — subtree, sequence, ΔP bigram, or SEED —
faces ONE description-length ledger over the streams: a template joins the constructicon
only if the bits it saves in l(D|G) exceed the bits it costs in l(G). The greedy EM-style
rounds add the best-paying candidate each pass and STOP when no candidate lowers the total
description length (l(G)+l(D|G) stops falling). A min-support floor + a held-out presence
cross-check guard the overfit corner — a template that only MEMORIZES a few instances
raises the sum and is rejected.

SEED-AND-REFINE is SAFE BECAUSE of MDL. We seed the candidate pool with a few KNOWN house
forms (the chiasmus open/close, the ahu-block, the sigil-row); MDL discards any seed that
fails to earn its bits, so the corpus can overrule the seed. Pure cold induction stays
available (seed=[]).

THE LLM STAYS OUT of the induction loop. `induce` surfaces + selects the templates BLIND;
labelling / merging is a documented DOWNSTREAM step (`label_constructicon`, a namer the
caller supplies AFTER mining) — that ordering is what honors the nameless discipline.

Protocol — a BATCH CLI (mirrors structure_router / bands_sidecar, not a serve holder):
  induce --structure <structureDir> [--out <path>] [--min-support N] [--max-forms N]
      -> NDJSON: one {form} line per surfaced template, then a final {summary} line on
         stdout. --out mirrors the template lines to a file (the corpus's constructicon).

Run under the mempalace venv (PYTHONPATH=<repo>/mempalace so `induce`'s chroma readback
`import mempalace` resolves; the pure miners need neither):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 form_induction.py \
      induce --structure <data>/sensoriums/c-x/structure
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter

from deep_time import content_hash

# ── caps ────────────────────────────────────────────────────────────────────────────
# Bounds so a pathological forest can never make the miners run unbounded. The templates
# saturate well below these on any real corpus; the caps only clip a degenerate tail.
_MAX_TREES = 20_000          # forest size ceiling for a single induce
_MAX_STRUCTURE_COUNT = 500   # per-structure recurrence-expansion cap (a hot shape can't flood)
_MAX_SUBTREE_NODES = 6       # the largest embedded subtree the TreeMiner grows to
_MAX_CANDIDATES = 4_000      # candidate-pool ceiling (across all miners)
_MAX_FORMS_DEFAULT = 64      # constructicon-size ceiling (the MDL rounds stop far sooner)
_DEFAULT_MIN_SUPPORT = 2     # a template must recur at least this many trees/sequences
_DP_MIN = 0.25               # the ΔP association floor for a candidate bigram


# ── tree helpers (the content-free {"type", "children"} shape the structure router emits) ────


def _children(node: dict) -> list:
    kids = node.get("children")
    return kids if isinstance(kids, list) else []


def _preorder_types(node: dict, out: list) -> None:
    """The pre-order node-type stream of a tree — the sequence the repeat / ΔP miners
    read (and the linearization every subtree template is scored through in the MDL)."""
    t = node.get("type")
    out.append(str(t) if t is not None else "?")
    for c in _children(node):
        _preorder_types(c, out)


def _all_nodes(node: dict, out: list) -> None:
    out.append(node)
    for c in _children(node):
        _all_nodes(c, out)


def _tree_size(node: dict) -> int:
    return 1 + sum(_tree_size(c) for c in _children(node))


def _canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _struct_hash(value) -> str:
    """The constructicon KEY — sha256 of a template's canonical form (mirrors the
    structurepalace structural_hash), so a form is addressed by its shape, never a name."""
    return content_hash(_canonical(value).encode("utf-8"))[:32]


# ── ordered EMBEDDED tree inclusion (the TreeMiner support relation) ──────────────────
#
# An embedded subtree preserves ancestor-descendant (not merely parent-child) and
# left-to-right order — the classic ordered tree-inclusion recurrence (Kilpeläinen &
# Mannila), memoized on (pattern-forest, target-forest) identities. A subtree template
# is SUPPORTED by a corpus tree when it embeds anywhere inside it.


def _flatten_forest(forest: tuple) -> "tuple[list, list]":
    """A (label, children) tuple-forest → parallel preorder arrays (labels, scope), where
    scope[i] names the index of node i's rightmost descendant (Zaki's s(x) = [x, y]). The
    contiguity fact the indexed recurrence stands on: node i's children occupy
    [i+1, scope[i]] and its right siblings occupy [scope[i]+1, ...] — always intervals."""
    labels: list = []
    scope: list = []
    stack = [(node, False) for node in reversed(forest)]
    starts: list = []
    while stack:
        node, done = stack.pop()
        if done:
            scope[starts.pop()] = len(labels) - 1
            continue
        labels.append(node[0])
        scope.append(0)
        starts.append(len(labels) - 1)
        stack.append((node, True))
        for child in reversed(node[1]):
            stack.append((child, False))
    return labels, scope


def _emb_indexed(pl: list, ps: list, tl: list, ts: list) -> bool:
    """Ordered EMBEDDED forest inclusion over preorder intervals — the Kilpeläinen–Mannila
    recurrence re-KEYED, never re-shaped. The old formulation memoized on value-keyed
    spliced tuples (O(subtree) hashing over an unbounded key space — the measured grind);
    every spliced forest is in fact a contiguous preorder interval, so the state collapses
    to four ints and the memo hashes O(1) at KM's own O(|P|·|T|) reachable-state bound.
    Verdict-identical: (a) match root-to-root then children-in-children AND rest-in-rest;
    (b) descend — drop the target root, its children join the sibling row, which in index
    form reads simply [lo+1, hi). No structure discarded, no budget, no knob."""
    memo: dict = {}
    root = (0, len(pl), 0, len(tl))
    stack = [[0, len(pl), 0, len(tl), 0]]  # [plo, phi, lo, hi, stage] — half-open
    while stack:
        frame = stack[-1]
        plo, phi, lo, hi, stage = frame
        key = (plo, phi, lo, hi)
        if stage == 0:
            if key in memo:
                stack.pop()
                continue
            if plo >= phi:
                memo[key] = True
                stack.pop()
                continue
            if lo >= hi:
                memo[key] = False
                stack.pop()
                continue
            # (a) map the first pattern root onto the first target root.
            if pl[plo] != tl[lo]:
                frame[4] = 2
                continue
            sub = (plo + 1, ps[plo] + 1, lo + 1, ts[lo] + 1)  # children in children
            if sub not in memo:
                stack.append([*sub, 0])
                continue
            frame[4] = 1 if memo[sub] else 2
            continue
        if stage == 1:
            sub = (ps[plo] + 1, phi, ts[lo] + 1, hi)  # rest of pattern after the subtree
            if sub not in memo:
                stack.append([*sub, 0])
                continue
            if memo[sub]:
                memo[key] = True
                stack.pop()
                continue
            frame[4] = 2
            continue
        # stage 2 — (b) descend: the target root drops, its children join the row.
        sub = (plo, phi, lo + 1, hi)
        if sub not in memo:
            stack.append([*sub, 0])
            continue
        memo[key] = memo[sub]
        stack.pop()
    return memo[root]


def _emb_forest(pf: tuple, tf: tuple, memo: dict) -> bool:
    # The tuple-forest face the callers and witnesses hold; the work rides the indexed
    # recurrence. `memo` stays accepted for the callers that pass one; the indexed DP
    # carries its own (a value-keyed cross-call memo priced O(subtree) per hash — the
    # exact grind the re-keying retired).
    pl, ps = _flatten_forest(pf)
    tl, ts = _flatten_forest(tf)
    return _emb_indexed(pl, ps, tl, ts)


# Motif-scale bounds: the sinks we mine are SHALLOW recurring shapes, not whole deep-wide ASTs.
# Bounding depth + fan-out keeps the ordered-inclusion recurrence (_emb_forest) off the Python
# recursion limit AND the subtree enumeration off a combinatorial cliff — witnessed on real JS ASTs,
# which are both deep and wide and blew 990+ recursion frames. Beyond a cap a node truncates to a
# leaf (depth) / drops its extra siblings (fan-out); the recurring MOTIF scale survives intact.
_MAX_TREE_DEPTH = 32
_MAX_TREE_WIDTH = 16


def _as_forest(node: dict, depth: int = 0) -> tuple:
    """A tree → the immutable (label, children-forest) the inclusion recurrence walks, bounded to
    motif scale so a deep-wide AST cannot overflow the recurrence."""
    label = str(node.get("type", "?"))
    if depth >= _MAX_TREE_DEPTH:
        return (label, ())
    return (label, tuple(_as_forest(c, depth + 1) for c in _children(node)[:_MAX_TREE_WIDTH]))


def _embeds(pattern_forest: tuple, target: dict) -> bool:
    """Does `pattern` (one tree, as a 1-forest) embed ANYWHERE inside `target`?"""
    tf = (_as_forest(target),)
    return _emb_forest(pattern_forest, tf, {})


# ── the TreeMiner — frequent CLOSED embedded ordered subtrees ─────────────────────────
#
# Rightmost-extension enumeration over the canonical (label, depth) preorder string: each
# ordered tree is generated exactly once by appending a node at depth d ∈ [1 .. last+1]
# (attached to the rightmost-path ancestor at depth d-1). Support = the number of corpus
# trees the candidate embeds in (anti-monotone → prune below the floor). Then CLOSED-filter:
# drop any frequent pattern subsumed by an equally-frequent larger one (no sub-pattern spam).


def _seq_to_tree(seq: list) -> dict:
    """A canonical (label, depth) preorder sequence → the nested {"type","children"} tree."""
    root = {"type": seq[0][0], "children": []}
    # stack[d] = the current node at depth d on the rightmost path.
    stack = [root]
    for label, depth in seq[1:]:
        node = {"type": label, "children": []}
        parent = stack[depth - 1]
        parent["children"].append(node)
        del stack[depth:]
        stack.append(node)
    return root


def _tree_scopes(t: dict) -> "tuple[list, dict]":
    """One preorder pass over a corpus tree → (scope, label_positions): scope[i] names
    node i's rightmost descendant (Zaki's s(x) = [x, y]), and each label's positions
    ride sorted for the interval joins. The scope arrays ARE the support machinery —
    every embedded-attachment constraint below reads as interval algebra over them."""
    scope: list = []
    label_pos: dict = {}
    stack = [(t, False)]
    starts: list = []
    while stack:
        node, done = stack.pop()
        if done:
            scope[starts.pop()] = len(scope) - 1
            continue
        pos = len(scope)
        scope.append(0)
        starts.append(pos)
        label_pos.setdefault(str(node.get("type", "?")), []).append(pos)
        stack.append((node, True))
        for child in reversed(_children(node)):
            stack.append((child, False))
    return scope, label_pos


def _extend_occs(occs: dict, trees_ix: dict, lab: str, depth: int) -> dict:
    """The scope-list join — one (label, depth) rightmost extension, per Zaki. An
    occurrence carries ONLY its rightmost path (extensions never reference anything
    left of it): attach at depth d under anc = path[d-1], with the new position q
    riding (scope(path[d]), scope(anc)] when a depth-d sibling stands, else
    (path[D], scope(path[D])] for the child-of-last case. Both read as one bisect
    over the label's sorted positions — no inclusion DP anywhere."""
    import bisect

    out: dict = {}
    for tid, paths in occs.items():
        scope, label_pos = trees_ix[tid]
        qs = label_pos.get(lab)
        if not qs:
            continue
        grown = set()
        for path in paths:
            last = len(path) - 1
            if depth > last + 1:
                continue
            if depth == last + 1:
                lo, hi = path[last], scope[path[last]]
            else:
                lo, hi = scope[path[depth]], scope[path[depth - 1]]
            for j in range(bisect.bisect_right(qs, lo), len(qs)):
                q = qs[j]
                if q > hi:
                    break
                grown.add(path[:depth] + (q,))
        if grown:
            out[tid] = grown
    return out


def mine_subtrees(forest: list, min_support: int, *, max_nodes: int = _MAX_SUBTREE_NODES,
                  max_candidates: int = _MAX_CANDIDATES) -> list:
    """Frequent CLOSED embedded ordered subtrees. Returns [{seq, tree, support, size}], the
    templates sorted large-first then by support (the strongest structural forms lead).

    Support rides SCOPE-LIST joins (Zaki, IEEE TKDE 17(8) 2005): each pattern carries
    its occurrences' rightmost paths per tree, and every (label, depth) extension joins
    by interval algebra over precomputed scopes — the per-candidate inclusion DP the
    old miner ran against whole trees never runs here. Same enumeration order, same
    budgets, same closed filter; only the support relation changed vehicle."""
    # frequent single labels seed level 1; the per-tree scope index feeds every join.
    trees_ix: dict = {}
    label_trees: dict = {}
    for tid, t in enumerate(forest):
        scope, label_pos = _tree_scopes(t)
        trees_ix[tid] = (scope, label_pos)
        for lab in sorted(label_pos):  # sorted: the walk order never rides string-hash order
            label_trees.setdefault(lab, []).append(tid)
    frontier: list = []
    frequent: dict = {}
    for lab, tids in sorted(label_trees.items()):
        if len(tids) >= min_support:
            seq = [(lab, 0)]
            occs = {tid: {(p,) for p in trees_ix[tid][1][lab]} for tid in tids}
            frequent[tuple(seq)] = {"seq": seq, "support": len(tids), "size": 1}
            frontier.append((seq, occs))
    explored = 0
    while frontier and explored < max_candidates:
        seq, occs = frontier.pop()
        if len(seq) >= max_nodes:
            continue
        last_depth = seq[-1][1]
        # rightmost-path depths a new node may attach at: 1 .. last_depth+1.
        for depth in range(1, last_depth + 2):
            for lab in sorted(label_trees):
                explored += 1
                if explored >= max_candidates:
                    break
                cand = seq + [(lab, depth)]
                grown = _extend_occs(occs, trees_ix, lab, depth)
                if len(grown) >= min_support:
                    frequent[tuple(cand)] = {
                        "seq": cand, "support": len(grown), "size": len(cand)
                    }
                    frontier.append((cand, grown))
    # CLOSED filter — a pattern is non-closed if a strictly larger frequent pattern with the
    # SAME support contains it (the sub-pattern adds nothing the super-pattern doesn't say).
    items = list(frequent.values())
    closed = []
    for a in items:
        a_tree = _seq_to_tree(a["seq"])
        a_forest = (_as_forest(a_tree),)
        subsumed = False
        for b in items:
            if b["size"] > a["size"] and b["support"] == a["support"]:
                if _embeds(a_forest, _seq_to_tree(b["seq"])):
                    subsumed = True
                    break
        if not subsumed:
            tree = _seq_to_tree(a["seq"])
            closed.append({
                "seq": a["seq"], "tree": tree, "support": a["support"], "size": a["size"],
            })
    closed.sort(key=lambda x: (-x["size"], -x["support"], x["seq"]))
    return closed


# ── maximal repeats — recurring contiguous runs over the streams ──────────────────────


def mine_sequences(streams: list, min_support: int, *, max_forms: int = _MAX_FORMS_DEFAULT,
                   min_len: int = 2, topk: bool = False) -> list:
    """Recurring CONTIGUOUS runs of the pre-order type streams — every maximal repeat
    over the FULL streams, surfaced linearly (maximal_repeats), priced downstream by
    the MDL rounds. Returns [{seq, support, occurrences}] as symbol lists.

    THE LATTICE WALK RETIRED. The closed-subsequence miner (PrefixSpan/BIDE) ground
    structurally on low-alphabet repetitive streams — the closed lattice runs
    exponential in pattern length there, and every bound that hid it (the per-stream
    symbol slice, the top-k cap, dropped closed-pruning) truncated silently. Maximal
    repeats carry the contiguous case's closure by definition (extendable neither way
    without losing an occurrence), the pool bounds by the STRING itself (<= n-2 per
    stream — a theorem, never a knob), and gapped subsequences hand their job to the
    tree lane, where ancestor/sibling-order gaps read structurally instead of joining
    unrelated subtrees across a bracketless preorder stream.

    `support` counts STREAMS carrying the run (the document frequency the old miner
    reported); `occurrences` counts landings. No support threshold gates emission —
    the MDL selector deletes what fails to pay — and `min_support`/`topk` stay in the
    signature only so existing callers keep composing (neither gates anything here).
    The [:max_forms] hand-off slice keeps the existing induce interface; candidates
    order by potential saving (occurrences x (len-1)) so the slice keeps the
    strongest-paying pool."""
    del min_support, topk  # retired gates — the two-part code arbitrates now
    from maximal_repeats import mine_maximal_repeats

    out = [
        {"seq": c["seq"], "support": c["doc_freq"], "occurrences": c["support"]}
        for c in mine_maximal_repeats(streams, min_len=min_len)
    ]
    return out[:max_forms]


def _seq_support(streams: list, pat: tuple) -> int:
    """The number of streams that contain `pat` as a (gapped) subsequence."""
    n = 0
    for s in streams:
        it = iter(s)
        if all(any(x == p for x in it) for p in pat):
            n += 1
    return n


# ── ΔP association — the c2xg candidate-identify METHOD, native over our streams ───────
#
# ΔP (Ellis) is a DIRECTIONAL, asymmetric association: ΔP(B|A) = P(B|A) − P(B|¬A) reads
# "how much A's presence raises B's odds"; ΔP(A|B) reads the reverse. c2xg identifies a
# construction candidate when the max-direction ΔP clears a floor — the pair coheres more
# than chance in at least one direction. We score ADJACENT unit pairs over the streams;
# the survivors are two-symbol candidate constructions the MDL then evaluates.


def delta_p_bigrams(streams: list, dp_min: float = _DP_MIN, min_support: int = _DEFAULT_MIN_SUPPORT) -> list:
    """Adjacent-pair construction candidates by the max-direction ΔP. Returns
    [{seq:[A,B], support, dp}] for pairs clearing `dp_min` and the support floor."""
    unigram: Counter = Counter()
    bigram: Counter = Counter()
    total_tokens = 0
    total_bigrams = 0
    for s in streams:
        total_tokens += len(s)
        for x in s:
            unigram[x] += 1
        for a, b in zip(s, s[1:]):
            bigram[(a, b)] += 1
            total_bigrams += 1
    if total_bigrams == 0:
        return []
    # per-stream support (how many streams carry the adjacent pair) — the recurrence floor.
    pair_streams: Counter = Counter()
    for s in streams:
        for pair in {(a, b) for a, b in zip(s, s[1:])}:
            pair_streams[pair] += 1
    out = []
    for (a, b), n_ab in bigram.items():
        if pair_streams[(a, b)] < min_support:
            continue
        n_a = unigram[a]
        n_b = unigram[b]
        # ΔP(B|A): P(B|A) − P(B|¬A) over the adjacency contingency table.
        # a-followed-by-b vs a-followed-by-not-b; not-a-followed-by-b vs not-a-followed-by-not-b.
        a_then = sum(cnt for (x, _y), cnt in bigram.items() if x == a) or 1
        nota_then = total_bigrams - a_then or 1
        b_after_a = n_ab
        b_after_nota = n_b - n_ab  # crude: b's incoming minus the a→b share
        p_b_given_a = b_after_a / a_then
        p_b_given_nota = max(b_after_nota, 0) / nota_then
        dp_b_a = p_b_given_a - p_b_given_nota
        # ΔP(A|B): the reverse direction over incoming edges.
        then_b = sum(cnt for (_x, y), cnt in bigram.items() if y == b) or 1
        not_then_b = total_bigrams - then_b or 1
        a_before_b = n_ab
        p_a_given_b = a_before_b / then_b
        p_a_given_notb = max(n_a - n_ab, 0) / not_then_b
        dp_a_b = p_a_given_b - p_a_given_notb
        dp = max(dp_b_a, dp_a_b)
        if dp >= dp_min:
            out.append({"seq": [str(a), str(b)], "support": pair_streams[(a, b)], "dp": round(dp, 4)})
    out.sort(key=lambda x: (-x["dp"], -x["support"], x["seq"]))
    return out


# ── the seed constructicon (seed-and-refine; MDL discards a seed that doesn't earn it) ─
#
# A few KNOWN house forms, offered as candidates like any other. They carry no privilege:
# MDL keeps a seed ONLY where the corpus reproduces it enough to pay its bits.

def house_seeds() -> list:
    """The house's own known forms, as sequence templates over node-type / sigil labels."""
    return [
        # the exchange chiasmus open→close (noosphere-boot#exchange-protocol).
        {"seq": ["sigil", "sigil", "sigil"], "origin": "seed", "name_hint": "sigil-row"},
        # the ahu section block wrapping its opening sigil.
        {"seq": ["ahu_block", "sigil"], "origin": "seed", "name_hint": "ahu-block"},
        # the entry bracket: the doctype comment + the pranala-header sigil.
        {"seq": ["comment", "sigil"], "origin": "seed", "name_hint": "pranala-open"},
    ]


# ── the MDL ledger — one description-length over the streams, the overfit guard ────────
#
# A two-part code: l(G) prices each template (its expansion + an id) and l(D|G) prices the
# streams encoded with the dictionary. A template earns its place iff it lowers l(G)+l(D|G).
# Uniform per-token cost over the EXTENDED alphabet (literals + template ids) makes the
# ledger monotone and honest: a template shortens the token count where it recurs, but
# inflates every token's price a little — so a rare template's l(G) never pays back.


def _encode_len(streams: list, dictionary: list, alphabet_size: int) -> float:
    """l(D|G): greedily cover each stream with the longest-matching dictionary template
    (else a literal), one token per emitted unit, at log2(|Σ|+|dict|) bits each."""
    ext = alphabet_size + len(dictionary)
    bits_per = math.log2(ext) if ext > 1 else 1.0
    # dictionary as tuples, longest-first so the greedy cover prefers the biggest template.
    pats = sorted((tuple(d["seq"]) for d in dictionary), key=len, reverse=True)
    total = 0
    for s in streams:
        i = 0
        n = len(s)
        while i < n:
            matched = 0
            for p in pats:
                lp = len(p)
                if lp and i + lp <= n and tuple(s[i:i + lp]) == p:
                    matched = lp
                    break
            total += 1  # one emitted token (a template id OR a literal)
            i += matched if matched else 1
    return total * bits_per


def _grammar_len(dictionary: list, alphabet_size: int) -> float:
    """l(G): each template costs (len+1) ids in the extended alphabet — its expansion plus
    a stop. An empty dictionary costs nothing."""
    ext = alphabet_size + len(dictionary)
    bits_per = math.log2(ext) if ext > 1 else 1.0
    return sum((len(d["seq"]) + 1) * bits_per for d in dictionary)


def description_length(streams: list, dictionary: list, alphabet_size: int) -> float:
    return _grammar_len(dictionary, alphabet_size) + _encode_len(streams, dictionary, alphabet_size)


class _CoverScorer:
    """The vectorized cover scan behind the MDL rounds — same greedy longest-match cover
    as _encode_len, restructured around three facts the naive loop re-derived every trial:
    a candidate's MATCH POSITIONS never change across rounds (cached once, one boolean
    array per stream); the kept dictionary changes once per round (the longest-match
    baseline rebuilds then, never per trial); and a candidate can never save more units
    than occurrences x (len-1) (each match replaces at most len emissions with one), so
    a round skips exactly the trials that provably cannot beat the best found — an
    MDL-derived bound, never a knob. Integer arithmetic throughout: deterministic."""

    def __init__(self, streams: list) -> None:
        import numpy as np

        self._np = np
        self._sym: dict = {}
        arrs = []
        for s in streams:
            row = np.empty(len(s), dtype=np.int64)
            for i, x in enumerate(s):
                v = self._sym.get(x)
                if v is None:
                    v = len(self._sym)
                    self._sym[x] = v
                row[i] = v
            arrs.append(row)
        self._arrs = arrs
        self._base = [np.zeros(a.shape[0], dtype=np.int32) for a in arrs]

    def masks(self, pat: tuple) -> "tuple[list, int]":
        """Per-stream match-start booleans for one template + its occurrence count."""
        enc = [self._sym.get(x) for x in pat]
        L = len(enc)
        out: list = []
        occ = 0
        for a in self._arrs:
            n = a.shape[0]
            if any(e is None for e in enc) or L == 0 or L > n:
                out.append(None)
                continue
            m = a[: n - L + 1] == enc[0]
            for j in range(1, L):
                m = m & (a[j : n - L + 1 + j] == enc[j])
            if m.any():
                out.append(m)
                occ += int(m.sum())
            else:
                out.append(None)
        return out, occ

    def rebuild_base(self, kept_pats: "list[tuple[tuple, list]]") -> int:
        """Re-derive the kept dictionary's longest-match array (once per accepted round)
        and return the baseline unit count."""
        np = self._np
        self._base = [np.zeros(a.shape[0], dtype=np.int32) for a in self._arrs]
        for pat, masks in kept_pats:
            L = len(pat)
            for bl, m in zip(self._base, masks):
                if m is not None:
                    np.maximum(bl[: m.shape[0]], np.where(m, L, 0), out=bl[: m.shape[0]])
        self._base_units = self._units(self._base)
        return self._base_units

    def _units(self, bestlen: list) -> int:
        total = 0
        for bl in bestlen:
            row = bl.tolist()  # scalar indexing runs far faster off a list
            i, n, u = 0, len(row), 0
            while i < n:
                u += 1
                step = row[i]
                i += step if step else 1
            total += u
        return total

    def units_with(self, pat: tuple, masks: list) -> int:
        """The cover's unit count with one candidate riding beside the kept baseline."""
        np = self._np
        L = len(pat)
        trial = []
        for bl, m in zip(self._base, masks):
            if m is None:
                trial.append(bl)
            else:
                t = bl.copy()
                np.maximum(t[: m.shape[0]], np.where(m, L, 0), out=t[: m.shape[0]])
                trial.append(t)
        return self._units(trial)


def mdl_select(streams: list, candidates: list, *, min_support: int = _DEFAULT_MIN_SUPPORT,
               max_forms: int = _MAX_FORMS_DEFAULT, holdout: list | None = None) -> dict:
    """The greedy EM-style MDL rounds: add the candidate that most lowers the total
    description length each pass; STOP when none lowers it (l(G)+l(D|G) stops falling).
    A min-support floor + an optional held-out presence cross-check reject the memorize-few
    corner. Returns {kept, rejected, dl0, dl, rounds}.

    The cover scan rides _CoverScorer (cached match masks · once-per-round baseline ·
    the occurrences x (len-1) unit bound) — verdict-identical to the reference
    description_length trials, measured in seconds instead of minutes on real streams."""
    alphabet = sorted({x for s in streams for x in s})
    asize = max(len(alphabet), 1)
    dl0 = description_length(streams, [], asize)
    kept: list = []
    kept_keys: set = set()
    rejected: list = []
    # de-dupe candidates by their sequence (a form surfaced by two miners counts once).
    pool = []
    seen_seq: set = set()
    for c in candidates:
        key = tuple(c["seq"])
        if key in seen_seq or len(key) < 1:
            continue
        seen_seq.add(key)
        pool.append(dict(c))
    # total order over the candidate pool: first-improvement MDL ties resolve by support then seq,
    # never by the miners' process-varying emission order (re-dreams stay byte-stable across seeds).
    # The seq key canonicalizes to ONE string: candidate kinds carry differently-shaped seqs
    # (subtree (label, depth) pairs beside sequence symbol strings), and a raw tuple compare
    # throws exactly when supports tie ACROSS kinds — a latent break no single-kind corpus hits.
    pool.sort(key=lambda c: (-int(c.get("support", 0) or 0), _canonical(c["seq"])))

    scorer = _CoverScorer(streams)
    # the floors and the match masks never change across rounds — derived once, here.
    trials = []
    for c in pool:
        key = tuple(c["seq"])
        if _seq_support(streams, key) < min_support:
            continue
        if holdout and _seq_support(holdout, key) < 1:
            continue
        masks, occ = scorer.masks(key)
        trials.append((c, key, masks, occ))

    base_units = scorer.rebuild_base([])
    kept_pats: list = []  # [(key, masks)] — the baseline's own ingredients
    grammar_ids = 0  # sum of (len+1) over kept — the l(G) id count at shared bits-per
    dl = dl0
    rounds = 0
    while len(kept) < max_forms:
        ext = asize + len(kept) + 1
        bits_per = math.log2(ext) if ext > 1 else 1.0
        best = None
        best_dl = dl
        best_masks = None
        for c, key, masks, occ in trials:
            if key in kept_keys:
                continue
            L = len(key)
            # the unit bound: no cover can save more than occ x (L-1) units, so a trial
            # whose floor already misses the best stays unscored — exact, knob-free.
            floor_dl = (base_units - occ * (L - 1) + grammar_ids + L + 1) * bits_per
            if floor_dl >= best_dl - 1e-9:
                continue
            trial_dl = (scorer.units_with(key, masks) + grammar_ids + L + 1) * bits_per
            if trial_dl < best_dl - 1e-9:
                best_dl = trial_dl
                best = c
                best_masks = masks
        if best is None:
            break  # no candidate lowers the description length → the grammar has settled.
        kept.append(best)
        kept_keys.add(tuple(best["seq"]))
        grammar_ids += len(best["seq"]) + 1
        kept_pats.append((tuple(best["seq"]), best_masks))
        base_units = scorer.rebuild_base(kept_pats)
        dl = best_dl
        rounds += 1
    # everything the rounds never took, recorded as rejected (it did not pay its bits / floor).
    for c in pool:
        if tuple(c["seq"]) not in kept_keys:
            rejected.append(c)
    return {"kept": kept, "rejected": rejected, "dl0": dl0, "dl": dl, "rounds": rounds}


# ── the induce fold (the testable core; no chroma) ────────────────────────────────────


def induce_forest(forest: list, *, min_support: int = _DEFAULT_MIN_SUPPORT,
                  max_forms: int = _MAX_FORMS_DEFAULT, seeds: list | None = None,
                  max_candidates: "int | None" = None) -> dict:
    """BLIND induction over a structure forest → the corpus's constructicon.

    TreeMiner + MaximalRepeats + ΔP surface candidates; MDL over the streams selects the
    ones that pay their bits; seeds ride the same ledger (kept only where earned). The LLM
    is NOT called — labelling is downstream. Returns {forms, summary}.

    `max_candidates` bounds the MDL's candidate POOL per miner (each miner's list already
    sorts strongest-first, so the slice keeps the highest-support/largest shapes): every
    MDL round trials the whole pool against the full streams, so an unbounded pool over
    real corpora turns the greedy rounds into a minutes-long grind (the same bounded-work
    philosophy as _MAX_CANDIDATES above, applied at the selection stage). None keeps the
    unbounded batch behavior; the per-pass plane cap rides a bound."""
    import sys
    # Backstop for the linear tree-walks (_all_nodes / _tree_size / _preorder_types) on deep ASTs;
    # the _as_forest motif bound already keeps the branching inclusion-recurrence shallow.
    sys.setrecursionlimit(max(sys.getrecursionlimit(), 6000))
    forest = forest[:_MAX_TREES]
    streams = []
    for t in forest:
        s: list = []
        _preorder_types(t, s)
        streams.append(s)
    # held-out split: a small tail witnesses generalization (skipped when too few trees).
    holdout = None
    if len(streams) >= 6:
        cut = max(1, len(streams) // 5)
        holdout = streams[-cut:]
        train = streams[:-cut]
    else:
        train = streams

    # The bound reaches the TreeMiner's ENUMERATION too, not just the pool slice: the default
    # 4000-try budget also quadratically inflates the closed-filter (each frequent pair pays an
    # inclusion check), which is where an unbounded per-pass induce ground for minutes.
    subtrees = (mine_subtrees(forest, min_support) if max_candidates is None
                else mine_subtrees(forest, min_support, max_candidates=max_candidates))
    # Bounded ⇒ the branch-and-bound top-k sequence miner (the exhaustive closed walk
    # grinds for minutes on real streams); unbounded keeps the exhaustive batch behavior.
    sequences = mine_sequences(train, min_support, max_forms=max_forms,
                               topk=(max_candidates is not None))
    dp = delta_p_bigrams(train, min_support=min_support)
    seed_forms = seeds if seeds is not None else house_seeds()
    if max_candidates is not None:
        # Bound the pool per miner (each list sorts strongest-first, so the strongest lead);
        # seeds never slice — MDL already prices them honestly.
        subtrees = subtrees[:max_candidates]
        sequences = sequences[:max_candidates]
        dp = dp[:max_candidates]

    # unify into ONE candidate pool for the MDL, carrying each candidate's origin + shape.
    # SEEDS lead the pool so a seeded shape that also gets mined keeps its name_hint through
    # the de-dup — seed-and-refine names the form, mining confirms it (the corpus can still
    # overrule the seed by never reproducing it, in which case MDL drops it below).
    candidates: list = []
    for sd in seed_forms:
        candidates.append(dict(sd))
    for st in subtrees:
        candidates.append({"seq": [lbl for lbl, _d in st["seq"]],
                           "origin": "tree", "support": st["support"], "size": st["size"],
                           "tree": st["tree"]})
    for sq in sequences:
        candidates.append({"seq": sq["seq"], "origin": "seq", "support": sq["support"]})
    for d in dp:
        candidates.append({"seq": d["seq"], "origin": "dp", "support": d["support"], "dp": d["dp"]})

    sel = mdl_select(train, candidates, min_support=min_support, max_forms=max_forms, holdout=holdout)

    forms = []
    for c in sel["kept"]:
        shape = c.get("tree") if c.get("origin") == "tree" else {"seq": c["seq"]}
        forms.append({
            "struct_hash": _struct_hash(shape),
            "origin": c.get("origin", "seq"),
            "seq": c["seq"],
            "support": c.get("support", _seq_support(train, tuple(c["seq"]))),
            **({"dp": c["dp"]} if "dp" in c else {}),
            **({"name_hint": c["name_hint"]} if "name_hint" in c else {}),
            **({"tree": c["tree"]} if "tree" in c else {}),
        })
    # A seed's fate is whether its SHAPE reached the constructicon (robust to de-dup: a seed
    # whose shape a miner also surfaced still counts as kept — the seeded form survived MDL).
    kept_seqs = {tuple(c["seq"]) for c in sel["kept"]}
    seeds_kept = [s.get("name_hint", "?") for s in seed_forms if tuple(s["seq"]) in kept_seqs]
    seeds_dropped = [s.get("name_hint", "?") for s in seed_forms if tuple(s["seq"]) not in kept_seqs]
    summary = {
        "forms": len(forms),
        "trees": len(forest),
        "candidates": len(candidates),
        "subtrees": len(subtrees),
        "sequences": len(sequences),
        "dp_bigrams": len(dp),
        "seeds_kept": seeds_kept,
        "seeds_dropped": seeds_dropped,
        "dl0": round(sel["dl0"], 2),
        "dl": round(sel["dl"], 2),
        "rounds": sel["rounds"],
    }
    return {"forms": forms, "summary": summary}


# ── the LLM-names-LAST shore (downstream of the loop, never inside it) ─────────────────


def label_constructicon(forms: list, namer=None) -> list:
    """Attach human names to ALREADY-MINED forms. `namer(form) -> str` is supplied by the
    caller AFTER induction (an LLM, a lookup, or None). With no namer this is a no-op — the
    mining stands on its own; naming is the last, separate step (the nameless discipline)."""
    if namer is None:
        return forms
    out = []
    for f in forms:
        g = dict(f)
        try:
            g["label"] = namer(f)
        except Exception:  # noqa: BLE001 — a namer fault never corrupts a mined form
            g["label"] = f.get("name_hint", "")
        out.append(g)
    return out


# ── the batch induce command — read the structure structurepalace, mine, emit ───────────────


def _read_structure_forest(structure_dir: str) -> tuple[list, str | None]:
    """Read the content-free trees back out of the structure structurepalace (the chroma at
    <corpus>/structure). Returns (forest, error). A missing/empty store → ([], reason)."""
    try:
        from mempalace.palace import get_collection
    except Exception as exc:  # noqa: BLE001 — no mempalace/chroma → graceful skip
        return [], f"no mempalace/chroma ({type(exc).__name__})"
    try:
        col = get_collection(structure_dir, _skip_identity_check=True)
    except Exception as exc:  # noqa: BLE001
        return [], f"no structure store ({type(exc).__name__})"
    try:
        got = col.get(include=["documents", "metadatas"])
    except Exception as exc:  # noqa: BLE001
        return [], f"structure read failed ({type(exc).__name__})"
    docs = got.get("documents") or []
    metas = got.get("metadatas") or []
    forest = []
    # The structurepalace DEDUPS identical structures to one row carrying a recurrence `count`
    # (structure_router files one put per source file; a repeated shape bumps the count). A
    # frequency miner must see that recurrence, so each distinct structure is EXPANDED by its
    # count (a tombstoned/set-aside structure feeds no plane) — capped so a hot structure can't
    # flood the forest.
    for i, doc in enumerate(docs):
        if not doc:
            continue
        meta = metas[i] if i < len(metas) else {}
        # The kapae gate reads `lar_tombstoned` — the key structurepalace_io actually stamps at
        # set-aside. Any other spelling reads absent on every row and lets every set-aside structure
        # straight into the forest.
        if isinstance(meta, dict) and meta.get("lar_tombstoned"):
            continue
        try:
            tree = json.loads(doc)
        except (ValueError, TypeError):
            continue
        if not isinstance(tree, dict):
            continue
        count = 1
        if isinstance(meta, dict):
            try:
                count = max(1, int(meta.get("count", 1)))
            except (ValueError, TypeError):
                count = 1
        for _ in range(min(count, _MAX_STRUCTURE_COUNT)):
            forest.append(tree)
            if len(forest) >= _MAX_TREES:
                return forest, None
    return forest, None


def cmd_induce(args) -> None:
    """Read the structure forest → induce the constructicon → NDJSON forms + a summary line.
    GRACEFUL: no store / too few trees ⇒ forms:0 with a `form-skipped` note (the content /
    structure / bands planes are untouched)."""
    forest, err = _read_structure_forest(args.structure)
    out = sys.stdout
    if err is not None:
        out.write(json.dumps({"forms": 0, "note": f"form-skipped: {err}"}) + "\n")
        return
    if len(forest) < args.min_support:
        out.write(json.dumps({
            "forms": 0, "trees": len(forest),
            "note": f"form-skipped: too few structures ({len(forest)} < min-support {args.min_support})",
        }) + "\n")
        return
    # PERF DEBT, named to the projector arc (RUN-ARC #5): this batch face walks the MDL
    # candidate pool UNBOUNDED (max_candidates stays None) — the per-pass bound cures
    # capture only. Unhit at the 12-doc test-bed (run_projector reads the durable form
    # plane, never re-mines); it bites HERE first when a big corpus rides this offline
    # CLI — apply capture's bounded-enumeration discipline (a --max-candidates arg) at
    # that crossing.
    res = induce_forest(forest, min_support=args.min_support, max_forms=args.max_forms)
    lines = [json.dumps(f, ensure_ascii=False) for f in res["forms"]]
    for line in lines:
        out.write(line + "\n")
    summary = dict(res["summary"])
    summary["note"] = f"form: {summary['forms']} constructions from {summary['trees']} structures"
    out.write(json.dumps(summary, ensure_ascii=False) + "\n")
    if args.out and lines:
        try:
            with open(args.out, "w") as fh:
                fh.write("\n".join(lines) + "\n")
        except OSError as exc:
            sys.stderr.write(f"form_induction: --out write failed ({exc})\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="form_induction — the corpus FORM cap (blind grammar induction)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    ind = sub.add_parser("induce", help="batch-induce a corpus's constructicon from its structure forest")
    ind.add_argument("--structure", required=True, help="the structure structurepalace dir (<corpus>/structure)")
    ind.add_argument("--out", default="", help="also write the constructicon NDJSON here")
    ind.add_argument("--min-support", type=int, default=_DEFAULT_MIN_SUPPORT, dest="min_support")
    ind.add_argument("--max-forms", type=int, default=_MAX_FORMS_DEFAULT, dest="max_forms")
    ind.set_defaults(fn=cmd_induce)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
