#!/usr/bin/env python3
"""sequitur_grammar — Nevill-Manning & Witten's SEQUITUR, written from the paper, because the algorithm
answers the no-imposed-prior constraint BY ABSENCE rather than by inference.

WHY SEQUITUR AND NOT ANOTHER SEGMENTER. Every instrument we have run at the Kumulipo carries a scale in
its hand before it reads a character: a window, a bin, a wavelet basis, a kernel width. Such an instrument
cannot fail to manufacture a finding at the scale it already holds — the MAUP bites, and the answer key
proves it bit. SEQUITUR holds NOTHING. It enforces two properties:

    · DIGRAM UNIQUENESS — no pair of adjacent symbols appears twice in the grammar.
    · RULE UTILITY      — a rule earns its keep only by getting used twice.

No window, no bin, no k, no basis, no kernel, no threshold. It reads left to right in linear time,
deterministically, and hands back a HIERARCHY that the repetitions themselves carved. The Kumulipo runs
on paired parallelism and refrain; a grammar induced from repetition reads the chant in the chant's own
grain, and a hierarchy wears the very shape a wā/branch structure wears.

Nevill-Manning & Witten, "Identifying Hierarchical Structure in Sequences: A Linear-Time Algorithm",
JAIR 7:67-82 (1997), arXiv cs/9709102; reference C++/Java at sequitur.info.
The PyPI package named `sequitur` holds an UNRELATED autoencoder library — hence this file.

THE IMPLEMENTATION follows the paper's data structures exactly: a doubly-linked symbol list per rule,
closed into a ring by a guard so no branch ever tests for an end; a digram table mapping an adjacent pair
to its ONE legal occurrence; four local operations (append, substitute, expand, delete) each restoring
both properties in place, which buys the linear time.

Self-test: `python3 sequitur_grammar.py` runs the paper's own example, abcdbcabcd.
"""
from __future__ import annotations

from typing import Iterable


class Symbol:
    """One cell of a rule's doubly-linked body — a terminal, or a reference standing for a rule."""

    __slots__ = ("value", "rule", "prev", "next", "_g")

    def __init__(self, g: "Sequitur", value=None, rule: "Rule | None" = None):
        self._g = g
        self.value = value
        self.rule = rule
        self.prev: "Symbol | None" = None
        self.next: "Symbol | None" = None
        if rule is not None:
            rule.count += 1

    # -- identity of the cell for the digram table
    @property
    def guard(self) -> bool:
        return False

    def key(self):
        return ("R", self.rule.index) if self.rule is not None else ("T", self.value)

    def digram(self):
        return (self.key(), self.next.key())

    def nonterminal(self) -> bool:
        return self.rule is not None

    def __repr__(self):
        return f"R{self.rule.index}" if self.rule is not None else repr(self.value)

    # -- surgery. Every relink runs through `join`, exactly as the paper does: the ONE place a digram
    # dies is the place its adjacency dies. Skip that and the table keeps pointing at a pair the list no
    # longer holds — the grammar then drops terminals, which the self-test below catches.
    def join(self, right: "Symbol") -> None:
        if self.next is not None:
            self._g.forget(self)
        self.next = right
        right.prev = self

    def insert_after(self, s: "Symbol") -> None:
        s.join(self.next)
        self.join(s)

    def delete(self) -> None:
        self.prev.join(self.next)
        self._g.forget(self)
        if self.nonterminal():
            self.rule.count -= 1

    def check(self) -> bool:
        """Enforce DIGRAM UNIQUENESS at this cell. True when the digram fired a rule."""
        g = self._g
        if self.guard or self.next.guard:
            return False
        k = self.digram()
        found = g.digrams.get(k)
        if found is None:
            g.digrams[k] = self
            return False
        if found.next is self:          # an OVERLAPPING occurrence — the paper forbids acting on it
            return False
        g.match(self, found)
        return True

    def substitute(self, r: "Rule") -> None:
        """Swap this digram for one reference to r, then re-check the seam the swap just created."""
        g = self._g
        prev = self.prev
        self.next.delete()
        self.delete()
        prev.insert_after(Symbol(g, rule=r))
        if not prev.check():
            prev.next.check()

    def expand(self) -> None:
        """RULE UTILITY: a rule down to one reference stops paying — inline its body and retire it."""
        g = self._g
        r = self.rule
        left, right = self.prev, self.next
        first, last = r.first(), r.last()
        g.forget(self)
        r.guard.prev = r.guard
        r.guard.next = r.guard
        left.join(first)
        last.join(right)
        r.count = 0
        g.dead.add(r.index)
        if not last.guard and not right.guard:
            g.digrams[last.digram()] = last


class Guard(Symbol):
    """The ring-closer. It removes every end-of-list branch from the hot path, and it NAMES ITS RULE —
    so a walk that runs off the end of a body lands on the rule that owns the body."""

    __slots__ = ("owner",)

    def __init__(self, g: "Sequitur", rule: "Rule"):
        super().__init__(g, None, None)
        self.owner = rule
        self.prev = self
        self.next = self

    @property
    def guard(self) -> bool:
        return True

    def key(self):
        return ("G", id(self))


