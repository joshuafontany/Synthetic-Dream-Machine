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
}

export interface LaresTw5Extension {
  lares?: Partial<LaresNaluAPI> & Record<string, unknown>;
}
