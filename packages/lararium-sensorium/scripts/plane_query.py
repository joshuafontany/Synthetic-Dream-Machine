"""plane_query — the neutral cross-plane READ helpers, extracted so BOTH surfaces that witness a cid
across content · structure · form share ONE implementation.

The circular-import cure: `lares_mcp` imports `capture_session`, so a shared read cannot live in either
(the capture holder's `plane_record` serve-op would then have to reach back into `lares_mcp`). These
helpers hold nothing and import nothing at module scope beyond the stdlib — each surface imports them and
the ONE implementation drives both the /mcp coordinator and the capture holder's serve-op.

Meme: lar:///ha.ka.ba/lararium/sensorium/plane-query (the shared cross-plane read).
"""
from __future__ import annotations

import json
import os

_HEX_DIGITS = frozenset("0123456789abcdef")


def reads_as_cid(s: str) -> bool:
    """A record cid reads as a full sha-256 hex, optionally chunk-suffixed (`<hex64>_<n>` — the
    capture chunker keys each chunk; the live test-bed carries this form); anything else reads
    as query TEXT."""
    if not isinstance(s, str):
        return False
    head, sep, tail = s.partition("_")
    return (len(head) == 64 and all(c in _HEX_DIGITS for c in head.lower())
            and (not sep or tail.isdigit()))


def structure_entry_for_cid(store, cid: str) -> "dict | None":
    """Resolve a record cid to its STRUCTURE entry through the provenance join — the structurepalace
    keys by structural HASH, so the cid walks the provenance lines (the same read-back leg the
    corpus_testbed witness rides). None when no entry binds the cid."""
    got = store._col.get(include=["metadatas"])  # noqa: SLF001 — the read probe walks the raw collection
    ids = got.get("ids") or []
    metas = got.get("metadatas") or []
    for i, h in enumerate(ids):
        meta = metas[i] or {}
        try:
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        if any(p.get("verbatim_sha") == cid for p in provenance):
            return {"hash": h, "count": meta.get("count"),
                    "provenance_cids": sorted({p.get("verbatim_sha") for p in provenance
                                               if p.get("verbatim_sha")})}
    return None


def open_plane_store(palace_root: str, plane: str):
    """Open the named plane palace (<root>/structure | <root>/form) READ-only, or None when the plane
    carries no store yet — the read verbs answer an honest null rather than PLANTING an empty palace."""
    path = os.path.join(palace_root, plane)
    if not os.path.exists(os.path.join(path, "chroma.sqlite3")):
        return None
    if plane == "structure":
        from structurepalace_io import StructurePalaceStore
        return StructurePalaceStore(path)
    from form_encoder import FormPalaceStore
    return FormPalaceStore(path)


def plane_record_witness(content_store, palace_root: str, cid: str) -> dict:
    """The cross-plane witness read: ONE cid → its presence + payload summary across content ·
    structure · form, honest nulls where a plane lacks the record. READ-only — it witnesses
    co-presence and scores nothing. `content_store` rides in (the caller owns the ONE content handle);
    the structure/form planes open fresh read-only readers off `palace_root`."""
    out: dict = {"cid": cid}
    row = content_store.get(cid)
    if row is None:
        out["content"] = {"present": False}
    else:
        meta = row.get("metadata") or {}
        out["content"] = {"present": True,
                          "head": (row.get("document") or "")[:120].replace("\n", " "),
                          "source_file": meta.get("source_file", ""),
                          "wing": meta.get("wing", ""), "room": meta.get("room", "")}
    s_store = open_plane_store(palace_root, "structure")
    if s_store is None:
        out["structure"] = {"present": False, "note": "no structure store"}
    else:
        entry = structure_entry_for_cid(s_store, cid)
        out["structure"] = {"present": entry is not None, **(entry or {})}
    f_store = open_plane_store(palace_root, "form")
    if f_store is None:
        out["form"] = {"present": False, "note": "no form store"}
    else:
        f_row = f_store.get(cid)
        if f_row is None:
            out["form"] = {"present": False}
        else:
            got = f_store._col.get(ids=[cid], include=["embeddings"])  # noqa: SLF001 — the membership count reads the vector
            embs = got.get("embeddings")
            vec = [float(x) for x in embs[0]] if embs is not None and len(embs) else []
            f_meta = f_row.get("metadata") or {}
            out["form"] = {"present": True, "dimension": f_meta.get("dimension"),
                           "count": f_meta.get("count"),
                           "active_templates": sum(1 for v in vec if v > 0.0)}
    return out
