/**
 * island-behaviors — node-specific island behavior wiring.
 *
 * The primary-wiki behavior is isomorphic and lives in @lararium/tw5
 * `makeWikiBehavior` (ACTION verb registry + wiki:place-verb dispatch). This
 * file supplies only the node-held capability that composes IN on boot: disk
 * projection (LarDiskProjector, fs). Browser supplies no onBoot — same behavior,
 * the disk capability simply absent.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/island-behaviors
 */

import type { IslandMsg_Manifest } from "@lararium/mesh";
import { exportMemeText, makeWikiBehavior } from "@lararium/tw5";
import type { IslandBehavior, IslandContext } from "@lararium/tw5";
import { LarDiskProjector } from "./disk-projector.js";
import { namedBagMirror } from "./bag-paths.js";

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
      const projector = new LarDiskProjector(
        mirrors,
        (uri) => { try { return Promise.resolve(exportMemeText(ctx.tw5, uri)); } catch { return Promise.resolve(null); } },
        undefined,
        // Disk-ward refusal → the admin VM (the generic worker.event → placeVerb
        // bridge routes any event whose payload carries `verb`). The admin audits
        // it durably and injects a $:/tags/Alert into the operator's pinned VM.
        (info) => ctx.post({
          schema_version: 1,
          type: "event",
          wikiUri: ctx.wikiUri,
          listenable: "disk-ward:refused",
          payload: { verb: "ward-alert", requestedBy: "disk-ward", bagId: info.bagId, uri: info.uri, reason: info.reason },
        }),
      );
      return projector.start(ctx.tw5);
    },
  });
}
