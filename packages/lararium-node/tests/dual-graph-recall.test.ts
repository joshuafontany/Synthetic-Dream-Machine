/**
 * dual-graph-recall — P4: the RRF dual-graph query. Asserts the PURE rank-fusion math (k=60, a
 * both-lists drawer outranks a single-list one), the verbatim_sha join (content↔form pairing, and
 * content-only / form-only drawers handled gracefully), a real dual-query → sensible fused ranking
 * (orchestrator over fake search legs — no python, no chroma), and that the aperture/weight knob
 * shifts results. The where-filter builder is covered for the multi-aperture scoping.
 */

import { describe, expect, test } from "vitest";

import type { SearchArgs, SearchHit, SearchResult } from "@lararium/mempalace";
import type { MoveSkeleton, SerializedBasis } from "@lararium/tw5/form-layer";
import type { FormMatch } from "../src/formpalace.js";
import {
  fuseDualGraph, dualGraphRecall, buildFormWhere, combineWhere, makeFormSearch, DEFAULT_RRF_K,
  type DualGraphRecallDeps, type FormSearchPalace,
} from "../src/dual-graph-recall.js";

const sha = (c: string) => c.repeat(64);
const SHA_A = sha("a");
const SHA_B = sha("b");
const SHA_C = sha("c");
const SHA_Y = sha("d");

function contentHit(verbatimSha: string | null, extra: Partial<SearchHit> = {}): SearchHit {
  return {
    text: `drawer ${verbatimSha ?? "no-sha"}`,
    ...(verbatimSha !== null ? { lar_verbatim_sha: verbatimSha } : {}),
    ...extra,
  };
}
function formMatch(key: string, distance = 0.1, metadata: Record<string, unknown> = {}): FormMatch {
  return { key, distance, metadata: { lar_verbatim_sha: key, ...metadata } };
}

describe("fuseDualGraph — the pure RRF rank-fusion + verbatim_sha join", () => {
  test("RRF math: score = Σ 1/(k+rank), k=60, exact", () => {
    // content ranks: A=1, B=2 ; form ranks: B=1, C=2
    const fused = fuseDualGraph(
      [contentHit(SHA_A), contentHit(SHA_B)],
      [formMatch(SHA_B), formMatch(SHA_C)],
    );
    const byKey = new Map(fused.map((r) => [r.verbatimSha, r]));

    expect(DEFAULT_RRF_K).toBe(60);
    // A: content rank 1 only
    expect(byKey.get(SHA_A)!.fusedScore).toBeCloseTo(1 / 61, 12);
    // C: form rank 2 only
    expect(byKey.get(SHA_C)!.fusedScore).toBeCloseTo(1 / 62, 12);
    // B: BOTH — content rank 2 + form rank 1
    expect(byKey.get(SHA_B)!.fusedScore).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(byKey.get(SHA_B)!.contentScore).toBeCloseTo(1 / 62, 12);
    expect(byKey.get(SHA_B)!.formScore).toBeCloseTo(1 / 61, 12);
  });

  test("a drawer in BOTH lists outranks one in a single list (even a single-list rank-1)", () => {
    const fused = fuseDualGraph(
      [contentHit(SHA_A), contentHit(SHA_B)], // A is content rank-1
      [formMatch(SHA_B), formMatch(SHA_C)],   // B is also form rank-1
    );
    // B (in both) tops the ranking despite A being the content rank-1 hit.
    expect(fused[0]!.verbatimSha).toBe(SHA_B);
    expect(fused[0]!.inBoth).toBe(true);
    expect(fused[0]!.fusedScore).toBeGreaterThan(fused[1]!.fusedScore);
    // order: B (both) > A (1/61) > C (1/62)
    expect(fused.map((r) => r.verbatimSha)).toEqual([SHA_B, SHA_A, SHA_C]);
  });

  test("the verbatim_sha join pairs content↔form on one key", () => {
    const fused = fuseDualGraph([contentHit(SHA_A)], [formMatch(SHA_A)]);
    expect(fused).toHaveLength(1);
    const row = fused[0]!;
    expect(row.verbatimSha).toBe(SHA_A);
    expect(row.inBoth).toBe(true);
    expect(row.content).not.toBeNull();
    expect(row.form).not.toBeNull();
    expect(row.contentRank).toBe(1);
    expect(row.formRank).toBe(1);
  });

  test("a content-only drawer (no form partner) rides gracefully", () => {
    const fused = fuseDualGraph([contentHit(SHA_A)], []);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.verbatimSha).toBe(SHA_A);
    expect(fused[0]!.inBoth).toBe(false);
    expect(fused[0]!.content).not.toBeNull();
    expect(fused[0]!.form).toBeNull();
    expect(fused[0]!.formScore).toBe(0);
  });

  test("a form-only drawer (no content partner) rides gracefully", () => {
    const fused = fuseDualGraph([], [formMatch(SHA_Y)]);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.verbatimSha).toBe(SHA_Y);
    expect(fused[0]!.inBoth).toBe(false);
    expect(fused[0]!.content).toBeNull();
    expect(fused[0]!.form).not.toBeNull();
    expect(fused[0]!.contentScore).toBe(0);
  });

  test("a content hit with NO verbatim_sha never collides — its own content-only row", () => {
    const fused = fuseDualGraph(
      [contentHit(null, { source_path: "wing/x" }), contentHit(SHA_A)],
      [formMatch(SHA_A)],
    );
    // three logical drawers: the no-sha content-only one, plus the joined A.
    expect(fused).toHaveLength(2);
    const noSha = fused.find((r) => r.content !== null && r.form === null && r.verbatimSha === "");
    expect(noSha).toBeDefined();
    expect(noSha!.content!.source_path).toBe("wing/x");
    // the joined A is in both
    expect(fused.find((r) => r.verbatimSha === SHA_A)!.inBoth).toBe(true);
  });

  test("empty × empty → empty", () => {
    expect(fuseDualGraph([], [])).toEqual([]);
  });
});

