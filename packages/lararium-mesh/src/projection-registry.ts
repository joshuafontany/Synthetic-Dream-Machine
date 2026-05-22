/**
 * LarProjectionRegistry — declarative wiring for system projections.
 *
 * A projection observes the CRDT store and fans changes to a side surface:
 *   - filesystem (LarDiskProjector — node only)
 *   - reaction graph (ReactionEngine — runs everywhere)
 *   - git mirror, S3 export, search index — future kinds
 *
 * The registry keeps a kind→factory table and an id→stop table for running
 * instances. Configs live as tiddlers tagged lar:///ha.ka.ba/tags/lararium-projection in
 * the admin wiki (S5.5+); until that lands, callers pass configs directly.
 *
 * Platform scoping: factories close over platform-specific deps (filesystem
 * roots, render functions) at registration time, so the same registry shape
 * works for node vessels and browser vessels. A browser vessel registers different
 * kinds (e.g. OPFS export) than a node vessel (filesystem write).
 */

import type { LarVessel } from "./lar-vessel.js";

/** TW5 tag that identifies a projection-config tiddler in the admin wiki. */
export const LARARIUM_PROJECTION_TAG = "lar:///ha.ka.ba/tags/lararium-projection";

/**
 * Declarative config for one projection instance.
 *
 * `kind` selects a registered factory; `fields` carry kind-specific settings
 * (e.g. disk projector reads `root`; git projector reads `remote`/`branch`).
 * `enabled` mirrors the future tiddler-driven manifest — the registry skips
 * disabled configs at enable time.
 */
export interface LarProjectionConfig {
  readonly id:      string;
  readonly kind:    string;
  readonly enabled: boolean;
  readonly fields:  Readonly<Record<string, string>>;
}

/**
 * Factory for a projection kind.
 *
 * The factory owns its own attachment style — some projections want
 * MemeProvider's coalesced URI events (vessel.addProjection); others want raw
 * per-change subscription (vessel.store.subscribe). The factory wires whichever
 * fits and returns a `stop` that tears down everything it attached.
 */
export type LarProjectionKind = (
  config: LarProjectionConfig,
  vessel: LarVessel,
) => Promise<{ stop: () => void }>;

export class LarProjectionRegistry {
  private readonly kinds   = new Map<string, LarProjectionKind>();
  private readonly running = new Map<string, () => void>();

  registerKind(kind: string, factory: LarProjectionKind): void {
    if (this.kinds.has(kind)) {
      throw new Error(`[projection] kind already registered: ${kind}`);
    }
    this.kinds.set(kind, factory);
  }

  hasKind(kind: string): boolean { return this.kinds.has(kind); }

  /**
   * Instantiate a projection from config and attach it to the vessel.
   * No-op if id is already running. No-op if config.enabled === false.
   */
  async enable(config: LarProjectionConfig, vessel: LarVessel): Promise<void> {
    if (!config.enabled)            return;
    if (this.running.has(config.id)) return;
    const factory = this.kinds.get(config.kind);
    if (!factory) throw new Error(`[projection] no kind registered: ${config.kind}`);
    const { stop } = await factory(config, vessel);
    this.running.set(config.id, stop);
  }

  /** Tear down a running projection by id. No-op if not running. */
  disable(id: string): void {
    const stop = this.running.get(id);
    if (!stop) return;
    stop();
    this.running.delete(id);
  }

  stopAll(): void {
    for (const stop of this.running.values()) stop();
    this.running.clear();
  }

  runningIds(): string[] { return [...this.running.keys()]; }
}
