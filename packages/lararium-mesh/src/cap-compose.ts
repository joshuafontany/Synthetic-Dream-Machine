/**
 * cap-compose — the composable-keel engine: a vessel = a #has-cap-stack (DECLARE) composed by a
 * transient capability-routing root (WIRE). Declare ⊥ wire, the same seam as INFRA⊥WHO / map⊥territory.
 *
 * The `#has-cap-stack` is an ECS declaration — a flat, dependency-blind set of cap-modules a vessel
 * HAS (what it *is*). It carries no edges (the retired-typed-edge ruling holds). Each cap-MODULE
 * declares the deps IT needs; `composeVessel` reads the stack and topologically WIRES the live
 * components — building each in dependency order, handing it a LEAST-AUTHORITY resolver that reaches
 * only its DECLARED deps (POLA / Genode default-deny / Granovetter "only connectivity begets
 * connectivity"). A missing mandatory dep or a cycle = the vessel REFUSES TO BOOT, loud — never a
 * runtime flag. The composer is transient: it builds the graph, then the boot extracts the few
 * entry-points it needs and drops broad authority (the powerbox guard — no god-object retained).
 *
 * So a Herm is not "a node with wiki=false" — it is a cap-stack that never declares the wiki cap, so
 * nothing routes to it: blind by structure, not by flag.
 *
 * Rhymes: ZLayer (provide-the-graph, topological, build-or-fail) · Genode `init` (capability-routing,
 * default-deny) · OSGi-DS (declared cardinality) · the ocap powerbox (transient broad authority).
 * Canon: lar:///ha.ka.ba/lararium/api/composable-keel
 */

/** A capability id — names a cap-module in a vessel's #has-cap-stack. */
export type CapId = string;

/**
 * A cap-module: the ECS tag carries no edges, so the MODULE declares the deps it needs, and BUILDS
 * its component from a least-authority resolution of exactly those deps.
 */
export interface CapModule<P = unknown> {
  readonly id: CapId;
  /** Mandatory deps (cardinality 1..1) — the composer REFUSES to boot if any is absent from the stack. */
  readonly requires?: readonly CapId[];
  /** Optional deps (cardinality 0..1) — resolve to `undefined` when absent from the stack. */
  readonly optional?: readonly CapId[];
  /**
   * Build the component. `resolve(id)` returns the already-built component for a DECLARED dep only —
   * resolving an undeclared id throws (POLA: the module reaches only what it routed). A mandatory dep
   * is guaranteed built (topo order); an absent optional dep resolves `undefined`.
   */
  readonly build: (resolve: <T = unknown>(id: CapId) => T) => P | Promise<P>;
  /** Optional teardown — composed vessels dispose in REVERSE build order. */
  readonly dispose?: (component: P) => void | Promise<void>;
}

/** A composed vessel — the powerbox read-face over the built components + reverse-order teardown. */
export interface ComposedVessel {
  /** Read a built component by cap-id (undefined if the cap was not in the stack). */
  readonly get: <T = unknown>(id: CapId) => T | undefined;
  /** The cap-ids composed, in build (dependency) order. */
  readonly order: readonly CapId[];
  /** Tear down in reverse build order. */
  readonly dispose: () => Promise<void>;
}

/**
 * Compose a vessel from its #has-cap-stack. Topologically wires the cap-modules (build-or-REFUSE on a
 * missing mandatory dep, a duplicate id, or a cycle), building each in dependency order with a
 * POLA-scoped resolver. The transient composer: builds the graph, hands back the read-face, retains
 * no ambient authority of its own.
 */
export async function composeVessel(stack: readonly CapModule[]): Promise<ComposedVessel> {
  // ── index + duplicate guard ──
  const index = new Map<CapId, CapModule>();
  for (const m of stack) {
    if (index.has(m.id)) throw new Error(`[compose] duplicate cap "${m.id}" in the #has-cap-stack`);
    index.set(m.id, m);
  }

  // ── mandatory-presence: a required dep absent from the stack REFUSES the boot (loud, not a flag) ──
  for (const m of stack) {
    for (const dep of m.requires ?? []) {
      if (!index.has(dep)) {
        throw new Error(
          `[compose] vessel refuses to boot: cap "${m.id}" requires "${dep}", absent from the #has-cap-stack`,
        );
      }
    }
  }

  // ── topological order over (requires + present-optional) edges; REFUSE on a cycle ──
  const order: CapId[] = [];
  const state = new Map<CapId, 1 | 2>(); // 1 = visiting (on stack), 2 = settled
  const visit = (id: CapId, path: readonly CapId[]): void => {
    const s = state.get(id);
    if (s === 2) return;
    if (s === 1) throw new Error(`[compose] vessel refuses to boot: dependency cycle ${[...path, id].join(" → ")}`);
    state.set(id, 1);
    const m = index.get(id)!;
    for (const dep of m.requires ?? []) visit(dep, [...path, id]);
    for (const dep of m.optional ?? []) if (index.has(dep)) visit(dep, [...path, id]);
    state.set(id, 2);
    order.push(id);
  };
  for (const m of stack) visit(m.id, []);

  // ── build in dependency order, each with a least-authority (POLA) resolver ──
  const built = new Map<CapId, unknown>();
  const builtOrder: CapId[] = []; // the caps actually built — drives reverse teardown (full OR partial)
  // Best-effort reverse teardown — a per-cap dispose error never blocks the rest (Effect-Scope / ExitStack
  // semantics, distilled from the Effect.Layer evaluation without the dependency).
  const teardown = async (): Promise<void> => {
    for (let i = builtOrder.length - 1; i >= 0; i--) {
      const id = builtOrder[i]!;
      const d = index.get(id)!.dispose;
      if (d) { try { await d(built.get(id)); } catch { /* teardown is best-effort */ } }
    }
  };
  for (const id of order) {
    const m = index.get(id)!;
    const declared = new Set<CapId>([...(m.requires ?? []), ...(m.optional ?? [])]);
    const resolve = <T = unknown>(dep: CapId): T => {
      if (!declared.has(dep)) {
        throw new Error(`[compose] cap "${id}" reached undeclared dep "${dep}" (POLA: declare it in requires/optional)`);
      }
      return built.get(dep) as T; // mandatory: built earlier; absent-optional: undefined
    };
    try {
      built.set(id, await m.build(resolve));
      builtOrder.push(id);
    } catch (err) {
      // a cap's build threw mid-boot → dispose the already-built caps before re-throwing, so a partial
      // boot leaks nothing (the one genuine win the Effect.Layer eval surfaced — Scope cleanup, sans dep).
      await teardown();
      throw err;
    }
  }

  return {
    get: <T = unknown>(id: CapId): T | undefined => built.get(id) as T | undefined,
    order,
    dispose: teardown,
  };
}