describe("the aperture / weight knob shifts results", () => {
  test("formWeight tilts a form-top drawer above a content-top drawer", () => {
    const content = [contentHit(SHA_A)]; // content rank-1
    const form = [formMatch(SHA_B)];     // form rank-1

    // balanced: A and B tie on score (1/61 each); deterministic tiebreak puts A (sha "a…") first.
    const balanced = fuseDualGraph(content, form, { formWeight: 1 });
    expect(balanced[0]!.verbatimSha).toBe(SHA_A);

    // heavy form weight: B's form contribution (5/61) beats A's content (1/61) → B leads.
    const formHeavy = fuseDualGraph(content, form, { formWeight: 5 });
    expect(formHeavy[0]!.verbatimSha).toBe(SHA_B);
    expect(formHeavy[0]!.formScore).toBeCloseTo(5 / 61, 12);
  });

  test("a custom k changes the damping", () => {
    const fused = fuseDualGraph([contentHit(SHA_A)], [], { k: 0 });
    expect(fused[0]!.fusedScore).toBeCloseTo(1 / 1, 12); // 1/(0+1)
  });
});

describe("buildFormWhere — the multi-aperture metadata scoping", () => {
  test("no scope → undefined", () => {
    expect(buildFormWhere()).toBeUndefined();
    expect(buildFormWhere("", "")).toBeUndefined();
  });
  test("one facet → a flat clause", () => {
    expect(buildFormWhere("synthesis")).toEqual({ register: "synthesis" });
    expect(buildFormWhere(undefined, "x-memetic")).toEqual({ grammar_layer: "x-memetic" });
  });
  test("both facets → an $and", () => {
    expect(buildFormWhere("synthesis", "x-memetic")).toEqual({
      $and: [{ register: "synthesis" }, { grammar_layer: "x-memetic" }],
    });
  });

  test("a bearing clause alone → a flat clause", () => {
    expect(buildFormWhere(undefined, undefined, { bearing_root: "breach.watch.fires" })).toEqual({
      bearing_root: "breach.watch.fires",
    });
    expect(buildFormWhere(undefined, undefined, { bearing_w1: "breach" })).toEqual({
      bearing_w1: "breach",
    });
  });

  test("aperture + bearing facets compose into one $and (present-only, empties dropped)", () => {
    expect(
      buildFormWhere("synthesis", undefined, { bearing_w1: "breach", bearing_w3: "fires", bearing_frag: "" }),
    ).toEqual({
      $and: [{ register: "synthesis" }, { bearing_w1: "breach" }, { bearing_w3: "fires" }],
    });
  });
});

describe("combineWhere — AND clauses, flatten one $and level", () => {
  test("all undefined → undefined", () => {
    expect(combineWhere(undefined, undefined)).toBeUndefined();
  });
  test("one clause → itself", () => {
    expect(combineWhere(undefined, { register: "synthesis" })).toEqual({ register: "synthesis" });
  });
  test("a pre-built $and + a flat clause flatten into ONE $and (no nesting)", () => {
    const aperture = buildFormWhere("synthesis", "x-memetic"); // an $and of two
    const bearing = { bearing_root: "breach.watch.fires" };
    expect(combineWhere(aperture, bearing)).toEqual({
      $and: [{ register: "synthesis" }, { grammar_layer: "x-memetic" }, { bearing_root: "breach.watch.fires" }],
    });
  });
});

