#!/usr/bin/env python3
"""maximal_repeats — every recurring contiguous run, surfaced linearly, priced by MDL alone.

Replaces the frequent-lattice walk (PrefixSpan/BIDE) as the sequence-candidate
surfacer. The lattice grind was structural — the closed-subsequence lattice runs
exponential in pattern length on low-alphabet repetitive streams (Wang & Han's own
regime notes), and every cap that hid it (stream slicing, top-k) truncated silently.
This organ surfaces candidates instead as MAXIMAL REPEATS over the FULL streams:

  · A maximal repeat = a substring occurring >= 2 times that extends neither left
    nor right without losing an occurrence — the closure, for the contiguous case,
    that the lattice's closed-check was grinding toward (Gusfield ch.7).
  · Enumeration rides the enhanced suffix array: SA (prefix-doubling with rank
    reuse) + Kasai LCP + one bottom-up LCP-interval pass. Proper LCP-intervals
    give right-maximality by construction; left-diversity folds up the interval
    stack off each suffix's preceding symbol (Abouelhoda et al. 2004).
  · The candidate pool is bounded by the STRING (Gusfield: <= n-2 maximal repeats),
    so no cap, no top-k, no support threshold stands in this organ — support >= 2
    reads definitional to "repeat", document frequency rides as a FEATURE, and the
    MDL two-part code downstream deletes whatever fails to pay its bits.
  · Streams concatenate with a UNIQUE sentinel per boundary. Uniqueness cures the
    cross-stream phantom trap by theorem: a repeated substring can never contain a
    symbol that occurs once.
  · Document frequency = a k-bit mask per interval, OR'd bottom-up (idempotent, so
    a within-stream double-occurrence counts its stream once). The mask is a plain
    int; past-word-width stream counts stay exact in Python, so no guard clips.

Grounds (the YIN/YANG cross-passes, 2026-07-13): Gusfield 1997 ch.7 · Abouelhoda,
Kurtz & Ohlebusch, J. Discrete Algorithms 2(1) 2004 · Kasai et al., CPM 2001 ·
Wang & Han, ICDE 2004 (why the lattice grinds) · Smets & Vreeken, SDM 2012 (MDL
arbitrates; the generator only pools).

Meme: lar:///ha.ka.ba/lararium/sensorium/maximal-repeats
"""
from __future__ import annotations


def suffix_array(t: "list[int]") -> "list[int]":
    """Prefix-doubling with rank reuse — O(n log^2 n), deterministic, stdlib.

    Symbols remap to dense non-negative ranks at the door: the past-end marker (-1)
    must stand strictly below every real symbol, and a negative alphabet (the unique
    stream sentinels ride below -9) would otherwise rank beneath end-of-string —
    a shorter suffix sorts before its extension, and the marker collision silently
    inverted exactly that on periodic multi-stream inputs."""
    n = len(t)
    if n == 0:
        return []
    order = {s: r for r, s in enumerate(sorted(set(t)))}
    sa = list(range(n))
    rank = [order[s] for s in t]
    k = 1
    while True:
        def key(i: int, k=k, rank=rank, n=n):
            return (rank[i], rank[i + k] if i + k < n else -1)

        sa.sort(key=key)
        tmp = [0] * n
        for j in range(1, n):
            tmp[sa[j]] = tmp[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
        rank = tmp
        if rank[sa[-1]] == n - 1:
            return sa
        k *= 2


def lcp_array(t: "list[int]", sa: "list[int]") -> "list[int]":
    """Kasai — lcp[i] = longest common prefix of the suffixes at sa[i-1] and sa[i]."""
    n = len(t)
    rank = [0] * n
    for i, s in enumerate(sa):
        rank[s] = i
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] == 0:
            h = 0  # no SA-predecessor — a stale carry here inflates every later entry
            continue
        j = sa[rank[i] - 1]
        while i + h < n and j + h < n and t[i + h] == t[j + h]:
            h += 1
        lcp[rank[i]] = h
        if h:
            h -= 1
    return lcp


_EMPTY, _DIVERSE = -1, -2


def _merge(entry: list, mask: int, prev: int) -> None:
    entry[2] |= mask
    if entry[3] == _EMPTY:
        entry[3] = prev
    elif prev == _DIVERSE or entry[3] != prev:
        entry[3] = _DIVERSE


def repeat_intervals(
    t: "list[int]", doc: "list[int]", min_len: int = 2
) -> "list[tuple]":
    """Every maximal repeat of length >= min_len as (length, start, support, doc_mask),
    in one bottom-up LCP-interval pass. Right-maximality = the proper interval;
    left-diversity = the preceding symbols disagree somewhere under it. `doc[i]`
    names the stream position i belongs to; position 0's predecessor reads as its
    own unique symbol (start-of-text diversifies honestly)."""
    n = len(t)
    if n < 2:
        return []
    sa = suffix_array(t)
    lcp = lcp_array(t, sa)
    # the symbol preceding each suffix; -3-i keys a unique start-of-text per position 0
    prev_of = [t[p - 1] if p > 0 else -3 for p in range(n)]

    out: "list[tuple]" = []
    stack: "list[list]" = []  # [lcp, left_boundary, doc_mask, prev_symbol]
    for i in range(1, n + 1):
        h = lcp[i] if i < n else -1
        leaf = sa[i - 1]
        lb = i - 1
        pending_mask, pending_prev = 1 << doc[leaf], prev_of[leaf]
        while stack and stack[-1][0] > h:
            e = stack.pop()
            _merge(e, pending_mask, pending_prev)
            if e[0] >= min_len and e[3] == _DIVERSE:
                out.append((e[0], sa[e[1]], i - 1 - e[1] + 1, e[2]))
            lb = e[1]
            pending_mask, pending_prev = e[2], e[3]
        if stack and stack[-1][0] == h:
            _merge(stack[-1], pending_mask, pending_prev)
        elif h >= 0:
            stack.append([h, lb, pending_mask, pending_prev])
    return out


def mine_maximal_repeats(streams: "list[list]", min_len: int = 2) -> "list[dict]":
    """The candidate pool over the FULL streams: [{seq, support, doc_freq}], every
    maximal repeat, deterministic order (potential-saving first: support x (len-1),
    then longer, then lexical). No cap, no threshold — the MDL selector deletes."""
    symtab: "dict[object, int]" = {}
    decode: "list[object]" = []

    def code(tok) -> int:
        got = symtab.get(tok)
        if got is None:
            got = len(decode)
            symtab[tok] = got
            decode.append(tok)
        return got

    t: "list[int]" = []
    doc: "list[int]" = []
    sentinel = -10  # unique per boundary, descending — each occurs exactly once
    for d, stream in enumerate(streams):
        if d > 0:
            t.append(sentinel)
            doc.append(d)  # the sentinel's stream tag never matters: it repeats never
            sentinel -= 1
        for tok in stream:
            t.append(code(tok))
            doc.append(d)

    seen: "dict[tuple, tuple]" = {}
    for length, start, support, mask in repeat_intervals(t, doc, min_len=min_len):
        seq = tuple(t[start : start + length])
        held = seen.get(seq)
        if held is None or support > held[0]:
            seen[seq] = (support, mask)
    out = [
        {
            "seq": [str(decode[c]) for c in seq],
            "support": support,
            "doc_freq": bin(mask).count("1"),
        }
        for seq, (support, mask) in seen.items()
    ]
    out.sort(key=lambda x: (-(x["support"] * (len(x["seq"]) - 1)), -len(x["seq"]), x["seq"]))
    return out
