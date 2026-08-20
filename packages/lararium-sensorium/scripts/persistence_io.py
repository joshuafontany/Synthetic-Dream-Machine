#!/usr/bin/env python3
"""persistence_io — the substrate side of the PersistencePalace (the 5th sensorium part).

A caller-vector mempalace-instance that persists TESTIMONY blocks: a nanopub-shaped record
(assertion vector ⊥ provenance ⊥ pubinfo) plus a signed WITNESS-LOG. Twin to structurepalace /
formpalace — the SAME ChromaDB engine, a separate palace dir; it NEVER federates (local, the
5th plane's durable floor). An operator Act alone crosses it to a federated surface.

THIS STORE STAYS DUMB. The lifecycle LAW lives ONCE in the TS keel (persistence-keel.ts):
standing derives from the witness-log, the admit gate scores novelty, mode = the half-life.
This holder only PERSISTS and LOADS — put a record, get it back, RMW-append a witness edge, and
hand out a POPULATION so the TS side can run its admit gate. It never computes standing, never
decides admission — that stays sovereign in TS.

TWO POPULATION READS, AND THE DIFFERENCE IS LOAD-BEARING. `neighbors` returns the k NEAREST
vectors — proximity, for a caller that wants proximity. `sample` returns a SEEDED UNIFORM DRAW of
the store — and that is the one the admit gate reads. The gate asks whether a claim carries bits
the store cannot already predict, so its model must describe THE STORE; a k-nearest population
describes the candidate's own surroundings, which every candidate resembles by construction. Score
the gate there and its variance shrinks as the store fills, so it admits MORE as near-duplicates
accumulate — the instrument choosing its own finding.

The assertion IS the embedding (caller-vector, `_skip_identity_check` — no model, no network),
so the store is a similarity index over testimonies out of the box. The witness-log rides the
metadata as a JSON list (move-not-delete: a defeat is a `polarity:-1` edge, never a removal).

Protocol — NDJSON over stdin/stdout, one JSON object per line (only JSON to stdout):

    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true}}

    -> {"id":2,"op":"put","claim_cid":C,"kind":K,"assertion":[...],"signer":S,"frontier":F,"pubinfo":{...}}
    <- {"id":2,"ok":true,"result":{"claim_cid":C}}

    -> {"id":3,"op":"get","claim_cid":C}
    <- {"id":3,"ok":true,"result":{ <Testimony> | null }}

    -> {"id":4,"op":"witness","claim_cid":C,"signer":S,"frontier":F,"polarity":1,"tick":N,"signature":H}
    <- {"id":4,"ok":true,"result":{"ok":true,"witnesses":M}}

    -> {"id":5,"op":"neighbors","assertion":[...],"k":16}     # proximity — NEVER the admit gate
    -> {"id":6,"op":"sample","k":256,"seed":4241}             # a uniform draw — the gate's population
    <- {"id":5,"ok":true,"result":{"population":[[...],[...],…]}}

Run with the mempalace CLI's interpreter (it has the package + chroma):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 persistence_io.py serve --palace <lararium>/sensoriums/<target>/persistence
"""
from __future__ import annotations

import argparse
import json

from chromadb.errors import NotFoundError
from mempalace.palace import get_collection

# The serve cap-stack this holder #has, composed from the shared foundation. `run_holder` IS the
# composition root — it holds the flock-singleton, the idle-reap, and the NDJSON serve-loop inside
# itself, so this module names only what it calls. An import list that recites the whole stack while
# calling one entry point declares caps the code does not hold, and the recital reads as the contract.
from holder_caps import (
    idle_ttl_seconds,
    make_dispatch,
    mine_busy_retry,
    run_holder,
)

# Cap the witness-log so a hot testimony cannot grow one record without bound — the log stays
# the audit history, but a runaway vouch-storm truncates oldest-first (the standing derivation
# reads distinct signers past the last defeat, so a cap loses only redundant same-signer noise).
WITNESS_CAP = 4096

IDLE_TTL_ENV = "PERSISTENCE_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "persistence_serve"