describe("makeFormSearch — the form-leg policy (bearing · markers · keywords)", () => {
  function fakePalace(matches: FormMatch[]): {
    palace: FormSearchPalace;
    filterCalls: { where?: Record<string, unknown>; nResults?: number }[];
    queryCalls: { skeleton: MoveSkeleton; basis: SerializedBasis; nResults?: number; where?: Record<string, unknown> }[];
  } {
    const filterCalls: { where?: Record<string, unknown>; nResults?: number }[] = [];
    const queryCalls: { skeleton: MoveSkeleton; basis: SerializedBasis; nResults?: number; where?: Record<string, unknown> }[] = [];
    const palace: FormSearchPalace = {
      async filter(input) { filterCalls.push(input); return matches; },
      async query(input) { queryCalls.push(input); return matches; },
    };
    return { palace, filterCalls, queryCalls };
  }
  const fakeDerive = () => ({ skeleton: {} as MoveSkeleton, basis: { axes: [], dimension: 0 } as SerializedBasis });

  test("a BEARING query → structured where-filter on the root, no vector", async () => {
    const { palace, filterCalls, queryCalls } = fakePalace([formMatch(SHA_A)]);
    const leg = makeFormSearch({ query: "lar:///breach.watch.fires/intent", formPalace: palace });
    const out = await leg({ nResults: 5 });
    expect(out).toHaveLength(1);
    expect(queryCalls).toHaveLength(0);          // NO vector query
    expect(filterCalls).toHaveLength(1);
    expect(filterCalls[0]!.nResults).toBe(5);
    expect(filterCalls[0]!.where).toEqual({ bearing_root: "breach.watch.fires" });
  });

  test("a BEARING query ANDs its root onto the incoming aperture where", async () => {
    const { palace, filterCalls } = fakePalace([]);
    const leg = makeFormSearch({ query: "lar:///breach.watch.fires", formPalace: palace });
    await leg({ nResults: 3, where: { register: "synthesis" } });
    expect(filterCalls[0]!.where).toEqual({
      $and: [{ register: "synthesis" }, { bearing_root: "breach.watch.fires" }],
    });
  });

  test("a MARKERS query (deriveSkeleton supplied) → vector similarity", async () => {
    const { palace, filterCalls, queryCalls } = fakePalace([formMatch(SHA_B)]);
    const leg = makeFormSearch({ query: "the turn <<~ ward ! >>", formPalace: palace, deriveSkeleton: fakeDerive });
    const out = await leg({ nResults: 4, where: { register: "synthesis" } });
    expect(out).toHaveLength(1);
    expect(filterCalls).toHaveLength(0);         // NO metadata filter
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0]!.nResults).toBe(4);
    expect(queryCalls[0]!.where).toEqual({ register: "synthesis" });
  });

  test("a MARKERS query with NO deriver degrades to the keyword branch", async () => {
    const { palace, filterCalls, queryCalls } = fakePalace([]);
    const leg = makeFormSearch({ query: "the turn <<~ ward ! >>", formPalace: palace });
    // no deriver, no aperture where → DEFER (content-only)
    const out = await leg({ nResults: 4 });
    expect(out).toEqual([]);
    expect(queryCalls).toHaveLength(0);
    expect(filterCalls).toHaveLength(0);
  });

  test("a KEYWORD query with an aperture scope → where-filter only", async () => {
    const { palace, filterCalls, queryCalls } = fakePalace([formMatch(SHA_A)]);
    const leg = makeFormSearch({ query: "what did we decide about deps", formPalace: palace });
    const out = await leg({ nResults: 6, where: { register: "synthesis" } });
    expect(out).toHaveLength(1);
    expect(queryCalls).toHaveLength(0);
    expect(filterCalls).toHaveLength(1);
    expect(filterCalls[0]!.where).toEqual({ register: "synthesis" });
  });

  test("a bare KEYWORD query with NO scope → DEFER (empty form leg, content-only fusion)", async () => {
    const { palace, filterCalls, queryCalls } = fakePalace([formMatch(SHA_A)]);
    const leg = makeFormSearch({ query: "what did we decide about deps", formPalace: palace });
    const out = await leg({ nResults: 6 });
    expect(out).toEqual([]);
    expect(filterCalls).toHaveLength(0);
    expect(queryCalls).toHaveLength(0);
  });
});

