/**
 * lares-globals — type surface for the `$tw.lares` extension.
 *
 * The nalu-engine TW5 startup module installs `$tw.lares.enqueueNalu` and
 * friends. Other TS code (IslandAdaptor) reads `$tw.lares.isApplyingNalu`
 * as the cross-context echo guard. Shared shape lives here so both sides
 * stay aligned without duplicating inline `declare`s.
 */

import type { LarTiddlerChange } from "@lararium/mesh";

export interface LaresNaluAPI {
  enqueueNalu(change: LarTiddlerChange): void;
  flushNalu(budget?: number): void;
  isApplyingNalu(): boolean;
  naluPending(): number;
  /** Progressive-boot hydration checkpoint. The recipe calls beginHydration() ONCE right after
   *  enqueuing the seed replay — instead of a synchronous unbounded flush — so the seed drains
   *  frame-by-frame on the paced rail. whenSeedDrained() resolves the first time the queue empties
   *  after hydration begins (or at once if none began): the catch-up checkpoint the island awaits
   *  before arming live reactive behavior, so onEa still observes a fully-resident seed. */
  beginHydration(): void;
  whenSeedDrained(): Promise<void>;
  /** The recompose inverse on the VM surface — one carrier whole from its record group. */
  expandMemeRefs(memeUri: string): string | null;
  /** The IN-VM capture annotate (capture-annotate-vm startup): parse + harvest a turn IN-REALM with
   *  the full self-hosted grammar → the lar_* patch (+ lar_ast). The daemon wires this as the engine's
   *  annotate so all ast-parsing runs inside the TW5 engine, never the worker. */
  captureAnnotateVm(turnText: string, sourceFile?: string): Record<string, string | number>;
}

export interface LaresTw5Extension {
  lares?: Partial<LaresNaluAPI> & Record<string, unknown>;
}
