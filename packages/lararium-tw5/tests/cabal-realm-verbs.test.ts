/**
 * cabal-realm-verbs — the OFFERING lands as a per-writer lease slot, and the clock reads it back without
 * drawing a conclusion.
 *
 * These hold the two properties the realm's liveness rests on:
 *   · ONE WRITER, ONE SLOT — two members feeding concurrently touch different keys, so no roll is ever lost
 *     to a whole-record merge and the effective epoch never moves backward.
 *   · THE CLOCK JUDGES NOTHING — it hands back per-maintainer standing, the spread, and the leading-set size,
 *     and emits no "captured" verdict. What those numbers mean stays the operator's calibration.
 * Plus the refusals: a malformed realm, and an anonymous feed.
 */

import { describe, expect, test } from "vitest";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { makeCabalRealmReactors } from "../src/cabal-realm-verbs.js";
import type { VerbContext } from "../src/verb-dispatcher.js";
import { DAEMON_BAG_ID, realmFeedSlotUri } from "@lararium/mesh";

const CTX   = {} as VerbContext;
const REALM = "ab".repeat(32);
const OTHER = "cd".repeat(32);
const FACE_A = "11".repeat(32);
const FACE_B = "22".repeat(32);

function reactorsOver(store: MemoryTiddlerStore) {
  return makeCabalRealmReactors({ resolveStore: async () => store });
}
const store = (): MemoryTiddlerStore => new MemoryTiddlerStore(DAEMON_BAG_ID);

describe("realm-feed — the offering rolls one writer's own slot", () => {
  test("a first feed lands epoch 1 and reports itself as first", async () => {
    const s = store();
    const r = reactorsOver(s);
    expect(await r.feed({ realm: REALM, writer: FACE_A }, CTX)).toMatchObject({
      verb: "realm-feed", realm: REALM, writer: FACE_A, epoch: 1, priorEffective: 0, first: true, federated: false,
    });
    expect((await s.get(realmFeedSlotUri(REALM, FACE_A)))?.tiddler.text).toBe("1");
  });

  test("feeding again rolls again — the clock measures how hard a hand feeds, so a repeat SHOULD register", async () => {
    const r = reactorsOver(store());
    await r.feed({ realm: REALM, writer: FACE_A }, CTX);
    expect(await r.feed({ realm: REALM, writer: FACE_A }, CTX)).toMatchObject({ epoch: 2, first: false });
  });

  test("★ two faces feeding touch DIFFERENT slots — neither roll is ever lost to the other ★", async () => {
    const s = store();
    const r = reactorsOver(s);
    await r.feed({ realm: REALM, writer: FACE_A }, CTX);      // A → 1
    await r.feed({ realm: REALM, writer: FACE_B }, CTX);      // B → 2 (it sees A's slot)
    expect((await s.get(realmFeedSlotUri(REALM, FACE_A)))?.tiddler.text).toBe("1");
    expect((await s.get(realmFeedSlotUri(REALM, FACE_B)))?.tiddler.text).toBe("2");
  });

  test("★ a feed never touches ANOTHER realm's slots ★", async () => {
    const s = store();
    const r = reactorsOver(s);
    await r.feed({ realm: OTHER, writer: FACE_A }, CTX);
    await r.feed({ realm: REALM, writer: FACE_A }, CTX);
    // The other realm's roll stays where it was — the prefix scopes both the read and the write.
    expect((await s.get(realmFeedSlotUri(OTHER, FACE_A)))?.tiddler.text).toBe("1");
    expect(await r.clock({ realm: OTHER }, CTX)).toMatchObject({ maintainerCount: 1, effectiveEpoch: 1 });
  });

  test("a malformed realm and an anonymous feed both REFUSE", async () => {
    const r = reactorsOver(store());
    await expect(r.feed({ realm: "not-a-realm", writer: FACE_A }, CTX)).rejects.toThrow(/64-hex/);
    await expect(r.feed({ realm: REALM }, CTX)).rejects.toThrow(/writer/);
  });
});

describe("realm-clock — it surfaces, it never judges", () => {
  test("★ an unfed realm reads the same as one this replica never synced ★", async () => {
    // Under no-global-now those two generate identically, and the clock says so by reporting neither.
    expect(await reactorsOver(store()).clock({ realm: REALM }, CTX)).toMatchObject({
      maintainerCount: 0, effectiveEpoch: 0, spread: 0, leadingCount: 0, maintainers: [],
    });
  });

  test("the read reports standing, spread and the leading set — leaders first", async () => {
    const r = reactorsOver(store());
    await r.feed({ realm: REALM, writer: FACE_A }, CTX);   // A → 1
    await r.feed({ realm: REALM, writer: FACE_B }, CTX);   // B → 2
    await r.feed({ realm: REALM, writer: FACE_B }, CTX);   // B → 3 — B out-feeds A
    const out = await r.clock({ realm: REALM }, CTX) as Record<string, unknown>;
    expect(out).toMatchObject({ maintainerCount: 2, effectiveEpoch: 3, trailingEpoch: 1, spread: 2, leadingCount: 1 });
    expect((out["maintainers"] as Array<{ writerId: string }>)[0]!.writerId).toBe(FACE_B);
  });

  test("★ NO capture verdict rides the outcome — the numbers travel, the conclusion does not ★", async () => {
    const r = reactorsOver(store());
    await r.feed({ realm: REALM, writer: FACE_A }, CTX);
    for (let i = 0; i < 20; i++) await r.feed({ realm: REALM, writer: FACE_B }, CTX);   // a stark minority lead
    const out = await r.clock({ realm: REALM }, CTX) as Record<string, unknown>;
    expect(out["spread"]).toBeGreaterThan(10);                 // the signal reads loudly…
    for (const banned of ["captured", "capture", "verdict", "alive", "dissolved", "healthy"]) {
      expect(Object.keys(out)).not.toContain(banned);          // …and no field draws the conclusion
    }
  });

  test("a malformed realm REFUSES rather than scanning every slot in the bag", async () => {
    await expect(reactorsOver(store()).clock({ realm: "nope" }, CTX)).rejects.toThrow(/64-hex/);
  });
});
