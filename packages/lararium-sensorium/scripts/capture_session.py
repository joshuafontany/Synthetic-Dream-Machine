#!/usr/bin/env python3
"""capture_session — the COORDINATOR/DRIVER that takes the capture engine LIVE (the M1 keystone wire).

The engine (capture_stream.Pipeline via sensorium.compose_stream_sensorium) stood DARK: no surface cap
parsed a transcript, nothing drove a pass. This driver composes the whole cap-stack and pulls the
trigger:

    Memory sensorium  =  content_io ContentStore (immutable ground, append-only, wing/room schema floor
                          + embedder-identity floor {dim, model})
                       +  a surface source-cap (capture_sources: claude · codex · copilot SQLite · copilot-vscode)
                       +  the warm embed cap (embed_cap: minilm/384, loaded once)

The DRIVER STAMPS the embedder identity: it reads `(embed_one, model)` off the warm cap, PROBES the
vector dim once, stamps `lar_embedder_model` onto every record's metadata, and pins `expected_dim` /
`expected_model` on the store — so a model/dim swap fails LOUD at the land, never corrupts recall
silently. Then it runs ONE capture pass (idempotent re-derivation: a re-run lands only the fresh tail).

Ephemeral-first witness discipline: point `--sensorium` at a tmp dir; NEVER seed the sovereign ~/.mempalace.

Usage:
  PYTHONPATH=<repo>/mempalace  <venv>/python capture_session.py \
      <claude|codex|copilot|copilot-vscode> <pointer> --sensorium <dir> --wing <wing> [--room <room>]

  · claude   pointer = a session `.jsonl` (or a sub-agent `agent-<id>.jsonl`)
  · codex    pointer = a rollout `.jsonl`
  · copilot  pointer = the SQLite `session-store.db` (NOT the deleted events.jsonl)
  · copilot-vscode pointer = the native Copilot Chat event-stream `.jsonl`

Meme: lar:///ha.ka.ba/lararium/sensorium/capture-session
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Callable, Iterator

from capture_sources import Record, SourceCap, resolve_source
from sensorium import (compose_content_land, compose_persistence_cap, compose_stream_sensorium,
                       derived_views, sensorium_paths, write_stream_manifest, OrderCap)
from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar


_LOCK_PREFIX = "capture_session_serve"


def worldline_path(sensorium_root: str) -> str:
    """Derive the worldline capability from the one sensorium root address."""
    return sensorium_paths(sensorium_root).worldline


def stamp_embedder(source: SourceCap, model: str) -> SourceCap:
    """Wrap a source-cap so every record carries the embedder-model stamp (`lar_embedder_model`) — the
    driver owns the embedder identity, the source owns the transcript schema. The store's model-floor
    checks this stamp, so a same-dim different-model swap fails loud at the land."""
    def wrapped(pointer: str) -> Iterator[Record]:
        for rec in source(pointer):
            meta = dict(rec.get("metadata") or {})
            meta["lar_embedder_model"] = model
            yield {**rec, "metadata": meta}
    return wrapped


def compose_memory_stream_sensorium(sensorium_root: str, *, embed_factory: "Callable | None" = None,
                                    planes_factory: "Callable | None" = None):
    """Compose the Memory stream entity once from a root-derived `#has` stack.

    The warm content/embed capabilities stay on the entity.  A source and the
    structure/form planes are born for each pass: SQLite/live-hook sessions and
    harvests therefore share one path without sharing mutable parser or plane
    state.  Other text streams use `compose_stream_sensorium` with their own
    source/land capabilities; no surface-specific sensorium class is needed.
    """
    if embed_factory is None:
        from embed_cap import make_embed_cap
        embed_factory = make_embed_cap
    embed_one, model = embed_factory()
    dim = len(embed_one("probe"))
    paths = sensorium_paths(sensorium_root)
    order = OrderCap("worldline", "observed:turn-dag")
    write_stream_manifest(
        paths.root,
        name="memory",
        lar="lar:///ha.ka.ba/lararium/api/living-grammar-palace#palace-instance",
        order=order,
        apertures={"beat": "worldline-dag"},
        worldline={"real": ["turn-dag"], "arbitrary": ["source-sequence"]},
    )

    def source_factory(*, surface, wing, room="conversations", session_id=None, **_route):
        return stamp_embedder(resolve_source(surface, wing=wing, room=room, session_id=session_id), model)

    def fresh_planes(**route):
        if planes_factory is not None:
            return planes_factory(**route)
        from plane_fanout import compose_text_planes
        return compose_text_planes(paths.root)

    def observe(pointer, *, surface, veil_secret=None, veil_context="", identity_dir=None, **_route):
        if surface != "claude":
            return {"worldline": None}
        from worldline_observe import observe_worldline
        from worldline_io import WorldlineStore
        store = WorldlineStore(paths.worldline)
        try:
            return {"worldline": observe_worldline(store, pointer, veil_secret=veil_secret,
                                                      veil_context=veil_context, identity_dir=identity_dir)}
        finally:
            store.close()

    land = compose_content_land(paths.root, required_keys={"wing", "room"}, expected_dim=dim,
                                expected_model=model)
    stream = compose_stream_sensorium(kind="memory", land=land, embed=embed_one,
                                      source_factory=source_factory, planes_factory=fresh_planes,
                                      observer=observe, worldline=paths.worldline,
                                      persistence=compose_persistence_cap(paths.root, half_life=None),
                                      order=order, mutation_root=paths.root)
    return stream, model, dim, paths


def capture_and_observe(sensorium_root: str, surface: str, pointer: str, *, wing: "str | None",
                        room: str = "conversations", embed_factory: "Callable | None" = None,
                        veil_secret: "bytes | str | None" = None, veil_context: str = "",
                        identity_dir: "str | None" = None, planes_factory: "Callable | None" = None) -> dict:
    """Capture one source stream through the canonical rooted Memory sensorium."""
    stream, model, dim, _paths = compose_memory_stream_sensorium(
        sensorium_root, embed_factory=embed_factory, planes_factory=planes_factory)
    summary = stream.capture(pointer, surface=surface, wing=wing, room=room,
                             veil_secret=veil_secret, veil_context=veil_context,
                             identity_dir=identity_dir)
    return {"surface": surface, "pointer": pointer, "wing": wing, "room": room,
            "embedder_model": model, "embedder_dim": dim, **summary}


@dataclass
class _DerivedEnricher:
    """One content-DERIVED enrichment the holder keeps fresh on new shards — a name, its coalesce cadence,
    and the derive callable that re-derives it from the content ground (returns a summary dict). rejim
    (DISCOVER the nameless rhythm) and worldline-ffz (ASSIGN prenamed slots per node) are both these: the
    work differs (detection vs assignment), the drive is one."""

    name: str
    cadence: "object"          # a derived_cadence.DerivedCadence (mark/due/observe_repour)
    derive: "Callable[[], dict]"


class CaptureSessionServer:
    """One Python-owned source-stream writer for one sovereign content palace.

    The daemon sends only a source pointer and its routing context.  This holder
    owns parsing, source identity, CID derivation, embedding, durable landing,
    and the worldline observation; TypeScript never receives a session turn.
    """

    def __init__(self, sensorium_root: str, *, embed_factory: "Callable | None" = None) -> None:
        self._stream, self._model, self._dim, self._paths = compose_memory_stream_sensorium(
            sensorium_root, embed_factory=embed_factory or self._make_embedder)
        # The DERIVED-ENRICHMENT registry — content-derived metadata the holder keeps fresh on new shards,
        # each a re-derivation on the coalesced idle beat (marks on capture, fires on settled quiet ground).
        # rejim (DETECT the nameless rhythm → geology) and worldline-ffz (ASSIGN prenamed membership slots per
        # node from the DAG → content metadata) ride ONE cadence machinery; the WORK differs, the DRIVE is one.
        # Clock-pure + dormant until ticked, so every existing deploy stays unchanged until the holder serves.
        from derived_cadence import DEFAULT_COALESCE_WINDOW, DerivedCadence
        self._clock = 0
        self._backlog = 0
        _env = os.environ.get("LARES_DERIVED_WINDOW")
        window = float(_env) if _env else DEFAULT_COALESCE_WINDOW
        # The three-fold of derived WORK, one DRIVE: rejim DISCOVERS the nameless rhythm, mempalace PROJECTS
        # content into the recall surface, worldline-ffz ASSIGNS prenamed membership slots per node. All
        # content-derived, rebuildable, refreshed on new shards — the ONE `refresh` command re-derives them all,
        # the idle beat auto-drives them. (rederive/bands are cousins — canon-triggered, not new-shard.)
        self._derived = [
            _DerivedEnricher("rejim", DerivedCadence(window=window), lambda: self.repour_rejim({})),
            _DerivedEnricher("mempalace", DerivedCadence(window=window), self._pave_mempalace),
        ]
        if self._worldline_declared():
            self._derived.append(_DerivedEnricher("worldline-ffz", DerivedCadence(window=window),
                                                  self._enrich_worldline))

    @staticmethod
    def _make_embedder():
        from embed_cap import make_embed_cap
        return make_embed_cap()

    def _tick(self) -> int:
        """Bump the holder's monotonic ordinal clock — the tick cadence sets its real-time meaning; the
        derived cadences read only the ordinal (clock-pure), so a replay drives them the same."""
        self._clock += 1
        return self._clock

    def _worldline_declared(self) -> bool:
        """Does this sensorium BEAR the worldline cap? The membership-slot assignment runs only where the
        manifest declares `apertures.beat: worldline-dag` (declaration-carries-authority — the same gate the
        worldline_ffz CLI holds). A non-worldline stream carries no beat leg, so no worldline enricher."""
        from sensorium import read_stream_manifest
        try:
            manifest = read_stream_manifest(self._paths.root, absent_ok=True)
        except Exception:  # noqa: BLE001 — an unreadable manifest simply carries no declared beat leg
            return False
        return ((manifest or {}).get("apertures") or {}).get("beat") == "worldline-dag"

    def _enrich_worldline(self) -> dict:
        """ASSIGN the membership-slot stamps across every braid (down the DAG spawn-tree) — the deterministic,
        per-node counterpart to rejim's whole-stream detection. Idempotent (a re-run mints the same slots);
        REUSES the holder's ONE content handle; opens a fresh WorldlineStore, closes it in `finally`."""
        from worldline_ffz import assign_worldline_ffz
        from worldline_io import WorldlineStore
        store = WorldlineStore(self._paths.worldline)
        try:
            report = assign_worldline_ffz(store, [self._content_store()])
            report.pop("__vector_fault__", None)
            return {"braids": len(report), "stamped": sum(c.stamped for c in report.values())}
        finally:
            store.close()

    def _drive_enricher(self, enr: "_DerivedEnricher", now: int, backlog: int) -> "dict | None":
        """Drive one derived enrichment's cadence a tick: fire its derive when due AND settled, fold the true
        cost into the servo, and return {revision, name, summary} — or None when it holds (not yet due)."""
        rev = enr.cadence.due(now, backlog)
        if rev is None:
            return None
        t0 = time.perf_counter()
        summary = enr.derive()
        enr.cadence.observe_repour((time.perf_counter() - t0) * 1000.0)   # fold true cost into the window servo
        return {"revision": rev, "name": enr.name, "summary": summary}

    def _derived_idle_beat(self) -> None:
        """One idle beat: tick EVERY derived enrichment; each due + settled one re-derives on quiet ground
        (a burst of captures coalesces to one re-derivation of the freshest settled content). The serve loop's
        idle guard swallows any error — background derivation, never the holder's lifeline. The AUTO-drive."""
        now, backlog = self._tick(), self._backlog
        for enr in self._derived:
            res = self._drive_enricher(enr, now, backlog)
            if res is not None:
                sys.stderr.write(f"capture_session: {enr.name} re-derived on idle (rev {res['revision']})\n")
                sys.stderr.flush()

    def _content_store(self):
        """The ONE persistent content handle this holder already owns (opened once at compose). Every
        serve-op REUSES it — the read taxonomy, the plane_record content leg, and BOTH kapae cascades write
        through this single client. Opening a second `ContentStore` on the same palace would put a second
        writing chroma client on one index (the corruption this whole holder-owns-the-palace design prevents)."""
        return self._stream._land.store  # noqa: SLF001 — the holder reaches its own land-cap's store

    def capture(self, req: dict) -> dict:
        surface = str(req.get("surface") or "")
        pointer = str(req.get("pointer") or "")
        wing = str(req.get("wing") or "")
        room = str(req.get("room") or "conversations")
        session_id = str(req.get("sessionId") or "") or None
        if surface not in {"claude", "codex", "copilot", "copilot-vscode"}:
            raise ValueError("capture requires surface claude|codex|copilot|copilot-vscode")
        if not pointer or not os.path.exists(pointer):
            raise ValueError(f"capture pointer is absent: {pointer!r}")
        if not wing:
            raise ValueError("capture requires a non-empty wing")

        summary = self._stream.capture(pointer, surface=surface, wing=wing, room=room, session_id=session_id)
        # the ground moved: arm EVERY derived cadence and record the honest backlog the next tick reads.
        now = self._tick()
        for enr in self._derived:
            enr.cadence.mark(now)
        self._backlog = len(summary.get("backlog") or [])
        return {
            "surface": surface, "pointer": pointer, "wing": wing, "room": room,
            **({"sessionId": session_id} if session_id else {}),
            "embedder_model": self._model, "embedder_dim": self._dim,
            **summary,
        }

    def refresh(self, req: dict) -> dict:
        """Re-derive the sensorium's whole DERIVED layer in ONE command — every content-derived enrichment
        the holder owns (rejim rhythm DISCOVERY · mempalace projection · worldline slot ASSIGNMENT where the
        aperture is declared), the SAME registry the idle beat auto-drives. FORCED — a manual ask re-derives
        now, bypassing the cadence gate. Optional `which` names a single enrichment (else all). Rides the
        serialized pipe, so it queues between capture passes and never races the writer. A live session's
        later turns land on the next `capture`; a later `refresh` re-derives the layer over them. Returns
        `{refreshed: {name: summary}}` — an honest empty when `which` names an enrichment this sensorium lacks."""
        which = req.get("which")
        refreshed: dict = {}
        for enr in self._derived:
            if which and enr.name != which:
                continue
            refreshed[enr.name] = enr.derive()
        return {"refreshed": refreshed}

    def _pave_mempalace(self) -> dict:
        """The mempalace enrichment's derive: re-pave the in-tree projection over THIS holder's content — the
        derived recall surface rebuilt from the eidetic ground. Rides the serialized pipe (no second store
        connection). Querying the projection is recall's job, not the pave's — this only re-derives the view."""
        import mempalace_pave_cli as pave_cli
        return pave_cli.run(self._paths.content, self._paths.mempalace, query=None, k=5, all_strata=False)

    def repour_rejim(self, req: dict) -> dict:
        """Re-derive the REJIM (rhythm/geology) plane over THIS holder's content — the nameless regimes the
        stream's own structure holds, re-poured from the eidetic ground, rebuildable like the mempalace
        projection. Rides the SAME serialized pipe as `capture`/`refresh`, so this heavy whole-stream repour
        queues BETWEEN capture passes and never races the writer (the pipe IS the serializer; no second
        store connection). Content-only, so a sigil-less sensorium repours unchanged."""
        import rejim_io
        rejim_dir = self._paths.rejim
        return rejim_io.repour_rejim(
            self._paths.content, rejim_dir,
            channel=str(req.get("channel") or rejim_io.CONTENT),
            n_surrogates=int(req.get("nSurrogates") or rejim_io.DEFAULT_N_SURROGATES),
            content_store=self._content_store(),   # reuse the holder's ONE content handle (the discipline)
        )

    def read_rejim(self, req: dict) -> dict:
        """The landed rejim geology for THIS holder — the derived rhythm plane made ASKABLE (repour writes it,
        this reads it), or an honest absence when it has never been repoured. Rides the serialized pipe like
        every other op, so a read never tears a half-written geology (the land swaps atomically)."""
        import rejim_io
        rejim_dir = self._paths.rejim
        geology = rejim_io.read_rejim(rejim_dir)
        return {"repoured": geology is not None, "geology": geology}

    # ── the lifecycle + cross-plane serve-ops (the /mcp DaemonCoordinator routes to these) ─────────
    # Each rides the SAME serialized pipe as capture (run_sidecar dispatch is serial), so a MUTATION never
    # races the live writer — that serialization is WHY the capture holder owns these ops, not a bare store.

    def status(self, req: dict) -> dict:
        """What THIS holder's palace holds — the content taxonomy over the ONE persistent store the holder
        already owns (reused, never a second client), PLUS the DERIVED layer (mempalace projection · rejim
        geology). Status tells the whole truth: the eidetic ground AND the rebuildable views hanging off it."""
        return {**self._content_store().taxonomy(), "derived": derived_views(self._paths.root)}

    def worldline(self, req: dict) -> dict:
        """The fork-DAG rhizome for THIS holder (bitemporal AS-OF `asOf`, else the whole history). Opens a
        FRESH WorldlineStore per-op and CLOSES it in `finally` (mirrors `observe()` above), so no worldline
        handle lingers on the holder. `selector` narrows on the CLI skin; the py `dag` renders the whole DAG."""
        from worldline_io import WorldlineStore
        store = WorldlineStore(self._paths.worldline)
        try:
            return store.dag(as_of=req.get("asOf"))
        finally:
            store.close()

    def kapae(self, req: dict) -> dict:
        """Mute a worldline branch + cascade the mute across THIS holder's content store (move-not-delete;
        `un_kapae` restores). MUTATION — it rides the SAME serialized pipe as capture, so the mute never races
        the live writer (the serialization is WHY this op homes on the capture holder). REUSES the holder's ONE
        content handle (never a second writer); opens a fresh WorldlineStore, closes it in `finally`."""
        branch, tick = str(req.get("branch") or ""), req.get("tick")
        if not branch or not isinstance(tick, int):
            raise ValueError("kapae requires a non-empty branch + an integer tick — a mutation guards its own args")
        import worldline_io
        from worldline_io import WorldlineStore
        store = WorldlineStore(self._paths.worldline)
        try:
            return worldline_io.cascade_kapae(store, [self._content_store()], branch, tick)
        finally:
            store.close()

    def un_kapae(self, req: dict) -> dict:
        """Restore a muted worldline branch across THIS holder's content store — the reverse of `kapae`.
        MUTATION on the serialized pipe (never races the live writer); reuses the holder's ONE content handle;
        opens a fresh WorldlineStore, closes it in `finally`."""
        branch, tick = str(req.get("branch") or ""), req.get("tick")
        if not branch or not isinstance(tick, int):
            raise ValueError("un_kapae requires a non-empty branch + an integer tick — a mutation guards its own args")
        import worldline_io
        from worldline_io import WorldlineStore
        store = WorldlineStore(self._paths.worldline)
        try:
            return worldline_io.cascade_un_kapae(store, [self._content_store()], branch, tick)
        finally:
            store.close()

    def plane_record(self, req: dict) -> dict:
        """The cross-plane witness: ONE cid → presence + payload summary across content · structure · form,
        honest nulls where a plane lacks it. READ-only. Rides the ONE content handle the holder owns + fresh
        read-only structure/form readers — the SAME `plane_query` implementation the /mcp coordinator drives."""
        from plane_query import plane_record_witness
        return plane_record_witness(self._content_store(), self._paths.root, str(req.get("cid") or ""))


