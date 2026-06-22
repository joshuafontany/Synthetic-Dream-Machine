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
import { openNodeVessel }               from "./open-node-vessel.js";
import { join } from "path";
import { REPO_ROOT }   from "./node-host.js";


// ---------------------------------------------------------------------------
// CLI / env config
// ---------------------------------------------------------------------------

function parseArgs(): { port: number; storageDir: string; genesisDir: string; wikiId: string; rootDir: string; catalogUrl: string | null } {
  const args = process.argv.slice(2);
  const get  = (flag: string, env: string, fallback: string) => {
    const i = args.indexOf(flag);
    return (i !== -1 ? args[i + 1] : undefined) ?? process.env[env] ?? fallback;
  };
  const rootDir    = resolve(get("--root", "LAR_ROOT", REPO_ROOT));
  const storageDir = resolve(get("--storage", "LAR_STORAGE", join(rootDir, ".lararium")));
  // One genesis law, shared with the CLI env contract: <root>/genesis —
  // the repo root carries the REAL tracked genesis dir (the symlink and the
  // package-dir home both died 2026-06-11; early alpha keeps no compatibility).
  const genesisDir = resolve(get("--genesis", "LAR_GENESIS", join(rootDir, "genesis")));
  return {
    port:       Number(get("--port", "LAR_PORT", "8080")),
    storageDir,
    genesisDir,
    wikiId:     get("--wiki", "LAR_WIKI", "lares"),
    rootDir,
    catalogUrl: process.env["LAR_CATALOG"] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { port, storageDir, genesisDir, wikiId, rootDir, catalogUrl } = parseArgs();

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
  if (result.activeWikiSource === "admin-marker" && result.activeWikiId !== wikiId) {
    console.log(`[lararium] active wiki marker: ${wikiId} → ${result.activeWikiId}`);
  }
  console.log(`[lararium] live — wiki: ${result.activeWikiId} | storage: ${storageDir} | root: ${rootDir}`);
  console.log(`[lararium] catalog:  ${result.catalogHandleUrl ?? "(none)"}`);
  console.log(`[lararium] oracle:   ${result.oracleDocUrl ?? "(none)"}`);
  console.log(`[lararium] lararium: ${result.larariumDocUrl ?? "(none)"}`);
  console.log(`[lararium] admin:    ${result.admin.adminHandle.url}`);
  console.log(`[lararium] ws:       ws://localhost:${port}/ws#${result.oracleDocUrl ?? result.catalogHandleUrl ?? ""}`);

  const shutdown = () => {
    console.log("[lararium] shutting down");
    result.admin.dispose();
    httpServer.close();
    process.exit(0);
  };
  process.on("SIGINT",  shutdown);
  process.on("SIGTERM", shutdown);
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
