/**
 * abide-wipe-zone — the law that makes the wipe zone STRUCTURAL, held as vectors.
 *
 * THE CRITERION IS WHOSE IT IS. The acquired shelf and the sensoriums belong to the LARARIUM; identity
 * and the seal belong to the LARES, because a Lar's keys ARE that Lar. LARES PASS; THE LARARIUM ABIDES —
 * that the house's things also outlive every rite follows from whose they are. The ruling's force is that
 * this holds by ADDRESS rather than by a wipe-list remembering to spare a directory, so what needs
 * holding is a property of the two addresses:
 *
 *   1. the two homes never nest and never alias — neither reaches the other by any prefix,
 *   2. `LAR_ROOT` isolates BOTH, so a test never reaches the operator's own shelf,
 *   3. every tier that abides resolves under the shrine and under nothing a rite pares,
 *   4. a caller-supplied NAME cannot walk out of its root — the one route that defeats an address,
 *      because a traversing segment does not consult a wipe-list either.
 *
 * A vector asserting "does not reach" passes trivially against a resolver that returns nothing, so each
 * case here also asserts the POSITIVE resolution — the exact path the code produced — and the refusals
 * assert a throw rather than an absence.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  laresDataHome, larariumDataHome, larStateHome, larCacheHome,
  larDataDir, larIdentityDir, larSealHome, larProjectionDir,
  memorySensoriumDir, meshSensoriumDir, memeticWikitextSensoriumDir, sensoriumDir,
  scratchSensoriumInstanceDir, assertOneSegment, larLibraryHome,
} from "../src/index.js";

const KEYS = ["LAR_ROOT", "XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME", "LAR_LIBRARY", "HOME", "USERPROFILE"] as const;
const saved: Record<string, string | undefined> = {};

function set(k: string, v: string | undefined): void {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

beforeEach(() => { for (const k of KEYS) saved[k] = process.env[k]; });
afterEach(() => { for (const k of KEYS) set(k, saved[k]); });

/** Is `dir` at or beneath `root`? — segment-safe, never a bare string prefix (`lararium` vs `lares`). */
function isUnder(dir: string, root: string): boolean {
  return dir === root || dir.startsWith(root.endsWith("/") ? root : root + "/");
}

describe("the two homes never nest and never alias", () => {
  test("XDG default: `lares` and `lararium` are siblings, neither under the other", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    expect(laresDataHome()).toBe(join("/x/data", "lares"));           // the code RAN and produced this
    expect(larariumDataHome()).toBe(join("/x/data", "lararium"));
    expect(isUnder(larariumDataHome(), laresDataHome())).toBe(false);
    expect(isUnder(laresDataHome(), larariumDataHome())).toBe(false);
  });

  test("the two names defeat even a NAIVE string-prefix wipe — `lararium` diverges before `lares` ends", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    // The usual sibling-name trap (`/x/lares` vs `/x/lares-backup`) needs a segment-boundary check to
    // refuse. These two never reach it: `larar` parts from `lares` at the fifth character, so a wipe
    // written with a bare `startsWith` misses the shrine as surely as a careful one does.
    expect(larariumDataHome().startsWith(laresDataHome())).toBe(false);
    expect(laresDataHome().startsWith(larariumDataHome())).toBe(false);
    expect(isUnder(larariumDataHome(), laresDataHome())).toBe(false);
  });

  test("neither home aliases the state or cache home", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    set("XDG_STATE_HOME", "/x/state");
    set("XDG_CACHE_HOME", "/x/cache");
    const homes = [laresDataHome(), larariumDataHome(), larStateHome(), larCacheHome()];
    expect(new Set(homes).size).toBe(homes.length);
    for (const a of homes) for (const b of homes) if (a !== b) expect(isUnder(a, b)).toBe(false);
  });
});

