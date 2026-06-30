/**
 * Lararium Node Vessel — local-first relay + TW5 engine entrypoint.
 *
 * Boots one LarVessel per configured wiki, wires a WebSocket relay for
 * browser vessels to sync through, and attaches a LarDiskProjector so
 * the bags/ tree stays in sync with the Automerge store.
 *
 * WS surface (sync):
 *   ws://localhost:8080/ws  → Automerge sync protocol
 *
 * Usage:
 *   node dist/main.js [--port 8080] [--storage .lararium] [--wiki lares] [--root /alt/root]
 *
 * Environment:
 *   LAR_PORT     — WS server port (default 8080)
 *   LAR_STORAGE  — storage directory (default {root}/.lararium)
 *   LAR_WIKI     — wiki id (default lares — the @lares-as-wiki quine)
 *   LAR_CATALOG  — existing catalog automerge URL to join (optional)
 *   LAR_ROOT     — alternate repo root for all mirror paths (default: monorepo root).
 *                  Set to an isolated test dir so promote/sync writes never touch
 *                  canonical packages/ or wikis/ paths.
 *
 * Bootstrap:
 *   The catalog Automerge URL is printed to stdout on boot.
 *   Browser vessels read it from location.hash on first visit, cache to
 *   localStorage for offline return visits.
 */

import { createServer }  from "http";
import WebSocket                         from "isomorphic-ws";
import { resolve }                       from "path";
import { openNodeVessel, openNodeHerm, type NodeRecipe } from "./open-node-vessel.js";
import { startUdsChannel }              from "./uds-channel.js";
import { mountOracleReadFace }          from "./oracle-read-face.js";
import { loadVesselSigningSeed }        from "./node-vessel-identity.js";
import { getMempalaceClient }           from "@lararium/mempalace";
import { larDataDir }                   from "./vessel-paths.js";
import type { AutomergeUrl }            from "@automerge/automerge-repo";
import { join } from "path";
import { REPO_ROOT }   from "./node-host.js";


// ---------------------------------------------------------------------------
// CLI / env config
// ---------------------------------------------------------------------------

