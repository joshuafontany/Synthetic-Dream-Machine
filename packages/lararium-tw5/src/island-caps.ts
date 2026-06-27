/**
 * island-caps — the RUNTIME twin of the has-stack law (lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack).
 *
 * has-stack models a DATA entity as nameless: a carrier tiddler whose `tags` are a stack of
 * component memes. This models a RUNTIME entity the same way — a sovereign **causal island** is a
 * nameless entity whose behavior is a STACK OF CAPS. There is no per-worker behavior class; an
 * island IS its cap stack. A wiki island HAS dispatch + projection; a telemetry island HAS capture;
 * the admin island HAS dispatch; any island MAY HAVE a servo. `composeIsland([...caps])` folds the
 * `#has` stack into the one `IslandBehavior` the sovereign kernel drives.
 *
 * Each island breathes like a cell (the metaphor, not the noun): IN = accumulate (the axon —
 * hasCapture / the wiki nalu), OUT = coalesce (the dendrite — hasProjection). Dispatch (hasDispatch)
 * is the third, non-gate channel; self-regulation rides inside the family it tunes. role =
 * capability ≠ platform: a cap injects its substrate seam, never imports it — the same stack
 * composes on node, browser, or any vessel.
 *
 * A cap contributes any of the three lifecycle hooks; composeIsland folds them:
 *   - onEa     — every cap sets up; a returned fn registers as LIFO teardown.
 *   - onSignal — first cap to CLAIM a message wins (returns true); order = stack order.
 *   - onHooAnu — teardown: LIFO cleanups first (awaited), then each cap's onHooAnu.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/island-caps
 */

import type { IslandBehavior, IslandContext } from "./island-context.js";

/** A teardown returned from a cap's onEa — sync or async (e.g. a final flush). */
export type CapTeardown = () => void | Promise<void>;

/** One runtime cap — a composable component of a causal island's behavior (the `#has` unit). Every
 *  hook is optional: a cap contributes only the lifecycle phases it needs. */
export interface IslandCap {
  /** Trace/debug label only — the island itself stays nameless (the stack is the identity). */
  readonly name?: string;
  /** Set up on ea. A returned function registers as a LIFO teardown run (awaited) on hooʻanu. */
  onEa?(ctx: IslandContext): void | CapTeardown | Promise<void | CapTeardown>;
  /** Claim a non-lifecycle message — return true if handled. First cap in stack order wins. */
  onSignal?(type: string, raw: unknown, ctx: IslandContext): boolean;
  /** Tear down before the drain loop stops. */
  onHooAnu?(ctx: IslandContext): void | Promise<void>;
}

/**
 * Fold a `#has` cap stack into one IslandBehavior — the nameless causal island. Stack order is
 * signal precedence (earlier caps claim first) and teardown is the mirror (LIFO), so a cap never
 * tears down before a later cap that may depend on it.
 */
export function composeIsland(caps: readonly IslandCap[]): IslandBehavior {
  const teardowns: CapTeardown[] = [];
  return {
    async onEa(ctx: IslandContext) {
      for (const cap of caps) {
        const t = await cap.onEa?.(ctx);
        if (typeof t === "function") teardowns.push(t);
      }
    },
    onSignal(type: string, raw: unknown, ctx: IslandContext): boolean {
      for (const cap of caps) {
        if (cap.onSignal?.(type, raw, ctx) === true) return true;
      }
      return false;
    },
    async onHooAnu(ctx: IslandContext) {
      while (teardowns.length) {
        try {
          await teardowns.pop()!();
        } catch (err) {
          // teardown is best-effort — one cap's failure never blocks the rest — but SURFACE it
          // (the original onHooAnu let throws propagate; never swallow a real dispose/flush failure).
          console.error("[island-caps] cap teardown failed", err);
        }
      }
      for (const cap of caps) await cap.onHooAnu?.(ctx);
    },
  };
}