def _serve(sensorium_root: str) -> None:
    """Serve one serialized Python capture pipe over NDJSON stdio. The holder AUTO-drives EVERY derived
    enrichment (rejim rhythm + worldline membership slots) on the serve loop's idle beat — each capture marks
    the cadences, and quiet, settled ground fires the re-derivations."""
    server = CaptureSessionServer(sensorium_root)
    run_sidecar(
        palace=server._paths.content,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch({
            "ping": lambda _req: {"ready": True},
            "capture": server.capture,
            "refresh": server.refresh,   # RE-DERIVE the whole derived layer (rejim · mempalace · worldline)
            "read_rejim": server.read_rejim,       # read the landed rejim geology — the plane made askable
            "status": server.status,               # the taxonomy over the holder's content store
            "worldline": server.worldline,         # the fork-DAG rhizome read (fresh worldline handle)
            "kapae": server.kapae,                 # mute a branch across the content store (serialized mutation)
            "un_kapae": server.un_kapae,           # restore a muted branch (serialized mutation)
            "plane_record": server.plane_record,   # the cross-plane witness (content · structure · form)
        }),
        idle_ttl=idle_ttl_seconds("LARES_CAPTURE_IDLE_TTL", 600.0),
        singleton_msg="capture_session: another holder already serves this palace; exiting (singleton)\n",
        on_idle=server._derived_idle_beat,   # AUTO-drive every derived enrichment on quiet ground
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="capture_session — Python source-stream driver for the Memory sensorium")
    ap.add_argument("surface", nargs="?", choices=["claude", "codex", "copilot", "copilot-vscode"], help="the AI surface to read")
    ap.add_argument("pointer", nargs="?", help="the transcript pointer (a .jsonl, or the Copilot session-store.db)")
    ap.add_argument("--sensorium", required=True,
                    help="the sovereign sensorium; content/ and worldline/ derive beneath it")
    ap.add_argument("--wing", default=None, help="the schema-floor wing")
    ap.add_argument("--room", default="conversations", help="the schema-floor room")
    ap.add_argument("--serve", action="store_true", help="serve serialized source-stream capture over NDJSON stdio")
    args = ap.parse_args()
    if args.serve:
        _serve(args.sensorium)
        return
    if not args.surface or not args.pointer:
        ap.error("surface and pointer are required unless --serve")
    # capture_and_observe on the shipping entrypoint: land the content AND build the worldline fork-DAG in
    # one pass (the demux 1b wire reaches the live driver, not just the tests). Codex/copilot land content
    # only; the claude surface also builds the braid beside the palace.
    summary = capture_and_observe(args.sensorium, args.surface, args.pointer, wing=args.wing, room=args.room)
    sys.stdout.write(json.dumps(summary) + "\n")


if __name__ == "__main__":
    main()
