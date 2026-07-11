/**
 * island-behaviors — node-specific island behavior wiring.
 *
 * The primary-wiki behavior is isomorphic and lives in @lararium/tw5
 * `makeWikiBehavior` (ACTION verb registry + wiki:place-verb dispatch). This
 * file supplies only the node-held capability that composes IN on boot: disk
 * projection (LarDiskProjector, fs). Browser supplies no onBoot — same behavior,
 * the disk capability simply absent.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/island-behaviors
 */

import type { IslandMsg_Manifest } from "@lararium/mesh";
import { exportMemeText, makeWikiBehavior, hasWikiSensorium } from "@lararium/tw5";
import type { IslandBehavior, IslandContext } from "@lararium/tw5";
import { LarDiskProjector } from "./disk-projector.js";
import { namedBagMirror } from "./bag-paths.js";
import { SyncedTree } from "./synced-tree.js";
import { larProjectionDir } from "./vessel-paths.js";
import { resolve as resolvePath, join } from "path";

/**
 * Primary wiki island behavior for the node vessel: the shared wiki behavior
 * plus disk write-back as the node-held onBoot capability.
 */
export function makeWikiPrimaryBehavior(manifest: IslandMsg_Manifest): IslandBehavior {
  return makeWikiBehavior({
    onBoot: (ctx: IslandContext): (() => void) | undefined => {
      const mirrorDefs = manifest.diskMirrors;
      if (!mirrorDefs?.length) return undefined;
      const mirrors = mirrorDefs.map(({ bagId, mirrorRoot, scope }) =>
        namedBagMirror(bagId, scope, mirrorRoot),
      );
      // The Synced tree (§6 merge base) sits at the INSTANCE ROOT (the dir
      // holding bags/) under .lararium-projection/ — observation state,
      // never a meme surface, never inside bags/; the ingest gate reads the
      // same file. mirrorRoot shape under the full-path-inside-bag ruling:
      // <root>/bags/<scope> → up two.
      const syncedTree = new SyncedTree(join(larProjectionDir(), "synced-tree.json"));   // runtime → ~/.lares
      const projector = new LarDiskProjector({
        mirrors,
        renderFn: (uri) => { try { return Promise.resolve(exportMemeText(ctx.tw5, uri)); } catch { return Promise.resolve(null); } },
        // Every bag holding a carrier — the shadow-aware stale-unlink gate. A
        // working edit shadowing its canon copy keeps BOTH files; the canon mirror
        // (bags/@slug) never loses its file just because the carrier surfaced in a
        // working layer above it (the boot-seed-deletion cure).
        bagsHolding: (uri) => ctx.composite.listBagsHolding(uri),
        // Disk-ward refusal → the daemon VM (the generic worker.event → placeVerb
        // bridge routes any event whose payload carries `verb`). The daemon audits
        // it durably and injects a $:/tags/Alert into the operator's pinned VM.
        onRefusal: (info) => ctx.post({
          schema_version: 1,
          type: "event",
          wikiUri: ctx.wikiUri,
          listenable: "disk-ward:refused",
          payload: { verb: "ward-alert", requestedBy: "disk-ward", bagId: info.bagId, uri: info.uri, reason: info.reason },
        }),
        syncedTree,
      });
      return projector.start(ctx.tw5);
    },
    // caps = the wiki-sensorium perceiver cap — the wiki island answers the daemon's supervision reads
    // (sensorium:cohere/recall in, SENSORIUM_FRAME back). Platform-blind hull; same cap as browser.
    caps: [hasWikiSensorium()],
  });
}
