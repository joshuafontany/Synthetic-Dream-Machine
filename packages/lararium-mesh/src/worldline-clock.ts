/**
 * worldline-clock — per-worldline RHYTHMIC clocks + the lar_ffz address, keyed on the
 * lineage HANDLE, over an agent's LOCAL work-memory. Pure functions; the caller owns
 * persistence and the harness-event reads.
 *
 * LOCALITY (operator ruling, 2026-06-25): an agent/subagent's memories-of-work — handles,
 * edges, clocks — are a LOCAL causal island (the mempalace). They MUST NOT enter the
 * mesh/federation. So this clock rides a LOCAL `WorldlineLog`, never the mesh social
 * `SessionEventLog`.
 *
 * GRAIN (Loom-grounded, 2026-06-25): L0 Pulse = one generation SEGMENT (a `stop_reason` /
 * tool_use round — the OTel span, the finest durably-addressable unit); a content-block is a
 * sub-Pulse OFFSET (an index, not a tick — blocks in one inference share one emission instant).
 * The tick reads the HARNESS transcript's deterministic events, never the rendered grammar
 * (lose the HUD, keep the clock). Address = Theme.Arc.Measure.Beat.Segment[.block],
 * prefix-truncatable. Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock#rhythmic-address
 */

import { ffzTick, ffzZero, type FfzClock, type FfzLevel, type LarTickCounter } from "./ffz-clock.js";
import { itcSeed, itcFork, itcEvent, itcJoin, itcCompare, type ItcStamp, type ItcOrder } from "./itc.js";

/** L1 (Beat) — one grounded operator-agent exchange turn. */
export const BEAT_LEVEL = 1;

/**
 * The Claude-agent FFZ profile (Loom-grounded @ 100+-turn scale; SHAPE grounded, constants
 * SEEDED — calibrate against real transcript histograms). Bounds [L0..L4]:
 * L0 Pulse = one generation SEGMENT ≤64/Beat · L1 Beat = grounded turn ≤512/Measure ·
 * L2 Measure = session ≤64/Arc · L3 Arc = day ≤128/Theme · L4 Theme = epoch (∞).
 */
export const CLAUDE_AGENT_BOUNDS: FfzLevel = [64, 512, 64, 128, Infinity];

/**
 * A LOCAL worldline event — one grounded turn's clock reading for a worldline. Agent
 * work-memory; NEVER federated. Distinct from the mesh social `SessionEvent`.
 */
export interface WorldlineEvent {
  /** actorId on the clock = the worldline HANDLE (never an Automerge actor). */
  readonly clock: FfzClock;
  /** Node-monotonic sequence — orders a handle's events without a global clock. */
  readonly tickCounter: LarTickCounter;
}

/** The LOCAL per-worldline event log — a local causal island, NOT the mesh SessionEventLog. */
export interface WorldlineLog {
  readonly events: Record<string, WorldlineEvent>;
}

/**
 * The current clock for a handle — the latest event it ticked (by the node-monotonic
 * tickCounter), else a fresh zero KEYED ON THE HANDLE (construct-on-first-event).
 */
export function worldlineClockFor(log: WorldlineLog, handle: string, bounds: FfzLevel = CLAUDE_AGENT_BOUNDS): FfzClock {
  let latest: WorldlineEvent | undefined;
  for (const ev of Object.values(log.events)) {
    if (ev.clock.actorId !== handle) continue;
    if (!latest || ev.tickCounter > latest.tickCounter) latest = ev;
  }
  return latest ? latest.clock : ffzZero(handle, bounds);
}

/**
 * Tick L0 (one generation SEGMENT within the current turn — the harness `stop_reason`
 * boundary). Segments and turns are INDEPENDENT events, not a carry chain, so this never
 * carries into L1; a turn exceeding L0's bound flags a re-profile, not a Beat.
 */
export function segmentTick(clock: FfzClock): FfzClock {
  const lv = Array.from(clock.levels) as number[];
  lv[0] = (lv[0] ?? 0) + 1;
  return { ...clock, levels: lv as unknown as FfzLevel };
}

/**
 * Tick L1 (the grounded exchange turn — the operator's acknowledging move, read from the
 * harness) and RESET L0 (a new turn starts at segment 0). Carries L1→L2→… per the bounds.
 */
export function groundingTick(clock: FfzClock): FfzClock {
  const ticked = ffzTick(clock, BEAT_LEVEL); // L1++, carry upward
  const lv = Array.from(ticked.levels) as number[];
  lv[0] = 0; // new turn → segment 0
  return { ...ticked, levels: lv as unknown as FfzLevel };
}

/**
 * A checkpoint boundary — a level at or above Measure (L2) rolled over. The natural point
 * to persist a durable local checkpoint; finer Pulse/Beat ticks need not.
 */
export function isCheckpoint(prev: FfzClock, next: FfzClock): boolean {
  for (let i = 2; i < 5; i++) if (next.levels[i] !== prev.levels[i]) return true;
  return false;
}

/**
 * Serialize a clock as a prefix-truncatable rhythmic ADDRESS, coarse→fine:
 * `Theme.Arc.Measure.Beat.Segment[.block]`. The block is an intra-segment OFFSET (an index,
 * not a clock tick — Loom-grounded). Prefix-valid at every cut (#rhythmic-address).
 */
export function ffzAddress(clock: FfzClock, blockOffset?: number): string {
  const l = clock.levels; // [L0 Segment, L1 Beat, L2 Measure, L3 Arc, L4 Theme]
  const base = `${l[4]}.${l[3]}.${l[2]}.${l[1]}.${l[0]}`; // Theme.Arc.Measure.Beat.Segment
  return blockOffset != null ? `${base}.${blockOffset}` : base;
}

