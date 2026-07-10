/**
 * who-sensory-seam — the CLASP where the WHO-plane (agency) meets the WHO sensorium (perception).
 * The two halves of the self, joined on the parallel session's StreamAdapter + sensorium
 * foundations, through THREE message-shapes (the signal-seam contract):
 *
 *   ① EMIT     — WHO-plane events → sensorium frames (whoStreamAdapter). The ladder/immune ops
 *                emit WhoEvents; the sensorium's bands/content planes sense them.
 *   ② CONSUME  — the sensorium's derived quantities → the immune-read's SignalPattern (Signal-1,
 *                the actor's own threat-pattern).
 *   ③ CORROBORATE — the immune-read's Signal-2 (an independent neighbor's flag) IS a mesh-coupling
 *                R-edge INTO who: does authority's or flow's stream INFORM the who-threat above a
 *                threshold? (The insight — the neighbor-signal is the coupling plane —
 *                made literal.)
 *
 * Platform-blind: rides ./stream-adapter (their contract) + ./immune-read + ./mesh-coupling +
 * ./veil-ladder types. NO node: imports.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/who
 */

import type { StreamAdapter, StreamFrame } from "./stream-adapter.js";
import { immuneReadPattern, type SignalPattern, type ImmuneDials, type ImmuneResponse } from "./immune-read.js";
import type { MeshCoupling } from "./mesh-coupling.js";
import type { VeilRung } from "./veil-ladder.js";

// ── ① EMIT — WHO-plane events → sensorium frames ─────────────────────────────────────────────

export type WhoEventKind = "pledge" | "burn" | "rotate" | "flag" | "feed" | "rep";

/** A WHO-plane event — what the ladder/immune ops emit into the WHO sensorium. */
export interface WhoEvent {
  readonly kind: WhoEventKind;
  readonly subject: string;        // the veil/persona key this event concerns
  readonly seq: number;            // per-stream ordering (NO global now — causal-island)
  readonly rep?: number;           // the veil's earned reputation at this event
  readonly rungLevel?: number;     // 0 throwaway · 1 lived · 2 handle (numeric rung)
  readonly linkAge?: number;       // the linkability clock (uses since last refound)
  readonly petname?: string;       // presence content (fed to the content-embed plane)
}

/**
 * The WHO StreamAdapter — turns WHO-plane events into the sensorium's frames. `signal` = the
 * presence numerics [rep, rungLevel, linkAge] (→ bands + coupling planes); `content` = the petname
 * (→ the content-embed presence plane, when named). LIVE — WHO-events arrive over time.
 */
export function whoStreamAdapter(): StreamAdapter<readonly WhoEvent[]> {
  return {
    modality: "who",
    mode: "live",
    ingest(events: readonly WhoEvent[]): StreamFrame[] {
      return events.map((e): StreamFrame => {
        const signal = [e.rep ?? 0, e.rungLevel ?? 0, e.linkAge ?? 0];
        const base: StreamFrame = { seq: e.seq, signal };
        return e.petname !== undefined ? { ...base, content: e.petname } : base;
      });
    },
  };
}

// ── ② CONSUME — sensorium-derived quantities → the immune-read's Signal-1 ────────────────────

/** Build the immune-read's SignalPattern from what the WHO sensorium derives (rate = bands, flags = reactions). */
export function signalPatternFrom(rep: number, rung: VeilRung, recentActionRate: number, flags: number): SignalPattern {
  return { rep, recentActionRate, flags, rung };
}

// ── ③ CORROBORATE — the neighbor-signal (immune Signal-2) IS the mesh-coupling R-edge into who ──

/**
 * Does an INDEPENDENT neighbor sensorium corroborate the threat? — the strongest R-edge FROM
 * another child INTO `target` (default "who"): if authority's or flow's stream INFORMS the
 * who-threat above `threshold`, that is the costimulatory Signal-2. Interior-conditioned (it rides
 * the phantom-guarded mesh-coupling), so a shared driver won't fake corroboration.
 */
export function neighborCorroborates(coupling: MeshCoupling, threshold: number, target = "who"): boolean {
  const ti = coupling.children.indexOf(target);
  if (ti < 0) return false;
  let maxIn = 0;
  for (let k = 0; k < coupling.children.length; k++) {
    if (k === ti) continue;
    maxIn = Math.max(maxIn, coupling.te[k]?.[ti] ?? 0);
  }
  return maxIn >= threshold;
}

/**
 * THE WHO IMMUNE READ — the full two-signal danger-model on the seam: Signal-1 (the actor's own
 * threat-pattern) AND Signal-2 (a neighbor's R-coupling into who). Anergize only when BOTH fire —
 * the autoimmunity guard, now sourced from real perception. Default = tolerate.
 */
export function whoImmuneRead(
  pattern: SignalPattern,
  coupling: MeshCoupling,
  dials: ImmuneDials,
  corroborateThreshold: number,
  target = "who",
): ImmuneResponse {
  return immuneReadPattern(pattern, neighborCorroborates(coupling, corroborateThreshold, target), dials);
}
