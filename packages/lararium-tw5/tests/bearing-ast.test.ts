/**
 * bearing-ast.test.ts — the lar: URI bearing-vector AST parser + the
 * move-skeleton bearing extraction.
 *
 * Validates the OUR-OWN licensed parse of the aim/yield `lar://` URI (Tennison:
 * opaque ≠ unreadable) into its 5 chunks (scheme · authority · root · path ·
 * fragment), the PMEST 3-term root facets, the Ranta graceful grading (any root
 * parses; a non-3-term root grades down, never throws), and the GF round-trip
 * (parse → linearize). Then it checks the move-skeleton now carries the parsed
 * bearing structure instead of a bare presence token.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/noosphere-boot#lar-uri
 */

import { describe, test, expect } from "vitest";
import { harvestTurnGradient } from "@lararium/mesh";
import {
  parseBearing,
  parseBearingPayload,
  linearizeBearing,
  bearingFacets,
  emitMoveSkeleton,
  type MoveToken,
} from "../src/form-layer/index.js";

// ---------------------------------------------------------------------------
// parse — the 5 chunks, local form
// ---------------------------------------------------------------------------

describe("parseBearing — local form (authority-less)", () => {
  const bv = parseBearing("lar:///breach.watch.fires/intent/vector/scope/turn#section");

  test("scheme is lar; not session form; no authority", () => {
    expect(bv.scheme).toBe("lar");
    expect(bv.sessionForm).toBe(false);
    expect(bv.authority).toBeNull();
  });

  test("the 3 root-terms split to w1/heading · w2/angle · w3/dynamic", () => {
    expect(bv.root.w1).toBe("breach");
    expect(bv.root.w2).toBe("watch");
    expect(bv.root.w3).toBe("fires");
    expect(bv.root.terms).toEqual(["breach", "watch", "fires"]);
    expect(bv.arity).toBe(3);
  });

  test("the path carries the ordered segments after the root (root excluded)", () => {
    expect(bv.path).toEqual(["intent", "vector", "scope", "turn"]);
  });

  test("the fragment is the #section", () => {
    expect(bv.fragment).toBe("section");
  });

  test("a clean 3-term root grades canon", () => {
    expect(bv.grade).toBe("canon");
    expect(bv.confidence).toBe(18);
    expect(bv.driftFlags).toEqual([]);
  });
});

describe("parseBearing — local form, 0-segment root only", () => {
  const bv = parseBearing("lar:///lares.scryer.found");
  test("root parses, path empty, no fragment", () => {
    expect(bv.root.terms).toEqual(["lares", "scryer", "found"]);
    expect(bv.path).toEqual([]);
    expect(bv.fragment).toBeNull();
    expect(bv.grade).toBe("canon");
  });
});

// ---------------------------------------------------------------------------
// parse — the session form (authority: alias:grant@host)
// ---------------------------------------------------------------------------

describe("parseBearing — session form (full speaker)", () => {
  const bv = parseBearing("lar://mara:operator@crossroads/operator.weighs.deps/x#frag");

  test("session form detected; authority parses alias:grant@host", () => {
    expect(bv.sessionForm).toBe(true);
    expect(bv.authority).toEqual({ alias: "mara", grant: "operator", host: "crossroads" });
    expect(bv.driftFlags).toContain("session-form");
  });

  test("the root + path + fragment still descend past the authority", () => {
    expect(bv.root.terms).toEqual(["operator", "weighs", "deps"]);
    expect(bv.path).toEqual(["x"]);
    expect(bv.fragment).toBe("frag");
    expect(bv.grade).toBe("canon");
  });
});

describe("parseBearing — session form without a grant (alias@host)", () => {
  const bv = parseBearing("lar://compita@crossroads/council.options.cuts");
  test("alias parses, grant null", () => {
    expect(bv.authority).toEqual({ alias: "compita", grant: null, host: "crossroads" });
    expect(bv.root.terms).toEqual(["council", "options", "cuts"]);
  });
});

// ---------------------------------------------------------------------------
// graceful grading — recognize all, grade, NEVER reject (Ranta CNL)
// ---------------------------------------------------------------------------