function parseArgs(): { port: number; storageDir: string; genesisDir: string; wikiId: string; rootDir: string; catalogUrl: string | null; recipe: NodeRecipe } {
  const args = process.argv.slice(2);
  const get  = (flag: string, env: string, fallback: string) => {
    const i = args.indexOf(flag);
    return (i !== -1 ? args[i + 1] : undefined) ?? process.env[env] ?? fallback;
  };
  const rootDir    = resolve(get("--root", "LAR_ROOT", REPO_ROOT));   // corpus root (genesis)
  const storageDir = resolve(get("--storage", "LAR_STORAGE", larDataDir()));   // runtime → ~/.lares/.lararium
  // One genesis law, shared with the CLI env contract: <root>/genesis —
  // the repo root carries the REAL tracked genesis dir (the symlink and the
  // package-dir home both died 2026-06-11; early alpha keeps no compatibility).
  const genesisDir = resolve(get("--genesis", "LAR_GENESIS", join(rootDir, "genesis")));
  const recipe = (get("--recipe", "LAR_RECIPE", "lararium") === "herm" ? "herm" : "lararium") as NodeRecipe;
  return {
    port:       Number(get("--port", "LAR_PORT", "8080")),
    storageDir,
    genesisDir,
    wikiId:     get("--wiki", "LAR_WIKI", "lares"),
    rootDir,
    catalogUrl: process.env["LAR_CATALOG"] ?? null,
    recipe,
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { port, storageDir, genesisDir, wikiId, rootDir, catalogUrl, recipe } = parseArgs();

  // WS server — path-scoped to /ws only. Non-WS requests get no handler (socket destroyed
  // by the upgrade gate below). No HTTP surface — catalog URL advertised via stdout.
  const httpServer = createServer();
  const wss = new WebSocket.Server({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else {
      socket.destroy();
    }
  });

  // Fail-fast on a busy port — the supervised vessel never manages its siblings
  // (12-factor / island sovereignty). A clean message, not an unhandled 'error'
  // crash; `lares reconcile` is the verb that stops the incumbent (hoike
  // #dev-loop-restart, 2026-06-16).
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[lararium] port ${port} is already in use — a vessel is already running. Use \`lares reconcile\` to restart it, or free the port.`);
      process.exit(1);
    }
    throw err;
  });
  httpServer.listen(port, () => {
    console.log(`[lararium] WS relay on :${port}  (ws://localhost:${port}/ws)`);
  });

  // ── Herm (Lares Viales) — the wiki-LESS wayfarer cap-stack: @daemon immune core + a served
  //    @meshpalace FLOW-map, no wiki/pool. Routed by --recipe herm / LAR_RECIPE=herm. ──────────
  if (recipe === "herm") {
    // Carriage + self-announce from the env: LAR_PEERS (bootstrap base URLs), LAR_PULL_MS, LAR_SEED (label),
    // LAR_PUBLIC_URL (this Herm's REACHABLE http read-face — advertised in its dial, the self-peering key).
    const peers = (process.env["LAR_PEERS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const pullMs = process.env["LAR_PULL_MS"];
    const seedLabel = process.env["LAR_SEED"];
    const publicUrl = process.env["LAR_PUBLIC_URL"] ?? `http://localhost:${port}`;
    // Routing-chart coord: θ deterministic from the node-id (CONTENT-BLIND — a hash of the address, never
    // sealed content; the canonical born-random-then-grow-from-topology is the fuller design), r = carriage
    // standing (LAR_RADIUS, default 1). Published in this Herm's slot + drives peers' proximity re-rank.
    const hashUnit = (s: string): number => {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
      return (h >>> 0) / 4294967296;
    };
    const selfCoord = { theta: hashUnit(publicUrl) * 2 * Math.PI, r: Number(process.env["LAR_RADIUS"] ?? 1) };
    const herm = await openNodeHerm({
      hostId:     "lares-viales",
      wikiId,
      storageDir,
      genesisDir,
      rootDir,
      wss,
      catalogUrl,
      recipe:     "herm",
      httpServer,
      selfEndpoint: publicUrl,
      selfCoord,
      ...(peers.length ? { peers } : {}),
      ...(pullMs ? { pullIntervalMs: Number.parseInt(pullMs, 10) } : {}),
      // the dial advertises the REACHABLE read-face URL (publicUrl), so peers carrying it can self-peer back.
      ...(seedLabel ? { seed: [{ bearing: `lar:///ha.ka.ba/@oracle/herm/${seedLabel}`, verifyingKeyHex: "f".repeat(64), endpoint: publicUrl, scale: "dreamnet" as const }] } : {}),
      onPhase:    (phase) => console.log(`[herm] phase → ${phase}`),
    });
    console.log(`[herm] live — wiki-less wayfarer | storage: ${storageDir}`);
    console.log(`[herm] catalog:   ${herm.catalogHandleUrl}`);
    console.log(`[herm] oracle:    ${herm.oracleDocUrl}`);
    console.log(`[herm] daemon:    ${herm.daemon.daemonHandle.url}`);
    console.log(`[herm] FLOW-map read-face: GET /oracle/pointer · /oracle/<cid>.bin`);
    console.log(`[herm] ws:        ws://localhost:${port}/ws`);

    // Co-located UDS verb-channel for the local `lares` CLI (the @daemon answers).
    const hermSocketPath = join(storageDir, "lares.sock");
    const hermUds = startUdsChannel({
      daemonHandle: herm.daemon.daemonHandle,
      socketPath:   hermSocketPath,
      onLog: (line) => console.log(`[herm] ${line}`),
    });

    let hermShuttingDown = false;
    const hermShutdown = async (sig: string): Promise<void> => {
      if (hermShuttingDown) return;
      hermShuttingDown = true;
      console.log(`[herm] ${sig} — graceful shutdown`);
      try {
        hermUds.close();
        httpServer.close();
        await herm.dispose();          // read-face + daemon island flush, then the composed vessel
        await herm.repo.flush();
        console.log("[herm] shutdown complete — state flushed durably");
      } catch (e) {
        console.error("[herm] shutdown error:", e instanceof Error ? e.message : String(e));
      } finally {
        process.exit(0);
      }
    };
    process.on("SIGINT",  () => void hermShutdown("SIGINT"));
    process.on("SIGTERM", () => void hermShutdown("SIGTERM"));
    return;
  }

  const result = await openNodeVessel({
    hostId:     "lararium-node",
    wikiId,
    storageDir,
    genesisDir,
    rootDir,
    wss,
    catalogUrl,
    onPhase: (phase) => {
      console.log(`[lararium] phase → ${phase}`);
    },
  });
  if (result.activeWikiSource === "daemon-marker" && result.activeWikiId !== wikiId) {
    console.log(`[lararium] active wiki marker: ${wikiId} → ${result.activeWikiId}`);
  }
  console.log(`[lararium] live — wiki: ${result.activeWikiId} | storage: ${storageDir} | root: ${rootDir}`);
  console.log(`[lararium] catalog:  ${result.catalogHandleUrl ?? "(none)"}`);
  console.log(`[lararium] oracle:   ${result.oracleDocUrl ?? "(none)"}`);
  console.log(`[lararium] lararium: ${result.larariumDocUrl ?? "(none)"}`);
  console.log(`[lararium] daemon:   ${result.daemon.daemonHandle.url}`);
  console.log(`[lararium] ws:       ws://localhost:${port}/ws#${result.oracleDocUrl ?? result.catalogHandleUrl ?? ""}`);

  // The @oracle read-only PUBLIC substrate (the Two-Faced Substrate's content-addressed
  // floor) — served over THIS http server: GET /oracle/pointer · /oracle/<cid>.bin.
  // Write-refusing by construction (GET-only, hash-named, no sync). Best-effort: a
  // read-face failure logs and never crashes boot. lar:///…/lararium-identity#the-oracle-plane.
  let oracleReadFace: { dispose: () => void } | null = null;
  if (result.oracleDocUrl) {
    try {
      const oracleHandle = await result.repo.find(result.oracleDocUrl as AutomergeUrl);
      const signerSeed   = await loadVesselSigningSeed(storageDir);
      oracleReadFace = await mountOracleReadFace({
        httpServer, oracleHandle, signerSeed, storageDir,
        onLog: (line) => console.log(`[lararium] ${line}`),
      });
      console.log(`[lararium] oracle read-face: GET /oracle/pointer · /oracle/<cid>.bin`);
    } catch (e) {
      console.log(`[lararium] oracle read-face skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Co-located fast path: a Unix-domain verb-channel for the local `lares` CLI —
  // no per-command leaf replica / WS handshake. The WS relay above stays the path
  // for remote mesh peers. (lar:///…/api/lares-lararium-binding)
  const socketPath = join(storageDir, "lares.sock");
  const uds = startUdsChannel({
    daemonHandle: result.daemon.daemonHandle,
    socketPath,
    onLog: (line) => console.log(`[lararium] ${line}`),
  });

  // Pre-warm the mempalace read sidecar so the FIRST recall / recall-into-wake skips
  // the ~8s cold chromadb start (the pool then stays warm for the daemon's life).
  // Background + best-effort: never blocks boot, never fails it if mempalace is absent.
  void getMempalaceClient().then(
    () => console.log("[lararium] mempalace sidecar pre-warmed"),
    (e) => console.log(`[lararium] mempalace pre-warm skipped: ${e instanceof Error ? e.message : String(e)}`),
  );

  // ── Graceful, DURABLE shutdown (flush-then-force) ────────────────────────────
  // A bare process.exit() (or a SIGKILL escalation when the handler is too slow)
  // while an island is writing DESYNCS the actively-written doc — the recurring
  // "@working never arrived over syncPort" gap. The reliable path:
  //   1. stop new inbound work (uds + http + read-face),
  //   2. flush the MAIN replica FIRST — the guaranteed durable floor for every doc
  //      that has already synced (this completes before any force-exit),
  //   3. tear down the wiki islands (disposeAll → each island flushes its OWN
  //      partition, incl. @working, before it acks),
  //   4. tear down the daemon island gracefully (it flushes its docs + capture WAL),
  //   5. flush MAIN again to capture anything that synced during teardown.
  // A hard budget guards the whole sequence: if a worker is jammed in keyhive WASM
  // and never acks, the force-timer fires — but ONLY after step 2 has already made
  // the synced state durable (flush-then-force, never force-before-flush).
  //
  // The budget MUST beat the incumbent-stopper's grace window: `lares reconcile`
  // (port-control.stopIncumbent) sends SIGTERM, polls for ~8s, then SIGKILLs. So
  // the whole graceful sequence has to FLUSH AND EXIT under 8s, else the SIGKILL we
  // are trying to avoid lands anyway. Default 6s leaves margin; the per-island
  // handshakes resolve in <1s when responsive, and the force-timer caps a jam.
  const SHUTDOWN_BUDGET_MS  = Number(process.env["LAR_SHUTDOWN_BUDGET_MS"] ?? 6_000);
  const DAEMON_SHUTDOWN_MS  = Math.max(1_000, Math.floor(SHUTDOWN_BUDGET_MS / 2));
  let shuttingDown = false;
  const shutdown = async (sig: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[lararium] ${sig} — graceful shutdown (durable flush, budget ${SHUTDOWN_BUDGET_MS}ms)`);
    const force = setTimeout(() => {
      console.error("[lararium] shutdown budget exceeded — forcing exit (main replica already flushed)");
      process.exit(0);
    }, SHUTDOWN_BUDGET_MS);
    force.unref?.();
    try {
      oracleReadFace?.dispose();
      uds.close();
      httpServer.close();
      await result.repo.flush();                       // floor: durable NOW, before any worker handshake
      await result.pool.disposeAll();                  // wiki islands flush their partitions + ack
      await result.daemon.shutdown(DAEMON_SHUTDOWN_MS); // daemon island flushes docs + capture, then acks
      await result.repo.flush();                       // catch what synced during teardown
      console.log("[lararium] shutdown complete — state flushed durably");
    } catch (e) {
      console.error("[lararium] shutdown flush error:", e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(force);
      process.exit(0);
    }
  };
  process.on("SIGINT",  () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

/**
 * Serde-skew detector — a dependency bump (keyhive / automerge / beelay / TW5) can
 * leave the on-disk genesis engine serialized in a format the new deserializer cannot
 * read; the vessel-host then faults with a Rust enum-tag error. Rather than a bare
 * boot-loop `fatal:`, name the condition and point at the identity-safe cure.
 */
function isSerdeSkewFault(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /tag for enum is not valid|manifest handler threw|\[vessel-host\] fault/i.test(msg);
}

main().catch((err) => {
  if (isSerdeSkewFault(err)) {
    console.error("[lararium] STORED-BYTES SERDE SKEW — the vessel could not deserialize the stored genesis engine.");
    console.error("[lararium]   Cause: stored bytes predate a dependency bump (keyhive / automerge / beelay / TW5).");
    console.error("[lararium]   Cure (identity-safe, no data loss): run `lares rebuild`");
    console.error("[lararium]         — rebuilds the genesis engine under current deps; your operator key/card are untouched.");
    console.error("[lararium]   underlying:", err instanceof Error ? err.message : String(err));
    process.exit(75);  // EX_TEMPFAIL — recoverable, distinct from a generic fatal(1)
  }
  console.error("[lararium] fatal:", err);
  process.exit(1);
});
