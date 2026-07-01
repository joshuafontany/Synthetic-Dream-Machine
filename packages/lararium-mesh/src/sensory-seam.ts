/**
 * sensory-seam — the GENERIC child-clasp, generalizing who-sensory-seam to any mesh child
 * sensorium. One pattern, instantiated three ways (who · authority · flow): a child turns its
 * events into the sensorium's frames via a modality-specific signal (+ optional content) map;
 * corroboration + the two-signal immune read are already target-parameterized (immune-read /
 * who-sensory-seam), so they compose unchanged.
 *
 * Each child's SIGNAL is its own domain's numerics — the bands + coupling planes read them, and
 * `mesh-coupling` couples the three streams (phantom-guarded). Content (a name) rides the
 * content-embed plane when the event carries one.
 *
 * Platform-blind: rides ./stream-adapter (their contract) + ./immune-read + ./mesh-coupling.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/who
 */

import type { StreamAdapter, StreamFrame } from "./stream-adapter.js";
import { immuneReadPattern, type SignalPattern, type ImmuneDials, type ImmuneResponse } from "./immune-read.js";
import { type MeshCoupling } from "./mesh-coupling.js";
import { neighborCorroborates } from "./who-sensory-seam.js";

/** The minimal shape any child sensorium's event carries (a per-stream ordering key; no global now). */
export interface SensedEvent {
  readonly kind: string;
  readonly subject: string;
  readonly seq: number;
}

/**
 * The GENERIC child StreamAdapter — turns a child's events into frames via `toSignal` (its
 * domain's numerics → bands + coupling) and optional `toContent` (a name → the content plane).
 * Every mesh child is one call: only its modality tag + its two maps differ.
 */
export function childStreamAdapter<E extends SensedEvent>(
  modality: string,
  toSignal: (e: E) => number[],
  toContent?: (e: E) => string | undefined,
  mode: "live" | "batch" = "live",
): StreamAdapter<readonly E[]> {
  return {
    modality, mode,
    ingest(events: readonly E[]): StreamFrame[] {
      return events.map((e): StreamFrame => {
        const base: StreamFrame = { seq: e.seq, signal: toSignal(e) };
        const c = toContent?.(e);
        return c !== undefined ? { ...base, content: c } : base;
      });
    },
  };
}

/**
 * The GENERIC child immune read — the two-signal danger-model for any child: Signal-1 (the actor's
 * threat-pattern) AND Signal-2 (a neighbor's R-coupling INTO this child, from the phantom-guarded
 * mesh-coupling). Anergize only when both fire. `target` is the child's name in the coupling.
 */
export function childImmuneRead(
  pattern: SignalPattern,
  coupling: MeshCoupling,
  dials: ImmuneDials,
  corroborateThreshold: number,
  target: string,
): ImmuneResponse {
  return immuneReadPattern(pattern, neighborCorroborates(coupling, corroborateThreshold, target), dials);
}

// ── AUTHORITY child — the capability sense (caps · delegation · epoch) ────────────────────────

export interface AuthorityEvent extends SensedEvent {
  readonly kind: "grant" | "revoke" | "delegate" | "admit" | "evict";
  readonly capCount?: number;        // caps held by the subject after this event
  readonly delegationDepth?: number; // how deep the delegation chain runs
  readonly holder?: string;          // presence content — the cap-holder's handle, when named
}

/** The AUTHORITY child adapter — signal = [capCount, delegationDepth]; content = the holder's handle. */
export function authorityStreamAdapter(): StreamAdapter<readonly AuthorityEvent[]> {
  return childStreamAdapter<AuthorityEvent>(
    "authority",
    (e) => [e.capCount ?? 0, e.delegationDepth ?? 0],
    (e) => e.holder,
  );
}

// ── FLOW child — the liveness sense (lease · sync · relay · partition) ────────────────────────

export interface FlowEvent extends SensedEvent {
  readonly kind: "lease" | "sync" | "relay" | "dial" | "partition";
  readonly leaseEpoch?: number;      // the resource's lease epoch (liveness heartbeat)
  readonly inFlight?: number;        // messages/syncs in flight
  readonly rate?: number;            // throughput in the window
}

/** The FLOW child adapter — signal = [leaseEpoch, inFlight, rate] (pure numerics; no content). */
export function flowStreamAdapter(): StreamAdapter<readonly FlowEvent[]> {
  return childStreamAdapter<FlowEvent>(
    "flow",
    (e) => [e.leaseEpoch ?? 0, e.inFlight ?? 0, e.rate ?? 0],
  );
}
