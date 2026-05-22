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
 *   node dist/main.js [--port 8080] [--storage .lararium] [--wiki altar-fire] [--root /alt/root]
 *
 * Environment:
 *   LAR_PORT     — WS server port (default 8080)
 *   LAR_STORAGE  — storage directory (default {root}/.lararium)
 *   LAR_WIKI     — wiki id (default altar-fire)
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
import { makeDiskProjectionKind }        from "./projection-kinds.js";
import { REPO_ROOT }   from "./node-host.js";
import {
  LarProjectionRegistry,
  LARES_DOC_URI, LARARIUM_DOC_URI,
} from "@lararium/mesh";
import type { CompositeStore }               from "@lararium/mesh";
import { exportMemeText }                    from "@lararium/tw5";
import { namedBagPath, wikiBagPath } from "./bag-paths.js";
import type { BagMirrorConfig } from "./bag-paths.js";

const WIKI_ORACLE_PREFIX = "lar:///ha.ka.ba/@lararium/wikis/";

/**
 * Build bag-mirror configs from the named-bag layout.
 *
 * Static bags (lares, lararium) derive their mirror paths from scope alone —
 * no oracle fields needed. Wiki bags are discovered by scanning visible
 * tiddlers for the wiki oracle prefix; each wiki name mirrors under `wikis/@<slug>`.
 */
async function buildBagMirrors(
  composite: CompositeStore,
  rootDir: string,
): Promise<BagMirrorConfig[]> {
  const mirrors: BagMirrorConfig[] = [
    { bagId: LARES_DOC_URI,    mirrorRoot: join(rootDir, "bags/@lares"),    toRelPath: namedBagPath("@lares") },
    { bagId: LARARIUM_DOC_URI, mirrorRoot: join(rootDir, "bags/@lararium"), toRelPath: namedBagPath("@lararium") },
  ];

  // Wiki bags — discovered from well-known oracle URI prefix.
  const allTitles = await composite.listVisible();
  const wikiPath  = wikiBagPath();
  for (const title of allTitles) {
    if (!title.startsWith(WIKI_ORACLE_PREFIX)) continue;
    if (title.includes("/drafts/"))           continue;
    const wikiName = title.slice(WIKI_ORACLE_PREFIX.length);
    if (!wikiName || wikiName.includes("/"))  continue;
    mirrors.push({
      bagId:      title,
      mirrorRoot: join(rootDir, "wikis", `@${wikiName}`),
      toRelPath:  wikiPath,
    });
  }

  console.log(`[lararium] ${mirrors.length} bag-mirror config(s)`);
  return mirrors;
}


// ---------------------------------------------------------------------------
// CLI / env config
// ---------------------------------------------------------------------------

function parseArgs(): { port: number; storageDir: string; genesisDir: string; wikiId: string; rootDir: string; catalogUrl: string | null; debugJson: boolean } {
  const args = process.argv.slice(2);
  const get  = (flag: string, env: string, fallback: string) => {
    const i = args.indexOf(flag);
    return (i !== -1 ? args[i + 1] : undefined) ?? process.env[env] ?? fallback;
  };
  const rootDir    = resolve(get("--root", "LAR_ROOT", REPO_ROOT));
  const storageDir = resolve(get("--storage", "LAR_STORAGE", join(rootDir, ".lararium")));
  const genesisDir = resolve(get("--genesis", "LAR_GENESIS", join(rootDir === REPO_ROOT ? join(REPO_ROOT, "packages", "lararium-node") : rootDir, "genesis")));
  return {
    port:       Number(get("--port", "LAR_PORT", "8080")),
    storageDir,
    genesisDir,
    wikiId:     get("--wiki", "LAR_WIKI", "altar-fire"),
    rootDir,
    catalogUrl: process.env["LAR_CATALOG"] ?? null,
    debugJson:  args.includes("--debug") || process.env["LAR_DEBUG_JSON"] === "1",
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { port, storageDir, genesisDir, wikiId, rootDir, catalogUrl, debugJson } = parseArgs();

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
  const { vessel, tw5 } = result;

  // Projection registry — declarative wiring for system projections.
  // Configs are programmatic here; migrate to admin-wiki tiddlers tagged
  // lar:///ha.ka.ba/tags/lararium-projection once the admin VM lands (S5.6).
  const projections = new LarProjectionRegistry();

  // TODO: ReactionEngine not yet implemented in @lararium/mesh. Re-register
  // the "reaction" kind once it lands; current ReactionGraph maintenance is a
  // no-op here.

  const mirrors = await buildBagMirrors(result.store, rootDir);

  projections.registerKind("disk", makeDiskProjectionKind({
    mirrors,
    tw5,
    renderFn: async (uri) => { try { return exportMemeText(tw5, uri); } catch { return null; } },
    debugJson,
  }));

  await projections.enable({ id: "disk", kind: "disk", enabled: true, fields: {} }, vessel);

  if (result.activeWikiSource === "admin-marker" && result.activeWikiId !== wikiId) {
    console.log(`[lararium] active wiki marker: ${wikiId} → ${result.activeWikiId}`);
  }
  console.log(`[lararium] live — wiki: ${result.activeWikiId} | storage: ${storageDir} | root: ${rootDir}`);
  console.log(`[lararium] catalog:  ${result.catalogHandleUrl ?? "(none)"}`);
  console.log(`[lararium] lararium: ${result.larariumDocUrl ?? "(none)"}`);
  console.log(`[lararium] admin:    ${result.admin.adminHandle.url}`);
  console.log(`[lararium] ws:       ws://localhost:${port}/ws#${result.larariumDocUrl ?? result.catalogHandleUrl ?? ""}`);

  const shutdown = () => {
    console.log("[lararium] shutting down");
    result.admin.dispose();
    httpServer.close();
    process.exit(0);
  };
  process.on("SIGINT",  shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[lararium] fatal:", err);
  process.exit(1);
});
