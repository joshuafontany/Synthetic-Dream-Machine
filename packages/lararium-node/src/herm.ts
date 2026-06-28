/**
 * herm — the Lares Viales / Herm: a minimal wayfarer composed UP from its caps (never a Lararium
 * with skips). It SERVES its public FLOW-map (the read-face, membrane at the wire) and CARRIES by
 * relaying the FLOW-map: it pulls peers' FLOW-maps, merges them into its own, and re-serves the
 * union — a public-map gossip node. Blind to sovereign content by construction (it only ever holds
 * public FLOW records). A peer down is no error — feed-or-fade (the `ea`/lease decay).
 *
 * This is the FLOW-map carriage half. The deeper blind WS-sync of SEALED content rides a separate
 * cut. Built up from the read-scope (mesh-palace.hermCanRead) + HERM_CAPS.
 *
 * Canon: lar:///ha.ka.ba/@lararium/mesh/vessel-caps#lares-viales
 */

import type { Server } from "node:http";
import type { DocHandle } from "@automerge/automerge-repo";
import { pullAndVerifyOracle, type MeshPalaceDoc, type LarTiddlerRecord } from "@lararium/mesh";
import { mountFlowMapReadFace } from "./oracle-read-face.js";

export interface HermConfig {
  readonly httpServer:       Server;
  /** The Herm's own ephemeral mesh-palace doc — the public FLOW-map it carries (no sovereign bags). */
  readonly meshPalaceHandle: DocHandle<MeshPalaceDoc>;
  readonly signerSeed:       Uint8Array;
  readonly storageDir:       string;
  /** Peer base URLs whose FLOW-maps this Herm pulls + merges (carry-by-aggregate). */
  readonly peers:            readonly string[];
  /** Pull cadence (ms); default 30s — the leyline's feed-or-fade pulse. */
  readonly pullIntervalMs?:  number;
  readonly onLog?:           (line: string) => void;
}

export interface Herm {
  /** Pull every peer once now, merging their FLOW-maps. Returns the count of records merged. */
  readonly pullOnce: () => Promise<number>;
  readonly dispose:  () => void;
}

/** Stand a Herm: serve its public FLOW-map + carry by pulling/merging peers' FLOW-maps. */
export async function createHerm(cfg: HermConfig): Promise<Herm> {
  const face = await mountFlowMapReadFace({
    httpServer:       cfg.httpServer,
    meshPalaceHandle: cfg.meshPalaceHandle,
    signerSeed:       cfg.signerSeed,
    storageDir:       cfg.storageDir,
    ...(cfg.onLog ? { onLog: cfg.onLog } : {}),
  });

  async function pullOnce(): Promise<number> {
    let merged = 0;
    for (const peer of cfg.peers) {
      let verdict;
      try { verdict = await pullAndVerifyOracle<MeshPalaceDoc>(peer, { nowMs: Date.now() }); }
      catch { continue; } // a peer down/unreachable is no error — feed-or-fade
      if (!verdict.ok || !verdict.doc) continue;
      const incoming = verdict.doc.tiddlers;
      const titles = Object.keys(incoming);
      if (titles.length === 0) continue;
      cfg.meshPalaceHandle.change((d) => {
        for (const title of titles) {
          // cross-doc copy → clone to plain values (Automerge refuses a value linked in another doc)
          d.tiddlers[title] = JSON.parse(JSON.stringify(incoming[title])) as LarTiddlerRecord;
        }
      });
      merged += titles.length;
      cfg.onLog?.(`herm: merged ${titles.length} FLOW records from ${peer}`);
    }
    return merged;
  }

  const timer = setInterval(() => { void pullOnce(); }, cfg.pullIntervalMs ?? 30_000);
  timer.unref();
  await pullOnce(); // carry the peers' maps from the first breath

  return {
    pullOnce,
    dispose: () => { clearInterval(timer); face.dispose(); },
  };
}
