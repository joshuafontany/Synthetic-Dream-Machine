#!/usr/bin/env python3
"""content_io — the substrate side of a CONTENT store (the Li-triple's content plane) for
NON-MEMORY targeted content: arbitrary target corpora (Twain · TiddlyWiki5 · the Kumulipo ·
Discordian Catma · any ingest target) that are NOT the operator's session-memory (the mempalace).

Caller-vector by design — uniform with structurepalace_io / persistence_io (skip-identity, the
embedding arrives ON the wire, no model load) — so it composes the SHARED holder_caps serve
foundation AND fits the parallel-ingest single-writer split (embed fans out upstream; this commits
the caller's vector). The text rides the `document` slot; the caller's dense vector is the embedding.

Protocol — NDJSON over stdin/stdout, one JSON object per line (only JSON to stdout):

    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true}}

    -> {"id":2,"op":"put","cid":C,"text":"…","embedding":[...],"metadata":{...}}
    <- {"id":2,"ok":true,"result":{"cid":C}}

    -> {"id":3,"op":"get","cid":C}
    <- {"id":3,"ok":true,"result":{ <ContentEntry> | null }}

    -> {"id":4,"op":"search","embedding":[...],"k":8,"where":{...}}
    <- {"id":4,"ok":true,"result":{"matches":[{cid,distance,metadata},…]}}

Run with the mempalace CLI's interpreter (it has the package + chroma):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 content_io.py serve --palace <data>/sensoriums/<target>/content
"""
from __future__ import annotations

import argparse
import math

from chromadb.errors import NotFoundError
from mempalace.palace import get_collection

from holder_caps import (
    idle_ttl_seconds,
    make_dispatch,
    mine_busy_retry,
    run_holder,
)

IDLE_TTL_ENV = "CONTENT_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "content_serve"

# The kapae mute-leg rides two metadata slots. `lar_turn_key` binds a content row to a
# worldline turn (the kapae cascade resolves cids by it); `lar_kapae` marks a row MUTED so recall
# excludes it — a metadata FLAG the block (document+embedding) never sees, so mute stays move-not-
# delete: the row persists, only the flag flips. A row without the slot reads live (unset = live).
TURN_KEY_META = "lar_turn_key"
KAPAE_META = "lar_kapae"
_MUTED_VALUES = {"1", "true", "yes"}

# The recall over-fetch ceiling factor: the muted-exclusion widen never fetches more than k·C rows, so a
# kapae'd hot-region bails with fewer-than-k live rows instead of scanning the whole collection (C5 scale).
_POOL_CEILING_FACTOR = 32

# The $in batch size — a scoped turn-key pull chunks its `where $in` so a wide braid never overflows
# SQLite's bound-variable limit (SQLITE_MAX_VARIABLE_NUMBER floors at 999 on older builds). 500 clears
# it with room for chroma's own bound params on the same statement.
_IN_CHUNK = 500


def _is_muted(metadata: "dict | None") -> bool:
    """A row reads muted when its `lar_kapae` slot carries a truthy mark. Absent/"0"/"" = live —
    so the vast un-kapae'd corpus (no slot) never filters, and un-mute (flag -> "0") restores."""
    return str((metadata or {}).get(KAPAE_META, "")).strip().lower() in _MUTED_VALUES


def _vectors_differ(a, b, *, tol: float = 1e-6) -> bool:
    """Whether two stored vectors DIVERGE past a float-noise tolerance — the append-only vector-drift
    guard. A deterministic re-embed of the same text mints the SAME vector (identical within `tol`), so a
    real divergence names a same-text DIFFERENT-embedding re-put (a silent-corrupt of the immutable
    ground). One present + one absent counts as differ; equal lengths compare element-wise."""
    if a is None or b is None:
        return (a is None) != (b is None)
    if len(a) != len(b):
        return True
    return any(abs(float(x) - float(y)) > tol for x, y in zip(a, b))


def _idle_ttl_seconds() -> float:
    return idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS)


