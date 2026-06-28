/**
 * lar-uris — petname l-space region predicates.
 *
 * Realizes the ruled capability-is-identity + petname model in code. Petnames /
 * TW5 titles ride the lar: grammar as a NAMING layer, classifying an address by
 * name-stability only: STABLE (ha.ka.ba — canonical, permanent) vs UNSTABLE (any
 * other three-term attitude root — a session/per-place local name). This naming
 * layer is ORTHOGONAL to federation (the residency bag controls that, not the
 * namespace) and to persistence (every meme persists but volatile-VM scratch).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/lararium-identity#capability-and-petnames
 */

import { describe, test, expect } from "vitest";
import {
  larRoot,
  isStableLarUri,
  isUnstablePetnameUri,
  isPersistableLarUri,
  isVolatileVmUri,
  stableLarUri,
  volatileVmUri,
  STABLE_L_SPACE,
  MESH_SCALES,
  parseMeshScale,
} from "../src/lar-uris.js";

describe("lar-uris petname regions", () => {
  const stable = stableLarUri("@oracle"); // lar:///ha.ka.ba/@oracle
  const stableBare = `lar:///${STABLE_L_SPACE}`; // root, no trailing path
  const volatile = volatileVmUri("scratch/x"); // lar:///lararium.local.vm/scratch/x
  const unstable = "lar:///threshold.uncertain.opens/peer/handle"; // a living local petname
  const session = "lar://alias:grant@host/some/path"; // session-form, capability-bearing

  test("larRoot extracts the authority-less root, undefined for session-form", () => {
    expect(larRoot(stable)).toBe("ha.ka.ba");
    expect(larRoot(stableBare)).toBe("ha.ka.ba");
    expect(larRoot(volatile)).toBe("lararium.local.vm");
    expect(larRoot(unstable)).toBe("threshold.uncertain.opens");
    expect(larRoot(session)).toBeUndefined();
    expect(larRoot("not-a-lar-uri")).toBeUndefined();
  });

  test("the stable region is ha.ka.ba alone", () => {
    expect(isStableLarUri(stable)).toBe(true);
    expect(isStableLarUri(stableBare)).toBe(true);
    expect(isStableLarUri(volatile)).toBe(false);
    expect(isStableLarUri(unstable)).toBe(false);
    expect(isStableLarUri(session)).toBe(false);
  });

  test("unstable petnames are any non-stable, non-volatile-VM local root", () => {
    expect(isUnstablePetnameUri(unstable)).toBe(true);
    expect(isUnstablePetnameUri(stable)).toBe(false);
    expect(isUnstablePetnameUri(volatile)).toBe(false); // reserved scratch, not a petname
    expect(isUnstablePetnameUri(session)).toBe(false); // session-form has no local root
  });

  test("persistence is LOCAL — every meme persists except volatile-VM scratch", () => {
    // We persist all memes. Stable AND unstable petnames write to the local store;
    // only pure volatile-VM scratch never persists. (Federation — what crosses to
    // peers — is controlled by the RESIDENCY BAG + capability, not by this naming axis.)
    expect(isPersistableLarUri(stable)).toBe(true);
    expect(isPersistableLarUri(unstable)).toBe(true); // local petname persists locally, even though it never federates
    expect(isPersistableLarUri(volatile)).toBe(false); // the one non-persistable region
  });

  test("the three regions stay mutually exclusive", () => {
    for (const uri of [stable, volatile, unstable]) {
      const flags = [isStableLarUri(uri), isVolatileVmUri(uri), isUnstablePetnameUri(uri)];
      expect(flags.filter(Boolean)).toHaveLength(1);
    }
  });
});

describe("parseMeshScale — federation scale declared on a residency entry", () => {
  test("accepts each of the five scales verbatim", () => {
    for (const s of MESH_SCALES) expect(parseMeshScale(s)).toBe(s);
    expect(MESH_SCALES).toHaveLength(5);
  });

  test("returns undefined for absent or unrecognized — caller defaults patience", () => {
    expect(parseMeshScale(undefined)).toBeUndefined();
    expect(parseMeshScale(null)).toBeUndefined();
    expect(parseMeshScale("")).toBeUndefined();
    expect(parseMeshScale("planet")).toBeUndefined();
    expect(parseMeshScale("Vessel")).toBeUndefined(); // case-sensitive, exact match
  });
});
