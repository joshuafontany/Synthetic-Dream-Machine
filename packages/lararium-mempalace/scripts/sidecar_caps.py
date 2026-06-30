#!/usr/bin/env python3
"""sidecar_caps — the composition foundation for the mempalace Python sidecars.

NOT a base class to subclass. A LIBRARY OF CAPABILITIES (caps) that a sidecar
COMPOSES. Each sidecar (drawer_io · astpalace_io · form_encoder · kg_io) is a
NAMELESS entity whose identity IS its cap-stack — the set of caps it #has, fused
with the OPS it declares. The caps live here as free functions + one small
composition root; a sidecar imports the caps it needs, declares its ops as a
plain dict (verb → handler), and calls the root that wires the caps around them.

  entity (sidecar)  =  the caps it #has  +  the ops it declares
  component (cap)    =  one reusable behavior (free function / closure)
  composition root   =  make_dispatch · run_sidecar · serve_loop (wire, never own)

This is ECS (entity=sidecar, component=cap) fused with ocap dependency-injection
(the script HANDS the caps its store/handlers; the caps never reach back). No god
base-class, no inheritance tower, no central registry — isomorphism by
composition, not interface.

THE CAPS
========
Path:      canonical_path                        — realpath∘expanduser (∘normcase)
NDJSON:    read_ndjson_records                    — parse an NDJSON file/stdin → dicts
           make_dispatch                          — ops-registry → an NDJSON request handler
Serve:     serve_lock_path / acquire_serve_lock /
           release_serve_lock                     — the per-palace flock singleton
           idle_ttl_seconds                       — env-read idle-reap TTL
           serve_loop                             — the raw-fd NDJSON loop + idle-reap
           run_sidecar                            — the serve composition root

The serve caps form the HEAVY shared machinery (astpalace_io + form_encoder #has
the full serve stack); the batch CLIs (drawer_io + kg_io) #has only the lighter
path/NDJSON caps — an entity carries only the components it needs.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import time

try:
    import fcntl as _fcntl  # POSIX only; absent on Windows
except ImportError:  # pragma: no cover - Windows fallback
    _fcntl = None

try:
    import select as _select  # POSIX-usable on the stdin pipe; idle-reap needs it
except ImportError:  # pragma: no cover - never absent on POSIX
    _select = None


# ---------------------------------------------------------------------------
# path cap — one canonicalization, shared by the serve singleton + the KG path
# ---------------------------------------------------------------------------


def canonical_path(path: str, *, normcase: bool = False) -> str:
    """Fully-normalized path: realpath ∘ expanduser, optionally ∘ normcase.

    ``normcase=True`` matches mempalace.palace.mine_palace_lock's keying (the
    serve-singleton keys on the SAME canonical path the mine lock does, so a
    path-spelling variant of one physical palace collapses to one key). The batch
    KG path leaves normcase off (POSIX no-op; on Windows it must not lowercase a
    sqlite path the caller spelled exactly)."""
    p = os.path.realpath(os.path.expanduser(path))
    return os.path.normcase(p) if normcase else p


# ---------------------------------------------------------------------------
# NDJSON caps — record reading + the ops-registry request handler
# ---------------------------------------------------------------------------


def read_ndjson_records(patchfile: str):
    """Yield one parsed JSON object per non-blank line of ``patchfile`` (or stdin
    when ``patchfile == "-"``). Closes a file it opened; never closes stdin."""
    src = sys.stdin if patchfile == "-" else open(patchfile)
    try:
        for line in src:
            if line.strip():
                yield json.loads(line)
    finally:
        if src is not sys.stdin:
            src.close()


def make_dispatch(ops: dict):
    """Wire an OPS REGISTRY (``{op: handler(req) -> result}``) into an NDJSON
    request handler ``dispatch(req, out)``.

    The registry IS the sidecar's #has-stack made literal. ``dispatch`` looks the
    op up, runs the handler, and writes the ``{id, ok, result}`` / ``{id, ok,
    error}`` envelope — never crashing the serve loop on a handler error."""

    def dispatch(req: dict, out) -> None:
        rid = req.get("id")
        op = req.get("op")
        try:
            handler = ops.get(op)
            if handler is None:
                raise ValueError(f"unknown op {op!r}")
            result = handler(req)
            out.write(json.dumps({"id": rid, "ok": True, "result": result}) + "\n")
        except Exception as exc:  # noqa: BLE001 — surface to the caller, never crash the loop
            out.write(json.dumps({"id": rid, "ok": False, "error": str(exc)}) + "\n")
        out.flush()

    return dispatch


# ---------------------------------------------------------------------------
# store-readback cap — read STORED vectors back out of ANY chroma collection
# ---------------------------------------------------------------------------

# The form/structure store's collection name. The SHARED home (form_encoder.py
# re-declares the same literal value, FORM_COLLECTION = "form", as its store
# target); a reader that joins the form plane keys off this. One name, two
# holders agree by value — the cross-graph join (living-grammar-palace#two-planes).
FORM_COLLECTION = "form"


def read_stored_embeddings(collection, key_map: dict, *, where=None) -> list:
    """Read STORED vectors back out of ``collection`` — NEVER re-embed, NEVER load a
    model. The model-agnostic readback shared by every plane's feed (content · form):
    a `.get(include=["embeddings","metadatas"])`, the None-embedding skip (a drawer
    with no stored vector has nothing to feed), and the `[float(x) for x in emb]`
    coercion (numpy → JSON-legal floats).

    ``key_map`` is ``{output_field: metadata_key}`` — each row projects the named
    metadata keys under the chosen output names. One row per drawer with a vector::

        {id, embedding:[...], **projected}

    The CALLER owns ordering (content sorts by (source_file, chunk_index, id); form
    dumps flat) — this cap reads, projects, and returns in the store's native order."""
    got = collection.get(where=where, include=["embeddings", "metadatas"])
    ids = got["ids"]
    embs = got["embeddings"]
    metas = got["metadatas"]
    rows = []
    for i, emb, m in zip(ids, embs, metas):
        if emb is None:
            continue  # a drawer with no stored vector — nothing to feed a plane
        m = m or {}
        row = {"id": i, "embedding": [float(x) for x in emb]}
        for out_field, meta_key in key_map.items():
            row[out_field] = m.get(meta_key)
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# serve cap — the per-palace flock singleton (reap-don't-pile, OS-enforced)
# ---------------------------------------------------------------------------