class ContentFloorError(ValueError):
    """A SYSTEMIC embedder-identity floor violation (dim / model / palace-history mismatch) — a wrong
    embedder poisons EVERY record's recall, never one drawer, so it MUST fail the whole pass LOUD. It
    subclasses ValueError (existing callers keep catching it), and the capture poison-guard re-raises it
    (a per-record data poison rides `failed`; a systemic misconfig never hides behind a growing backlog)."""


class ContentStore:
    """One open CONTENT collection: put a caller-vector content record (text=document,
    caller-supplied embedding) + get by cid + nearest-neighbor search. Caller-vector
    (skip-identity — the embedder never runs here); the ingest pipeline supplies the vector."""

    def __init__(self, palace_path: str, required_keys: "set[str] | None" = None,
                 expected_dim: "int | None" = None, expected_model: "str | None" = None,
                 append_only: bool = False, collection_name: "str | None" = None) -> None:
        # GENERIC by default (arbitrary corpora — no schema, no identity guard). The SESSION-MEMORY
        # palace opts IN: `required_keys` names the mempalace-schema metadata a drawer MUST carry
        # (wing/room/source_file/chunk_index/lar_*). The EMBEDDER-IDENTITY FLOOR has two halves, both
        # opt-in: `expected_dim` pins the vector WIDTH (the physically-unusable case), and
        # `expected_model` pins the MODEL NAME (the caller stamps `lar_embedder_model` in metadata) —
        # because a same-dim DIFFERENT-model swap (e.g. minilm→another 384-d model) passes the dim
        # guard yet corrupts recall silently (vectors from an incomparable space). Both fail LOUD on
        # the wire; neither fires when unset, so generic corpora are untouched.
        self._required_keys = required_keys or set()
        self._expected_dim = expected_dim
        self._expected_model = expected_model
        # append_only = the IMMUTABLE-GROUND policy (the Memory sensorium: verbatim/eidetic). A put on
        # an existing cid whose text DIFFERS is refused — a committed block is never overwritten; an edit
        # rides kapae/worldline (a muted fork-branch), never a silent re-put. An idempotent same-text
        # re-put still passes (the re-derivation crash-cure). The Dream sensorium leaves this off (mutable).
        self._append_only = append_only
        # WHICH COLLECTION a plane's records live in belongs to the plane, not to this class. A palace may
        # hold several (the form registry writes a caller-vector `form` collection beside the base drawers),
        # so a reader that always opens the base collection reads an empty sibling and reports the plane
        # empty — a store speaks only through the collection you open. Unset falls to the base default.
        self._collection_name = collection_name
        self._col = (
            get_collection(palace_path, collection_name=collection_name, create=True, _skip_identity_check=True)
            if collection_name
            else get_collection(palace_path, create=True, _skip_identity_check=True)
        )
        if self._expected_model is not None:
            self._assert_palace_model_history()

    def _assert_palace_model_history(self) -> None:
        """The PALACE-HISTORY half of the identity floor: refuse to OPEN a palace whose FIRST stamped
        drawer names a DIFFERENT embedder than the driver's pin. A model-B driver re-opening a model-A
        palace stamps each fresh record self-consistently (stamp==pin), so it clears the record-level
        `expected_model` guard (put) — yet its queries search an incomparable space (recall corruption
        of the immutable ground). This compose-time guard catches that slip: compare the pin against
        the palace's first stamped drawer; a mismatch fails loud on compose.

        SCOPE: this catches a driver-vs-first-stamped mismatch ONLY. A palace that ALREADY holds two
        distinct stamped models internally rides the write-side record floor (put's `expected_model`
        rejects the second model at land) — this open-time peek never re-scans for that."""
        # SCAN pages until a STAMPED drawer surfaces — sampling only metas[0] would read an UNSTAMPED
        # first row as no-history and skip a model stamped deeper in. The first stamped drawer names
        # the palace's embedder to compare against the pin; an all-unstamped palace holds no history to
        # disagree with.
        held = self._first_stamped_model()
        if held and held != self._expected_model:
            raise ContentFloorError(f"content palace already holds vectors from embedder {held!r} != expected "
                             f"{self._expected_model!r} — a model swap over an existing palace searches an "
                             "incomparable space (palace-history identity floor); re-embed or open under the held model")

    def _first_stamped_model(self, page: int = 512) -> "str | None":
        """The `lar_embedder_model` the FIRST stamped drawer carries — scanned page-by-page so an
        UNSTAMPED prefix never hides a stamped model deeper in. None when the palace holds no stamped
        drawer at all (nothing to disagree with)."""
        offset = 0
        while True:
            got = self._col.get(limit=page, offset=offset, include=["metadatas"])
            metas = got.get("metadatas") or []
            if not metas:
                return None                    # scanned to the end — no stamped drawer
            for m in metas:
                held = str((m or {}).get("lar_embedder_model", "")).strip()
                if held:
                    return held                # the first stamped drawer names the palace's model
            if len(metas) < page:
                return None                    # last page, none stamped
            offset += len(metas)

    @property
    def append_only(self) -> bool:
        """Whether this store rides the IMMUTABLE-GROUND policy — a committed block never overwrites (the
        Memory sensorium). The rewind cure reads this to CHOOSE its move: retract-and-mute on immutable
        ground vs a re-land overwrite on a mutable store."""
        return self._append_only

    def _get_raw(self, cid: str) -> "dict | None":
        got = self._col.get(ids=[cid], include=["documents", "metadatas"])
        ids = got.get("ids") or []
        if not ids:
            return None
        docs = got.get("documents") or [None]
        metas = got.get("metadatas") or [None]
        return {"cid": ids[0], "document": docs[0], "metadata": metas[0] or {}}

    def _get_raw_with_vector(self, cid: str) -> "dict | None":
        """Like `_get_raw` but ALSO pulls the stored embedding — the append-only vector-drift compare needs
        the durable vector, not just its text/metadata. None when the cid holds no row."""
        got = self._col.get(ids=[cid], include=["documents", "embeddings"])
        ids = got.get("ids") or []
        if not ids:
            return None
        docs = got.get("documents") or [None]
        embs = got.get("embeddings")
        emb = [float(x) for x in embs[0]] if embs is not None and len(embs) > 0 and embs[0] is not None else None
        return {"cid": ids[0], "document": docs[0], "embedding": emb}

    def get(self, cid: str) -> "dict | None":
        raw = self._get_raw(cid)
        if raw is None:
            return None
        return {"cid": raw["cid"], "document": raw["document"] or "", "metadata": raw["metadata"]}

    def put(self, cid: str, text: str, embedding: list, metadata: dict) -> dict:
        """Durable write of ONE record — validate its floors, then upsert. The floor raises land verbatim: a
        systemic ContentFloorError (dim/model) fails loud, a per-record ValueError (non-finite/schema) rides
        the caller's poison-guard. Shares its validation with put_many, so a batched write floors identically."""
        meta = self._validate_put(cid, text, embedding, metadata)
        mine_busy_retry(lambda: self._col.upsert(ids=[cid], documents=[text], embeddings=[embedding], metadatas=[meta]))
        return {"cid": cid}

    def put_many(self, records: "list[tuple]") -> dict:
        """Batch the durable write — the store-side counterpart to the embed batch. Validate EACH record's
        floors individually (so a per-record poison isolates to itself, exactly as put does), then upsert every
        VALID record in ONE chroma call instead of one call per record. `records` = [(cid, text, embedding,
        metadata), …] in order; returns {landed: [cid…] (in input order), failed: [{cid, error}…]}. A SYSTEMIC
        floor (ContentFloorError — dim/model) raises and fails the whole batch loud (it poisons every record);
        a per-record data poison drops that ONE record to `failed` and the rest still land. Preserves the
        per-record poison-guard while amortizing the palace flock and the write across the window."""
        ids: list = []
        docs: list = []
        embs: list = []
        metas: list = []
        landed: list = []
        failed: list = []
        for cid, text, embedding, metadata in records:
            try:
                meta = self._validate_put(cid, text, embedding, metadata)
            except ContentFloorError:
                raise                                  # systemic — the batch fails loud, never buries it
            except ValueError as exc:                  # a per-record poison isolates to itself
                failed.append({"cid": cid, "error": f"{type(exc).__name__}: {exc}"})
                continue
            ids.append(cid)
            docs.append(text)
            embs.append(embedding)
            metas.append(meta)
            landed.append(cid)
        if ids:
            mine_busy_retry(lambda: self._col.upsert(ids=ids, documents=docs, embeddings=embs, metadatas=metas))
        return {"landed": landed, "failed": failed}

    def _validate_put(self, cid: str, text: str, embedding: list, metadata: dict) -> dict:
        """Every durable-write floor for one record — the sole validation both put and put_many cross. Returns
        the validated flat metadata; raises ContentFloorError on a systemic embedder-identity breach (dim/
        model) and ValueError on a per-record data poison (nested/envelope/missing-key/non-finite/immutable)."""
        meta = metadata or {}
        if not isinstance(meta, dict):
            raise ValueError(f"content put {cid}: metadata must be one flat object")
        # Chroma metadata has a scalar contract.  Enforce it at the sole durable write boundary
        # rather than allowing a second `metadata`/`attributes` envelope (or a nested list) to
        # become an alternative schema.  Every session source emits the canonical flat lar_* map.
        nested = sorted(str(k) for k, value in meta.items() if isinstance(value, (dict, list, tuple, set)))
        if nested:
            raise ValueError(f"content put {cid}: nested metadata fields forbidden: {nested}")
        envelopes = sorted(str(k) for k in meta if str(k).lower() in {"metadata", "attributes"})
        if envelopes:
            raise ValueError(f"content put {cid}: metadata envelope fields forbidden: {envelopes}")
        # Opt-in session-memory guards (NO-OP for generic corpora — both unset). A missing schema
        # key or a dim-mismatch RAISES, so the serve dispatch replies {ok:false,error} — fail LOUD,
        # never a silent off-schema or wrong-embedder write (the ack-after-proof law: a non-land
        # crosses as an error line, so the caller's watermark never advances on it).
        if self._required_keys:
            # present-AND-non-empty: a required key with a falsy/whitespace value is as un-addressable
            # as a missing one. str(...).strip() so a legitimate chunk_index=0 / False PASSES — only
            # None / "" / whitespace fail (a bare truthiness check would wrongly reject 0).
            missing = sorted(k for k in self._required_keys if not str(meta.get(k, "")).strip())
            if missing:
                raise ValueError(f"content put {cid}: missing/empty required schema keys {missing}")
        if self._expected_dim is not None and (not isinstance(embedding, (list, tuple)) or len(embedding) != self._expected_dim):
            got = len(embedding) if isinstance(embedding, (list, tuple)) else 0  # guard len(None) → a clean domain error
            raise ContentFloorError(f"content put {cid}: embedding dim {got} != expected {self._expected_dim} "
                                    "(embedder-identity floor — a model swap that changes the dim must fail loud)")
        # the finite-value floor: a NaN/inf vector value never lands — it corrupts nearest-neighbor recall
        # silently (a NaN distance sorts unpredictably). A per-record data poison (plain ValueError), so the
        # capture poison-guard rides ONE bad vector to `failed` and carries the pass on.
        if isinstance(embedding, (list, tuple)):
            bad = next((x for x in embedding if not math.isfinite(x)), None)
            if bad is not None:
                raise ValueError(f"content put {cid}: non-finite vector value {bad!r} "
                                 "(NaN/inf corrupts nearest-neighbor recall silently)")
        if self._expected_model is not None:
            # the model-name half: the caller stamps `lar_embedder_model`; a same-dim different-model
            # swap slips the dim guard but corrupts recall — reject it (fail-closed on an absent tag too).
            got_model = str(meta.get("lar_embedder_model", "")).strip()
            if got_model != self._expected_model:
                raise ContentFloorError(f"content put {cid}: embedder model {got_model!r} != expected {self._expected_model!r} "
                                        "(embedder-identity floor — a same-dim different-model swap corrupts recall silently)")
        if self._append_only:
            # the immutable-ground guard: a committed block is never overwritten (an edit rides kapae, not a
            # re-put). An identical re-put passes (idempotent re-derivation crash-cure). BOTH halves must
            # match — same TEXT and same VECTOR: a same-text DIFFERENT-embedding re-put (a silent model
            # drift the model-stamp missed) would corrupt recall of the immutable ground just as a text
            # edit would, so it is refused too.
            existing = self._get_raw_with_vector(cid)
            if existing is not None:
                if (existing.get("document") or "") != text:
                    raise ValueError(f"content put {cid}: append-only sensorium (immutable ground) — a committed "
                                     "block's text cannot be overwritten; an edit rides kapae/worldline, never a re-put")
                if _vectors_differ(existing.get("embedding"), embedding):
                    raise ValueError(f"content put {cid}: append-only sensorium (immutable ground) — a committed "
                                     "block's VECTOR cannot be overwritten (same text, different embedding — a silent "
                                     "recall-corrupt); re-embed under the held model or kapae the block")
        # Every floor cleared — hand back the validated flat metadata for the caller to upsert (put writes
        # one; put_many collects the window and writes them together, both self-taking the palace flock via
        # mine_busy_retry, which WAITS out a concurrent mempalace write on the LOCK_NB flock).
        return meta

    def patch_metadata(self, cid: str, patch: dict) -> dict:
        """Partial metadata write — MERGE `patch` onto the drawer's existing metadata via chroma-native
        col.update, which preserves the document AND the embedding (no re-embed, no vector clobber). For
        evolving standing/decay/register on a stored drawer without a whole-record re-put. A get+put RMW
        would drop the vector (get returns no embedding); this stays vector-safe. Returns {ok:false} for
        an absent cid — a patch names an EXISTING drawer, it never creates one."""
        raw = self._get_raw(cid)
        if raw is None:
            return {"ok": False, "cid": cid}
        merged = {**raw["metadata"], **(patch or {})}
        # A guarded (session-memory) store must not let a patch leave a required key missing/empty —
        # merge cannot drop a key, but it can overwrite one with a falsy value (same ward as put).
        if self._required_keys:
            missing = sorted(k for k in self._required_keys if not str(merged.get(k, "")).strip())
            if missing:
                raise ValueError(f"content patch_metadata {cid}: patch would leave required keys missing/empty {missing}")
        mine_busy_retry(lambda: self._col.update(ids=[cid], metadatas=[merged]))
        return {"ok": True, "cid": cid}

    def search(self, embedding: list, k: int = 8, where: "dict | None" = None,
               include_muted: bool = False) -> dict:
        """Nearest-neighbor recall that EXCLUDES kapae-muted rows by default (the recall-exclusion
        leg). We drop muted rows in PYTHON, never via a chroma `where`: chroma's `$ne` on the mute
        slot would SKIP every un-kapae'd row that lacks the slot (the absent-key trap), silently
        emptying recall. So we over-fetch in an EXPANDING window until k live rows stand or the
        collection drains — correct even when many near neighbors ride muted. `include_muted`
        opts the raw index back (audit/debug)."""
        try:
            n = self._col.count()
        except NotFoundError:                  # ONLY the genuinely-absent collection reads as empty;
            n = 0                              # a real backend error propagates LOUD (never look-empty)
        if n == 0:
            return {"matches": [], "scanned": 0, "matched": 0}
        # The over-fetch POOL CEILING: a kapae'd hot-region (the cascade mutes contiguous near-neighbors)
        # would otherwise double the pool to the WHOLE collection — turning recall into a full-collection
        # ANN scan. Cap the widen at k·C; past it, bail with the live rows found (fewer than k), never a
        # full scan. A small collection (n ≤ ceiling) keeps the exact old behavior.
        ceiling = min(n, max(k, 1) * _POOL_CEILING_FACTOR)
        pool = min(max(k, 1), n)
        while True:
            got = self._col.query(
                query_embeddings=[embedding], n_results=pool,
                include=["distances", "metadatas", "documents"],
                **({"where": where} if where else {}),
            )
            ids = (got.get("ids") or [[]])[0]
            dists = (got.get("distances") or [[]])[0]
            metas = (got.get("metadatas") or [[]])[0]
            docs = (got.get("documents") or [[]])[0]
            matches = []
            for i in range(len(ids)):
                meta = metas[i] or {}
                if not include_muted and _is_muted(meta):
                    continue                    # a kapae-muted row never recalls
                matches.append({
                    "cid": ids[i],
                    "distance": dists[i] if i < len(dists) else None,
                    "document": docs[i] if i < len(docs) else "",
                    "metadata": meta,
                })
            # Enough live rows, the pool hit the ceiling (bail — never a full-collection scan), or nothing
            # to exclude — done. `scanned`/`matched` feed the CLI recall stale-daemon guard (it refuses a
            # filtered read that lacks a numeric scanned) — so the routed CLI reads like a native read.
            if len(matches) >= k or pool >= ceiling or include_muted:
                return {"matches": matches[:k], "scanned": pool, "matched": len(matches)}
            pool = min(pool * 2, ceiling)       # widen and re-fetch (more near neighbors were muted)

    def cids_for_turn(self, turn_key: str) -> list:
        """Every cid bound to a worldline `turn_key` (via `lar_turn_key` metadata) — the kapae
        cascade's resolver. A chroma `where` EQUALITY read (scalar match, no absent-key trap)."""
        if not turn_key:
            return []
        got = self._col.get(where={TURN_KEY_META: turn_key}, include=["metadatas"])
        return list(got.get("ids") or [])

    def vectors_for_turns(self, turn_keys) -> dict:
        """`turn_key -> [vectors]` for a GIVEN set of worldline turn-keys — the SCOPED vector pull
        (worldline_ffz reads only the braids it stamps, never a whole-corpus `scan`). A chroma `where`
        $in on `lar_turn_key` with embeddings included; drawers bound to no wanted key never ride out.
        Empty/absent keys → {}.

        CHUNKED: a wide braid (a deep fork-DAG) can name more turn-keys than SQLite binds in one
        statement (SQLITE_MAX_VARIABLE_NUMBER, ~999 on older builds), and one $in over the whole set
        would overflow the variable limit → a backend raise/mis-read. So the keys ride in batches and
        the per-batch dicts MERGE — a turn's chunk-vectors accumulate even when the turn straddles no
        batch (each key sits in exactly one batch, so no cross-batch double-count)."""
        keys = sorted({k for k in (turn_keys or []) if k})
        if not keys:
            return {}
        out: dict = {}
        for start in range(0, len(keys), _IN_CHUNK):
            batch = keys[start:start + _IN_CHUNK]
            got = self._col.get(where={TURN_KEY_META: {"$in": batch}}, include=["metadatas", "embeddings"])
            ids = got.get("ids") or []
            metas = got.get("metadatas") or []
            embs = got.get("embeddings")
            for i in range(len(ids)):
                emb = embs[i] if embs is not None and i < len(embs) and embs[i] is not None else None
                if emb is None:
                    continue
                tk = str((metas[i] or {}).get(TURN_KEY_META, "")).strip()
                if tk:
                    out.setdefault(tk, []).append([float(x) for x in emb])
        return out

    def mute(self, cid: str, tick=None) -> dict:
        """MUTE one row for kapae — flip the `lar_kapae` flag via patch_metadata (chroma-native
        col.update: the document AND the embedding survive, no re-embed, no vector clobber). The
        block never changes, so this rides the IMMUTABLE-GROUND (append-only) Memory sensorium too —
        a mute is metadata, not an edit. `tick` (a caller LOGICAL mark) stamps when, never a host
        clock. Idempotent; {ok:false} for an absent cid."""
        patch = {KAPAE_META: "1"}
        if tick is not None:
            patch["lar_kapae_tick"] = tick
        return self.patch_metadata(cid, patch)

    def unmute(self, cid: str, tick=None) -> dict:
        """UN-MUTE one row — flip `lar_kapae` back to "0" (never a key removal: move-not-delete at
        the content plane too; the row and its mute-history stay, the flag flips). Restores recall."""
        patch = {KAPAE_META: "0"}
        if tick is not None:
            patch["lar_unkapae_tick"] = tick
        return self.patch_metadata(cid, patch)

    def scan(self, offset: int = 0, limit: int = 256) -> dict:
        """Read a PAGE of records WITH their embeddings — the guest-import read leg. Copies a
        source store (a mine-built or caller-vector collection) into another store-compatibly: the
        embeddings ride out so the target `put`s them verbatim (no re-embed, no drift). `next` is the
        offset to resume from, or null when the page ran short (the scan is drained)."""
        try:
            n = self._col.count()
        except NotFoundError:                  # ONLY the absent collection reads as empty; a real backend
            n = 0                              # error propagates LOUD (never a look-empty page)
        if offset >= n:
            return {"records": [], "next": None, "total": n}
        got = self._col.get(
            limit=limit, offset=offset,
            include=["documents", "metadatas", "embeddings"],
        )
        ids = got.get("ids") or []
        docs = got.get("documents") or []
        embs = got.get("embeddings")
        metas = got.get("metadatas") or []
        records = [
            {
                "cid": ids[i],
                "document": docs[i] if i < len(docs) else "",
                "embedding": [float(x) for x in embs[i]] if embs is not None and i < len(embs) else None,
                "metadata": metas[i] or {},
            }
            for i in range(len(ids))
        ]
        nxt = offset + len(ids)
        return {"records": records, "next": (nxt if nxt < n else None), "total": n}


    def taxonomy(self, limit: int = 4096) -> dict:
        """The STATUS/taxonomy read (the lift of list_wings/list_rooms/get_taxonomy): aggregate the
        structuring metadata across drawers into distinct wings/rooms/halls + an entity frequency map.
        Pure metadata scan (no vectors); the aggregation walks at most `limit` records.

        `total` reports the COLLECTION'S CENSUS — what the store holds — and `scanned` reports how many
        records the aggregation actually walked. The two MUST stay separate: a scan that stops at its own
        limit and calls that number the total reports its sample size as a census, and the caller reads a
        truncation as a population. `partial` says so out loud, so no reader has to infer it.
        """
        wings, rooms, halls, entities = {}, {}, {}, {}
        seen: dict[str, dict[str, int]] = {}          # every metadata key the store actually carries
        scanned, offset, census = 0, 0, 0
        while offset < limit:
            page = self.scan(offset, min(256, limit - offset))
            census = int(page.get("total") or 0)   # the store's own count, never the walk's
            recs = page["records"]
            if not recs:
                break
            for r in recs:
                scanned += 1
                m = r.get("metadata") or {}
                for k, v in m.items():
                    if v is None or v == "":
                        continue
                    seen.setdefault(k, {})
                    vk = str(v)
                    seen[k][vk] = seen[k].get(vk, 0) + 1
                for key, bag in (("wing", wings), ("room", rooms), ("hall", halls)):
                    v = m.get(key)
                    if v:
                        bag[v] = bag.get(v, 0) + 1
                ents = m.get("entities") or ""
                for e in (ents.split(";") if isinstance(ents, str) else []):
                    e = e.strip()
                    if e:
                        entities[e] = entities.get(e, 0) + 1
            nxt = page.get("next")
            if nxt is None:
                break
            offset = nxt

        # THE FACETS EMERGE — a plane's own metadata keys name what it groups by; nothing gets
        # pre-assigned. `wing`/`room`/`hall` name CONTENT-plane concepts, and a plane that never records
        # them (a form registry keys on struct_hash) answers them with silence — which a caller then reads
        # as an empty store. So report every key the records carry, and let each key declare its own shape:
        # a key whose values never repeat IDENTIFIES rather than groups, so it earns a distinct-count and
        # no histogram. The split falls out of the data — no cardinality knob draws it.
        facets = {
            k: ({"distinct": len(vals), "identifier": True}
                if len(vals) >= scanned and scanned > 1
                else {"distinct": len(vals), "identifier": False, "values": vals})
            for k, vals in sorted(seen.items())
        }
        return {
            "total": census,
            "scanned": scanned,
            "partial": scanned < census,
            "facets": facets,
            "wings": sorted(wings.keys()),
            "rooms": sorted(rooms.keys()),
            "halls": sorted(halls.keys()),
            "entities": entities,
        }


