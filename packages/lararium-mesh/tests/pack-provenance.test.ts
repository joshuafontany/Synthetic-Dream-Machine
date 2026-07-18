/**
 * pack-provenance — the aside map's pure operations (parse · query · record ·
 * forget), the foundation the multi-tiddler PACK model reads and writes.
 */

import { describe, test, expect } from "vitest";
import {
  ORIGINAL_TIDDLER_PATHS, parseProvenance, serializeProvenance,
  packOfMember, membersOfPack, packPaths, recordPack, forgetPack,
} from "../src/pack-provenance.js";

describe("pack-provenance — the TW5-native aside map", () => {
  test("the tiddler name matches TW5's own", () => {
    expect(ORIGINAL_TIDDLER_PATHS).toBe("$:/config/OriginalTiddlerPaths");
  });

  test("parse tolerates missing / malformed bodies as an empty map", () => {
    expect(parseProvenance(undefined)).toEqual({});
    expect(parseProvenance("")).toEqual({});
    expect(parseProvenance("not json")).toEqual({});
    expect(parseProvenance("[1,2,3]")).toEqual({});               // array, not a map
    expect(parseProvenance('{"A":"x.json","B":42}')).toEqual({ A: "x.json" }); // drops non-string
  });

  test("record stamps a pack's members; a re-record replaces its whole membership", () => {
    let p = recordPack({}, "x/foo.json", ["Alpha", "Beta", "Gamma"]);
    expect(membersOfPack(p, "x/foo.json")).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(packOfMember(p, "Beta")).toBe("x/foo.json");
    // re-ingest with Gamma dropped + Delta added → the map tracks the CURRENT shape
    p = recordPack(p, "x/foo.json", ["Alpha", "Beta", "Delta"]);
    expect(membersOfPack(p, "x/foo.json")).toEqual(["Alpha", "Beta", "Delta"]);
    expect(packOfMember(p, "Gamma")).toBeUndefined();             // Gamma left the pack
  });

  test("recording one pack never disturbs another", () => {
    let p = recordPack({}, "a.json", ["A1", "A2"]);
    p = recordPack(p, "b.multids", ["B1"]);
    expect(membersOfPack(p, "a.json")).toEqual(["A1", "A2"]);
    expect(membersOfPack(p, "b.multids")).toEqual(["B1"]);
    expect(packPaths(p)).toEqual(["a.json", "b.multids"]);
  });

  test("forget drops a whole pack, leaving the others", () => {
    let p = recordPack(recordPack({}, "a.json", ["A1", "A2"]), "b.json", ["B1"]);
    p = forgetPack(p, "a.json");
    expect(membersOfPack(p, "a.json")).toEqual([]);
    expect(membersOfPack(p, "b.json")).toEqual(["B1"]);
  });

  test("serialize is canonical (sorted keys) → stable bytes across re-writes", () => {
    const p1 = recordPack({}, "f.json", ["Zeta", "Alpha", "Mu"]);
    const p2 = parseProvenance(serializeProvenance(p1));         // round-trip
    expect(p2).toEqual(p1);
    // key order is deterministic regardless of insertion order
    const a = serializeProvenance(recordPack({}, "f.json", ["Alpha", "Mu", "Zeta"]));
    const b = serializeProvenance(recordPack({}, "f.json", ["Zeta", "Mu", "Alpha"]));
    expect(a).toBe(b);
  });
});