describe("LAR_ROOT isolates BOTH homes", () => {
  test("an isolated instance nests BOTH HOUSES under the data KIND, as the real disk does", () => {
    // ONE VOCABULARY IN BOTH CONTEXTS. Under LAR_ROOT every directory names an XDG kind — data, state,
    // cache, config, run — and the two HOUSES nest inside the data kind exactly as they do under XDG. A
    // house standing where a kind belongs makes an isolated run read differently from the disk it stands
    // in for, and a test that rehearses a different shape rehearses the wrong thing.
    set("LAR_ROOT", "/iso");
    set("XDG_DATA_HOME", "/x/data");                 // present, and OUTRANKED
    expect(laresDataHome()).toBe(join("/iso", "data", "lares"));
    expect(larariumDataHome()).toBe(join("/iso", "data", "lararium"));
    expect(isUnder(larariumDataHome(), laresDataHome())).toBe(false);   // siblings, never nested
    expect(isUnder(laresDataHome(), larariumDataHome())).toBe(false);
  });

  test("an isolated run never reaches the operator's own shelf or sensoriums", () => {
    set("LAR_ROOT", "/iso");
    set("LAR_LIBRARY", undefined);
    set("XDG_DATA_HOME", "/x/data");
    for (const p of [larLibraryHome(), memorySensoriumDir(), meshSensoriumDir(), sensoriumDir("memory")]) {
      expect(isUnder(p, "/iso")).toBe(true);
      expect(isUnder(p, join("/x/data", "lararium"))).toBe(false);
    }
  });
});

describe("what abides stands in the shrine, and shares no prefix with what a rite pares", () => {
  test("the shelf and every sensorium resolve under the shrine", () => {
    set("LAR_ROOT", undefined);
    set("LAR_LIBRARY", undefined);
    set("XDG_DATA_HOME", "/x/data");
    const abide = larariumDataHome();
    expect(larLibraryHome()).toBe(join(abide, "library"));
    expect(memorySensoriumDir()).toBe(join(abide, "sensoriums", "memory"));
    expect(meshSensoriumDir()).toBe(join(abide, "sensoriums", "mesh"));
    expect(memeticWikitextSensoriumDir()).toBe(join(abide, "sensoriums", "memetic-wikitext"));
    expect(sensoriumDir("memory")).toBe(memorySensoriumDir());     // one name, one dir
  });

  test("a wipe root and the shrine share no prefix, either direction", () => {
    set("LAR_ROOT", undefined);
    set("LAR_LIBRARY", undefined);
    set("XDG_DATA_HOME", "/x/data");
    set("XDG_STATE_HOME", "/x/state");
    // What `lares vessel clear` pares (scripted.ts::clearTargets) + what regenesis reforges beneath it.
    const wipeRoots = [larDataDir(), larProjectionDir()];
    const abiding   = [larariumDataHome(), larLibraryHome(), memorySensoriumDir(), meshSensoriumDir(), memeticWikitextSensoriumDir()];
    expect(wipeRoots.every((w) => w.length > 0)).toBe(true);        // the resolvers RAN
    for (const w of wipeRoots) for (const a of abiding) {
      expect(isUnder(a, w)).toBe(false);
      expect(isUnder(w, a)).toBe(false);
    }
  });

  test("the sovereign root and the seal stay in the spirit's house — the split is not a move of everything", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    expect(isUnder(larIdentityDir(), laresDataHome())).toBe(true);
    expect(isUnder(larSealHome(), laresDataHome())).toBe(true);
    expect(isUnder(larIdentityDir(), larDataDir())).toBe(false);    // beside the wiped store, never inside
  });
});

describe("the one-segment law — a name never routes out of its root", () => {
  test("a plain name passes through unchanged (the guard is not a blanket refusal)", () => {
    expect(assertOneSegment("t", "memory")).toBe("memory");
    expect(assertOneSegment("t", "memetic-wikitext")).toBe("memetic-wikitext");
    expect(assertOneSegment("t", "_")).toBe("_");                   // sensoriumsRoot() resolves through this
  });

  for (const bad of ["..", ".", "", "../abide", "a/b", "/etc", "..\\win", "../../../../.local/share/lararium"]) {
    test(`refuses ${JSON.stringify(bad)}`, () => {
      expect(() => assertOneSegment("t", bad)).toThrow(/ONE path segment/);
    });
  }

  test("sensoriumDir refuses a traversing name rather than resolving out of the shrine", () => {
    set("LAR_ROOT", "/iso");
    expect(sensoriumDir("memory")).toBe(join("/iso", "data", "lararium", "sensoriums", "memory"));   // it RESOLVES
    expect(() => sensoriumDir("../../abide")).toThrow(/ONE path segment/);                //  … and refuses
  });

  test("the scratch dissolve target refuses a traversing id — `dissolve` rmSyncs what this returns", () => {
    set("LAR_ROOT", "/iso");
    expect(scratchSensoriumInstanceDir("abc123")).toBe(join("/iso", "cache", "scratch", "sensoriums", "abc123"));
    expect(() => scratchSensoriumInstanceDir("../../../abide")).toThrow(/ONE path segment/);
  });
});