describe("dualGraphRecall × makeFormSearch — the wired recall", () => {
  test("a dual bearing query fuses content + the bearing-filtered form leg", async () => {
    const { palace } = (() => {
      const palace: FormSearchPalace = {
        async filter() { return [formMatch(SHA_B)]; },
        async query() { return []; },
      };
      return { palace };
    })();
    const deps: DualGraphRecallDeps = {
      async contentSearch(args) { return { query: args.query, results: [contentHit(SHA_A), contentHit(SHA_B)] }; },
      formSearch: makeFormSearch({ query: "lar:///breach.watch.fires", formPalace: palace }),
    };
    const res = await dualGraphRecall(deps, { query: "lar:///breach.watch.fires" });
    expect(res.contentCount).toBe(2);
    expect(res.formCount).toBe(1);
    // B rode both graphs → it tops the fused ranking.
    expect(res.results[0]!.verbatimSha).toBe(SHA_B);
    expect(res.results[0]!.inBoth).toBe(true);
  });

  test("a keyword-only dual query degrades to content-leaning WITHOUT error", async () => {
    const palace: FormSearchPalace = {
      async filter() { return []; },
      async query() { return []; },
    };
    const deps: DualGraphRecallDeps = {
      async contentSearch(args) { return { query: args.query, results: [contentHit(SHA_A)] }; },
      formSearch: makeFormSearch({ query: "plain keywords here", formPalace: palace }),
    };
    const res = await dualGraphRecall(deps, { query: "plain keywords here" });
    expect(res.formCount).toBe(0);             // form leg deferred
    expect(res.contentCount).toBe(1);
    expect(res.results).toHaveLength(1);
    expect(res.results[0]!.verbatimSha).toBe(SHA_A);
    expect(res.results[0]!.inBoth).toBe(false); // content-only
  });
});

describe("dualGraphRecall — the orchestrator over fake search legs (no python)", () => {
  function fakeDeps(content: SearchHit[], form: FormMatch[]): {
    deps: DualGraphRecallDeps;
    contentArgs: SearchArgs[];
    formArgs: { nResults: number; where?: Record<string, unknown> }[];
  } {
    const contentArgs: SearchArgs[] = [];
    const formArgs: { nResults: number; where?: Record<string, unknown> }[] = [];
    const deps: DualGraphRecallDeps = {
      async contentSearch(args) {
        contentArgs.push(args);
        return { query: args.query, results: content } satisfies SearchResult;
      },
      async formSearch(input) {
        formArgs.push(input);
        return form;
      },
    };
    return { deps, contentArgs, formArgs };
  }

  test("a real dual-query fuses both graphs into a sensible ranking", async () => {
    const { deps } = fakeDeps(
      [contentHit(SHA_A), contentHit(SHA_B)],
      [formMatch(SHA_B), formMatch(SHA_C)],
    );
    const res = await dualGraphRecall(deps, { query: "the verb leads" });
    expect(res.query).toBe("the verb leads");
    expect(res.k).toBe(60);
    expect(res.contentCount).toBe(2);
    expect(res.formCount).toBe(2);
    // B rode both graphs → it tops; C (form-only rank 2) trails.
    expect(res.results[0]!.verbatimSha).toBe(SHA_B);
    expect(res.results.map((r) => r.verbatimSha)).toEqual([SHA_B, SHA_A, SHA_C]);
  });

  test("the aperture knobs flow to the legs (wing→content, register/layer→form where)", async () => {
    const { deps, contentArgs, formArgs } = fakeDeps([contentHit(SHA_A)], [formMatch(SHA_A)]);
    await dualGraphRecall(deps, {
      query: "q", wing: "wing_x", limit: 7, register: "synthesis", grammarLayer: "x-memetic",
    });
    expect(contentArgs[0]).toEqual({ query: "q", wing: "wing_x", limit: 7 });
    expect(formArgs[0]!.nResults).toBe(7);
    expect(formArgs[0]!.where).toEqual({
      $and: [{ register: "synthesis" }, { grammar_layer: "x-memetic" }],
    });
  });

  test("limit caps the fused result count", async () => {
    const content = [contentHit(SHA_A), contentHit(SHA_B), contentHit(SHA_C)];
    const { deps } = fakeDeps(content, []);
    const res = await dualGraphRecall(deps, { query: "q", limit: 2 });
    expect(res.results).toHaveLength(2);
    expect(res.contentCount).toBe(3);
  });

  test("no form where-filter when no aperture scope is asked", async () => {
    const { deps, formArgs } = fakeDeps([contentHit(SHA_A)], []);
    await dualGraphRecall(deps, { query: "q" });
    expect(formArgs[0]!.where).toBeUndefined();
  });
});
