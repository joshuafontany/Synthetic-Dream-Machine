/**
 * multi-graph-recall — P4: the N-ary RRF multi-graph query. Asserts the PURE rank-fusion math (k=60,
 * a more-graphs drawer outranks a fewer-graphs one), the verbatim_sha join (content↔form↔… pairing,
 * single-leg drawers handled gracefully), the N-graph (3+) fold, the live markers→vector deriver, the
 * P6 paragraph aperture, and a real multi-query → sensible fused ranking (orchestrator over fake
 * search legs — no python, no chroma). The where-filter builder is covered for the multi-aperture
 * scoping.
 */

import { describe, expect, test } from "vitest";

import type { SearchArgs, SearchHit, SearchResult } from "@lararium/mempalace";
import type { MoveSkeleton, SerializedBasis } from "@lararium/tw5/form-layer";
import type { FormMatch } from "../src/formpalace.js";
import {
  fuseMultiGraph, multiGraphRecall, buildFormWhere, combineWhere, makeFormSearch, DEFAULT_RRF_K,
  contentLeg, formLeg, makeSkeletonDeriver, resolveApertureGrain, apertureWeight, weightByAperture,
  PARAGRAPH_APERTURE,
  type MultiGraphRecallDeps, type FormSearchPalace, type MultiGraphHit, type GraphLeg,
} from "../src/multi-graph-recall.js";

const sha = (c: string) => c.repeat(64);
const SHA_A = sha("a");
const SHA_B = sha("b");
const SHA_C = sha("c");
const SHA_D = sha("e");
const SHA_X = sha("f");
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
/** A ranked structure/extra leg straight from sha keys (the GraphItem shape). */
function shaLeg(name: string, shas: string[], weight?: number): GraphLeg {
  return {
    name,
    ...(weight !== undefined ? { weight } : {}),
    items: shas.map((s) => ({ key: s, sha: s, payload: { key: s } })),
  };
}

