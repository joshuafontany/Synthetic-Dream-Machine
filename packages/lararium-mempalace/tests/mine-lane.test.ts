/**
 * mine-lane — the single-writer lane per palace: N parallel async "mines" against one
 * palace SERIALIZE (FIFO, queue-never-drop); distinct palaces run independently; a failed
 * mine never wedges the queue. The sandbox witness for the flow-control cut 2.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { mineLaneBusy, withMineLane } from "../src/mine-lane.js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function sandboxPalace(name: string): string {
  return join(mkdtempSync(join(tmpdir(), "mine-lane-")), name);
}

describe("withMineLane — the single-writer palace lane", () => {
  it("serializes N parallel mines against ONE palace (no overlap, FIFO order)", async () => {
    const palace = sandboxPalace("palace-a");
    const events: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const N = 8;
    const runs = Array.from({ length: N }, (_, i) =>
      withMineLane(palace, async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        events.push(`start-${i}`);
        await sleep(3 + ((i * 7) % 5)); // uneven durations — overlap would show
        events.push(`end-${i}`);
        inFlight -= 1;
        return i;
      }),
    );
    const results = await Promise.all(runs);

    // ONE in flight, ever — the single-writer invariant (zero lock-retry storms by construction).
    expect(maxInFlight).toBe(1);
    // FIFO: start-i follows end-(i-1); every start immediately follows the prior end.
    const expected: string[] = [];
    for (let i = 0; i < N; i++) expected.push(`start-${i}`, `end-${i}`);
    expect(events).toEqual(expected);
    // Queue, never drop: every mine ran and returned its own result.
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps distinct palaces independent (no cross-palace serialization)", async () => {
    const a = sandboxPalace("palace-a");
    const b = sandboxPalace("palace-b");
    let overlap = false;
    let aRunning = false;

    const runA = withMineLane(a, async () => {
      aRunning = true;
      await sleep(20);
      aRunning = false;
    });
    const runB = withMineLane(b, async () => {
      await sleep(5);
      if (aRunning) overlap = true; // b ran while a held ITS lane — independent lanes
    });
    await Promise.all([runA, runB]);
    expect(overlap).toBe(true);
  });

  it("a failed mine rejects its OWN caller and never wedges the queue", async () => {
    const palace = sandboxPalace("palace-a");
    const first = withMineLane(palace, async () => {
      await sleep(2);
      throw new Error("hnsw fault");
    });
    const second = withMineLane(palace, async () => "recovered");

    await expect(first).rejects.toThrow("hnsw fault");
    await expect(second).resolves.toBe("recovered");
  });

  it("keys by the CANONICAL palace path — two spellings of one palace share the lane", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mine-lane-"));
    const spellingA = join(dir, "palace");
    const spellingB = join(dir, ".", "sub", "..", "palace"); // resolves to the same path
    let inFlight = 0;
    let maxInFlight = 0;
    const job = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(5);
      inFlight -= 1;
    };
    await Promise.all([withMineLane(spellingA, job), withMineLane(spellingB, job)]);
    expect(maxInFlight).toBe(1);
  });

  it("drains the lane map once idle (bounded)", async () => {
    const palace = sandboxPalace("palace-a");
    const run = withMineLane(palace, async () => sleep(2));
    expect(mineLaneBusy(palace)).toBe(true);
    await run;
    await sleep(1); // the tail's own then-cleanup settles a microtask later
    expect(mineLaneBusy(palace)).toBe(false);
  });
});
