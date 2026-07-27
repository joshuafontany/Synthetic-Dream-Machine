/**
 * mu-void.test.ts — THE INDISTINGUISHABILITY PROOF. A Kapae'd presenter and a caught-up peer draw the
 * BYTE-IDENTICAL void, so the wire cannot tell nothing-more-permitted from nothing-more-to-extract.
 * This is the information-minimal guarantee, pinned byte-for-byte.
 */
import { describe, test, expect } from "vitest";
import {
  muVoid, muVoidBytes, muVoidJson, muResponse, syncCompleteVoid, kapaeDeniedVoid, MU_VOID_DOMAIN,
} from "../src/mu-void.js";

describe("mu-void — one void, two reasons, indistinguishable", () => {
  test("sync-complete and kapae-denied yield BYTE-IDENTICAL bytes", () => {
    // Re-derive each path's wire bytes independently and compare byte-for-byte.
    const sync  = new TextEncoder().encode(JSON.stringify(syncCompleteVoid()));
    const kapae = new TextEncoder().encode(JSON.stringify(kapaeDeniedVoid()));
    expect(Array.from(kapae)).toEqual(Array.from(sync));
    // and via the canonical wire form the shore actually emits
    expect(Array.from(muVoidBytes())).toEqual(Array.from(sync));
  });

  test("muResponse conditions NOTHING on its reason — same object shape both ways", () => {
    expect(muResponse("sync-complete")).toEqual(muResponse("kapae-denied"));
    expect(muVoidJson()).toBe(JSON.stringify(muVoid()));
  });

  test("the void confesses nothing — only its domain crosses", () => {
    const v = muVoid();
    expect(Object.keys(v)).toEqual(["kind"]);
    expect(v.kind).toBe(MU_VOID_DOMAIN);
  });

  test("the void is frozen — no reason can be smuggled onto it later", () => {
    expect(Object.isFrozen(muVoid())).toBe(true);
  });
});
