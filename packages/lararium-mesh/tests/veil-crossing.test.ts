/**
 * veil-crossing — the promote gesture: LIFT (keep-key, weld the anon past) or HOLD
 * (refound a fresh key, sever the public link). Tests the operator's recorded design +
 * the crucible's owed unlinkability: the wire-watcher can stitch a LIFT, never a HOLD.
 */
import { describe, test, expect } from "vitest";
import { crossVeil, weldsToAnon, deriveVeiledUserKey, type PersonaPath } from "../src/index.js";

const SEED = new Uint8Array(32).fill(0x07);
const ANON: PersonaPath = { handleIndex: 0, contextIndex: 0 };

describe("veil-crossing — lift welds, hold severs", () => {
  test("LIFT keeps the anon key — linkable, the reputation carries", async () => {
    const anonKey = (await deriveVeiledUserKey(SEED, ANON.handleIndex, ANON.contextIndex)).verifyingKey;
    const lifted = await crossVeil(SEED, ANON, "lift", { petname: "Guru Josh" });
    expect(lifted.verifyingKey).toBe(anonKey);          // SAME key
    expect(lifted.linkedToAnon).toBe(true);
    expect(weldsToAnon(anonKey, lifted)).toBe(true);    // a wire-watcher CAN stitch anon→persona
    expect(lifted.petname).toBe("Guru Josh");
  });

  test("HOLD refounds a FRESH key — severed, the anon past has nothing to weld to", async () => {
    const anonKey = (await deriveVeiledUserKey(SEED, ANON.handleIndex, ANON.contextIndex)).verifyingKey;
    const held = await crossVeil(SEED, ANON, "hold");
    expect(held.verifyingKey).not.toBe(anonKey);        // DIFFERENT key
    expect(held.linkedToAnon).toBe(false);
    expect(weldsToAnon(anonKey, held)).toBe(false);     // a wire-watcher CANNOT stitch it
    expect(held.path).toEqual({ handleIndex: 1, contextIndex: 0 });   // a fresh hardened path
  });

  test("HOLD is deterministic (same seed+path → same refound key) but distinct per new path", async () => {
    const h1 = await crossVeil(SEED, ANON, "hold", { newHandleIndex: 5 });
    const h1again = await crossVeil(SEED, ANON, "hold", { newHandleIndex: 5 });
    const h2 = await crossVeil(SEED, ANON, "hold", { newHandleIndex: 6 });
    expect(h1.verifyingKey).toBe(h1again.verifyingKey);   // recoverable from the seed
    expect(h1.verifyingKey).not.toBe(h2.verifyingKey);    // each refound a distinct pseudonym
  });

  test("two lived-anon slices refound into MUTUALLY unlinkable personas (cross-place unlinkability)", async () => {
    // home-anon and work-anon, each holding into its own private persona — no public thread ties them.
    const homeAnon: PersonaPath = { handleIndex: 0, contextIndex: 0 };
    const workAnon: PersonaPath = { handleIndex: 0, contextIndex: 1 };
    const homePersona = await crossVeil(SEED, homeAnon, "hold", { newHandleIndex: 10 });
    const workPersona = await crossVeil(SEED, workAnon, "hold", { newHandleIndex: 11 });
    expect(homePersona.verifyingKey).not.toBe(workPersona.verifyingKey);
    // neither persona key equals either anon key — nothing a wire-watcher can correlate
    const homeAnonKey = (await deriveVeiledUserKey(SEED, 0, 0)).verifyingKey;
    const workAnonKey = (await deriveVeiledUserKey(SEED, 0, 1)).verifyingKey;
    for (const p of [homePersona, workPersona]) {
      expect(p.verifyingKey).not.toBe(homeAnonKey);
      expect(p.verifyingKey).not.toBe(workAnonKey);
    }
  });
});
