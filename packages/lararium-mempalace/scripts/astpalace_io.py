#!/usr/bin/env python3
"""astpalace_io — the substrate side of the `.astpalace` memory-ast-unfolding palace.

A SECOND mempalace instance (the same ChromaDB engine, a separate palace dir) that
holds the per-turn parse-tree AST, keyed by its STRUCTURAL HASH (sha256 of the
canonical-JSON of the tree). Twin to the verbatim palace (`~/.mempalace`) and to
`.meshpalace`; it NEVER federates on the mesh — local, content-addressed, the eidetic
↔ semantic bridge.

The binding is CODE-LEVEL, navigable BOTH ways:
  - the verbatim drawer (in the verbatim palace) carries `lar_ast_hash`  → this entry's id
  - this entry carries `verbatim_sha` + `source_file`                    → that drawer

This helper is the SOLE holder of the `.astpalace` PersistentClient for its palace dir
(one process, lazily spawned, reused) — the reap-don't-pile invariant: never two holders
fighting the per-palace mine lock. The TS `makeAstPalace` keys a singleton on the
canonical palace dir so a second `put` reuses this one process instead of spawning a pile.

It is OUR code (the causal-island boundary's substrate side), NOT the submodule: it only
moves bytes across the boundary via `mempalace.palace.get_collection` (create-or-open),
storing the AST verbatim as the drawer document and the binding as flat metadata. It never
classifies, never decides — the sovereign parse stays in TS (@lararium/mesh).

Protocol — NDJSON over stdin/stdout, one JSON object per line; ONLY JSON responses go to
stdout (banners/library noise → stderr, which the TS side drains and ignores):

    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true}}

    -> {"id":2,"op":"put","hash":H,"ast":"<canonical-json>","source_file":S,"verbatim_sha":V}
    <- {"id":2,"ok":true,"result":{"hash":H,"count":N}}

    -> {"id":3,"op":"get","hash":H}
    <- {"id":3,"ok":true,"result":{ <AstEntry> | null }}

Run with the mempalace CLI's interpreter (it has the package + chroma):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 astpalace_io.py serve --palace ~/.lares/.astpalace
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time

from mempalace.palace import get_collection

try:
    import fcntl as _fcntl  # POSIX only; absent on Windows
except ImportError:  # pragma: no cover - Windows fallback
    _fcntl = None

try:
    import select as _select  # POSIX-usable on the stdin pipe; idle-reap needs it
except ImportError:  # pragma: no cover - never absent on POSIX
    _select = None

# Cap the provenance list so a hot recurring structure cannot grow one entry without
# bound — mirrors the prior flat-file store's PROVENANCE_CAP.
PROVENANCE_CAP = 64

# Idle-reap TTL: a holder with no requests for this many seconds shuts itself down so
# a holder that outlives its TS parent (or one piled up before the singleton flock
# landed) can't linger forever. 0 (or negative) opts out. Read fresh from the env so
# an operator/test can override per process. The flock singleton is the primary guard;
# idle-reap bounds accumulation even if a flock is somehow bypassed (e.g. non-POSIX).
IDLE_TTL_ENV = "ASTPALACE_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0


def _canonical_palace_path(palace_path: str) -> str:
    """Fully-normalized palace path, IDENTICAL to mempalace.palace.mine_palace_lock's
    keying (normcase ∘ realpath ∘ expanduser) so the serve-singleton keys on the SAME
    canonical path the mine lock does — per-palace, never per-machine, and a
    path-spelling variant of one physical palace collapses to one key."""
    return os.path.normcase(os.path.realpath(os.path.expanduser(palace_path)))


def _serve_lock_path(palace_path: str) -> str:
    lock_dir = os.path.join(os.path.expanduser("~"), ".mempalace", "locks")
    os.makedirs(lock_dir, exist_ok=True)
    key = hashlib.sha256(_canonical_palace_path(palace_path).encode("utf-8")).hexdigest()[:16]
    return os.path.join(lock_dir, f"astpalace_serve_{key}.lock")


def _acquire_serve_lock(palace_path: str):
    """Lifetime per-palace singleton lock for this holder.

    Returns an open file handle (HELD for the whole process, released on exit) when
    this process may hold the palace, or ``None`` when another holder already owns it
    and this process must exit. Non-blocking + exclusive, keyed on the canonical palace
    path — so "one holder per palace dir" is OS-enforced and the 3 coexisting palaces
    (~/.mempalace, ~/.lares/.astpalace, .meshpalace) each run their own singleton. On
    non-POSIX (no fcntl) the handle is returned unlocked (best-effort; idle-reap still
    bounds accumulation)."""
    lock_path = _serve_lock_path(palace_path)
    fh = open(lock_path, "w")
    try:
        os.chmod(lock_path, 0o600)
    except OSError:
        pass
    if _fcntl is None:  # pragma: no cover - Windows fallback
        return fh
    try:
        _fcntl.flock(fh.fileno(), _fcntl.LOCK_EX | _fcntl.LOCK_NB)
    except OSError:
        try:
            fh.close()
        except OSError:
            pass
        return None
    return fh


def _release_serve_lock(fh) -> None:
    if fh is None:
        return
    try:
        if _fcntl is not None:
            _fcntl.flock(fh.fileno(), _fcntl.LOCK_UN)
    except OSError:
        pass
    finally:
        try:
            fh.close()
        except OSError:
            pass


def _idle_ttl_seconds() -> float:
    raw = os.environ.get(IDLE_TTL_ENV)
    if raw is None:
        return DEFAULT_IDLE_TTL_SECONDS
    try:
        return float(raw)
    except ValueError:
        return DEFAULT_IDLE_TTL_SECONDS


# A CHEAP, DETERMINISTIC embedding derived from the structural hash. The `.astpalace`
# is addressed by EXACT id (the structural hash) — we never semantic-search it — so we
# provide our own vectors and NEVER invoke the palace's embedding model (no model load,
# no download, no network). Consistent dimension across every upsert fixes the
# collection's vector dimension to ours; the configured embedding function is left
# attached but never called.
_EMBED_DIM = 16


def _embed(structural_hash: str) -> list[float]:
    """16 floats in [0,1) read straight off the hash hex — constant per structure."""
    h = (structural_hash + "0" * (_EMBED_DIM * 2))[: _EMBED_DIM * 2]
    return [int(h[i * 2 : i * 2 + 2], 16) / 255.0 for i in range(_EMBED_DIM)]


def _now() -> str:
    import datetime

    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class AstPalaceStore:
    """One open `.astpalace` collection; put (recurrence RMW) + get by structural hash."""

    def __init__(self, palace_path: str) -> None:
        # create-or-open: get_collection(create=True) os.makedirs the dir + creates the
        # collection if absent — this IS the `init` for a fresh palace. Identity check
        # skipped: we never run the embedder, so its recorded identity is irrelevant.
        self._col = get_collection(palace_path, create=True, _skip_identity_check=True)

    def _get_raw(self, structural_hash: str) -> dict | None:
        got = self._col.get(ids=[structural_hash], include=["documents", "metadatas"])
        ids = got.get("ids") or []
        if not ids:
            return None
        docs = got.get("documents") or [None]
        metas = got.get("metadatas") or [None]
        return {"id": ids[0], "document": docs[0], "metadata": metas[0] or {}}

    def _to_entry(self, raw: dict) -> dict:
        meta = raw["metadata"]
        try:
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        try:
            ast = json.loads(raw["document"]) if raw["document"] else None
        except (ValueError, TypeError):
            ast = None
        return {
            "hash": raw["id"],
            "ast": ast,
            "count": int(meta.get("count", 1)),
            "first_seen": meta.get("first_seen", ""),
            "last_seen": meta.get("last_seen", ""),
            "provenance": provenance,
        }

    def get(self, structural_hash: str) -> dict | None:
        raw = self._get_raw(structural_hash)
        return self._to_entry(raw) if raw is not None else None

    def put(self, structural_hash: str, ast_json: str, source_file: str, verbatim_sha: str) -> dict:
        now = _now()
        link = {"source_file": source_file, "verbatim_sha": verbatim_sha}
        existing = self._get_raw(structural_hash)
        if existing is not None:
            meta = dict(existing["metadata"])
            try:
                provenance = json.loads(meta.get("lar_provenance") or "[]")
            except (ValueError, TypeError):
                provenance = []
            seen = any(
                p.get("source_file") == source_file and p.get("verbatim_sha") == verbatim_sha
                for p in provenance
            )
            if not seen and len(provenance) < PROVENANCE_CAP:
                provenance.append(link)
            count = int(meta.get("count", 1)) + 1
            meta.update(
                {
                    "count": count,
                    "last_seen": now,
                    "lar_verbatim_sha": verbatim_sha,
                    "source_file": source_file,
                    "lar_provenance": json.dumps(provenance),
                }
            )
            # Recurrence: same structure, same id → upsert (overwrite) the one entry.
            self._col.upsert(
                ids=[structural_hash],
                documents=[ast_json],
                metadatas=[meta],
                embeddings=[_embed(structural_hash)],
            )
            return {"hash": structural_hash, "count": count}

        meta = {
            "kind": "ast",
            "lar_structural_hash": structural_hash,
            "lar_verbatim_sha": verbatim_sha,
            "source_file": source_file,
            "count": 1,
            "first_seen": now,
            "last_seen": now,
            "lar_provenance": json.dumps([link]),
        }
        self._col.upsert(
            ids=[structural_hash],
            documents=[ast_json],
            metadatas=[meta],
            embeddings=[_embed(structural_hash)],
        )
        return {"hash": structural_hash, "count": 1}


def _handle_line(store: AstPalaceStore, line: str, out) -> None:
    try:
        req = json.loads(line)
    except ValueError:
        return  # non-JSON on stdin — ignore (defensive)
    rid = req.get("id")
    op = req.get("op")
    try:
        if op == "ping":
            result: object = {"ready": True}
        elif op == "put":
            result = store.put(
                req["hash"], req["ast"], req.get("source_file", ""), req.get("verbatim_sha", "")
            )
        elif op == "get":
            result = store.get(req["hash"])
        else:
            raise ValueError(f"unknown op {op!r}")
        out.write(json.dumps({"id": rid, "ok": True, "result": result}) + "\n")
    except Exception as exc:  # noqa: BLE001 — surface to the caller, never crash the loop
        out.write(json.dumps({"id": rid, "ok": False, "error": str(exc)}) + "\n")
    out.flush()


def _serve_loop(store: AstPalaceStore, in_fd: int, out) -> None:
    """NDJSON request loop with idle-reap.

    Reads at the raw fd (not the buffered ``sys.stdin`` iterator) so ``select`` and the
    byte buffer never disagree about pending lines. Exits on EOF (the TS parent closed
    stdin — the natural lifetime end) or when idle past the TTL (orphan bound). On a
    platform without ``select`` the loop degrades to a plain blocking read (EOF-only)."""
    idle_ttl = _idle_ttl_seconds()
    poll = _select is not None and idle_ttl > 0
    last_activity = time.monotonic()
    buf = b""
    while True:
        if poll:
            try:
                ready, _, _ = _select.select([in_fd], [], [], 1.0)
            except (OSError, ValueError):  # pragma: no cover - select unusable → blocking
                poll = False
                ready = [in_fd]
            if not ready:
                # No bytes pending: reap if idle past the TTL and nothing half-buffered.
                if not buf.strip() and (time.monotonic() - last_activity) >= idle_ttl:
                    return
                continue
        try:
            chunk = os.read(in_fd, 65536)
        except OSError:  # pragma: no cover - fd closed under us
            return
        if not chunk:  # EOF — parent closed stdin
            return
        buf += chunk
        while b"\n" in buf:
            raw, buf = buf.split(b"\n", 1)
            line = raw.strip()
            if not line:
                continue
            _handle_line(store, line.decode("utf-8", "replace"), out)
            last_activity = time.monotonic()


def _serve(palace_path: str) -> None:
    # Lifetime singleton: acquire BEFORE opening the ChromaDB collection so a second
    # holder for the same palace dir exits cleanly without two clients fighting the
    # per-palace mine lock (the reap-don't-pile invariant, now OS-enforced).
    lock = _acquire_serve_lock(palace_path)
    if lock is None:
        sys.stderr.write(
            "astpalace_io: another holder already serves this palace; exiting (singleton)\n"
        )
        return
    try:
        store = AstPalaceStore(palace_path)
        _serve_loop(store, sys.stdin.fileno(), sys.stdout)
    finally:
        _release_serve_lock(lock)


def main() -> None:
    ap = argparse.ArgumentParser(description="astpalace I/O (the .astpalace mempalace-instance holder)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one .astpalace palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
