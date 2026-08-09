/**
 * persona-selves.test — the per-field CRDT beneath a human's own-persona names on @persona.
 *
 * The property that earns this module its existence reads as a REFUSAL TO CLOBBER: two vessels of one human
 * rename different things concurrently and BOTH edits survive, because each name carries its own value+stamp
 * pair and a write touches nothing else. These pin that, pin the stale-arrival rule, and pin what the fold
 * refuses to read (every non-selves tiddler the @persona bag carries beside these labels).
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */
import { describe, test, expect } from "vitest";
import {
  personaSelfTiddlerUri, handleIndexFromSelfTiddlerUri, foldPersonaSelf, foldPersonaSelves,
  withPersonaSelfName, withoutPersonaSelfName, type PersonaSelfFields,
} from "../src/persona-selves.js";
import { PERSONA_NAMESPACE } from "../src/lar-uris.js";

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-01-02T00:00:00.000Z";
const T2 = "2026-01-03T00:00:00.000Z";

describe("one self tiddler — two names, two stamps, no shared field", () => {
  test("a name writes its own value+stamp pair and titles the record", () => {
    const f = withPersonaSelfName({}, 2, "petname", "veil-three", T0);
    expect(f["petname"]).toBe("veil-three");
    expect(f["petname@"]).toBe(T0);
    expect(f["title"]).toBe(personaSelfTiddlerUri(2));
  });

  test("★ renaming ONE name leaves the OTHER's value and stamp untouched ★", () => {
    // The whole point: a fleet-mate renaming the Handle must not lose this device's pet-name to a merge.
    let f: PersonaSelfFields = withPersonaSelfName({}, 0, "petname", "veil-one", T0);
    f = withPersonaSelfName(f, 0, "handle", "Kahu Alpha", T1);
    expect(foldPersonaSelf(f)).toEqual({ petname: "veil-one", handle: "Kahu Alpha" });
    expect(f["petname@"]).toBe(T0);   // untouched by the handle write
    expect(f["handle@"]).toBe(T1);
  });

  test("★ a STALE arrival never overwrites a newer name — the older stamp loses ★", () => {
    const fresh = withPersonaSelfName({}, 1, "petname", "current", T2);
    const stale = withPersonaSelfName(fresh, 1, "petname", "old", T0);
    expect(stale).toBe(fresh);                       // returned unchanged — the caller can see it wrote nothing
    expect(foldPersonaSelf(stale).petname).toBe("current");
  });

  test("a LATER stamp does advance the name — a real rename lands", () => {
    const first = withPersonaSelfName({}, 1, "petname", "old", T0);
    const next  = withPersonaSelfName(first, 1, "petname", "current", T2);
    expect(foldPersonaSelf(next).petname).toBe("current");
  });

  test("clearing a name stamps the clear, so it outranks a stale rename still in flight", () => {
    const named   = withPersonaSelfName({}, 3, "handle", "Kahu Gamma", T0);
    const cleared = withoutPersonaSelfName(named, 3, "handle", T1);
    expect(foldPersonaSelf(cleared).handle).toBeUndefined();
    // A rename stamped BEFORE the clear cannot resurrect the name.
    expect(foldPersonaSelf(withPersonaSelfName(cleared, 3, "handle", "resurrected", T0)).handle).toBeUndefined();
  });

  test("a whitespace-only value folds ABSENT — a blank never reads as a name", () => {
    expect(foldPersonaSelf({ petname: "   " })).toEqual({});
  });
});

describe("the multitude fold over the @persona bag", () => {
  test("★ the fold reads ONLY selves tiddlers — the bag's identity machinery passes untouched ★", () => {
    // @persona also carries the bindings, the sentinels and the hearth true-name. A fold that swept them in
    // would report machinery as faces.
    const rows = [
      { title: personaSelfTiddlerUri(1), fields: { petname: "veil-two", handle: "Kahu Beta" } },
      { title: `${PERSONA_NAMESPACE}/binding/signer-did`, fields: { text: "0xdead" } },
      { title: `${PERSONA_NAMESPACE}/hearth/true-name`,   fields: { text: "engine-cid" } },
    ];
    expect(foldPersonaSelves(rows)).toEqual([[1, { petname: "veil-two", handle: "Kahu Beta" }]]);
  });

  test("selves sort ascending by handle-index, so two devices converge on one ordering", () => {
    const rows = [
      { title: personaSelfTiddlerUri(5), fields: { petname: "e" } },
      { title: personaSelfTiddlerUri(0), fields: { petname: "a" } },
      { title: personaSelfTiddlerUri(2), fields: { petname: "c" } },
    ];
    expect(foldPersonaSelves(rows).map(([i]) => i)).toEqual([0, 2, 5]);
  });

  test("a fully-cleared self reads ABSENT rather than as an empty face", () => {
    const cleared = withoutPersonaSelfName(withPersonaSelfName({}, 4, "petname", "x", T0), 4, "petname", T1);
    expect(foldPersonaSelves([{ title: personaSelfTiddlerUri(4), fields: cleared }])).toEqual([]);
  });

  test("the title round-trips its handle-index, and a foreign title reads null", () => {
    expect(handleIndexFromSelfTiddlerUri(personaSelfTiddlerUri(7))).toBe(7);
    expect(handleIndexFromSelfTiddlerUri(`${PERSONA_NAMESPACE}/binding/signer-did`)).toBeNull();
    expect(handleIndexFromSelfTiddlerUri("some/other/title")).toBeNull();
  });
});

describe("the concurrent-fleet case, played out", () => {
  test("★ two vessels rename DIFFERENT names of the SAME persona — both survive the merge ★", () => {
    const base = withPersonaSelfName({}, 0, "petname", "old-label", T0);
    // Vessel A renames the private label; vessel B declares a Handle. Automerge merges by FIELD, and the two
    // writes touch disjoint fields, so the merged doc carries both — no last-writer-wins over the record.
    const a = withPersonaSelfName(base, 0, "petname", "new-label", T1);
    const b = withPersonaSelfName(base, 0, "handle", "Kahu Alpha", T1);
    const merged: PersonaSelfFields = { ...a, ...b, petname: a["petname"], "petname@": a["petname@"] };
    expect(foldPersonaSelf(merged)).toEqual({ petname: "new-label", handle: "Kahu Alpha" });
  });

  test("two vessels rename the SAME name — the later stamp reads, and the human can rename again", () => {
    const base  = withPersonaSelfName({}, 0, "petname", "old", T0);
    const later = withPersonaSelfName(base, 0, "petname", "b-wins", T2);
    // An earlier write arriving afterwards loses, so the outcome never depends on delivery order.
    expect(foldPersonaSelf(withPersonaSelfName(later, 0, "petname", "a-late", T1)).petname).toBe("b-wins");
  });
});