def _build_ops(store: ContentStore) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "put": lambda req: store.put(req["cid"], req.get("text", ""), req["embedding"], req.get("metadata", {})),
        "patch_metadata": lambda req: store.patch_metadata(req["cid"], req.get("patch", {})),
        "get": lambda req: store.get(req["cid"]),
        "search": lambda req: store.search(req["embedding"], int(req.get("k", 8)), req.get("where"), bool(req.get("include_muted", False))),
        "cids_for_turn": lambda req: {"cids": store.cids_for_turn(req["turn_key"])},
        "mute": lambda req: store.mute(req["cid"], req.get("tick")),
        "unmute": lambda req: store.unmute(req["cid"], req.get("tick")),
        "scan": lambda req: store.scan(int(req.get("offset", 0)), int(req.get("limit", 256))),
        "taxonomy": lambda req: store.taxonomy(int(req.get("limit", 4096))),
    }


def _serve(palace_path: str, required_keys: "set[str] | None" = None, expected_dim: "int | None" = None,
           expected_model: "str | None" = None, append_only: bool = False,
           collection_name: "str | None" = None) -> None:
    # The guards ride optional kwargs into the store built inside the dispatch closure — so
    # run_holder is untouched, and the session-memory contract reaches the RPC face (the QA #1
    # fix: the coordinator's resolveMemoryContentSpawn passes the flags; a generic corpus omits them).
    run_holder(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(ContentStore(palace_path, required_keys=required_keys, expected_dim=expected_dim, expected_model=expected_model, append_only=append_only, collection_name=collection_name))),
        idle_ttl=_idle_ttl_seconds(),
        singleton_msg="content_io: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="content I/O (a caller-vector CONTENT store holder — non-memory targeted content)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one content palace dir")
    s.add_argument("--palace", required=True)
    s.add_argument("--require-keys", default="",
                   help="comma-joined schema keys a session-memory drawer MUST carry; empty = generic corpus (no schema guard)")
    s.add_argument("--expected-dim", type=int, default=None,
                   help="pin the embedder vector width; a dim mismatch fails loud (session-memory opt-in; unset = generic)")
    s.add_argument("--expected-model", default=None,
                   help="pin the embedder MODEL name (checked vs each drawer's lar_embedder_model); a same-dim different-model swap fails loud (session-memory opt-in; unset = off)")
    s.add_argument("--append-only", action="store_true",
                   help="immutable-ground policy (the Memory sensorium): a committed block's text cannot be overwritten (an edit rides kapae); idempotent same-text re-put still passes")
    s.add_argument("--collection", default=None,
                   help="which collection in the palace holds this plane's records (the form registry writes 'form' beside the base drawers); unset = the base default")
    s.set_defaults(fn=lambda a: _serve(
        a.palace,
        # `if k` is load-bearing: an empty/absent --require-keys yields None (generic), never {""}
        # (which would fire the guard on every put and reject all generic corpora).
        required_keys=({k for k in a.require_keys.split(",") if k} or None),
        expected_dim=a.expected_dim,
        expected_model=a.expected_model,
        append_only=a.append_only,
        collection_name=a.collection))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
