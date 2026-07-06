"""plane_fanout — the STRUCTURE + FORM plane caps that ride the capture pass (RUN-ARC #1).

The capture Pipeline lands the CONTENT plane; these caps fan the SAME records out to the
other two planes, so all three planes key on one cid over genuinely-shared units:

  · structure — `structure_router.parse_to_tree` unfolds each record's text into a
    content-free node-type tree; `structurepalace_io.StructurePalaceStore` lands it by
    structural hash with a provenance line binding back to the record's cid.
  · form      — `form_induction.induce_forest` mines the pass's OWN structure forest
    into a constructicon (MDL-selected templates, blind); each record then reads as a
    membership vector over those induced templates, landed by cid into the
    `form_encoder.FormPalaceStore` "form" collection.

THE INDEPENDENCE LAW (RUN-ARC — the whole point): neither plane ever touches the content
EMBEDDING. Structure reads only the parse SHAPE; form reads only the induced-grammar
membership of the node-type stream. Structure and form share the one parse-tree per record
by design (form_induction reads over the accumulated structure plane — corpus.md
#the-form-induction); the forbidden shortcut is surrogating either from the content vector.

IDEMPOTENCE: each cap owns its own durable-skip (the Pipeline re-offers every record on a
re-pass): structure skips a hash whose provenance already carries the record's cid (a bare
re-put would re-bump the recurrence count); form skips a cid the form collection already
holds. So a second pass lands zero on every plane, and a crash between plane lands cures
on the next pass — the same re-derivation discipline the content leg rides.

CLOCK PURITY: nothing here reads the host clock; the stores' own sighting registers carry
the only host-time marks (provenance, never ordering).

Meme: lar:///ha.ka.ba/@lararium/sensorium/plane-fanout
"""
from __future__ import annotations

import os

from form_induction import _preorder_types, _seq_support, induce_forest
from structure_router import canonical_json, detect_kind, parse_to_tree, structural_hash

# The form plane needs at least this many trees before induction says anything
# (form_induction's own floor); below it the plane surfaces `form-skipped`, honest.
_DEFAULT_MIN_SUPPORT = 2
_DEFAULT_MAX_FORMS = 64
# The per-pass MDL candidate-pool bound (per miner): the capture pass runs induction
# inline, so its work stays bounded — the unbounded pool belongs to the offline batch
# CLI (form_induction.cmd_induce), never a capture pass.
_DEFAULT_MAX_CANDIDATES = 96


class StructurePlaneCap:
    """The STRUCTURE plane cap: per record, parse text → content-free tree → land by
    structural hash, provenance-bound to the record's cid. Shares its per-pass tree map
    with the form cap (one parse per record — the two planes read one unfolding)."""

    name = "structure"

    def __init__(self, store, *, trees: "dict | None" = None) -> None:
        self._store = store            # a StructurePalaceStore (put / get by hash)
        self.trees = trees if trees is not None else {}   # cid -> tree, the pass-shared parse
        self._landed = 0
        self._already = 0
        self._skipped = 0              # records the router holds no grammar for

    def land(self, rec: dict) -> None:
        meta = rec.get("metadata") or {}
        text = rec.get("text", "")
        # The source-cap's stamped kind leads; a record without one re-sniffs from its
        # source_file path + content (the AI-surface records carry no extension).
        kind = meta.get("lar_kind") or detect_kind(meta.get("source_file", ""), text)
        tree = parse_to_tree(kind, text)
        if tree is None:
            self._skipped += 1         # structure-skipped: the content plane still stands
            return
        cid = rec["cid"]
        self.trees[cid] = tree
        h = structural_hash(tree)
        # Idempotence: a provenance line already carrying this cid marks the durable no-op
        # (a bare re-put would re-bump the recurrence count on every re-pass).
        entry = self._store.get(h)
        if entry is not None and any(p.get("verbatim_sha") == cid for p in entry.get("provenance", [])):
            self._already += 1
            return
        self._store.put(h, canonical_json(tree), source_file=meta.get("source_file", ""),
                        verbatim_sha=cid, turn_key=meta.get("lar_turn_key", ""))
        self._landed += 1

    def finish(self) -> dict:
        return {"landed": self._landed, "already": self._already, "skipped": self._skipped}


