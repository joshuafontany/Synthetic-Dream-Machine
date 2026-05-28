/**
 * BrowserVesselIslandPool — browser pool for wiki island authorities.
 *
 * Island Sovereignty Law — vessel side:
 *   1. Spawns a dedicated Web Worker per wiki island.
 *   2. Creates a MessageChannel. Keeps mainPort; transfers syncPort to the island.
 *   3. Optionally wires mainPort to the vessel Repo via MessageChannelNetworkAdapter
 *      so the island-side Repo syncs the wiki doc automatically.
 *   4. Delivers manifest with syncPort, bagBindings, coreHash.
 *      TW5 core bytes travel via CRDT — no blob bytes in the manifest.
 *   5. Awaits ea — island declares sovereignty; island is live.
 *
 * API mirrors VesselIslandPool (Node): mountWiki / unmountWiki / disposeAll.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-vessel-island-pool
 */

import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import {
  isIslandToVesselMsg,
  mkManifest,
  mkTeardown,
} from "@lararium/mesh";
import type {
  IslandMsg_Ea,
  IslandMsg_TeardownAck,
  IslandMsg_Event,
  IslandToVesselMsg,
  BrowserWikiMountParams,
} from "@lararium/mesh";

// ── Internal slot ──────────────────────────────────────────────────────────

type SlotPhase = "booting" | "live" | "disposing" | "disposed";

interface BrowserSlot {
  worker:   Worker;
  mainPort: MessagePort;
  phase:    SlotPhase;
}

// ── Handshake ──────────────────────────────────────────────────────────────

const HANDSHAKE_TIMEOUT_MS = 10_000;

function _awaitMsg<T extends { type: string }>(
  worker: Worker,
  type:   string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[browser-vessel-island-pool] timeout waiting for ${type}`)),
      HANDSHAKE_TIMEOUT_MS,
    );
    const onMsg = (e: MessageEvent) => {
      if (!isIslandToVesselMsg(e.data) || e.data.type !== type) return;
      clearTimeout(timer);
      worker.removeEventListener("message", onMsg);
      resolve(e.data as T);
    };
    worker.addEventListener("message", onMsg);
  });
}

// ── BrowserVesselIslandPool ────────────────────────────────────────────────

export interface BrowserVesselIslandPoolOptions {
  /** URL of the compiled browser-wiki-worker entry script. */
  workerScriptUrl: URL;
  /**
   * Optional vessel Automerge Repo. When provided, each island's mainPort wires
   * to this Repo via MessageChannelNetworkAdapter so the island syncs automatically.
   */
  mainRepo?: Repo;
  /** Called when an island emits a verse-event reaction. */
  onWorkerEvent?: (id: string, msg: IslandMsg_Event) => void;
}

export class BrowserVesselIslandPool {
  private readonly _slots     = new Map<string, BrowserSlot>();
  private readonly _workerUrl: URL;
  private readonly _mainRepo:  Repo | null;
  private readonly _onEvent:   ((id: string, msg: IslandMsg_Event) => void) | null;

  constructor(opts: BrowserVesselIslandPoolOptions) {
    this._workerUrl = opts.workerScriptUrl;
    this._mainRepo  = opts.mainRepo ?? null;
    this._onEvent   = opts.onWorkerEvent ?? null;
  }

  async mountWiki(id: string, params: BrowserWikiMountParams): Promise<void> {
    if (this._slots.has(id)) return;

    const worker = new Worker(this._workerUrl, { type: "module" });
    worker.addEventListener("error", (e) =>
      console.error(`[browser-vessel-island-pool] island error (${id}):`, e.message),
    );

    const { port1: mainPort, port2: syncPort } = new MessageChannel();

    if (this._mainRepo) {
      this._mainRepo.networkSubsystem.addNetworkAdapter(
        new MessageChannelNetworkAdapter(mainPort),
      );
    }

    const slot: BrowserSlot = { worker, mainPort, phase: "booting" };
    this._slots.set(id, slot);

    worker.addEventListener("message", (e: MessageEvent) => {
      if (!isIslandToVesselMsg(e.data)) return;
      const msg = e.data as IslandToVesselMsg;
      if (msg.type === "event" && this._onEvent) this._onEvent(id, msg as IslandMsg_Event);
      if (msg.type === "fault") {
        console.error(`[browser-vessel-island-pool] island fault (${id}): ${(msg as { error: string }).error}`);
        slot.phase = "disposed";
      }
    });

    const manifestMsg = mkManifest(id, syncPort, params.coreHash, {
      bagBindings: params.bagBindings,
      recipeUri:   params.recipeUri,
      ...(params.pluginTiddlers ? { pluginTiddlers: params.pluginTiddlers } : {}),
    });
    worker.postMessage(manifestMsg, [syncPort]);

    await _awaitMsg<IslandMsg_Ea>(worker, "ea");
    slot.phase = "live";
  }

  async unmountWiki(id: string): Promise<void> {
    const slot = this._slots.get(id);
    if (!slot || slot.phase === "disposed") return;

    slot.phase = "disposing";
    try {
      const ackPromise = _awaitMsg<IslandMsg_TeardownAck>(slot.worker, "teardown:ack");
      slot.worker.postMessage(mkTeardown());
      await ackPromise;
    } catch {
      // teardown timed out — terminate anyway
    }

    slot.mainPort.close();
    slot.worker.terminate();
    slot.phase = "disposed";
    this._slots.delete(id);
  }

  async disposeAll(): Promise<void> {
    await Promise.allSettled([...this._slots.keys()].map((id) => this.unmountWiki(id)));
  }

  has(id: string): boolean {
    const slot = this._slots.get(id);
    return !!slot && slot.phase !== "disposed";
  }

  inspect(): Array<{ id: string; phase: SlotPhase }> {
    return [...this._slots.entries()].map(([id, slot]) => ({ id, phase: slot.phase }));
  }

  get size(): number { return this._slots.size; }
}
