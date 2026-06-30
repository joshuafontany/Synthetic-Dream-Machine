/**
 * worldline-causal — the worldline's CAUSAL partial-order, an in-memory ITC registry keyed
 * on the lineage HANDLE. SEPARATE from the rhythmic clocks (worldline-clock.ts) by the
 * PATH-B cut: causal rides ITC / the edge-DAG, the FfzClock stays purely rhythmic.
 *
 * Happened-before projects from the spawn/inject/handback structure, so the order is
 * concurrent-capable: siblings of one spawn with no join between them read "concurrent"
 * (agent-worldline #time, #attribution). Keyed turn-DAG (the operator's C-cut) — handles
 * survive rewind/fork because the turn-DAG node does.
 *
 * NOTE — the edge-DAG home LANDED (slice-2): the same spawn/inject/handback now persist as
 * mempalace-KG triples (prov:Delegation + prov:Communication via kg_add / `kg_io.py`), and
 * kapae (rewind) closes them via kg_invalidate (valid_to set, never deleted). This in-memory
 * ITC registry stays the live causal READ; the persisted edge-DAG is the durable home, and the
 * ITC verdict re-projects from those triples via worldline-trajectory's worldlineCausalFromEdges.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time
 */

import { itcSeed, itcFork, itcEvent, itcJoin, itcCompare, type ItcStamp, type ItcOrder } from "./itc.js";

/**
 * The worldline's CAUSAL partial-order carrier — one ITC stamp per handle. Concurrent-capable:
 * the happened-before projects from the spawn/inject/handback structure (the PATH-B cut keeps
 * this OFF the rhythmic FfzClock).
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