class FormPlaneCap:
    """The FORM plane cap: collect the pass's records, then at `finish` induce the corpus's
    OWN constructicon over the shared structure forest and land each record's membership
    vector (which induced templates its node-type stream carries) by cid.

    The membership reads by the miners' own support relation — a template counts when its
    symbol sequence rides the record's pre-order stream as a (gapped) subsequence — so the
    form vector derives from the induced grammar alone, never the content embedding.

    DIMENSION pins to the induced constructicon's size at the first land (chroma pins a
    collection's vector length); a re-curated corpus that induces a different constructicon
    surfaces as the store's precise dimension-drift error, never a silent mislanding."""

    name = "form"

    def __init__(self, store, *, trees: dict, min_support: int = _DEFAULT_MIN_SUPPORT,
                 max_forms: int = _DEFAULT_MAX_FORMS,
                 max_candidates: "int | None" = _DEFAULT_MAX_CANDIDATES) -> None:
        self._store = store            # a FormPalaceStore (store / get by key)
        self._trees = trees            # SHARED with the structure cap — one parse per record
        self._min_support = min_support
        self._max_forms = max_forms
        self._max_candidates = max_candidates   # bounds the per-pass MDL pool (bounded work)
        self._cids: list = []          # the pass's record order (first sighting wins)
        self._seen: set = set()

    def land(self, rec: dict) -> None:
        cid = rec["cid"]
        if cid not in self._seen:
            self._seen.add(cid)
            self._cids.append(cid)

    def finish(self) -> dict:
        """The pass-end batch step: induce, then land one membership vector per record.
        Honest floors surface as notes — too few trees, or nothing induced — and the
        content/structure planes stand untouched.

        THE DURABLE NO-OP LEADS: when every parsed record already carries its form row,
        the whole induction skips — a re-pass costs a store-get per cid, never a re-mine
        (the same is-landed-first discipline the content and structure legs ride)."""
        pending = [c for c in self._cids
                   if c in self._trees and self._store.get(c) is None]
        if not pending:
            already = sum(1 for c in self._cids if c in self._trees)
            return {"landed": 0, "already": already, "skipped": len(self._cids) - already,
                    "forms": 0, "note": "form: every record already carries its row — induction skipped"}
        forest = [self._trees[c] for c in self._cids if c in self._trees]
        if len(forest) < self._min_support:
            return {"landed": 0, "already": 0, "skipped": len(self._cids), "forms": 0,
                    "note": f"form-skipped: too few structures ({len(forest)} < min-support {self._min_support})"}
        res = induce_forest(forest, min_support=self._min_support, max_forms=self._max_forms,
                            max_candidates=self._max_candidates)
        forms = res["forms"]
        if not forms:
            return {"landed": 0, "already": 0, "skipped": len(self._cids), "forms": 0,
                    "note": "form-skipped: induction kept no template (MDL paid for none)",
                    "induction": res["summary"]}
        dimension = len(forms)
        landed = already = skipped = 0
        for cid in self._cids:
            tree = self._trees.get(cid)
            if tree is None:
                skipped += 1           # no structure → no form (the plane chain holds honest)
                continue
            if self._store.get(cid) is not None:
                already += 1           # the durable no-op — a re-pass lands nothing new
                continue
            stream: list = []
            _preorder_types(tree, stream)
            indices, values = [], []
            for i, f in enumerate(forms):
                if _seq_support([stream], tuple(f["seq"])) > 0:
                    indices.append(i)
                    values.append(1.0)
            self._store.store(cid, {"indices": indices, "values": values}, dimension,
                              {"verbatim_sha": cid, "struct_hash": structural_hash(tree)})
            landed += 1
        return {"landed": landed, "already": already, "skipped": skipped,
                "forms": dimension, "induction": res["summary"]}


def compose_corpus_planes(root_dir: str, *, min_support: int = _DEFAULT_MIN_SUPPORT,
                          max_forms: int = _DEFAULT_MAX_FORMS,
                          max_candidates: "int | None" = _DEFAULT_MAX_CANDIDATES) -> list:
    """Stand the structure + form plane caps over `<root>/structure` + `<root>/form`
    (the test-bed sensorium's plane palaces, beside its `<root>/content`). The two caps
    share one tree map, so each record parses once and both planes read the unfolding.
    Imports ride here (not module-top) so the pure caps stay composable without chroma."""
    from form_encoder import FormPalaceStore
    from structurepalace_io import StructurePalaceStore

    trees: dict = {}
    structure = StructurePlaneCap(StructurePalaceStore(os.path.join(root_dir, "structure")), trees=trees)
    form = FormPlaneCap(FormPalaceStore(os.path.join(root_dir, "form")), trees=trees,
                        min_support=min_support, max_forms=max_forms, max_candidates=max_candidates)
    return [structure, form]