def _idle_ttl_seconds() -> float:
    return idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS)


class PersistenceStore:
    """One open PersistencePalace collection: put a testimony (assertion=embedding) + get +
    RMW witness-append + a nearest-neighbor read for the TS admit gate. DUMB by design — no
    standing, no admission decision (both live in the TS keel)."""

    def __init__(self, palace_path: str, expected_dim: "int | None" = None,
                 expected_model: "str | None" = None) -> None:
        # create-or-open; identity check skipped (we never run the embedder — the assertion IS
        # the vector). get_collection os.makedirs the dir, so this IS `init` for a fresh palace.
        # `expected_dim` opts IN the DIM half of the embedder-identity floor: a caller pins the assertion
        # width so a model swap that CHANGES the dim FAILS LOUD before it corrupts standing. `expected_model`
        # mirrors content_io's MODEL half: a same-dim DIFFERENT-model swap slips the dim guard yet searches
        # an incomparable space (standing corruption) — so the store self-stamps the model on every put and
        # refuses to OPEN a palace already holding a different model. Both unset → no guard (caller-trusting).
        self._expected_dim = expected_dim
        self._expected_model = expected_model
        self._col = get_collection(palace_path, create=True, _skip_identity_check=True)
        if self._expected_model is not None:
            self._assert_palace_model_history()

    def _assert_palace_model_history(self) -> None:
        """The palace-history half of the model floor (mirrors content_io): refuse to OPEN a
        PersistencePalace already holding assertions from a DIFFERENT embedder — its queries would search
        an incomparable space. Scan pages until a STAMPED record surfaces (an unstamped prefix never hides
        a held model); an all-unstamped palace has no history to disagree with."""
        offset, page = 0, 512
        while True:
            got = self._col.get(limit=page, offset=offset, include=["metadatas"])
            metas = got.get("metadatas") or []
            if not metas:
                return
            for m in metas:
                held = str((m or {}).get("lar_embedder_model", "")).strip()
                if held:
                    if held != self._expected_model:
                        raise ValueError(f"persistence palace already holds assertions from embedder {held!r} != "
                                         f"expected {self._expected_model!r} — a model swap searches an incomparable "
                                         "space (palace-history identity floor); re-embed or open under the held model")
                    return
            if len(metas) < page:
                return
            offset += len(metas)

    def _get_raw(self, claim_cid: str) -> "dict | None":
        got = self._col.get(ids=[claim_cid], include=["embeddings", "metadatas", "documents"])
        ids = got.get("ids") or []
        if not ids:
            return None
        embs = got.get("embeddings")
        metas = got.get("metadatas") or [None]
        docs = got.get("documents") or [None]
        emb = embs[0] if embs is not None and len(embs) else None
        return {"id": ids[0], "embedding": emb, "metadata": metas[0] or {}, "document": docs[0]}

    def _to_testimony(self, raw: dict) -> dict:
        meta = raw["metadata"]
        try:
            witnesses = json.loads(meta.get("lar_witnesses") or "[]")
        except (ValueError, TypeError):
            witnesses = []
        try:
            pubinfo = json.loads(meta.get("lar_pubinfo") or "{}")
        except (ValueError, TypeError):
            pubinfo = {}
        emb = raw["embedding"]
        return {
            "kind": meta.get("kind", ""),
            "assertion": list(emb) if emb is not None else [],
            "provenance": {"signer": meta.get("lar_signer", ""), "frontier": meta.get("lar_frontier", "")},
            "pubinfo": pubinfo,
            "witnesses": witnesses,
            # the OPTIONAL text projection (the "past text" slot) — "" when only the vector-block rides.
            "document": raw.get("document") or "",
        }

    def get(self, claim_cid: str) -> "dict | None":
        raw = self._get_raw(claim_cid)
        return self._to_testimony(raw) if raw is not None else None

    def put(self, claim_cid: str, kind: str, assertion: list, signer: str, frontier: str, pubinfo: dict, document: str = "") -> dict:
        # Idempotent on the id: a re-put of the same claim_cid overwrites (the caller owns the id, a
        # content-hash or a uuid). The witness-log is NOT reset on re-put — an existing record's
        # log is preserved (put carries content+provenance; witness carries edges).
        if self._expected_dim is not None and (not isinstance(assertion, (list, tuple)) or len(assertion) != self._expected_dim):
            got = len(assertion) if isinstance(assertion, (list, tuple)) else 0  # guard len(None) → a clean domain error
            raise ValueError(f"persistence put {claim_cid}: assertion dim {got} != expected {self._expected_dim} "
                             "(embedder-identity floor — a model swap that changes the dim must fail loud before it corrupts standing)")
        existing = self._get_raw(claim_cid)
        witnesses_json = existing["metadata"].get("lar_witnesses") if existing else None
        meta = {
            "kind": kind,
            "lar_signer": signer,
            "lar_frontier": frontier,
            "lar_pubinfo": json.dumps(pubinfo or {}),
            "lar_witnesses": witnesses_json or "[]",
        }
        # self-stamp the embedder model when the floor is armed — so the palace carries a model history the
        # open-check reads (the model-tag rides the trusted coordinator, mirroring content_io's stamp).
        if self._expected_model is not None:
            meta["lar_embedder_model"] = self._expected_model
        # The document slot carries the OPTIONAL text projection (the "past text" design — text is
        # ONE projection of the vector-block). Absent one, the id rides as a non-empty placeholder
        # (chroma requires a document); the block stays the assertion vector.
        mine_busy_retry(lambda: self._col.upsert(ids=[claim_cid], embeddings=[assertion], documents=[document or claim_cid], metadatas=[meta]))
        return {"claim_cid": claim_cid}

    def witness(self, claim_cid: str, signer: str, frontier: str, polarity: int, tick=None, signature=None) -> dict:
        raw = self._get_raw(claim_cid)
        if raw is None:
            return {"ok": False, "witnesses": 0}
        meta = dict(raw["metadata"])
        try:
            log = json.loads(meta.get("lar_witnesses") or "[]")
        except (ValueError, TypeError):
            log = []
        edge = {"signer": signer, "frontier": frontier, "polarity": 1 if polarity >= 0 else -1}
        if tick is not None:
            edge["tick"] = tick
        # Round-trip the sovereign keel's ed25519 string so a re-loaded edge still verifies. The store is
        # dumb — it keeps the string verbatim; the keel mints and checks it. The TS gate rejects an edge
        # that lacks it, so a fresh witness always carries one; a legacy edge without it fails closed.
        if signature is not None:
            edge["signature"] = signature
        log.append(edge)
        if len(log) > WITNESS_CAP:
            # Tombstone-exempt truncation (the Kafka log-compaction rule): a DEFEAT (polarity −1)
            # must never shed silently — dropping it resurrects every vouch it defeated, and the
            # standing law (`freshIndependentEdges`: +1 edges strictly AFTER the last defeat) then
            # reads a false rise. So defeats stay compaction-exempt; only vouches (+1) truncate,
            # oldest-first; the interleaved audit order survives so "after last defeat" reads true.
            # Two bounded degenerates (both keep the invariant — never a false rise): (i) defeats > CAP
            # keeps the NEWEST CAP defeats (the last-defeat boundary always survives; oldest defeats shed);
            # (ii) after-defeat vouches > keep_vouches sheds the oldest of them — standing may UNDER-count
            # distinct signers, never over-count.
            indexed = list(enumerate(log))
            defeats = [(i, e) for i, e in indexed if e["polarity"] < 0]
            vouches = [(i, e) for i, e in indexed if e["polarity"] >= 0]
            keep_vouches = max(0, WITNESS_CAP - len(defeats))
            kept = defeats[-WITNESS_CAP:] + vouches[-keep_vouches:] if keep_vouches else defeats[-WITNESS_CAP:]
            log = [e for _, e in sorted(kept, key=lambda ie: ie[0])]
        meta["lar_witnesses"] = json.dumps(log)
        # Re-upsert with the SAME embedding + document (the assertion + its text projection are
        # immutable; only the witness-log grows).
        mine_busy_retry(lambda: self._col.upsert(ids=[claim_cid], embeddings=[raw["embedding"]], documents=[raw.get("document") or claim_cid], metadatas=[meta]))
        return {"ok": True, "witnesses": len(log)}

    def neighbors(self, assertion: list, k: int = 16) -> dict:
        # The k NEAREST vectors — a proximity read, for a caller that wants proximity (a recall, a
        # dedup-by-similarity). It MUST NOT feed the admit gate: a population selected by nearness to
        # the candidate has its variance chosen by the candidate, and the gate scored against it grows
        # more permissive exactly as near-duplicates accumulate. The gate reads `sample`.
        try:
            n = self._col.count()
        except NotFoundError:                  # ONLY the absent collection reads as first-light-empty;
            n = 0                              # a real backend error propagates LOUD (never look-empty)
        if n == 0:
            return {"population": []}
        got = self._col.query(query_embeddings=[assertion], n_results=min(k, n), include=["embeddings"])
        embs = (got.get("embeddings") or [[]])[0]
        return {"population": [list(e) for e in embs]}

    def sample(self, k: int = 256, seed: int = 4241) -> dict:
        """A UNIFORM RANDOM SAMPLE of the admitted store — the population the admit gate scores against.

        The gate asks whether a claim carries bits the store cannot already predict, so its model must
        describe THE STORE. A k-nearest population describes the candidate's own neighbourhood, and a
        model fitted there says only that the candidate resembles the things nearest it — which every
        candidate does, by construction. The instrument would choose its own finding.

        Seeded, so the draw reproduces: the same store and the same seed hand back the same population,
        and an admission decision stays auditable rather than depending on a lucky draw.
        """
        import random

        try:
            n = self._col.count()
        except NotFoundError:
            n = 0
        if n == 0:
            return {"population": []}
        got = self._col.get(include=["embeddings"])
        embs = [list(e) for e in (got.get("embeddings") or [])]
        if len(embs) <= k:
            return {"population": embs}        # the whole store IS the sample; no draw needed
        return {"population": random.Random(seed).sample(embs, k)}