/**
 * Truncate a rhythmic address to a coarser grain by dropping the N finest terms
 * (prefix-truncation = zoom out; Geohash/Plus-Codes). drop=1 drops block-or-Segment.
 * Always keeps at least the Theme term.
 */
export function ffzAddressPrefix(address: string, drop: number): string {
  const parts = address.split(".");
  return parts.slice(0, Math.max(1, parts.length - drop)).join(".");
}

export interface GroundedEvent {
  /** The new local event, for the caller to append to its WorldlineLog. */
  readonly event: WorldlineEvent;
  /** True when this tick crossed a Measure+ rollover — a durable checkpoint (#rhythmic-address). */
  readonly checkpoint: boolean;
}

/**
 * Construct-on-first-event + grounding-tick + build the local event — PURE. The caller appends
 * `event` to its LOCAL WorldlineLog and MAY use `checkpoint` for durable-persist timing.
 */
export function groundWorldlineEvent(
  log: WorldlineLog,
  handle: string,
  tickCounter: LarTickCounter,
  bounds: FfzLevel = CLAUDE_AGENT_BOUNDS,
): GroundedEvent {
  const prev = worldlineClockFor(log, handle, bounds);
  const clock = groundingTick(prev);
  return { event: { clock, tickCounter }, checkpoint: isCheckpoint(prev, clock) };
}

// ---------------------------------------------------------------------------
// The CAUSAL partial-order — rides ITC, keyed turn-DAG (the PATH-B cut)
// ---------------------------------------------------------------------------

/**
 * The worldline's CAUSAL partial-order carrier — one ITC stamp per handle. SEPARATE from
 * the rhythmic clocks above (the PATH-B cut: causal rides ITC, the FfzClock stays purely
 * rhythmic). Happened-before projects from the spawn/inject/handback structure, so the
 * order is concurrent-capable: siblings of one spawn with no join between them read
 * "concurrent" (agent-worldline #time, #attribution). Keyed turn-DAG (the operator's
 * C-cut) — handles survive rewind/fork because the turn-DAG node does.
 *
 * NOTE — the edge-DAG home is deferred. This in-memory ITC registry is the CAUSAL
 * FOUNDATION; slice-2 stamps the same spawn/inject/handback as mempalace-KG triples
 * (prov:Delegation + prov:Communication via kg_add) and wires kapae (rewind) via
 * kg_invalidate. The ITC verdict re-projects from those triples when they land.
 */
export interface WorldlineCausal {
  readonly stamps: Readonly<Record<string, ItcStamp>>;
}

/** Seed the causal registry at the root worldline (the E-cut common cause — the operator). */
export function worldlineCausalSeed(rootHandle: string): WorldlineCausal {
  return { stamps: { [rootHandle]: itcSeed() } };
}

/**
 * SPAWN (fork) — the parent forks its stamp; the child inherits the shared history, so the
 * parent happened-before the child (the prov:Delegation edge). The parent's pre-spawn acts
 * precede the child; its post-spawn acts read concurrent with the child (the lightcone cut).
 */
export function worldlineSpawn(c: WorldlineCausal, parent: string, child: string): WorldlineCausal {
  const ps = c.stamps[parent];
  if (!ps) throw new Error(`worldlineSpawn: unknown parent handle "${parent}"`);
  if (c.stamps[child]) throw new Error(`worldlineSpawn: child handle "${child}" already exists`);
  const [pNext, cNext] = itcFork(ps);
  return { stamps: { ...c.stamps, [parent]: pNext, [child]: cNext } };
}

/**
 * INJECT (event) — the rhizome's prov:Communication leg. A mid-flight message (operator OR
 * parent reaching a RUNNING spirit) advances the target's history. FULL ticks: EVERY
 * injection is an event (the operator's D-cut — we cannot reliably detect a bearing-change,
 * so full ticks beat a lossy test). Merge-where-messages-land, not only at handback.
 */
export function worldlineInject(c: WorldlineCausal, target: string): WorldlineCausal {
  const s = c.stamps[target];
  if (!s) throw new Error(`worldlineInject: unknown handle "${target}"`);
  return { stamps: { ...c.stamps, [target]: itcEvent(s) } };
}

/**
 * HANDBACK (join) — the twin-reunion: sum the ids back, max-join the histories, retire the
 * child. After it, the parent is causally AFTER the child's pre-handback history. One merge
 * among many in the rhizome; the sealed-delegation case is just the merge where the only
 * messages were spawn + return.
 */
export function worldlineHandback(c: WorldlineCausal, parent: string, child: string): WorldlineCausal {
  const ps = c.stamps[parent];
  const cs = c.stamps[child];
  if (!ps) throw new Error(`worldlineHandback: unknown parent handle "${parent}"`);
  if (!cs) throw new Error(`worldlineHandback: unknown child handle "${child}"`);
  const joined = itcJoin(ps, cs);
  const stamps: Record<string, ItcStamp> = { ...c.stamps, [parent]: joined };
  delete stamps[child]; // the child dissolves at handback (apoptosis)
  return { stamps };
}

/**
 * The CAUSAL verdict between two worldlines — concurrent-capable (the read the rhythmic
 * ffzCompare can never give). "before"/"after"/"equal"/"concurrent" off the ITC histories.
 */
export function worldlineCompare(c: WorldlineCausal, a: string, b: string): ItcOrder {
  const sa = c.stamps[a];
  const sb = c.stamps[b];
  if (!sa) throw new Error(`worldlineCompare: unknown handle "${a}"`);
  if (!sb) throw new Error(`worldlineCompare: unknown handle "${b}"`);
  return itcCompare(sa, sb);
}
