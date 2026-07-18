#!/usr/bin/env python3
"""rejim_io — the RHYTHM/geology DERIVED plane: repour a stream's nameless rejim over the WHOLE captured
content and land them, rebuildable like the mempalace projection. content = blocks (eidetic, per-block ground)
⊥ rejim = derived regimes (re-poured over the whole, holds no verbatim). NOT a declared sheaf plane — a
rebuildable view at `<root>/rejim`, wiped-and-repoured, exactly as the mempalace projection is re-paved.

Why REPOUR, not per-block: the geology is a whole-stream property (a dyadic scale needs the accumulated
stream to resolve; recurrence reads across the corpus). Pouring block-by-block would re-impose the block
grain the continuous pour exists to drop. So rejim re-derives from the content ground on a cadence, the
derived-view discipline — the caller wraps it in the exclusive root-mutation lease + a coalesce-gate so it
never blocks capture/recall and self-paces under pressure (rederive.py's skeleton; wired at the CLI/refresh).

Meme: lar:///ha.ka.ba/lararium/sensorium/rejim-io
"""
from __future__ import annotations

import json
import os

from rejim import CONTENT, couple_rejim, detect_rejim, strip_private
from content_io import ContentStore

GEOLOGY_FILE = "geology.json"


def _content_stream(store: ContentStore) -> str:
    """Drain the content store in TRUE stream order — sorted by (source_file, chunk_index, cid) — and
    concatenate the block documents into one continuous character stream. Raw scan/page order is NOT
    stream order (chroma paging); the geology needs the stream as it was authored (chunk_index within
    source_file), so a re-derivation reads the same wave every time."""
    recs: list = []
    offset = 0
    while True:
        page = store.scan(offset, 512)
        recs.extend(page.get("records") or [])
        nxt = page.get("next")
        if nxt is None:
            break
        offset = nxt
    recs.sort(key=lambda r: (str((r.get("metadata") or {}).get("source_file", "")),
                             int((r.get("metadata") or {}).get("chunk_index", 0) or 0),
                             str(r.get("cid", ""))))
    return "".join(r.get("document") or "" for r in recs)


def repour_rejim(content_dir: str, rejim_dir: str, *, channel: str = CONTENT,
                  n_surrogates: int = 3) -> dict:
    """Repour the derived rejim plane over the whole content: read content → concatenate the stream in
    authored order → DETECT the nameless regimes → couple cepat⊥lambat → land. Rebuildable — a re-repour
    fully overwrites from content, the one writable source; it holds no verbatim (a landed rejim resolves
    back to the stream by scale + span). Content-only, so the same repour runs on a sigil-less corpus.

    The caller owns the pressure discipline (exclusive root-mutation lease + coalesce-gate + timeout servo);
    this is the pure derive-and-land, decoupled from the store the way the pave is."""
    stream = _content_stream(ContentStore(content_dir))
    reading = detect_rejim(stream, channel=channel, n_surrogates=n_surrogates)
    landed = {**strip_private(reading), "couples": couple_rejim(reading), "stream_chars": len(stream)}
    os.makedirs(rejim_dir, exist_ok=True)
    tmp = os.path.join(rejim_dir, GEOLOGY_FILE + ".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(landed, fh, indent=2, default=str)
    os.replace(tmp, os.path.join(rejim_dir, GEOLOGY_FILE))   # atomic swap — a reader never sees a half-write
    return landed


def read_rejim(rejim_dir: str) -> "dict | None":
    """The landed geology, or None when the plane has never been repoured (an honest absence, never a lie)."""
    path = os.path.join(rejim_dir, GEOLOGY_FILE)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)