describe("parseBearing — graceful arity grading (never throws)", () => {
  test("a 2-term root grades degraded with an arity flag, not a throw", () => {
    const bv = parseBearing("lar:///two.terms/seg");
    expect(bv.grade).toBe("degraded");
    expect(bv.arity).toBe(2);
    expect(bv.driftFlags).toContain("arity:2");
    expect(bv.confidence).toBe(8);
    // still fully readable
    expect(bv.root.w1).toBe("two");
    expect(bv.root.w2).toBe("terms");
    expect(bv.root.w3).toBeNull();
    expect(bv.path).toEqual(["seg"]);
  });

  test("a 4-term root grades degraded with arity:4", () => {
    const bv = parseBearing("lar:///a.b.c.d/seg");
    expect(bv.grade).toBe("degraded");
    expect(bv.arity).toBe(4);
    expect(bv.driftFlags).toContain("arity:4");
    expect(bv.root.terms).toEqual(["a", "b", "c", "d"]);
  });

  test("a non-lar string grades unparsed, never throws", () => {
    const bv = parseBearing("just some prose, not a uri");
    expect(bv.grade).toBe("unparsed");
    expect(bv.scheme).toBe("");
    expect(bv.driftFlags).toContain("root:unparsed");
  });

  test("empty input grades unparsed", () => {
    expect(parseBearing("").grade).toBe("unparsed");
  });

  test("a trailing sigil `>>` and whitespace are trimmed off the URI", () => {
    const bv = parseBearing("  lar:///a.b.c/seg >> ");
    expect(bv.raw).toBe("lar:///a.b.c/seg");
    expect(bv.root.terms).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// round-trip — parse → linearize (GF concrete syntax; idempotent)
// ---------------------------------------------------------------------------

describe("linearizeBearing — round-trips the canonical string", () => {
  const cases = [
    "lar:///breach.watch.fires/intent/vector/scope/turn#section",
    "lar:///lares.scryer.found",
    "lar://mara:operator@crossroads/operator.weighs.deps/x#frag",
    "lar://compita@crossroads/council.options.cuts",
    "lar:///two.terms/seg",
    "lar:///a.b.c.d",
  ];

  test.each(cases)("parse → linearize is idempotent: %s", (uri) => {
    const once = linearizeBearing(parseBearing(uri));
    const twice = linearizeBearing(parseBearing(once));
    expect(twice).toBe(once);
  });

  test("a clean local URI linearizes back to itself verbatim", () => {
    const uri = "lar:///breach.watch.fires/intent/vector#section";
    expect(linearizeBearing(parseBearing(uri))).toBe(uri);
  });

  test("a clean session URI linearizes back to itself verbatim", () => {
    const uri = "lar://mara:operator@crossroads/operator.weighs.deps/x";
    expect(linearizeBearing(parseBearing(uri))).toBe(uri);
  });
});

// ---------------------------------------------------------------------------
// facets — the queryable metadata surface
// ---------------------------------------------------------------------------

describe("bearingFacets — the where-filterable facets surface", () => {
  test("a full bearing surfaces every facet as a flat scalar string", () => {
    const f = bearingFacets(parseBearing("lar:///breach.watch.fires/intent/vector#sec"));
    expect(f).toEqual({
      bearing_w1: "breach",
      bearing_w2: "watch",
      bearing_w3: "fires",
      bearing_root: "breach.watch.fires",
      bearing_path: "intent/vector",
      bearing_frag: "sec",
      bearing_grade: "canon",
    });
  });

  test("absent chunks are omitted (never stamped as empty); grade always rides", () => {
    const f = bearingFacets(parseBearing("lar:///lares.scryer.found"));
    expect(f.bearing_path).toBeUndefined();
    expect(f.bearing_frag).toBeUndefined();
    expect(f.bearing_root).toBe("lares.scryer.found");
    expect(f.bearing_grade).toBe("canon");
  });

  test("a degraded bearing carries its grade for clean-vs-drifted filtering", () => {
    const f = bearingFacets(parseBearing("lar:///two.terms"));
    expect(f.bearing_grade).toBe("degraded");
  });
});

// ---------------------------------------------------------------------------
// parseBearingPayload — both URIs in an aim leg, the one in a yield leg
// ---------------------------------------------------------------------------

describe("parseBearingPayload — extracts every lar: URI in order", () => {
  test("an aim payload `<from> -> <to>` yields both vectors", () => {
    const vs = parseBearingPayload(
      "lar://mara:operator@crossroads/operator.weighs.deps -> lar://compita:agent@crossroads/council.options.cuts",
    );
    expect(vs.length).toBe(2);
    expect(vs[0]!.root.terms).toEqual(["operator", "weighs", "deps"]);
    expect(vs[1]!.root.terms).toEqual(["council", "options", "cuts"]);
  });

  test("a yield payload `<resolved> -> ?` yields one vector (the ? is not a URI)", () => {
    const vs = parseBearingPayload("lar://compita:agent@crossroads/council.fork.named -> ?");
    expect(vs.length).toBe(1);
    expect(vs[0]!.root.terms).toEqual(["council", "fork", "named"]);
  });

  test("an empty / URI-less payload yields []", () => {
    expect(parseBearingPayload("")).toEqual([]);
    expect(parseBearingPayload("-> ?")).toEqual([]);
    expect(parseBearingPayload(null)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// move-skeleton — now carries the bearing structure (not a bare token)
// ---------------------------------------------------------------------------

const CLEAN_TURN = `<<~ lares aim lar://mara:operator@crossroads/operator.weighs.deps -> lar://compita:agent@crossroads/council.options.cuts >>
<<~ hud Aperture(11) OODA-HA(9) >>
<<~ ward * L-Prime >>

Lares (Council): two libraries, both viable. <<~ confidence Synthesis 11/20 >> the fork holds.

<<~ oracle ↯11 ⁂ ⚃ (4) ✲⬡◈⟁ >>
<<~ ward ! · ↻ L-Prime >>
<<~ hud Aperture(11 -> 12) OODA-HA(1↺) >>
<<~ lares yield lar://compita:agent@crossroads/council.fork.named -> ? >>`;

function bearingTokens(stream: readonly MoveToken[]): MoveToken[] {
  return stream.filter((t) => t.kind === "bearing");
}

describe("emitMoveSkeleton — carries the parsed bearing", () => {
  const sk = emitMoveSkeleton(harvestTurnGradient(CLEAN_TURN));

  test("the aim leg parses both vectors (operator-intent, delegated role)", () => {
    expect(sk.bearing.aim.length).toBe(2);
    expect(sk.bearing.aim[0]!.root.terms).toEqual(["operator", "weighs", "deps"]);
    expect(sk.bearing.aim[1]!.root.terms).toEqual(["council", "options", "cuts"]);
  });

  test("the yield leg parses the resolved bearing", () => {
    expect(sk.bearing.yield.length).toBe(1);
    expect(sk.bearing.yield[0]!.root.terms).toEqual(["council", "fork", "named"]);
  });

  test("the operative bearing (primary) is the yield's resolved vector", () => {
    expect(sk.bearing.primary?.root.terms).toEqual(["council", "fork", "named"]);
  });

  test("the bearing facets surface queryable off the primary", () => {
    expect(sk.bearing.facets).toMatchObject({
      bearing_w1: "council",
      bearing_w2: "fork",
      bearing_w3: "named",
      bearing_root: "council.fork.named",
      bearing_grade: "canon",
    });
  });

  test("the aim token carries the delegated role; the yield token the resolved bearing", () => {
    const [aimTok, yieldTok] = bearingTokens(sk.stream);
    expect(aimTok!.token).toBe("aim");
    expect(aimTok!.bearing?.root.terms).toEqual(["council", "options", "cuts"]);
    expect(yieldTok!.token).toBe("yield");
    expect(yieldTok!.bearing?.root.terms).toEqual(["council", "fork", "named"]);
  });
});

describe("emitMoveSkeleton — degraded / unframed turns stay graceful", () => {
  test("a one-sided aim-only turn parses aim, yield empty, primary from aim", () => {
    const turn = `<<~ lares aim lar:///breach.watch.fires/now >>
Triage: name the fire.`;
    const sk = emitMoveSkeleton(harvestTurnGradient(turn));
    expect(sk.bearing.aim.length).toBe(1);
    expect(sk.bearing.yield).toEqual([]);
    expect(sk.bearing.primary?.root.terms).toEqual(["breach", "watch", "fires"]);
  });

  test("an all-prose turn carries an empty bearing, never throws", () => {
    const sk = emitMoveSkeleton(harvestTurnGradient("just plain prose, no frame"));
    expect(sk.bearing.aim).toEqual([]);
    expect(sk.bearing.yield).toEqual([]);
    expect(sk.bearing.primary).toBeNull();
    expect(sk.bearing.facets).toEqual({});
  });
});