def _build_ops(store: PersistenceStore) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "put": lambda req: store.put(
            req["claim_cid"], req.get("kind", ""), req["assertion"],
            req.get("signer", ""), req.get("frontier", ""), req.get("pubinfo", {}),
        ),
        "get": lambda req: store.get(req["claim_cid"]),
        "witness": lambda req: store.witness(
            req["claim_cid"], req.get("signer", ""), req.get("frontier", ""),
            int(req.get("polarity", 1)), req.get("tick"), req.get("signature"),
        ),
        "neighbors": lambda req: store.neighbors(req["assertion"], int(req.get("k", 16))),
        "sample": lambda req: store.sample(int(req.get("k", 256)), int(req.get("seed", 4241))),
    }


def _serve(palace_path: str, expected_dim: "int | None" = None, expected_model: "str | None" = None) -> None:
    # Compose: the serve root acquires the per-palace singleton BEFORE build_dispatch opens the
    # ChromaDB collection (the reap-don't-pile invariant, OS-enforced). expected_dim / expected_model
    # (unset = off) arm the two halves of the embedder-identity floor.
    run_holder(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(
            PersistenceStore(palace_path, expected_dim=expected_dim, expected_model=expected_model))),
        idle_ttl=_idle_ttl_seconds(),
        singleton_msg="persistence_io: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="persistence I/O (the PersistencePalace mempalace-instance holder)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one PersistencePalace dir")
    s.add_argument("--palace", required=True)
    s.add_argument("--expected-dim", type=int, default=None,
                   help="pin the assertion vector width; a dim mismatch fails loud (embedder-identity floor; unset = off)")
    s.add_argument("--expected-model", type=str, default=None,
                   help="pin the embedder model name; a same-dim different-model swap fails loud (embedder-identity floor; unset = off)")
    s.set_defaults(fn=lambda a: _serve(a.palace, expected_dim=a.expected_dim, expected_model=a.expected_model))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
