/**
 * worldline-causal — the worldline's CAUSAL partial-order, an in-memory ITC registry keyed on
 * (handle × FRONTIER). SEPARATE from the rhythmic clocks (worldline-clock.ts) by the PATH-B cut:
 * causal rides ITC / the edge-DAG, the FfzClock stays purely rhythmic.
 *
 * Happened-before projects from the spawn/inject/handback structure, so the order is
 * concurrent-capable: siblings of one spawn with no join between them read "concurrent"
 * (agent-worldline #time, #attribution). Keyed turn-DAG (the operator's C-cut) — handles
 * survive rewind/fork because the turn-DAG node does.
 *
 * ## The (handle, frontier) address (slice-3)
 *
 * The registry key is `${handle}@${frontier}` — address = handle × FRONTIER, the frontier keyed
 * BY the handle, never smuggled INSIDE it. The handle stays a RIGID designator (baptized-fixed at
 * spawn); the frontier is the MOVING antichain — a short hash of the ITC event heads (the causal
 * history), so it advances on every inject/handback and holds across a bare fork. This fixes the
 * same-session-fork collision: two spawns of one child handle across a rewind carry DIFFERENT
 * re-projected histories → different frontiers → distinct keys, so `worldlineSpawn` no longer
 * throws when a handle re-appears on a rewound-then-re-forked branch. The frontier is DERIVED from
 * the stamp — never authoritative state, so the composite key holds only because causal-order rides
 * a re-derivable projection (else the global-now sneaks back in).
 *
 * NOTE — the edge-DAG home LANDED (slice-2): the same spawn/inject/handback persist as
 * mempalace-KG triples (prov:Delegation + prov:Communication via kg_add / `kg_io.py`), and
 * kapae (rewind) closes them via kg_invalidate (valid_to set, never deleted). This in-memory
 * ITC registry stays the live causal READ; the persisted edge-DAG is the durable home, and the
 * ITC verdict re-projects from those triples via worldline-trajectory's worldlineCausalFromEdges.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time
 */

import { itcSeed, itcFork, itcEvent, itcJoin, itcCompare, type ItcStamp, type ItcOrder, type ItcEvent } from "./itc.js";

/**
 * The worldline's CAUSAL partial-order carrier — one ITC stamp per (handle × frontier). Concurrent-
 * capable: the happened-before projects from the spawn/inject/handback structure (the PATH-B cut keeps
 * this OFF the rhythmic FfzClock). The `stamps` keys are COMPOSITE (`${handle}@${frontier}`); read them
 * through {@link worldlineStampFor} / {@link worldlineHandles}, never by a bare-handle index.
 */
export interface WorldlineCausal {
  readonly stamps: Readonly<Record<string, ItcStamp>>;
}

/** The seam a frontier is appended on — the handle stays rigid, the frontier rides after this mark. */
const FRONTIER_SEP = "@";

/**
 * FNV-1a/32 → 8 hex — a short, stable, dependency-free fingerprint (twin of build-patch's fnv1a8,
 * inlined here so this module — and the pure `@lararium/mesh/worldline` VM subpath it feeds — pulls
 * in NOTHING heavier). NOT cryptographic; it only DISTINGUISHES frontiers deterministically.
 */
function fnv1a8(s: string): string {
  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // FNV prime, keep unsigned
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * The stamp's CAUSAL FRONTIER fingerprint — a short, stable hash of its ITC event heads (the causal
 * history). The MOVING antichain: it advances on every inject/handback and holds across a bare fork
 * (which leaves the event unchanged). Two spawns of one handle across a rewind carry different
 * re-projected histories → different frontiers. Derived, never authoritative (the guard).
 */
export function frontierOf(stamp: ItcStamp): string {
  return fnv1a8(canonEvent(stamp.event));
}

/** Canonical string of an ITC event tree — a deterministic fold (arrays + numbers only, JSON-safe). */
function canonEvent(e: ItcEvent): string {
  return typeof e === "number" ? String(e) : `[${e[0]},${canonEvent(e[1])},${canonEvent(e[2])}]`;
}

/**
 * The composite registry key: address = handle × frontier. Keyed BY the handle (rigid, baptized-
 * fixed), the frontier riding as a suffix over the value's moving history — NOT inside the handle.
 */
export function stampKey(handle: string, stamp: ItcStamp): string {
  return `${handle}${FRONTIER_SEP}${frontierOf(stamp)}`;
}

/**
 * Split a composite key back into its rigid handle (everything before the LAST `@`). A lineage-path
 * handle carries no `@` of its own (dotted form: `run.child`); the frontier suffix always does, so the
 * LAST `@` is the seam. A key with no `@` reads as a bare handle (defensive).
 */
export function handleFromKey(key: string): string {
  const at = key.lastIndexOf(FRONTIER_SEP);
  return at < 0 ? key : key.slice(0, at);
}

/** A resolved registry entry — its composite key + the stamp it holds. */
interface Resolved {
  readonly key: string;
  readonly stamp: ItcStamp;
}

/**
 * Resolve a reference — an EXACT composite key if one is present, else a bare HANDLE → its (latest)
 * live entry (the last-inserted `${handle}@…`, the current frontier of that handle). Returns undefined
 * when neither hits. Insertion order = event order, so "latest" reads the handle's most-advanced
 * frontier — the one an inject/handback/compare means by a bare handle.
 */
function resolveRef(c: WorldlineCausal, ref: string): Resolved | undefined {
  const exact = c.stamps[ref];
  if (exact) return { key: ref, stamp: exact };
  const prefix = ref + FRONTIER_SEP;
  let found: Resolved | undefined;
  for (const key of Object.keys(c.stamps)) {
    if (key.startsWith(prefix)) found = { key, stamp: c.stamps[key]! }; // last wins → latest frontier
  }
  return found;
}

