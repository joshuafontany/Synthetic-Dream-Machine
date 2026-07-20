/**
 * Lararium Node Vessel — local-first relay + TW5 engine entrypoint.
 *
 * Boots one LarVessel per configured wiki, wires a WebSocket relay for
 * browser vessels to sync through, and attaches a LarDiskProjector so
 * the bags/ tree stays in sync with the Automerge store.
 *
 * Three surfaces mount here, not one:
 *   ws://localhost:{port}/ws     → Automerge sync protocol (browser + remote mesh peers)
 *   {storage}/lares.sock         → UDS verb channel (co-located CLI fast path)
 *   http://localhost:{port}/…    → oracle read-face; federation pulls + verifies through it
 *
 * Usage:
 *   node dist/main.js [--port 8080] [--storage .lararium] [--wiki lares] [--root /alt/root]
 *
 * Environment:
 *   LAR_PORT     — server port (default 8080; docker-compose.yml overrides to 4321)
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
import { deriveMeshSelf } from "./node-caps.js";
import { startUdsChannel }              from "./uds-channel.js";
import { mountOracleReadFace }          from "./oracle-read-face.js";
import { loadVesselSigningSeed, generateOrLoadVesselIdentity } from "./node-vessel-identity.js";
import { getMempalaceClient }           from "@lararium/mempalace";
import { larDataDir }                   from "./vessel-paths.js";
import type { AutomergeUrl }            from "@automerge/automerge-repo";
import { join } from "path";
import { REPO_ROOT }   from "./node-host.js";
import { loadLaresConfig } from "./lares-config.js";


// ---------------------------------------------------------------------------
// CLI / env config
// ---------------------------------------------------------------------------

function parseArgs(): { port: number; storageDir: string; genesisDir: string; wikiId: string; rootDir: string; catalogUrl: string | null; recipe: NodeRecipe } {
  const args = process.argv.slice(2);
  const get  = (flag: string, env: string, fallback: string) => {
    const i = args.indexOf(flag);
    return (i !== -1 ? args[i + 1] : undefined) ?? process.env[env] ?? fallback;
  };
  const cfg        = loadLaresConfig();   // per-@daemon resource overrides (~/.lares/config.json)
  const rootDir    = resolve(get("--root", "LAR_ROOT", REPO_ROOT));   // corpus root (genesis)
  const storageDir = resolve(get("--storage", "LAR_STORAGE", larDataDir()));   // runtime → ~/.lares/.lararium
  // The composable genesis cap: --genesis flag → LAR_GENESIS env → ~/.lares/config.json → repo-relative
  // <rootDir>/genesis. Genesis stays checked-in by default, so a no-config boot lands on the repo's
  // tracked seed exactly as before; an operator sites it under ~ via config.resources.genesis.
  const genesisDir = resolve(get("--genesis", "LAR_GENESIS", cfg.resources?.genesis ?? join(rootDir, "genesis")));
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

  // Mesh standing — derived ONCE for either cap-stack (was duplicated across the herm + lararium
  // branches). Every vessel is a node on the routing chart: LAR_PUBLIC_URL = its REACHABLE http
  // read-face (the self-peering key, advertised in its dial), LAR_PEERS = bootstrap base URLs,
  // LAR_SEED = its dial label (else hash-derived); LAR_RADIUS = its carriage standing r.
  const publicUrl = process.env["LAR_PUBLIC_URL"] ?? `http://localhost:${port}`;
  const peers = (process.env["LAR_PEERS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const seedLabel = process.env["LAR_SEED"];
  const meshSelf = deriveMeshSelf(publicUrl, peers, seedLabel ? { label: seedLabel } : {});

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
  // crash; `lares reconcile` is the verb that stops the incumbent.
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
    const pullMs = process.env["LAR_PULL_MS"];   // carriage cadence — tuning, kept separate from membership
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
      meshSelf,
      ...(pullMs ? { pullIntervalMs: Number.parseInt(pullMs, 10) } : {}),
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
      placeVerb:    (o) => herm.daemon.placeVerb(o),
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

  // A Lararium is also a first-class mesh-node: it carries the FLOW-map (meshpalace+carriage) from the SAME
  // derived meshSelf — a hearth that navigates the mesh, not a destination beside the roads.
  const result = await openNodeVessel({
    hostId:     "lararium-node",
    wikiId,
    storageDir,
    genesisDir,
    rootDir,
    wss,
    catalogUrl,
    meshSelf,
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

  // THE CROSSING, spoken aloud. A leaf's V3 proof commits to the GATE'S key, and the leaf must hold that
  // key OUT-OF-BAND — the challenge carries it on the wire, but trusting it there would let any relay
  // impersonate the gate (the anti-relay guarantee), so the wire copy is not a source. A leaf that never
  // received the key binds its proof to its OWN did, the gate recomputes against its own, and the proof
  // fails closed. That refusal is correct, and it looks exactly like a broken socket: dial, deny, re-dial.
  //
  // The gate arms with this vessel's operator verifying key, so this vessel already HOLDS the one thing a
  // crossing leaf cannot obtain for itself. Printing it turns an unperformable ritual into an instruction.
  // The load is idempotent — the same identity the gate armed with, read back, never a second one.
  const gateIdentity = await generateOrLoadVesselIdentity(storageDir);
  console.log(`[lararium] gate key: ${gateIdentity.verifyingKey}`);
  console.log("[lararium] browser crossing:");
  console.log(`[lararium]   http://localhost:5173/?relay=ws://localhost:${port}/ws&gate=${gateIdentity.verifyingKey}`);
  console.log("[lararium]   (a leaf still needs an ADMIT — `lares device-admit --joinee-key <the leaf's key>`)");

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
    placeVerb:    (o) => result.daemon.placeVerb(o),
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
  // Match the SYMPTOM (a Rust deserializer error), never the wrapper: matching any
  // `[vessel-host] fault` / `manifest handler threw` painted every island fault
  // (e.g. a slot-sync timeout) with the "run lares rebuild" cure — a wrong cure
  // banner that costs real diagnosis time.
  return /tag for enum is not valid|failed to deserialize|invalid type:|serde/i.test(msg);
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
