/**
 * pack-provenance — the aside map's pure operations (parse · query · record ·
 * forget), the foundation the multi-tiddler PACK model reads and writes.
 */

import { describe, test, expect } from "vitest";
import {
  ORIGINAL_TIDDLER_PATHS, parseProvenance, serializeProvenance,
  packOfMember, membersOfPack, packPaths, recordPack, forgetPack,
  ORIGINAL_TIDDLER_HASHES, parseHashes, serializeHashes,
  hashOfMember, recordPackHashes, forgetPackHashes,
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

describe("pack-provenance — the SIBLING per-member content-hash map", () => {
  test("the sibling tiddler name stands apart from the path map", () => {
    expect(ORIGINAL_TIDDLER_HASHES).toBe("$:/config/OriginalTiddlerHashes");
    expect(ORIGINAL_TIDDLER_HASHES).not.toBe(ORIGINAL_TIDDLER_PATHS);
  });

  test("parse degrades a missing/malformed body to empty; drops non-string hashes", () => {
    expect(parseHashes(undefined)).toEqual({});
    expect(parseHashes("not json")).toEqual({});
    expect(parseHashes("[1,2,3]")).toEqual({});                       // array, not a map
    expect(parseHashes('{"A":"deadbeef","B":42}')).toEqual({ A: "deadbeef" });
  });

  test("record/query a member's content-hash", () => {
    const paths = recordPack({}, "x/foo.json", ["Alpha", "Beta"]);
    const h = recordPackHashes({}, paths, "x/foo.json", { Alpha: "h-a", Beta: "h-b" });
    expect(hashOfMember(h, "Alpha")).toBe("h-a");
    expect(hashOfMember(h, "Beta")).toBe("h-b");
    expect(hashOfMember(h, "Gamma")).toBeUndefined();
  });

  test("re-record drops a departed member's hash, keeps OTHER packs' hashes", () => {
    let paths = recordPack({}, "a.json", ["A1", "A2"]);
    paths = recordPack(paths, "b.json", ["B1"]);
    let h = recordPackHashes({}, paths, "a.json", { A1: "ha1", A2: "ha2" });
    h = recordPackHashes(h, paths, "b.json", { B1: "hb1" });
    // A2 leaves pack a.json → its hash drops; A1 re-stamps; b.json's B1 untouched
    const paths2 = recordPack(paths, "a.json", ["A1"]);
    h = recordPackHashes(h, paths, "a.json", { A1: "ha1-v2" });
    expect(hashOfMember(h, "A1")).toBe("ha1-v2");
    expect(hashOfMember(h, "A2")).toBeUndefined();                    // departed → hash gone
    expect(hashOfMember(h, "B1")).toBe("hb1");                        // other pack retained
    expect(membersOfPack(paths2, "a.json")).toEqual(["A1"]);
  });

  test("forget a whole pack's hashes; other packs stay", () => {
    let paths = recordPack(recordPack({}, "a.json", ["A1", "A2"]), "b.json", ["B1"]);
    let h = recordPackHashes({}, paths, "a.json", { A1: "ha1", A2: "ha2" });
    h = recordPackHashes(h, paths, "b.json", { B1: "hb1" });
    h = forgetPackHashes(h, paths, "a.json");
    expect(hashOfMember(h, "A1")).toBeUndefined();
    expect(hashOfMember(h, "A2")).toBeUndefined();
    expect(hashOfMember(h, "B1")).toBe("hb1");
  });

  test("serialize is canonical (sorted keys) → stable bytes, bare-hex agile-comparable", () => {
    const paths = recordPack({}, "f.json", ["Zeta", "Alpha"]);
    const a = serializeHashes(recordPackHashes({}, paths, "f.json", { Zeta: "hz", Alpha: "ha" }));
    const b = serializeHashes(recordPackHashes({}, paths, "f.json", { Alpha: "ha", Zeta: "hz" }));
    expect(a).toBe(b);
    expect(parseHashes(a)).toEqual({ Alpha: "ha", Zeta: "hz" });      // round-trip
  });
});
