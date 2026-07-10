/**
 * openDaemonVm — node host wrapper over the shared daemon-VM core.
 *
 * The lifecycle lives in @lararium/tw5 `openDaemonVmCore` — ONE core both
 * vessels compose. This file supplies the node platform pieces:
 *   - spawnWorker  : worker_threads Worker (.on / .postMessage)
 *   - newSyncChannel: worker_threads MessageChannel
 *   - daemonHandle  : waitHandleLocal (merge-on-late-arrival strategy)
 *   - recipe       : built here from libraryBags; storage = nodefs dir
 *
 * Node-ahead capability proxies (authSeam verify-proxy, resolveBinding) compose
 * on top via a second listener on the core's exposed worker handle — they are
 * node-only surface the browser has not built yet, not duplication.
 *
 * Boot ordering: `workerEa` resolves only after the daemon island sends `ea`.
 * `openNodeVessel` awaits it before emitting `"live"`.
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/open-daemon-vm
 */

import { join }                                          from "path";
import {
  type Repo, type AutomergeUrl, type LarDoc,
  type WikiRecipe,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openDaemonVmCore,
  type DaemonVmHost,
  type DaemonVmCore,
} from "@lararium/tw5";
import { resolveBootDoc } from "./repo-helpers.js";
import { nodeNewSyncChannel, nodeSpawnWorker } from "./worker-handle.js";

const DEFAULT_ADMIN_WORKER_URL = new URL("./node-daemon-island.js", import.meta.url);

export interface DaemonVmOptions {
  repo:              Repo;
  daemonUrl:          string;
  /** @persona (PersonaGroup veiled-identity) doc URL — resolved alongside the daemon doc. */
  personaUrl:         string;
  /**
   * SHA-256 hex (the CID) of the TW5 core blob — the daemon island pulls the engine
   * bytes by this CID from the local CAS (the CID plane).
   */
  coreHash:          string | null;
  /** The engine's plugin-tiddler CIDs — the daemon island pulls them by CID from the local
   *  CAS (the breath path), never CRDT-syncing the bytes over the port. */
  pluginCids?:       readonly string[];
  /** Typed structural capabilities: @lararium engine, @daemon bag, @lares,
   *  @catalog access. Library bags resolve island-side from @catalog. */
  grants:            IslandGrants;
  /** Optional canon bag URIs for the daemon recipe. Empty by default. */
  libraryBags?:        readonly string[];
  /**
   * Operator authn/z material delivered to the daemon island so it boots keyhive
   * in-worker (Stage 1). Seed + sentinel hexes + the bags to register. The seed
   * crossing the worker boundary is the deliberate custody boundary.
   */
  daemonAuth?:        IslandMsg_Manifest["daemonAuth"];
  /** Optional storage dir for the daemon island's NodeFS Repo. */
  storageDir?:       string;
  /**
   * Optional telemetry SINK config. The @daemon ALWAYS carries the capture cap (idempotent);
   * passing this rides it to the daemon island as workerData, wiring the cap LIVE (the node sink:
   * `mine --source ndjson` + fs-WAL + the self-regulating two-loop). Absent → the cap stays inert.
   */
  telemetry?: {
    readonly palacePath: string;
    readonly spoolDir: string;
    readonly walPath: string;
    readonly quarantinePath: string;
    /** The DURABLE .structurepalace dir (the memory-ast-unfolding bridge — local, never federates). */
    readonly structurePalaceDir?: string;
    /** The DURABLE .formpalace dir (the living-grammar FORM-vector store — local, never federates). */
    readonly formPalaceDir?: string;
    /** Caller-vector routing: verbatim content → the SOVEREIGN contentpalace (not the guest mine). */
    readonly callerVector?: { readonly contentDir: string; readonly structured?: boolean };
    readonly mempalaceBin?: string;
    readonly tickMs?: number;
    readonly targetLatencyMs?: number;
    readonly holdingCostPerMs?: number;
  };
  /** Override the daemon island script URL (tests). */
  workerScriptUrl?:  URL;
}

export async function openDaemonVm(opts: DaemonVmOptions): Promise<DaemonVmCore> {
  const { repo, daemonUrl, personaUrl, coreHash, pluginCids, grants, libraryBags, daemonAuth, storageDir, telemetry, workerScriptUrl } = opts;

  // ── Daemon doc handle (node strategy: merge-on-late-arrival) ────────────────
  const daemonHandle = await resolveBootDoc<LarDoc>(
    repo, daemonUrl as AutomergeUrl,
    { tideline: "hearth-private", label: "@daemon" },
  );
  // ── Persona doc handle (same strategy) — the one VM tends both bags ──────────
  const personaHandle = await resolveBootDoc<LarDoc>(
    repo, personaUrl as AutomergeUrl,
    { tideline: "hearth-private", label: "@persona" },
  );

  // The daemon holds NO standing system-bag mount: it reaches a deep target bag
  // by ACCESS per residency action (ephemeral mount, released after — the
  // edit/action split, wiki-layer-ontology#write-law). The daemon's own composite
  // stays its recipe alone — it mounts no standing write facet.
  const recipe: WikiRecipe = {
    wikiSlug: "daemon",
    ...(libraryBags?.length ? { libraryBags } : {}),
  };
  const storage = storageDir
    ? { type: "nodefs" as const, dir: join(storageDir, "daemon") }
    : undefined;

  const host: DaemonVmHost = {
    newSyncChannel: nodeNewSyncChannel,
    // Inject the telemetry SINK as workerData via a closure — the daemon island reads it to wire
    // its standing capture cap LIVE. openDaemonVmCore stays untouched (it calls spawnWorker(url)).
    spawnWorker:    (url) => nodeSpawnWorker(url, telemetry ? { telemetry } : undefined),
  };

  // The wrapper IS the seam — host pieces + recipe/storage + merge-on-arrival daemonHandle;
  // the lifecycle and the whole result surface (DaemonVmCore) live once in the core.
  return openDaemonVmCore(host, {
    repo, daemonHandle, personaHandle, recipe, grants, coreHash,
    ...(pluginCids?.length ? { pluginCids } : {}),
    ...(daemonAuth ? { daemonAuth } : {}),
    ...(storage   ? { storage }   : {}),
    workerScriptUrl: workerScriptUrl ?? DEFAULT_ADMIN_WORKER_URL,
  });
}
