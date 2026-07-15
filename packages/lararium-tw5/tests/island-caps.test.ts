/**
 * island-caps — the runtime has-stack: composeIsland folds a #has cap stack into one
 * IslandBehavior (a nameless causal island). onEa sets up every cap (LIFO teardown),
 * onSignal is first-claim-wins in stack order.
 */

import { describe, expect, test } from "vitest";

import { composeIsland } from "../src/island-caps.js";
import { hasCapture } from "../src/has-capture.js";
import type { IslandCap } from "../src/island-caps.js";
import type { IslandContext } from "../src/island-context.js";

const ctx = {} as IslandContext;

describe("composeIsland — the nameless causal island over a #has cap stack", () => {
  test("onEa runs every cap; returned cleanups tear down LIFO on hooʻanu", async () => {
    const order: string[] = [];
    const caps: IslandCap[] = [
      {
        name: "a",
        onEa: () => {
          order.push("ea:a");
          return () => order.push("down:a");
        },
      },
      {
        name: "b",
        onEa: () => {
          order.push("ea:b");
          return () => order.push("down:b");
        },
      },
    ];
    const island = composeIsland(caps);
    await island.onEa(ctx);
    await island.onHooAnu(ctx);
    expect(order).toEqual(["ea:a", "ea:b", "down:b", "down:a"]); // setup FIFO, teardown LIFO
  });

  test("onSignal: first cap in stack order to claim wins; later caps not consulted", () => {
    const seen: string[] = [];
    const caps: IslandCap[] = [
      { name: "x", onSignal: (t) => (t === "x" ? (seen.push("x"), true) : false) },
      { name: "y", onSignal: (t) => (seen.push("y-checked"), t === "y") },
    ];
    const island = composeIsland(caps);
    expect(island.onSignal("x", null, ctx)).toBe(true);
    expect(seen).toEqual(["x"]); // y never consulted — x claimed it
    seen.length = 0;
    expect(island.onSignal("z", null, ctx)).toBe(false); // nobody claims
    expect(seen).toEqual(["y-checked"]);
  });

  test("awaits an async teardown (a final flush) before the cap's onHooAnu", async () => {
    const order: string[] = [];
    const caps: IslandCap[] = [
      {
        name: "a",
        onEa: () => async () => {
          await Promise.resolve();
          order.push("flush:a");
        },
        onHooAnu: () => void order.push("anu:a"),
      },
    ];
    const island = composeIsland(caps);
    await island.onEa(ctx);
    await island.onHooAnu(ctx);
    expect(order).toEqual(["flush:a", "anu:a"]); // async cleanup awaited, then onHooAnu
  });

  test("a cap with no hooks is inert (every hook optional)", async () => {
    const island = composeIsland([{ name: "empty" }]);
    await island.onEa(ctx);
    expect(island.onSignal("anything", null, ctx)).toBe(false);
    await island.onHooAnu(ctx);
  });

  test("publishes only the fragments carried by this island", async () => {
    const worker = { ready: true, $tw: {} };
    const island = composeIsland([
      { sensorium: { has: ["telemetry"] } },
      { sensorium: { has: ["content"] } },
    ]);
    await island.onEa({ tw5: worker } as unknown as IslandContext);
    expect((worker.$tw as { lares?: Record<string, unknown> }).lares?.sensoriumContract)
      .toEqual({ has: ["telemetry", "content"] });
  });

  test("adds an injected cap without assuming its source or sink", async () => {
    const worker = { ready: true, $tw: {} };
    const island = composeIsland([hasCapture({})]);
    await island.onEa({ tw5: worker } as unknown as IslandContext);
    expect((worker.$tw as { lares?: Record<string, unknown> }).lares?.sensoriumContract)
      .toEqual({ has: ["capture"] });
  });
});