class Rule:
    __slots__ = ("guard", "count", "index")

    def __init__(self, g: "Sequitur"):
        self.index = g.next_index()
        self.count = 0
        self.guard = Guard(g, self)

    def first(self) -> Symbol:
        return self.guard.next

    def last(self) -> Symbol:
        return self.guard.prev

    def body(self) -> "list[Symbol]":
        out, s = [], self.first()
        while not s.guard:
            out.append(s)
            s = s.next
        return out


class Sequitur:
    """The grammar, grown one symbol at a time. Pour with `run`; read with the methods below."""

    def __init__(self):
        self._idx = 0
        self.digrams: dict = {}
        self.dead: set = set()
        self.S = Rule(self)

    def next_index(self) -> int:
        self._idx += 1
        return self._idx - 1

    def forget(self, s: Symbol) -> None:
        if s.guard or s.next is None or s.next.guard:
            return
        k = s.digram()
        if self.digrams.get(k) is s:
            del self.digrams[k]

    def match(self, new: Symbol, old: Symbol) -> None:
        """The digram at `new` duplicates the one at `old`. Reuse a rule, or mint one."""
        if old.prev.guard and old.next.next.guard:
            # `old` already stands alone as some rule's entire body — that rule IS the digram
            r = self._owner_of(old)
            new.substitute(r)
        else:
            r = Rule(self)
            r.guard.insert_after(Symbol(self, new.next.value, new.next.rule))
            r.guard.insert_after(Symbol(self, new.value, new.rule))
            old.substitute(r)
            new.substitute(r)
            self.digrams[r.first().digram()] = r.first()
        f = r.first()
        if f.nonterminal() and f.rule.count == 1:
            f.expand()

    def _owner_of(self, s: Symbol) -> Rule:
        """Walk forward to the guard closing s's ring; the guard names the rule that owns the body."""
        c = s
        while not c.guard:
            c = c.next
        return c.owner

    def append(self, value) -> None:
        s = Symbol(self, value)
        last = self.S.last()
        last.insert_after(s)
        if not last.guard:
            last.check()

    def run(self, stream: Iterable) -> "Sequitur":
        for v in stream:
            self.append(v)
        return self

    # ---- readings ----------------------------------------------------------------------------
    def rules(self) -> "list[Rule]":
        seen, out, stack = set(), [], [self.S]
        while stack:
            r = stack.pop()
            if r.index in seen:
                continue
            seen.add(r.index)
            out.append(r)
            for s in r.body():
                if s.nonterminal():
                    stack.append(self._rule_of(s))
        return out

    def _rule_of(self, s: Symbol) -> Rule:
        return s.rule

    def grammar_size(self) -> int:
        """Symbols in the grammar — the description length SEQUITUR pays. MDL reads this, nothing else."""
        return sum(len(r.body()) + 1 for r in self.rules())

    def expand_depth(self) -> "tuple[list, list[int], list[int]]":
        """Walk S down to terminals, carrying (terminal, depth, top-level-rule-index) per position.

        DEPTH names how far the grammar reached to say this terminal. Chant the grammar compresses hard
        sits DEEP (nested refrain); fresh unrepeated material sits SHALLOW, at the top level. A regime
        change should show as a depth cliff — the first boundary reading the harness tests.
        """
        terms: list = []
        depths: list[int] = []
        tops: list[int] = []
        stack = [(s, 1, s.rule.index if s.nonterminal() else -1) for s in reversed(self.S.body())]
        while stack:
            s, d, top = stack.pop()
            if s.nonterminal():
                for c in reversed(s.rule.body()):
                    stack.append((c, d + 1, top))
            else:
                terms.append(s.value)
                depths.append(d)
                tops.append(top)
        return terms, depths, tops

    def top_spans(self) -> "list[tuple[int, int, int]]":
        """(start, end, rule-index) of each TOP-LEVEL symbol, in terminal coordinates.

        Where one long top-level block ends and another opens, the grammar drew a seam nobody asked for.
        """
        spans, pos = [], 0
        for s in self.S.body():
            n = _span_len(s)
            spans.append((pos, pos + n, s.rule.index if s.nonterminal() else -1))
            pos += n
        return spans


def _span_len(s: Symbol) -> int:
    if not s.nonterminal():
        return 1
    stack, n = [s], 0
    while stack:
        c = stack.pop()
        if c.nonterminal():
            stack.extend(c.rule.body())
        else:
            n += 1
    return n


def induce(stream: Iterable) -> Sequitur:
    return Sequitur().run(stream)


def render(g: Sequitur) -> str:
    lines = []
    for r in sorted(g.rules(), key=lambda r: r.index):
        name = "S" if r.index == 0 else f"R{r.index}"
        body = " ".join(("S" if s.rule.index == 0 else f"R{s.rule.index}") if s.nonterminal()
                        else str(s.value) for s in r.body())
        lines.append(f"{name} -> {body}")
    return "\n".join(lines)


if __name__ == "__main__":
    g = induce("abcdbcabcd")
    print(render(g))
    terms, depths, tops = g.expand_depth()
    print("terminals:", "".join(terms))
    print("depths   :", depths)
    assert "".join(terms) == "abcdbcabcd", "the grammar must reproduce its input EXACTLY"
    print("\nround-trip holds — the grammar reproduces its input")