def serve_lock_path(palace_path: str, prefix: str) -> str:
    """``~/.mempalace/locks/<prefix>_<key>.lock`` where key = sha256 of the
    canonical palace path [:16]. ``prefix`` names the sidecar (its cap-stack
    identity) so each sidecar holds its OWN per-palace singleton."""
    lock_dir = os.path.join(os.path.expanduser("~"), ".mempalace", "locks")
    os.makedirs(lock_dir, exist_ok=True)
    key = hashlib.sha256(canonical_path(palace_path, normcase=True).encode("utf-8")).hexdigest()[:16]
    return os.path.join(lock_dir, f"{prefix}_{key}.lock")


def acquire_serve_lock(palace_path: str, prefix: str):
    """Lifetime per-palace singleton lock for this holder (non-blocking, exclusive,
    canonical-keyed).

    Returns an open file handle (HELD for the whole process, released on exit) when
    this process may hold the palace, or ``None`` when another holder already owns
    it and this process must exit. On non-POSIX (no fcntl) the handle is returned
    unlocked (best-effort; idle-reap still bounds accumulation)."""
    lock_path = serve_lock_path(palace_path, prefix)
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


def release_serve_lock(fh) -> None:
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


def idle_ttl_seconds(env_name: str, default: float) -> float:
    """Read the idle-reap TTL from ``env_name`` (fresh, so a test/operator can
    override per process), falling back to ``default`` on absence/garbage."""
    raw = os.environ.get(env_name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


# ---------------------------------------------------------------------------
# serve cap — the raw-fd NDJSON loop with idle-reap
# ---------------------------------------------------------------------------


def serve_loop(dispatch, in_fd: int, out, *, idle_ttl: float) -> None:
    """NDJSON request loop with idle-reap.

    Reads at the raw fd (not the buffered ``sys.stdin`` iterator) so ``select`` and
    the byte buffer never disagree about pending lines. Parses each line as JSON
    (non-JSON lines ignored defensively) and calls ``dispatch(req, out)``. Exits on
    EOF (the parent closed stdin — the natural lifetime end) or when idle past the
    TTL (orphan bound). Without ``select`` the loop degrades to a plain blocking
    read (EOF-only)."""
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
            try:
                req = json.loads(line.decode("utf-8", "replace"))
            except ValueError:
                continue  # non-JSON on stdin — ignore (defensive)
            dispatch(req, out)
            last_activity = time.monotonic()


# ---------------------------------------------------------------------------
# serve composition root — wire flock-singleton + serve-loop around a sidecar
# ---------------------------------------------------------------------------


def run_sidecar(
    *,
    palace,
    lock_prefix: str,
    build_dispatch,
    idle_ttl: float,
    singleton_msg: str,
    require_lock: bool = True,
    in_fd: int | None = None,
    out=None,
) -> None:
    """The serve composition root: acquire the per-palace singleton, then (only if
    held) wire the sidecar's ops into the serve loop, then release.

    ``build_dispatch`` is a zero-arg callable the SIDECAR supplies — it opens its
    store(s)/scorer and returns the ``dispatch(req, out)`` handler. It runs ONLY
    after the lock is held, so a refused second holder never opens a store (the
    reap-don't-pile invariant). When ``palace is None`` (an encode-only holder) the
    lock is skipped and the loop runs lock-free."""
    lock = None
    if require_lock and palace is not None:
        lock = acquire_serve_lock(palace, lock_prefix)
        if lock is None:
            sys.stderr.write(singleton_msg)
            return
    try:
        dispatch = build_dispatch()
        serve_loop(
            dispatch,
            sys.stdin.fileno() if in_fd is None else in_fd,
            sys.stdout if out is None else out,
            idle_ttl=idle_ttl,
        )
    finally:
        release_serve_lock(lock)