describe("fuseMultiGraph — the pure N-ary RRF rank-fusion + verbatim_sha join", () => {
  test("RRF math: score = Σ weight/(k+rank), k=60, exact", () => {
    // content ranks: A=1, B=2 ; form ranks: B=1, C=2
    const fused = fuseMultiGraph([
      contentLeg("content", [contentHit(SHA_A), contentHit(SHA_B)]),
      formLeg("form", [formMatch(SHA_B), formMatch(SHA_C)]),
    ]);
    const byKey = new Map(fused.map((r) => [r.verbatimSha, r]));

    expect(DEFAULT_RRF_K).toBe(60);
    expect(byKey.get(SHA_A)!.fusedScore).toBeCloseTo(1 / 61, 12);     // content rank 1 only
    expect(byKey.get(SHA_C)!.fusedScore).toBeCloseTo(1 / 62, 12);     // form rank 2 only
    // B: BOTH — content rank 2 + form rank 1
    expect(byKey.get(SHA_B)!.fusedScore).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(byKey.get(SHA_B)!.scores["content"]).toBeCloseTo(1 / 62, 12);
    expect(byKey.get(SHA_B)!.scores["form"]).toBeCloseTo(1 / 61, 12);
    expect(byKey.get(SHA_B)!.presentIn).toEqual(["content", "form"]);
  });

  test("a drawer in MORE graphs outranks one in a single graph (even a single-graph rank-1)", () => {
    const fused = fuseMultiGraph([
      contentLeg("content", [contentHit(SHA_A), contentHit(SHA_B)]), // A is content rank-1
      formLeg("form", [formMatch(SHA_B), formMatch(SHA_C)]),         // B is also form rank-1
    ]);
    expect(fused[0]!.verbatimSha).toBe(SHA_B);            // B (in both) tops despite A's content rank-1
    expect(fused[0]!.presentIn).toEqual(["content", "form"]);
    expect(fused[0]!.fusedScore).toBeGreaterThan(fused[1]!.fusedScore);
    expect(fused.map((r) => r.verbatimSha)).toEqual([SHA_B, SHA_A, SHA_C]);
  });

  test("the N-graph (3+) fold: a triple-confirmed drawer accrues all three contributions", () => {
    // X rides content(rank2) + form(rank1) + structure(rank1); each other drawer rides one graph.
    const fused = fuseMultiGraph([
      contentLeg("content", [contentHit(SHA_A), contentHit(SHA_X)]),
      formLeg("form", [formMatch(SHA_X), formMatch(SHA_C)]),
      shaLeg("structure", [SHA_X, SHA_D]),
    ]);
    const x = fused.find((r) => r.verbatimSha === SHA_X)!;
    expect(x.presentIn).toEqual(["content", "form", "structure"]);
    expect(x.fusedScore).toBeCloseTo(1 / 62 + 1 / 61 + 1 / 61, 12);
    expect(fused[0]!.verbatimSha).toBe(SHA_X);            // the triple-confirmed move tops
    // a single-graph structure-only drawer (D) still rides as its own row
    const d = fused.find((r) => r.verbatimSha === SHA_D)!;
    expect(d.presentIn).toEqual(["structure"]);
  });

  test("a per-graph WEIGHT tilts the fusion (the aperture tilt now rides on the leg)", () => {
    const balanced = fuseMultiGraph([
      contentLeg("content", [contentHit(SHA_A)]),
      formLeg("form", [formMatch(SHA_B)]),
    ]);
    expect(balanced[0]!.verbatimSha).toBe(SHA_A);         // tie → sha "a…" wins the tiebreak

    const formHeavy = fuseMultiGraph([
      contentLeg("content", [contentHit(SHA_A)]),
      formLeg("form", [formMatch(SHA_B)], 5),             // form leg weighted ×5
    ]);
    expect(formHeavy[0]!.verbatimSha).toBe(SHA_B);
    expect(formHeavy[0]!.scores["form"]).toBeCloseTo(5 / 61, 12);
  });

  test("the verbatim_sha join pairs content↔form on one key", () => {
    const fused = fuseMultiGraph([contentLeg("content", [contentHit(SHA_A)]), formLeg("form", [formMatch(SHA_A)])]);
    expect(fused).toHaveLength(1);
    const row = fused[0]!;
    expect(row.verbatimSha).toBe(SHA_A);
    expect(row.presentIn).toEqual(["content", "form"]);
    expect(row.payloads["content"]).toBeDefined();
    expect(row.payloads["form"]).toBeDefined();
    expect(row.ranks["content"]).toBe(1);
    expect(row.ranks["form"]).toBe(1);
  });

  test("a content-only drawer (no form partner) rides gracefully", () => {
    const fused = fuseMultiGraph([contentLeg("content", [contentHit(SHA_A)]), formLeg("form", [])]);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.verbatimSha).toBe(SHA_A);
    expect(fused[0]!.presentIn).toEqual(["content"]);
    expect(fused[0]!.payloads["content"]).toBeDefined();
    expect(fused[0]!.payloads["form"]).toBeUndefined();
    expect(fused[0]!.scores["form"]).toBeUndefined();
  });

  test("a form-only drawer (no content partner) rides gracefully", () => {
    const fused = fuseMultiGraph([contentLeg("content", []), formLeg("form", [formMatch(SHA_Y)])]);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.verbatimSha).toBe(SHA_Y);
    expect(fused[0]!.presentIn).toEqual(["form"]);
    expect(fused[0]!.payloads["content"]).toBeUndefined();
    expect(fused[0]!.payloads["form"]).toBeDefined();
    expect(fused[0]!.scores["content"]).toBeUndefined();
  });

  test("a content hit with NO verbatim_sha never collides — its own content-only row", () => {
    const fused = fuseMultiGraph([
      contentLeg("content", [contentHit(null, { source_path: "wing/x" }), contentHit(SHA_A)]),
      formLeg("form", [formMatch(SHA_A)]),
    ]);
    expect(fused).toHaveLength(2);
    const noSha = fused.find((r) => r.payloads["content"] && !r.payloads["form"] && r.verbatimSha === "");
    expect(noSha).toBeDefined();
    expect((noSha!.payloads["content"] as SearchHit).source_path).toBe("wing/x");
    expect(fused.find((r) => r.verbatimSha === SHA_A)!.presentIn).toEqual(["content", "form"]);
  });

  test("empty fold → empty", () => {
    expect(fuseMultiGraph([contentLeg("content", []), formLeg("form", [])])).toEqual([]);
    expect(fuseMultiGraph([])).toEqual([]);
  });

  test("a custom k changes the damping", () => {
    const fused = fuseMultiGraph([contentLeg("content", [contentHit(SHA_A)])], { k: 0 });
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
    expect(buildFormWhere(undefined, undefined, { bearing_w1: "breach" })).toEqual({ bearing_w1: "breach" });
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
    const aperture = buildFormWhere("synthesis", "x-memetic");
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
    expect(queryCalls).toHaveLength(0);
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
    expect(filterCalls).toHaveLength(0);
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0]!.nResults).toBe(4);
    expect(queryCalls[0]!.where).toEqual({ register: "synthesis" });
  });

  test("a MARKERS query with NO deriver degrades to the keyword branch", async () => {
    const { palace, filterCalls, queryCalls } = fakePalace([]);
    const leg = makeFormSearch({ query: "the turn <<~ ward ! >>", formPalace: palace });
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

// ---------------------------------------------------------------------------
// the MARKERS → VECTOR live deriver — recall-by-move-form (the jurus query)
// ---------------------------------------------------------------------------

describe("makeSkeletonDeriver — the live markers→vector path (node-side, no VM)", () => {
  const fakeBasis = { axes: [], dimension: 12 } as SerializedBasis;
  const MARKERS_QUERY = "what did we decide <<~ hud Aperture(10) OODA-HA(3) >> <<~ ward ! L-Prime >>";

  test("a sigil-bearing query → a derived skeleton (stream carries axis-bearing move tokens)", () => {
    const derive = makeSkeletonDeriver(() => fakeBasis);
    const out = derive(MARKERS_QUERY);
    expect(out).not.toBeNull();
    expect(out!.basis).toBe(fakeBasis);
    expect(out!.skeleton.stream.some((t) => t.axisId !== null)).toBe(true);
    expect(out!.skeleton.graph).toEqual([]);     // no meme-ast tree on the query side
  });

  test("a plain keyword query (no markers) → null (degrades to keyword/content)", () => {
    expect(makeSkeletonDeriver(() => fakeBasis)("what did we decide about deps")).toBeNull();
  });

  test("markers present but NO cached basis → null (degrades gracefully)", () => {
    expect(makeSkeletonDeriver(() => null)(MARKERS_QUERY)).toBeNull();
  });

  test("a zero-dimension basis → null (no real space to query)", () => {
    expect(makeSkeletonDeriver(() => ({ axes: [], dimension: 0 }) as SerializedBasis)(MARKERS_QUERY)).toBeNull();
  });

  test("wired into makeFormSearch: a markers query drives the VECTOR (query) path, not filter", async () => {
    const queryCalls: { skeleton: MoveSkeleton; basis: SerializedBasis }[] = [];
    const filterCalls: unknown[] = [];
    const palace: FormSearchPalace = {
      async query(input) { queryCalls.push(input); return [formMatch(SHA_B)]; },
      async filter(input) { filterCalls.push(input); return []; },
    };
    const leg = makeFormSearch({
      query: MARKERS_QUERY, formPalace: palace, deriveSkeleton: makeSkeletonDeriver(() => fakeBasis),
    });
    const out = await leg({ nResults: 5 });
    expect(out).toHaveLength(1);
    expect(queryCalls).toHaveLength(1);
    expect(filterCalls).toHaveLength(0);
    expect(queryCalls[0]!.basis.dimension).toBe(12);
  });

  test("wired into makeFormSearch: markers + a deriver that null-degrades → keyword branch (DEFER)", async () => {
    const queryCalls: unknown[] = [];
    const palace: FormSearchPalace = {
      async query(i) { queryCalls.push(i); return [formMatch(SHA_B)]; },
      async filter() { return []; },
    };
    const leg = makeFormSearch({
      query: MARKERS_QUERY, formPalace: palace, deriveSkeleton: makeSkeletonDeriver(() => null),
    });
    expect(await leg({ nResults: 5 })).toEqual([]);
    expect(queryCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// P6 — the PARAGRAPH-SCALE aperture (the basin-peak knob)
// ---------------------------------------------------------------------------

describe("resolveApertureGrain — band names / numbers → a 0..20 center", () => {
  test("the paragraph band resolves to PARAGRAPH_APERTURE (10)", () => {
    expect(PARAGRAPH_APERTURE).toBe(10);
    expect(resolveApertureGrain("paragraph")).toBe(10);
    expect(resolveApertureGrain("measure")).toBe(10);
  });
  test("a number / numeric string passes through; band names map; junk → undefined", () => {
    expect(resolveApertureGrain(14)).toBe(14);
    expect(resolveApertureGrain("18")).toBe(18);
    expect(resolveApertureGrain("theme")).toBe(18);
    expect(resolveApertureGrain("pulse")).toBe(2);
    expect(resolveApertureGrain(undefined)).toBeUndefined();
    expect(resolveApertureGrain("")).toBeUndefined();
    expect(resolveApertureGrain("nonsense")).toBeUndefined();
  });
});

describe("apertureWeight — the paragraph-centered triangular kernel", () => {
  test("paragraph grain peaks; off-grain falls to the floor; unknown stays neutral", () => {
    expect(apertureWeight(10)).toBeCloseTo(2, 12);
    expect(apertureWeight(0)).toBeCloseTo(0.5, 12);
    expect(apertureWeight(null)).toBe(1);
    expect(apertureWeight(undefined)).toBe(1);
    expect(apertureWeight(12.5)).toBeCloseTo(0.5 + 1.5 * 0.5, 12);
  });
});

describe("weightByAperture — re-weights a fused ranking toward paragraph grain", () => {
  function mgHit(s: string, fusedScore: number, opts: { aperture?: number; larAperture?: number } = {}): MultiGraphHit {
    const payloads: Record<string, unknown> = {};
    if (opts.aperture !== undefined) payloads["form"] = { key: s, distance: 0.1, metadata: { aperture: opts.aperture } };
    if (opts.larAperture !== undefined) payloads["content"] = { text: "x", lar_aperture: opts.larAperture };
    return { verbatimSha: s, fusedScore, scores: { content: fusedScore }, ranks: { content: 1 }, presentIn: ["content"], payloads };
  }
  test("a paragraph-grain drawer overtakes an equal-score off-grain drawer", () => {
    const out = weightByAperture([mgHit(SHA_A, 0.02, { aperture: 0 }), mgHit(SHA_B, 0.02, { aperture: 10 })], PARAGRAPH_APERTURE);
    expect(out[0]!.verbatimSha).toBe(SHA_B);
    expect(out[0]!.fusedScore).toBeGreaterThan(out[1]!.fusedScore);
  });
  test("an unknown-grain drawer is NOT penalized below a far-off-grain one (neutral × 1)", () => {
    const out = weightByAperture([mgHit(SHA_A, 0.02, { aperture: 0 }), mgHit(SHA_B, 0.02)], PARAGRAPH_APERTURE);
    expect(out[0]!.verbatimSha).toBe(SHA_B);
  });
  test("reads the content hit's lar_aperture when the form side has none", () => {
    const out = weightByAperture([mgHit(SHA_A, 0.02, { larAperture: 10 }), mgHit(SHA_C, 0.02, { larAperture: 0 })], PARAGRAPH_APERTURE);
    expect(out[0]!.verbatimSha).toBe(SHA_A);
  });
});

// ---------------------------------------------------------------------------
// the wired recall — makeFormSearch × multiGraphRecall
// ---------------------------------------------------------------------------

describe("multiGraphRecall × makeFormSearch — the wired recall", () => {
  test("a bearing query fuses content + the bearing-filtered form leg", async () => {
    const palace: FormSearchPalace = { async filter() { return [formMatch(SHA_B)]; }, async query() { return []; } };
    const deps: MultiGraphRecallDeps = {
      async contentSearch(args) { return { query: args.query, results: [contentHit(SHA_A), contentHit(SHA_B)] }; },
      formSearch: makeFormSearch({ query: "lar:///breach.watch.fires", formPalace: palace }),
    };
    const res = await multiGraphRecall(deps, { query: "lar:///breach.watch.fires" });
    expect(res.counts["content"]).toBe(2);
    expect(res.counts["form"]).toBe(1);
    expect(res.results[0]!.verbatimSha).toBe(SHA_B);
    expect(res.results[0]!.presentIn).toEqual(["content", "form"]);
  });

  test("a keyword-only query degrades to content-leaning WITHOUT error", async () => {
    const palace: FormSearchPalace = { async filter() { return []; }, async query() { return []; } };
    const deps: MultiGraphRecallDeps = {
      async contentSearch(args) { return { query: args.query, results: [contentHit(SHA_A)] }; },
      formSearch: makeFormSearch({ query: "plain keywords here", formPalace: palace }),
    };
    const res = await multiGraphRecall(deps, { query: "plain keywords here" });
    expect(res.counts["form"]).toBe(0);
    expect(res.counts["content"]).toBe(1);
    expect(res.results).toHaveLength(1);
    expect(res.results[0]!.presentIn).toEqual(["content"]);
  });
});

describe("multiGraphRecall — the orchestrator over fake search legs (no python)", () => {
  function fakeDeps(content: SearchHit[], form: FormMatch[]): {
    deps: MultiGraphRecallDeps;
    contentArgs: SearchArgs[];
    formArgs: { nResults: number; where?: Record<string, unknown> }[];
  } {
    const contentArgs: SearchArgs[] = [];
    const formArgs: { nResults: number; where?: Record<string, unknown> }[] = [];
    const deps: MultiGraphRecallDeps = {
      async contentSearch(args) { contentArgs.push(args); return { query: args.query, results: content } satisfies SearchResult; },
      async formSearch(input) { formArgs.push(input); return form; },
    };
    return { deps, contentArgs, formArgs };
  }

  test("a real multi-query fuses both graphs into a sensible ranking", async () => {
    const { deps } = fakeDeps([contentHit(SHA_A), contentHit(SHA_B)], [formMatch(SHA_B), formMatch(SHA_C)]);
    const res = await multiGraphRecall(deps, { query: "the verb leads" });
    expect(res.query).toBe("the verb leads");
    expect(res.k).toBe(60);
    expect(res.counts["content"]).toBe(2);
    expect(res.counts["form"]).toBe(2);
    expect(res.results[0]!.verbatimSha).toBe(SHA_B);
    expect(res.results.map((r) => r.verbatimSha)).toEqual([SHA_B, SHA_A, SHA_C]);
  });

  test("an EXTRA graph (3-leg) fuses alongside content+form with zero core change", async () => {
    const { deps } = fakeDeps([contentHit(SHA_A)], [formMatch(SHA_X)]);
    const res = await multiGraphRecall(
      {
        ...deps,
        extraGraphs: [{
          name: "structure",
          search: async () => [{ key: SHA_X, sha: SHA_X, payload: { struct: 1 } }],
        }],
      },
      { query: "q" },
    );
    expect(res.counts["structure"]).toBe(1);
    // X rides form + structure → it tops; A (content only) trails.
    expect(res.results[0]!.verbatimSha).toBe(SHA_X);
    expect(res.results[0]!.presentIn).toEqual(["form", "structure"]);
  });

  test("the aperture knobs flow to the legs (wing→content, register/layer→form where, formWeight→leg)", async () => {
    const { deps, contentArgs, formArgs } = fakeDeps([contentHit(SHA_A)], [formMatch(SHA_A)]);
    const res = await multiGraphRecall(deps, {
      query: "q", wing: "wing_x", limit: 7, register: "synthesis", grammarLayer: "x-memetic", formWeight: 5,
    });
    expect(contentArgs[0]).toEqual({ query: "q", wing: "wing_x", limit: 7 });
    expect(formArgs[0]!.nResults).toBe(7);
    expect(formArgs[0]!.where).toEqual({ $and: [{ register: "synthesis" }, { grammar_layer: "x-memetic" }] });
    // formWeight rode the form leg → the joined A's form contribution is ×5.
    expect(res.results[0]!.scores["form"]).toBeCloseTo(5 / 61, 12);
  });

  test("limit caps the fused result count", async () => {
    const { deps } = fakeDeps([contentHit(SHA_A), contentHit(SHA_B), contentHit(SHA_C)], []);
    const res = await multiGraphRecall(deps, { query: "q", limit: 2 });
    expect(res.results).toHaveLength(2);
    expect(res.counts["content"]).toBe(3);
  });

  test("no form where-filter when no aperture scope is asked", async () => {
    const { deps, formArgs } = fakeDeps([contentHit(SHA_A)], []);
    await multiGraphRecall(deps, { query: "q" });
    expect(formArgs[0]!.where).toBeUndefined();
  });

  test("the P6 aperture knob re-ranks the fused result + reports the resolved center", async () => {
    const deps: MultiGraphRecallDeps = {
      async contentSearch(args) { return { query: args.query, results: [contentHit(SHA_A)] }; },
      async formSearch() { return [formMatch(SHA_B, 0.1, { aperture: 0 }), formMatch(SHA_C, 0.2, { aperture: 10 })]; },
    };
    const res = await multiGraphRecall(deps, { query: "the verb leads", apertureGrain: "paragraph" });
    expect(res.apertureGrain).toBe(10);
    const idxB = res.results.findIndex((r) => r.verbatimSha === SHA_B);
    const idxC = res.results.findIndex((r) => r.verbatimSha === SHA_C);
    expect(idxC).toBeLessThan(idxB);     // paragraph-grain SHA_C overtakes off-grain SHA_B
  });

  test("no apertureGrain → no re-weighting, apertureGrain reported null", async () => {
    const { deps } = fakeDeps([contentHit(SHA_A)], []);
    const res = await multiGraphRecall(deps, { query: "q" });
    expect(res.apertureGrain).toBeNull();
  });
});
