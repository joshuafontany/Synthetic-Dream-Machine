#!/usr/bin/env python3
"""span_layer — the STANDOFF keel of the derived-recall model.

A recall segmentation rides as `(cid, start, end)` SPANS over the ONE verbatim content source, never a
second byte-copy. A span carries only offsets into a content block; the verbatim bytes resolve on READ
from the content plane by cid + slice. So many segmentations (turn-window, fixed lexical chunk, section)
coexist as LAYERS over one source — the shape standoff annotation (BRAT / STAM / TEI) and Lucene's
positions+offsets have carried for decades.

The kupono law this keel enforces (the one-bit test, made structural): a span stores NO bytes, so any
layer built from spans DROPS and REBUILDS from content alone. It is a DERIVED surface, never a source;
content stays the single writable arbiter. "Storage names a caching decision, never an ontology" —
duplicated *authority* is the sin, not duplicated bytes; a span duplicates neither.

Cross-block reach (a lexical chunk that crosses a turn boundary) lives in the layer ABOVE: a source-level
segmentation maps its offsets down to one-or-more block spans. This keel carries the intra-block span and
its resolution; the cross-block mapping composes on top.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterator


@dataclass(frozen=True)
class Span:
    """A standoff span — a rebuildable pointer into a content block. NO verbatim bytes ride here.

    `cid` names the content block (the sensorium content-id); `[start, end)` are char offsets into that
    block's verbatim text; `layer` names the segmentation this span belongs to ("chunk" · "turn" · …).
    """

    cid: str
    start: int
    end: int
    layer: str = ""

    def __post_init__(self) -> None:
        if self.start < 0 or self.end < self.start:
            raise ValueError(f"span offsets fall out of order: [{self.start}, {self.end})")

    def resolve(self, get_content: Callable[[str], "str | None"]) -> str:
        """Materialize the verbatim span — fetch the block by cid, slice the offsets. The bytes live once
        (content); this reads a window of them, so the span reconstructs verbatim without holding it.
        A missing block (content dropped) yields "" rather than raising — the caller rebuilds from source.
        """
        text = get_content(self.cid) or ""
        return text[self.start:self.end]


def chunk_spans(
    cid: str, text_len: int, size: int, overlap: int = 0, layer: str = "chunk",
) -> Iterator[Span]:
    """Segment ONE content block into fixed-size, overlapping CHUNK spans — a lexical-recall segmentation
    DISTINCT from the turn segmentation, carried as offset-views (no byte copy). The final chunk clamps to
    the block's end. Cross-turn chunks (spanning blocks) compose in the layer above; here each span stays
    inside one block.
    """
    if size <= 0:
        raise ValueError("chunk size must run positive")
    if overlap < 0 or overlap >= size:
        raise ValueError("overlap must land in [0, size)")
    step = size - overlap
    start = 0
    while start < text_len:
        end = min(start + size, text_len)
        yield Span(cid=cid, start=start, end=end, layer=layer)
        if end >= text_len:
            break
        start += step


def rebuilds_from_content(spans: "list[Span]", get_content: Callable[[str], "str | None"]) -> bool:
    """The one-bit test, executable: EVERY span in a layer resolves from content alone (a non-empty block
    yields a non-empty slice for a non-empty span). A layer that passes stays a lawful derived surface —
    drop it, rebuild it. A False here flags a span pointing where content no longer carries it.
    """
    for s in spans:
        if s.end > s.start and not s.resolve(get_content):
            return False
    return True
