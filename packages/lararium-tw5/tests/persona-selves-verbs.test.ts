/**
 * persona-selves-verbs — a human's own-persona names land in @persona, read back, and NEVER touch a board.
 *
 * These hold the fleet-ride the verbs exist for:
 *   · `persona-label` / `persona-handle` each write ONE name's value+stamp pair over the @persona store.
 *   · `persona-selves` folds the multitude back, ascending, reading only the selves tiddlers.
 *   · TWO NAMES, ONE RECORD: declaring a Handle never disturbs the pet-name beside it.
 *   · A BLANK value CLEARS a name; a stale write reports `written: false` rather than clobbering.
 *   · NEVER-FEDERATES: the reactors reach ONLY the @persona store — no @crossroads / board title is ever
 *     written, and every outcome reads `federated: false`. Only an announced Handle binds a public glamour.
 *   · THE SEAT NEVER RIDES: no verb here carries a seat claim, so a fleet-mate can never seat a persona on
 *     another node's seal.
 */

import { describe, expect, test } from "vitest";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { makePersonaSelvesReactors } from "../src/persona-selves-verbs.js";
import type { VerbContext } from "../src/verb-dispatcher.js";
import { personaSelfTiddlerUri, PERSONA_NAMESPACE, mutableLarRecord } from "@lararium/mesh";

const CTX = {} as VerbContext;

function store(): MemoryTiddlerStore {
  return new MemoryTiddlerStore(PERSONA_NAMESPACE);
}
function reactorsOver(s: MemoryTiddlerStore) {
  return makePersonaSelvesReactors({ resolveStore: async () => s });
}
/** The stored fields for one persona's self tiddler, read straight off the store. */
async function fieldsOf(s: MemoryTiddlerStore, handleIndex: number): Promise<Record<string, unknown>> {
  return ((await s.get(personaSelfTiddlerUri(handleIndex)))?.tiddler ?? {}) as Record<string, unknown>;
}

describe("the two names land on @persona and read back", () => {
  test("persona-label writes the PRIVATE pet-name and folds it back through persona-selves", async () => {
    const s = store();
    const r = reactorsOver(s);
    const out = await r.label({ handleIndex: 1, petname: "veil-two" }, CTX);
    expect(out).toMatchObject({ verb: "persona-label", handleIndex: 1, petname: "veil-two", written: true, federated: false });
    expect(await r.selves({}, CTX)).toMatchObject({ selves: [{ handleIndex: 1, petname: "veil-two" }] });
  });

  test("persona-handle writes the DECLARED Handle beside it, disturbing nothing", async () => {
    const s = store();
    const r = reactorsOver(s);
    await r.label({ handleIndex: 1, petname: "veil-two" }, CTX);
    await r.handle({ handleIndex: 1, handle: "Kahu Beta" }, CTX);
    expect(await r.selves({}, CTX)).toMatchObject({
      selves: [{ handleIndex: 1, petname: "veil-two", handle: "Kahu Beta" }],
    });
  });

  test("★ the two names carry SEPARATE stamps — a Handle write never re-stamps the pet-name ★", async () => {
    const s = store();
    const r = reactorsOver(s);
    await r.label({ handleIndex: 0, petname: "veil-one" }, CTX);
    const afterLabel = (await fieldsOf(s, 0))["petname@"];
    await r.handle({ handleIndex: 0, handle: "Kahu Alpha" }, CTX);
    const fields = await fieldsOf(s, 0);
    expect(fields["petname@"]).toBe(afterLabel);          // untouched — a fleet-mate's rename cannot be lost here
    expect(typeof fields["handle@"]).toBe("string");
  });

  test("the multitude folds ascending by handle-index", async () => {
    const r = reactorsOver(store());
    for (const i of [4, 0, 2]) await r.label({ handleIndex: i, petname: `p${i}` }, CTX);
    const out = await r.selves({}, CTX) as { selves: Array<{ handleIndex: number }> };
    expect(out.selves.map((x) => x.handleIndex)).toEqual([0, 2, 4]);
  });

  test("a BLANK value clears one name and leaves the other standing", async () => {
    const r = reactorsOver(store());
    await r.label({ handleIndex: 3, petname: "burner" }, CTX);
    await r.handle({ handleIndex: 3, handle: "Kahu Gamma" }, CTX);
    await r.label({ handleIndex: 3, petname: "" }, CTX);
    expect(await r.selves({}, CTX)).toMatchObject({ selves: [{ handleIndex: 3, handle: "Kahu Gamma" }] });
  });
});

describe("what the verbs refuse", () => {
  test("★ NEVER FEDERATES — only the persona's own self tiddler is ever written ★", async () => {
    const s = store();
    const r = reactorsOver(s);
    await r.label({ handleIndex: 2, petname: "veil-three" }, CTX);
    await r.handle({ handleIndex: 2, handle: "Kahu Gamma" }, CTX);
    // No board / @crossroads / who-face title exists in the store, and nothing outside the selves prefix moved.
    const titles = await s.listVisible();
    expect(titles).toEqual([personaSelfTiddlerUri(2)]);
  });

  test("★ the identity machinery beside these labels stays untouched and unread ★", async () => {
    const s = store();
    s._seed(mutableLarRecord(`${PERSONA_NAMESPACE}/binding/signer-did`, { text: "0xdead" }, "lararium-seed"));
    const r = reactorsOver(s);
    await r.label({ handleIndex: 0, petname: "veil-one" }, CTX);
    expect(await r.selves({}, CTX)).toMatchObject({ selves: [{ handleIndex: 0, petname: "veil-one" }] });
    expect(((await s.get(`${PERSONA_NAMESPACE}/binding/signer-did`))?.tiddler as { text?: string })?.text).toBe("0xdead");
  });

  test("★ NO verb carries a seat claim — a chair can never be seated from another vessel ★", async () => {
    const r = reactorsOver(store());
    // The arg is simply not read; the outcome names only what rides.
    const out = await r.handle({ handleIndex: 0, handle: "Kahu Gamma", seat: true }, CTX);
    expect(out).not.toHaveProperty("seat");
    const selves = (await r.selves({}, CTX)) as { selves: Array<Record<string, unknown>> };
    expect(selves.selves[0]).not.toHaveProperty("seat");
  });

  test("a missing/negative handleIndex REFUSES rather than guessing a face to rename", async () => {
    const r = reactorsOver(store());
    await expect(r.label({ petname: "x" }, CTX)).rejects.toThrow(/handleIndex/);
    await expect(r.label({ handleIndex: -1, petname: "x" }, CTX)).rejects.toThrow(/handleIndex/);
  });
});
