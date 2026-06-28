/**
 * ea-breath.test.ts — the watchdog listens for breath; silence alone times out.
 *
 * The ea-breath law (burr resolved 2026-06-12): a mounting island that still
 * breathes (emits) never reads dead, however long the mount. `awaitIslandMsg`
 * carries `resetOnTypes` — a matching message re-arms the silence window
 * instead of settling the wait. The timeout error names the last breath heard,
 * so a dead mount says where breathing stopped.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/vessel-host
 */

import { describe, test, expect } from "vitest";
import { awaitIslandMsg } from "../src/vessel-host.js";
import { mkEa, mkBreath, mkFault, type IslandMsg_Ea } from "../src/island-protocol.js";

const WIKI = "lar:///ha.ka.ba/@test/wiki";

/** A bare in-memory wire: handlers + an emit, standing in for worker.listen. */
function fakeWire() {
  const handlers: Array<(raw: unknown) => void> = [];
  return {
    subscribe: (h: (raw: unknown) => void): (() => void) => {
      handlers.push(h);
      return () => {};
    },
    emit: (msg: unknown): void => {
      for (const h of handlers) h(msg);
    },
  };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe("awaitIslandMsg — the ea-breath watchdog", () => {
  test("silence alone times out", async () => {
    const wire = fakeWire();
    await expect(
      awaitIslandMsg<IslandMsg_Ea>({
        expectedType: "ea",
        timeoutMs:    80,
        resetOnTypes: ["breath"],
        subscribe:    wire.subscribe,
      }),
    ).rejects.toThrow(/timeout waiting for ea/);
  });

  test("breath re-arms the window — the wait survives past the budget and ea resolves", async () => {
    const wire = fakeWire();
    const wait = awaitIslandMsg<IslandMsg_Ea>({
      expectedType: "ea",
      timeoutMs:    100,
      resetOnTypes: ["breath"],
      subscribe:    wire.subscribe,
    });

    // Breathe every 40ms for 360ms — well past 3x the silence budget.
    for (let i = 0; i < 9; i++) {
      await sleep(40);
      wire.emit(mkBreath(WIKI, "recipe"));
    }
    wire.emit(mkEa(WIKI));

    const msg = await wait;
    expect(msg.type).toBe("ea");
  });

  test("the silence timeout names the last breath heard", async () => {
    const wire = fakeWire();
    const wait = awaitIslandMsg<IslandMsg_Ea>({
      expectedType: "ea",
      timeoutMs:    80,
      resetOnTypes: ["breath"],
      subscribe:    wire.subscribe,
    });

    await sleep(20);
    wire.emit(mkBreath(WIKI, "tw5-boot"));
    // ...then breathing stops.

    await expect(wait).rejects.toThrow(/tw5-boot/);
  });

  test("breathing without advancing rejects at the stall budget (progress-kick law)", async () => {
    // The timer-ISR anti-pattern guard: a live event loop that emits frozen
    // (phase, progress) proves only that it turns, not that mount advances.
    const wire = fakeWire();
    const wait = awaitIslandMsg<IslandMsg_Ea>({
      expectedType:    "ea",
      timeoutMs:       100,
      progressStallMs: 250,
      resetOnTypes:    ["breath"],
      subscribe:       wire.subscribe,
    });

    const breather = setInterval(() => wire.emit(mkBreath(WIKI, "slots", 1)), 40);
    await expect(wait).rejects.toThrow(/stalled/);
    clearInterval(breather);
  });

  test("advancing progress sustains past the stall budget", async () => {
    const wire = fakeWire();
    const wait = awaitIslandMsg<IslandMsg_Ea>({
      expectedType:    "ea",
      timeoutMs:       100,
      progressStallMs: 150,
      resetOnTypes:    ["breath"],
      subscribe:       wire.subscribe,
    });

    // Each breath carries fresh progress — alive AND advancing, far past 150ms.
    for (let i = 0; i < 10; i++) {
      await sleep(40);
      wire.emit(mkBreath(WIKI, "slots", i + 1));
    }
    wire.emit(mkEa(WIKI));

    const msg = await wait;
    expect(msg.type).toBe("ea");
  });

  test("a named fault rejects immediately — no silence budget spent on a corpse", async () => {
    const wire = fakeWire();
    const wait = awaitIslandMsg<IslandMsg_Ea>({
      expectedType:  "ea",
      timeoutMs:     5_000,
      resetOnTypes:  ["breath"],
      rejectOnTypes: ["fault"],
      subscribe:     wire.subscribe,
    });

    const start = Date.now();
    wire.emit(mkFault(WIKI, "keyhive gate B failed"));

    await expect(wait).rejects.toThrow(/fault while waiting for ea: keyhive gate B failed/);
    expect(Date.now() - start).toBeLessThan(100);
  });

  test("a breath never settles the wait — only the expected type resolves", async () => {
    const wire = fakeWire();
    const wait = awaitIslandMsg<IslandMsg_Ea>({
      expectedType: "ea",
      timeoutMs:    200,
      resetOnTypes: ["breath"],
      subscribe:    wire.subscribe,
    });

    wire.emit(mkBreath(WIKI, "slots"));
    wire.emit(mkEa(WIKI));

    const msg = await wait;
    expect(msg.type).toBe("ea");
    expect(msg.wikiUri).toBe(WIKI);
  });
});
