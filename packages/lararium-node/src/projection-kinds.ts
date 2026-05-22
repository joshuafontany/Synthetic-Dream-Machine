/**
 * Node-scoped projection kinds.
 *
 * Each builder closes over platform-bound deps (filesystem roots, TW5 render
 * functions) and returns a LarProjectionKind that the registry can call.
 *
 * Browser vessels register a different set of builders (e.g. OPFS export, IDB
 * mirror) — the registry shape stays identical.
 */

import type {
  LarProjectionKind, ReadinessMap,
} from "@lararium/mesh";
import type { TW5Engine } from "@lararium/tw5";
import { LarDiskProjector } from "./disk-projector.js";
import type { BagMirrorConfig } from "./bag-paths.js";

export interface DiskKindDeps {
  /** Bag mirrors — one entry per writable bag that should reflect to disk. */
  mirrors: readonly BagMirrorConfig[];
  /** Render a tiddler URI to its disk text. Closes over the TW5 engine. */
  renderFn: (tiddlerUri: string) => Promise<string | null>;
  /**
   * The TW5 engine whose wiki change events drive disk projection.
   * Architecture law: only IslandAdaptor subscribes to Automerge stores;
   * the disk projector subscribes to TW5 wiki events here.
   */
  tw5: TW5Engine;
  /** Optional readiness map — first flush lights `disk-projector`. */
  readinessMap?: ReadinessMap;
  /** Optional debounce override (ms). */
  debounceMs?: number;
  /** Write .json sidecar next to each .md for peek debugging. */
  debugJson?: boolean;
}

/**
 * Build a `disk` projection kind bound to a TW5 render function.
 *
 * The mirror set determines which bags reach disk. Bags absent from the set
 * (typically operator-private — identities, groups, sessions, admin) never
 * write to disk; they live solely in `.lararium/` Automerge storage.
 */
export function makeDiskProjectionKind(deps: DiskKindDeps): LarProjectionKind {
  return async (_config, _vessel) => {
    const projector = new LarDiskProjector(
      deps.mirrors,
      deps.renderFn,
      deps.debounceMs ?? 1000,
      deps.readinessMap,
      deps.debugJson ?? false,
    );
    const stop = projector.start(deps.tw5);
    return { stop };
  };
}
