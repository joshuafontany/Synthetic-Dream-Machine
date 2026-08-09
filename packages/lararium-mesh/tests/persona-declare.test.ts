/**
 * persona-declare.test — the third own-side store: what a persona declares outward, and why it stands apart.
 *
 * The load-bearing property reads as a SEPARATION. A declared Handle and a private pet-name may carry the same
 * characters and still stand as two acts; nothing in this module can read one off the other. These pin that,
 * pin the seat as its own act beside the Handle, and pin what `personasStandingForSeat` refuses to hand a
 * caller — a seat claim with no chair name to answer to.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */
import { describe, test, expect } from "vitest";
import {
  declarePersonaHandle, standForKahuSeat, clearPersonaDeclaration, declaredHandle,
  personasStandingForSeat, type PersonaDeclaration, type PersonaDeclarationStore,
} from "../src/persona-declare.js";

function makeStore(): PersonaDeclarationStore {
  const map = new Map<number, PersonaDeclaration>();
  return {
    async get(i) { return map.get(i); },
    async set(i, d) { map.set(i, d); },
    async clear(i) { map.delete(i); },
    async entries() { return [...map.entries()].sort((a, b) => a[0] - b[0]); },
  };
}

describe("a declaration says what a persona answers to — never what it published", () => {
  test("declaring a Handle lands it, and leaves any seat claim untouched", async () => {
    const store = makeStore();
    await standForKahuSeat(store, 1, true);
    await declarePersonaHandle(store, 1, "Kahu Beta");
    expect(await store.get(1)).toEqual({ seat: true, handle: "Kahu Beta" });
  });

  test("standing for a seat lands it, and leaves the declared Handle untouched", async () => {
    const store = makeStore();
    await declarePersonaHandle(store, 1, "Kahu Beta");
    await standForKahuSeat(store, 1, true);
    expect(await declaredHandle(store, 1)).toBe("Kahu Beta");
    // Stepping back drops the claim and keeps the name — a persona that stops offering still answers outward.
    await standForKahuSeat(store, 1, false);
    expect(await store.get(1)).toEqual({ handle: "Kahu Beta", seat: false });
  });

  test("a blank Handle REFUSES rather than silently un-naming a face the human means to wear", async () => {
    const store = makeStore();
    await declarePersonaHandle(store, 0, "Kahu Gamma");
    await expect(declarePersonaHandle(store, 0, "   ")).rejects.toThrow(/empty Handle/);
    expect(await declaredHandle(store, 0)).toBe("Kahu Gamma");   // the held declaration survives the refusal
  });

  test("clearing drops the whole declaration — the persona survives, declaring nothing outward", async () => {
    const store = makeStore();
    await declarePersonaHandle(store, 2, "Kahu Gamma");
    await standForKahuSeat(store, 2, true);
    await clearPersonaDeclaration(store, 2);
    expect(await store.get(2)).toBeUndefined();
    expect(await declaredHandle(store, 2)).toBeUndefined();
  });

  test("a Handle trims to what the human typed, never to what a store happened to hold", async () => {
    const store = makeStore();
    await declarePersonaHandle(store, 3, "  Kahu Alpha  ");
    expect(await declaredHandle(store, 3)).toBe("Kahu Alpha");
  });
});

describe("personasStandingForSeat — both acts, or no chair", () => {
  test("★ a declared Handle WITHOUT a seat claim never stands — declaring is not offering ★", async () => {
    const store = makeStore();
    await declarePersonaHandle(store, 0, "Kahu Alpha");
    expect(await personasStandingForSeat(store)).toEqual([]);
  });

  test("★ a seat claim WITHOUT a Handle never stands — a nameless claim answers to no chair ★", async () => {
    // Reading such a claim off some other label is exactly the weld this store exists to prevent, so it
    // vanishes here and the seal's own door reports the gap rather than guessing at a name.
    const store = makeStore();
    await standForKahuSeat(store, 0, true);
    expect(await personasStandingForSeat(store)).toEqual([]);
  });

  test("both acts together stand, ascending by handle-index", async () => {
    const store = makeStore();
    for (const [i, handle] of [[2, "Kahu Gamma"], [0, "Kahu Alpha"]] as const) {
      await declarePersonaHandle(store, i, handle);
      await standForKahuSeat(store, i, true);
    }
    await declarePersonaHandle(store, 1, "Kahu Beta");   // declares, never offers
    expect(await personasStandingForSeat(store)).toEqual([
      [0, "Kahu Alpha"],
      [2, "Kahu Gamma"],
    ]);
  });

  test("★ the store cannot read a Handle off a private label — the two registers never touch ★", async () => {
    // Nothing here takes a pet-name store, so no code path exists that could fall back to one. A persona whose
    // compartment reads "veil-three" stands as "Kahu Gamma" purely because the human said both.
    const store = makeStore();
    await declarePersonaHandle(store, 5, "Kahu Gamma");
    await standForKahuSeat(store, 5, true);
    const standing = await personasStandingForSeat(store);
    expect(standing).toEqual([[5, "Kahu Gamma"]]);
    expect(JSON.stringify(standing)).not.toContain("burner");
  });
});
