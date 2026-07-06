/**
 * memetic-wikitext sensorium BUILDERS — the node-side fs intake for the memetic-wikitext corpus:
 * the neither-top compose (a nameless top entity that #has NO fiber caps and TWO PEER sub-sensoria
 * as coupling.children=[formal, informal]) plus each thin content-cap peer.
 *
 * THE READER LIVES IN @lararium/tw5 (memetic-wikitext-sensorium) — platform-blind, runnable in any
 * sovereign-island TW5 VM worker context (node, browser, worker); this file re-surfaces it so node
 * callers keep one import home, and adds ONLY the fs-manifest builders (the rind py mirrors as *_io).
 */

export * from "@lararium/tw5/memetic-wikitext-sensorium";

import { FFZ_ADDRESS_ORDER } from "@lararium/mesh";
import { buildSensoriumManifest, type SensoriumManifest, type SensoriumBands } from "./sensorium.js";

export function defaultSensoriumBands(): SensoriumBands {
  return { grain: "aperture", ladder: FFZ_ADDRESS_ORDER.join(".") };
}

export interface ComposeMemeticWikitextOptions {
  /** the top sensorium's stable graph address. */
  readonly lar: string;
  /** where the FORMAL peer (memes-on-disk) sensorium dir sits (absolute or nested-relative to root). */
  readonly formalDir: string;
  /** where the INFORMAL peer (chat-sessions) sensorium dir sits. */
  readonly informalDir: string;
  /** override the bands base-cap (defaults to the aperture-ladder grain). */
  readonly bands?: SensoriumBands;
  /** override the mint time (tests). */
  readonly created?: string;
}

/**
 * Compose the memetic-wikitext sensorium: a nameless top entity that `#has` NO fiber caps and TWO PEER
 * sub-sensoria as `coupling.children=[formal, informal]` — NEITHER on top. The base-cap coupling plane
 * (read on demand via {@link readKiCorpus}) carries the directed formal↔informal flow. This maps
 * cap-for-cap onto the SHEAF-TRUE sensorium primitive: peers ride the dumb coupling child-edges, the ki
 * rides the base caps, no essence stored at the top.
 */
export function buildMemeticWikitextSensorium(rootDir: string, opts: ComposeMemeticWikitextOptions): SensoriumManifest {
  return buildSensoriumManifest(rootDir, {
    sensorium: "memetic-wikitext",
    lar: opts.lar,
    caps: {},   // the top holds NO byte-storing fiber cap; the peers ARE the corpus, held as coupling children
    bands: opts.bands ?? defaultSensoriumBands(),
    children: [
      { sensorium: "formal", absDir: opts.formalDir },
      { sensorium: "informal", absDir: opts.informalDir },
    ],
    ...(opts.created !== undefined ? { created: opts.created } : {}),
  });
}

/** Build one PEER sub-sensorium (formal or informal) — a thin content-cap sensorium under the corpus. */
export function buildPeerSensorium(
  peerDir: string, peer: "formal" | "informal", lar: string, engine: string, created?: string,
): SensoriumManifest {
  return buildSensoriumManifest(peerDir, {
    sensorium: peer,
    lar,
    caps: { content: { absDir: peerDir, engine } },
    bands: defaultSensoriumBands(),
    ...(created !== undefined ? { created } : {}),
  });
}

