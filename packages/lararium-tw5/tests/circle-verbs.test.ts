/**
 * circle-verbs — the FOLLOW-GRAPH lands in @circles.memberDids, reads back, and NEVER touches a board.
 *
 * These hold the source-of-truth move (Build 2a's local file → the sovereign @circles doc):
 *   · a follow WRITES @circles.memberDids (not a local JSON file) — over the daemon store, deduped + sorted.
 *   · a circle-list READS that membership back.
 *   · an unfollow drops it (remove-wins, idempotent).
 *   · NEVER-FEDERATES: the reactor reaches ONLY the @circles store — no @crossroads / board title is ever
 *     written, and every outcome reads `federated: false`.
 *   · the @daemon follow surface renders FROM @circles (the worker owns the render).
 */

import { describe, expect, test } from "vitest";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { makeCircleReactors } from "../src/circle-verbs.js";
import type { VerbContext } from "../src/verb-dispatcher.js";
import type { TW5Engine } from "../src/tw5-vm.js";
import { circleTiddlerUri, CIRCLES_DOC_URI, mutableLarRecord } from "@lararium/mesh";

const CTX = {} as VerbContext;
const NYM_A = "aa".repeat(32);
const NYM_B = "bb".repeat(32);

/** A @circles store seeded with the "following" system circle (memberDids empty), as seedCirclesDoc plants it. */
function seededCircles(): MemoryTiddlerStore {
  const store = new MemoryTiddlerStore(CIRCLES_DOC_URI);
  store._seed(mutableLarRecord(circleTiddlerUri("following"), {
    text: "", id: "following", displayName: "Following", kind: "System", memberDids: "", createdAt: "",
  }, "lararium-seed"));
  return store;
}

function reactorsOver(store: MemoryTiddlerStore, tw5?: TW5Engine) {
  return makeCircleReactors({ resolveStore: async () => store, ...(tw5 ? { tw5 } : {}) });
}

function memberDidsOf(store: MemoryTiddlerStore, circle: string): string {
  const rec = store._snapshot().get(circleTiddlerUri(circle));
  return (rec?.tiddler as Record<string, unknown> | undefined)?.["memberDids"] as string ?? "";
}

describe("circle-verbs — the follow-graph over @circles", () => {
  test("circle-add WRITES the nym into @circles.memberDids (not a local file)", async () => {
    const store = seededCircles();
    const { add } = reactorsOver(store);

    const out = await add({ circle: "following", nym: NYM_A }, CTX);

    expect(out["added"]).toBe(true);
    expect(out["federated"]).toBe(false);
    // The membership landed in the @circles doc's memberDids field — the source of truth.
    expect(memberDidsOf(store, "following")).toBe(NYM_A);
  });

  test("circle-list READS the membership back from @circles", async () => {
    const store = seededCircles();
    const { add, list } = reactorsOver(store);
    await add({ circle: "following", nym: NYM_B }, CTX);
    await add({ circle: "following", nym: NYM_A }, CTX);

    const one = await list({ circle: "following" }, CTX);
    expect(one["members"]).toEqual([NYM_A, NYM_B]);   // deduped + sorted

    const all = await list({}, CTX);
    expect(all["circles"]).toEqual([{ circle: "following", members: [NYM_A, NYM_B] }]);
  });

  test("circle-add is idempotent (a re-add dedupes)", async () => {
    const store = seededCircles();
    const { add } = reactorsOver(store);
    await add({ circle: "following", nym: NYM_A }, CTX);
    const again = await add({ circle: "following", nym: NYM_A }, CTX);
    expect(again["added"]).toBe(false);
    expect(memberDidsOf(store, "following")).toBe(NYM_A);
  });

  test("circle-remove drops the nym (remove-wins, idempotent)", async () => {
    const store = seededCircles();
    const { add, remove } = reactorsOver(store);
    await add({ circle: "following", nym: NYM_A }, CTX);
    await add({ circle: "following", nym: NYM_B }, CTX);

    const out = await remove({ circle: "following", nym: NYM_A }, CTX);
    expect(out["removed"]).toBe(true);
    expect(out["federated"]).toBe(false);
    expect(memberDidsOf(store, "following")).toBe(NYM_B);

    // a second remove is a no-op
    const again = await remove({ circle: "following", nym: NYM_A }, CTX);
    expect(again["removed"]).toBe(false);
  });

  test("a follow of a NEW circle the operator names is born (kind Circle)", async () => {
    const store = seededCircles();
    const { add } = reactorsOver(store);
    await add({ circle: "close-friends", nym: NYM_A }, CTX);
    const rec = store._snapshot().get(circleTiddlerUri("close-friends"));
    expect((rec?.tiddler as Record<string, unknown>)?.["kind"]).toBe("Circle");
    expect(memberDidsOf(store, "close-friends")).toBe(NYM_A);
  });

  test("NEVER-FEDERATES: a follow writes ONLY @circles — no @crossroads / board title", async () => {
    const store = seededCircles();
    const { add, remove } = reactorsOver(store);
    await add({ circle: "following", nym: NYM_A }, CTX);
    await remove({ circle: "following", nym: NYM_B }, CTX);

    // Every title the reactors ever wrote sits under the @circles prefix — no board seam is reachable.
    for (const title of store._snapshot().keys()) {
      expect(title.startsWith(CIRCLES_DOC_URI)).toBe(true);
      expect(title).not.toContain("crossroads");
      expect(title).not.toContain("board");
    }
  });

  test("the @daemon follow surface renders FROM @circles (worker owns the render)", async () => {
    const store = seededCircles();
    const rendered: Array<Record<string, string>> = [];
    const fakeTw5 = { setTiddler: (f: Record<string, string>) => { rendered.push(f); } } as unknown as TW5Engine;
    const { add } = reactorsOver(store, fakeTw5);

    await add({ circle: "following", nym: NYM_A }, CTX);

    const last = rendered.at(-1)!;
    expect(last["title"]).toBe("$:/temp/lares/circles");
    expect(last["circle"]).toBe("following");
    expect(last["count"]).toBe("1");
    expect(last["nym-0"]).toBe(NYM_A);
    expect(last["petname-0"]).toBe("");   // blank — the handle-book stays local (the co-move fork)
  });
});
