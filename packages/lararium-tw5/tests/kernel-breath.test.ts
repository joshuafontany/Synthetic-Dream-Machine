/**
 * kernel-breath.test.ts — the sovereign kernel breathes while it mounts.
 *
 * The ea-breath law (burr resolved 2026-06-12): from manifest receipt to
 * settle (ea or fault), the island emits breath — an immediate breath at
 * receipt, stage marks before long stretches, and a steady interval between
 * them. After settle the breathing stops (the interval clears); the final
 * `ea` declaration alone speaks for a live island.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/sovereign-kernel
 */

import { describe, test, expect } from "vitest";
import { MessageChannel } from "worker_threads";
import {
  mkManifest,
  type IslandToVesselMsg,
  type IslandMsg_Manifest,
} from "@lararium/mesh";
import { runSovereignKernel, type IslandHostShore } from "../src/sovereign-kernel.js";
import type { IslandBehavior } from "../src/island-context.js";

const WIKI = "lar:///ha.ka.ba/bags/@test/wiki";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await sleep(10);
  }
}

describe("runSovereignKernel — breath emission during mount", () => {
  test("the kernel breathes from manifest receipt and falls silent after settle", async () => {
    const posted: IslandToVesselMsg[] = [];
    let deliver: ((raw: unknown) => void) | null = null;

    const host: IslandHostShore = {
      post:    (msg) => posted.push(msg),
      listen:  (h)   => { deliver = h; },
      storage: ()    => undefined,
    };

    const behavior: IslandBehavior = {
      onEa:     async () => {},
      onSignal: () => false,
      onHooAnu: async () => {},
    };

    runSovereignKernel(host, behavior, { breathEveryMs: 25 });
    expect(deliver).not.toBeNull();

    // A manifest whose island slot can never resolve — the mount faults, but
    // the kernel MUST breathe between receipt and settle.
    const { port1, port2 } = new MessageChannel();
    const manifest = mkManifest(
      WIKI,
      port2 as unknown as IslandMsg_Manifest["syncPort"],
      { wikiSlug: "test" },
      { islandUrl: "automerge:bogus-slot-url" },
      null,
    );
    deliver!(manifest);

    await waitFor(() => posted.some((m) => m.type === "fault"));

    const faultAt  = posted.findIndex((m) => m.type === "fault");
    const breaths  = posted.slice(0, faultAt).filter((m) => m.type === "breath");
    expect(breaths.length).toBeGreaterThanOrEqual(1);
    expect(breaths.every((b) => b.wikiUri === WIKI)).toBe(true);

    // Progress-kick law: breaths carry a monotonic counter; stage work advances it.
    expect(breaths.every((b) => typeof b.progress === "number")).toBe(true);
    for (let i = 1; i < breaths.length; i++) {
      expect(breaths[i]!.progress).toBeGreaterThanOrEqual(breaths[i - 1]!.progress);
    }
    expect(breaths[0]!.progress).toBe(0);
    expect(breaths.at(-1)!.progress).toBeGreaterThanOrEqual(1);

    // After settle the interval clears — no further breaths.
    const countAtSettle = posted.filter((m) => m.type === "breath").length;
    await sleep(100); // 4x the breath interval
    expect(posted.filter((m) => m.type === "breath").length).toBe(countAtSettle);

    port1.close();
    port2.close();
  });
});
