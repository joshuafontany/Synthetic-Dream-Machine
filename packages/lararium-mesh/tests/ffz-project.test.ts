/**
 * ffz-project — the `lar_ffz` rhythmic address as a NESTED-MEMBERSHIP CONTAINMENT PATH.
 *
 * Proves: ffzMembershipAddress builds a coarse→fine path from membership cells (graceful omission
 * of absent/fluid cells); ffzTruncate yields a clean coarser prefix; ffzCoDepth/ffzLca
 * read the ULTRAMETRIC distance (the longest-common-prefix / lowest common ancestor —
 * same session, different turns share Arc not Beat; different sessions share only the
 * root); and the build-patch wire stamps Arc (free, from source_file) + Pulse, omits the
 * fluid bands, and carries ZERO causality (the PATH-B cut).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import {
  ffzMembershipAddress,
  ffzTruncate,
  ffzCoDepth,
  ffzLca,
  ffzHasCell,
  FFZ_ADDRESS_ORDER,
  FFZ_ABSENT,
  buildPatch,
  harvestTurnGradient,
} from "../src/index.js";

const h = () => harvestTurnGradient("Lares (Council): the verb leads");

describe("ffzMembershipAddress — a coarse→fine membership path, gracefully partial", () => {
  test("pure + deterministic: same cells → identical address", () => {
    const a = ffzMembershipAddress({ arc: "sessA", beat: "t8", pulse: "drwX", profile: "session" });
    const b = ffzMembershipAddress({ arc: "sessA", beat: "t8", pulse: "drwX", profile: "session" });
    expect(a).toBe(b);
  });

  test("a full set carries all five coarse→fine bands (Theme first)", () => {
    const addr = ffzMembershipAddress({ theme: "th", arc: "ar", measure: "me", beat: "be", pulse: "pu" });
    const [profile, tuple] = addr.split("/");
    expect(profile).toBe("session"); // default tree-root
    expect(tuple!.split(".")).toHaveLength(FFZ_ADDRESS_ORDER.length); // 5 bands
    expect(tuple).toBe("th.ar.me.be.pu");
  });

  test("absent leading/interior cells render as the porous sentinel; trailing cells omit", () => {
    // Arc + Pulse only (the stage-one free bands): Theme/Measure/Beat absent.
    const addr = ffzMembershipAddress({ arc: "sessA", pulse: "drwX" });
    expect(addr).toBe(`session/${FFZ_ABSENT}.sessA.${FFZ_ABSENT}.${FFZ_ABSENT}.drwX`);
    // Arc only: trailing absents (Measure/Beat/Pulse) drop entirely.
    expect(ffzMembershipAddress({ arc: "sessA" })).toBe(`session/${FFZ_ABSENT}.sessA`);
    // nothing real → the bare root.
    expect(ffzMembershipAddress({})).toBe("session/");
  });

  test("labels are delimiter-safe: dots/slashes/whitespace in a cell collapse to '-'", () => {
    const addr = ffzMembershipAddress({ arc: "claude__run-abc.jsonl", pulse: "a/b c" });
    const segs = addr.split("/")[1]!.split(".");
    expect(segs).toHaveLength(5); // no extra segment split out of the dotted source_file
    expect(segs[1]).toBe("claude__run-abc-jsonl");
    expect(segs[4]).toBe("a-b-c");
  });

  test("an explicit profile rides as the tree-root", () => {
    expect(ffzMembershipAddress({ arc: "x", profile: "diegetic" }).startsWith("diegetic/")).toBe(true);
  });

  test("ffzHasCell — true with a real cell, false for the bare root", () => {
    expect(ffzHasCell(ffzMembershipAddress({ arc: "x" }))).toBe(true);
    expect(ffzHasCell(ffzMembershipAddress({}))).toBe(false);
  });
});

describe("ffzTruncate — prefix-truncation drops trailing (finer) bands cleanly", () => {
  test("a coarser read is a clean prefix of the full address", () => {
    const full = ffzMembershipAddress({ theme: "th", arc: "ar", measure: "me", beat: "be", pulse: "pu" });
    const coarse = ffzTruncate(full, 2); // keep Theme.Arc
    expect(coarse.split("/")[1]!.split(".")).toHaveLength(2);
    expect(full.startsWith(coarse)).toBe(true);
  });

  test("the profile prefix is preserved; clamps to available bands", () => {
    const full = ffzMembershipAddress({ theme: "th", arc: "ar", measure: "me", beat: "be", pulse: "pu" });
    expect(ffzTruncate(full, 99).split("/")[1]!.split(".")).toHaveLength(5); // clamp up
    expect(ffzTruncate(full, 0)).toBe("session/"); // profile kept, no bands
  });
});

describe("ffzCoDepth / ffzLca — the ultrametric (longest-common-prefix = LCA depth)", () => {
  // Two drawers in the SAME session (same Arc) but DIFFERENT turns (different Pulse).
  const a = ffzMembershipAddress({ arc: "sessA", pulse: "drw1" });
  const b = ffzMembershipAddress({ arc: "sessA", pulse: "drw2" });
  // A drawer in a DIFFERENT session.
  const c = ffzMembershipAddress({ arc: "sessB", pulse: "drw3" });

  test("same session, different turns → share Arc, not the finer cell (co-depth 1)", () => {
    expect(ffzCoDepth(a, b)).toBe(1); // Arc shared; Pulse diverges
    expect(ffzLca(a, b)).toBe(`session/${FFZ_ABSENT}.sessA`); // the LCA node = the Arc cell
  });

  test("different sessions → share only the root (co-depth 0)", () => {
    expect(ffzCoDepth(a, c)).toBe(0); // Arc diverges
    expect(ffzLca(a, c)).toBe("session/"); // only the tree-root
  });

  test("a drawer is maximally near itself (co-depth = its real cell count)", () => {
    expect(ffzCoDepth(a, a)).toBe(2); // Arc + Pulse
    expect(ffzLca(a, a)).toBe(a);
  });

  test("an absent (fluid) band is porous — a coarser shared cell reads through it", () => {
    // Beat present on one side, absent on the other: the shared Arc still counts.
    const withBeat = ffzMembershipAddress({ arc: "sessA", beat: "t1", pulse: "drwZ" });
    const noBeat = ffzMembershipAddress({ arc: "sessA", pulse: "drwY" });
    expect(ffzCoDepth(withBeat, noBeat)).toBe(1); // Arc shared; Beat porous on one side
  });

  test("same session AND same turn (same Beat) → share Arc + Beat (co-depth 2)", () => {
    const x = ffzMembershipAddress({ arc: "sessA", beat: "t1", pulse: "drwA" });
    const y = ffzMembershipAddress({ arc: "sessA", beat: "t1", pulse: "drwB" });
    expect(ffzCoDepth(x, y)).toBe(2); // Arc + Beat; Pulse diverges
    expect(ffzLca(x, y)).toBe(`session/${FFZ_ABSENT}.sessA.${FFZ_ABSENT}.t1`);
  });

  test("a different profile (a different tree) → co-depth 0, no common tree", () => {
    const d = ffzMembershipAddress({ arc: "sessA", pulse: "drw1", profile: "diegetic" });
    expect(ffzCoDepth(a, d)).toBe(0);
    expect(ffzLca(a, d)).toBe("");
  });
});

describe("buildPatch wire — lar_ffz stamps Arc (free) + Pulse, omits fluid bands, no causality", () => {
  test("source_file alone ⇒ lar_ffz stamps the Arc cell (the session, given free)", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl");
    // Arc derived from source_file (basename, extension stripped); Pulse/Beat absent.
    expect(p["lar_ffz"]).toBe("session/_.claude__sess1");
  });

  test("no source_file and no context ⇒ no lar_ffz (nothing to address)", () => {
    const p = buildPatch(h());
    expect(p["lar_ffz"]).toBeUndefined();
  });

  test("source_file + Pulse cell ⇒ Arc + Pulse stamp, the fluid bands omitted", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { pulse: "drwX" });
    expect(p["lar_ffz"]).toBe("session/_.claude__sess1._._.drwX");
    // exactly the five-slot tuple with the two fluid bands + Beat porous.
    expect(String(p["lar_ffz"]).split("/")[1]!.split(".")).toHaveLength(5);
  });

  test("Beat threads when supplied (a per-island turn cell)", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { pulse: "drwX", beat: "t3" });
    expect(p["lar_ffz"]).toBe("session/_.claude__sess1._.t3.drwX");
  });

  test("an explicit profile threads through to the stamp", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { pulse: "drwX", ffzProfile: "diegetic" });
    expect(String(p["lar_ffz"]).startsWith("diegetic/")).toBe(true);
  });

  test("two same-session drawers' stamps read same-session via ffzCoDepth", () => {
    const p1 = buildPatch(h(), "claude__sess1.jsonl", undefined, { pulse: "drw1" });
    const p2 = buildPatch(h(), "claude__sess1.jsonl", undefined, { pulse: "drw2" });
    expect(ffzCoDepth(String(p1["lar_ffz"]), String(p2["lar_ffz"]))).toBe(1); // share Arc
  });

  test("lar_ffz carries NO causality field — it is a rhythm-only membership string", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { pulse: "drwX" });
    expect(typeof p["lar_ffz"]).toBe("string");
    // the patch holds only the str/int chroma scalars — no edge/causal/itc field rode in
    expect(Object.keys(p).some((k) => /causal|edge|happens|itc/i.test(k))).toBe(false);
  });
});