/** Set a stamp under its composite key, dropping a prior key when the frontier MOVED (re-key in place). */
function rekey(stamps: Record<string, ItcStamp>, priorKey: string | null, handle: string, stamp: ItcStamp): void {
  const key = stampKey(handle, stamp);
  if (priorKey !== null && priorKey !== key) delete stamps[priorKey];
  stamps[key] = stamp;
}

/** Seed the causal registry at the root worldline (the E-cut common cause — the operator). */
export function worldlineCausalSeed(rootHandle: string): WorldlineCausal {
  const s = itcSeed();
  return { stamps: { [stampKey(rootHandle, s)]: s } };
}

/**
 * SPAWN (fork) — the parent forks its stamp; the child inherits the shared history, so the
 * parent happened-before the child (the prov:Delegation edge). The parent's pre-spawn acts
 * precede the child; its post-spawn acts read concurrent with the child (the lightcone cut).
 *
 * The collision guard now fires on the COMPOSITE child key, not the bare handle: re-spawning a
 * child handle whose frontier moved (a rewound-then-re-forked branch) succeeds — a distinct
 * (handle, frontier) entry rides alongside the old one (the same-session-fork fix).
 */
export function worldlineSpawn(c: WorldlineCausal, parent: string, child: string): WorldlineCausal {
  const p = resolveRef(c, parent);
  if (!p) throw new Error(`worldlineSpawn: unknown parent handle "${parent}"`);
  const [pNext, cNext] = itcFork(p.stamp);
  const childKey = stampKey(child, cNext);
  if (c.stamps[childKey]) throw new Error(`worldlineSpawn: child "${childKey}" already exists`);
  const stamps = { ...c.stamps };
  rekey(stamps, p.key, parent, pNext); // fork leaves the event unchanged → parent key holds
  stamps[childKey] = cNext;
  return { stamps };
}

/**
 * INJECT (event) — the rhizome's prov:Communication leg. A mid-flight message (operator OR
 * parent reaching a RUNNING spirit) advances the target's history. FULL ticks: EVERY
 * injection is an event (the operator's D-cut — we cannot reliably detect a bearing-change,
 * so full ticks beat a lossy test). Merge-where-messages-land, not only at handback. The event
 * advances → the frontier MOVES → the entry re-keys.
 */
export function worldlineInject(c: WorldlineCausal, target: string): WorldlineCausal {
  const t = resolveRef(c, target);
  if (!t) throw new Error(`worldlineInject: unknown handle "${target}"`);
  const next = itcEvent(t.stamp);
  const stamps = { ...c.stamps };
  rekey(stamps, t.key, handleFromKey(t.key), next);
  return { stamps };
}

/**
 * HANDBACK (join) — the twin-reunion: sum the ids back, max-join the histories, retire the
 * child. After it, the parent is causally AFTER the child's pre-handback history. One merge
 * among many in the rhizome; the sealed-delegation case is just the merge where the only
 * messages were spawn + return. The join advances the parent's event → the parent re-keys; the
 * child dissolves (apoptosis).
 */
export function worldlineHandback(c: WorldlineCausal, parent: string, child: string): WorldlineCausal {
  const p = resolveRef(c, parent);
  const ch = resolveRef(c, child);
  if (!p) throw new Error(`worldlineHandback: unknown parent handle "${parent}"`);
  if (!ch) throw new Error(`worldlineHandback: unknown child handle "${child}"`);
  const joined = itcJoin(p.stamp, ch.stamp);
  const stamps = { ...c.stamps };
  delete stamps[ch.key]; // the child dissolves at handback
  rekey(stamps, p.key, handleFromKey(p.key), joined);
  return { stamps };
}

/**
 * The CAUSAL verdict between two worldlines — concurrent-capable (the read the rhythmic
 * ffzCompare can never give). "before"/"after"/"equal"/"concurrent" off the ITC histories.
 * Each argument reads as a bare handle (→ its latest frontier) or an exact composite key.
 */
export function worldlineCompare(c: WorldlineCausal, a: string, b: string): ItcOrder {
  const sa = resolveRef(c, a);
  const sb = resolveRef(c, b);
  if (!sa) throw new Error(`worldlineCompare: unknown handle "${a}"`);
  if (!sb) throw new Error(`worldlineCompare: unknown handle "${b}"`);
  return itcCompare(sa.stamp, sb.stamp);
}

// ---------------------------------------------------------------------------
// Accessors — read the composite-keyed registry by handle (never a bare index)
// ---------------------------------------------------------------------------

/** The live stamp for a handle (its latest frontier), or undefined when the handle is absent. */
export function worldlineStampFor(c: WorldlineCausal, handle: string): ItcStamp | undefined {
  return resolveRef(c, handle)?.stamp;
}

/** The distinct handles currently live in the registry (frontier stripped, deduped, first-seen order). */
export function worldlineHandles(c: WorldlineCausal): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of Object.keys(c.stamps)) {
    const h = handleFromKey(key);
    if (!seen.has(h)) { seen.add(h); out.push(h); }
  }
  return out;
}

/** Every composite key a handle carries — its concurrent frontiers (>1 only across a same-session fork). */
export function worldlineFrontiersFor(c: WorldlineCausal, handle: string): string[] {
  const prefix = handle + FRONTIER_SEP;
  return Object.keys(c.stamps).filter((k) => k === handle || k.startsWith(prefix));
}
