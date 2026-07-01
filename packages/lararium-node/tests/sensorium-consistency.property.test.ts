/**
 * sensorium-consistency — ADVERSARIAL / property-based attack on the Robinson consistency-radius
 * (The-Sword QA, 2026-07-01). Many random + adversarial cases per invariant:
 *   · radius === 0 ⟺ the li-planes GLUE (agree on every overlap); ANY seeded disagreement ⇒ > 0.
 *   · vacuous NEVER false-glues (disjoint / empty ⇒ vacuous, glues === false, radius 0).
 *   · a cosheaf plane THROWS (never faked through the li restriction map).
 *   · the obstruction locus lies INSIDE the actual disagreement.
 *   · symmetry (permutation-invariant radius) + monotonicity (widening a gap never shrinks it).
 *
 * Exhausted clean — no break found; the radius holds its invariants under fuzzing.
 */

import { describe, test, expect } from "vitest";
import {
  consistencyRadius, chebyshevStalkMetric,
  type PlaneRestriction, type ComparisonStalk,
} from "../src/sensorium-consistency.js";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RUNS = 500;
const sheaf = (plane: string, v: Map<string, number>): PlaneRestriction =>
  ({ plane, variance: "sheaf", value: v });

/** A random restriction over a random subset of the stalk units, values in [0,1]. */
function randRestriction(u: () => number, plane: string, units: string[]): PlaneRestriction {
  const v = new Map<string, number>();
  for (const unit of units) if (u() < 0.7) v.set(unit, u()); // ~70% domain coverage
  return sheaf(plane, v);
}

// ── radius === 0 ⟺ the planes GLUE (independent recomputation of the truth) ──────────────────

describe("consistencyRadius — 0 iff glue (property)", () => {
  test("radius === 0 && !vacuous ⟺ every BINDING pair agrees on every overlap unit", () => {
    const u = rng(11);
    for (let i = 0; i < RUNS; i++) {
      const K = 1 + Math.floor(u() * 5);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const stalk: ComparisonStalk = { units };
      const restrictions = ["content", "structure", "form"].map((p) => randRestriction(u, p, units));
      const r = consistencyRadius(restrictions, stalk);

      // INDEPENDENT truth: does every overlapping pair agree exactly on every shared unit?
      let anyOverlap = false, allAgree = true;
      for (let a = 0; a < restrictions.length; a++) {
        for (let b = a + 1; b < restrictions.length; b++) {
          const va = restrictions[a]!.value, vb = restrictions[b]!.value;
          const overlap = [...va.keys()].filter((k) => vb.has(k) && units.includes(k));
          if (overlap.length === 0) continue;
          anyOverlap = true;
          for (const k of overlap) if (va.get(k) !== vb.get(k)) allAgree = false;
        }
      }
      if (!anyOverlap) {
        expect(r.vacuous).toBe(true);
        expect(r.glues).toBe(false); // a vacuous 0 is NEVER a glue
      } else {
        expect(r.vacuous).toBe(false);
        expect(r.glues).toBe(allAgree); // glues IFF the independent truth says so
        expect(r.radius === 0).toBe(allAgree); // radius 0 IFF they all agree
      }
    }
  });

  test("an AGREEING assignment always glues at radius 0 (no false obstruction)", () => {
    const u = rng(22);
    for (let i = 0; i < RUNS; i++) {
      const K = 1 + Math.floor(u() * 6);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const shared = new Map(units.map((unit) => [unit, u()] as const));
      const r = consistencyRadius(
        ["content", "structure", "form"].map((p) => sheaf(p, new Map(shared))),
        { units },
      );
      expect(r.radius).toBe(0);
      expect(r.glues).toBe(true);
      expect(r.vacuous).toBe(false);
      expect(r.obstructionLocus).toEqual([]);
    }
  });

  test("ANY seeded disagreement over a full overlap ⇒ radius STRICTLY positive + localized", () => {
    const u = rng(33);
    for (let i = 0; i < RUNS; i++) {
      const K = 2 + Math.floor(u() * 5);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const base = new Map(units.map((unit) => [unit, 0.5] as const));
      const seedUnit = units[Math.floor(u() * K)]!;
      const delta = 1e-6 + u(); // any non-zero gap
      const perturbed = new Map(base);
      perturbed.set(seedUnit, 0.5 + delta);
      const r = consistencyRadius(
        [sheaf("content", new Map(base)), sheaf("structure", new Map(base)), sheaf("form", perturbed)],
        { units },
      );
      expect(r.radius).toBeCloseTo(delta, 9);
      expect(r.glues).toBe(false);
      expect(r.obstructionLocus).toEqual([seedUnit]); // localized to exactly the seeded unit
    }
  });
});

// ── vacuous NEVER false-glues ─────────────────────────────────────────────────────────────────

describe("consistencyRadius — vacuous never false-glues (property)", () => {
  test("DISJOINT domains ⇒ vacuous true, glues false, radius 0, every pair vacuous", () => {
    const u = rng(44);
    for (let i = 0; i < RUNS; i++) {
      // give each plane its OWN private units (guaranteed disjoint)
      const restrictions = ["content", "structure", "form"].map((p, idx) =>
        sheaf(p, new Map([[`${p}_${idx}`, u()]])),
      );
      const units = restrictions.flatMap((r) => [...r.value.keys()]);
      const r = consistencyRadius(restrictions, { units });
      expect(r.vacuous).toBe(true);
      expect(r.glues).toBe(false);
      expect(r.radius).toBe(0);
      expect(r.pairs.every((p) => p.vacuous)).toBe(true);
    }
  });

  test("EMPTY stalk ⇒ vacuous true, glues false (no engineered overlap buys nothing)", () => {
    const u = rng(55);
    for (let i = 0; i < 100; i++) {
      const r = consistencyRadius([sheaf("content", new Map([["u0", u()]]))], { units: [] });
      expect(r.vacuous).toBe(true);
      expect(r.glues).toBe(false);
      expect(r.radius).toBe(0);
    }
  });
});

// ── a cosheaf plane THROWS (never faked through the restriction map) ─────────────────────────

describe("consistencyRadius — refuses a cosheaf plane (property)", () => {
  test("ANY restriction tagged cosheaf makes the whole read THROW", () => {
    const u = rng(66);
    for (let i = 0; i < 200; i++) {
      const units = ["u0", "u1"];
      const good = sheaf("content", new Map([["u0", u()]]));
      const bad: PlaneRestriction = {
        plane: u() < 0.5 ? "bands" : "coupling",
        variance: "cosheaf",
        value: new Map([["u0", u()]]),
      };
      const mix = u() < 0.5 ? [good, bad] : [bad, good];
      expect(() => consistencyRadius(mix, { units })).toThrow(/sheaf/i);
    }
  });
});

// ── the obstruction locus lies INSIDE the actual disagreement ────────────────────────────────

describe("consistencyRadius — the locus is inside the real disagreement (property)", () => {
  test("every pair-locus unit realizes that pair's max gap; obstructionLocus ⊆ ⋃ pair loci", () => {
    const u = rng(77);
    for (let i = 0; i < RUNS; i++) {
      const K = 2 + Math.floor(u() * 5);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const restrictions = ["content", "structure", "form"].map((p) => randRestriction(u, p, units));
      const r = consistencyRadius(restrictions, { units });
      const byName = new Map(restrictions.map((x) => [x.plane, x.value]));
      const lociUnion = new Set<string>();
      for (const pair of r.pairs) {
        if (pair.vacuous) {
          expect(pair.distance).toBe(0);
          expect(pair.locus).toEqual([]);
          continue;
        }
        const va = byName.get(pair.a)!, vb = byName.get(pair.b)!;
        for (const unit of pair.locus) {
          lociUnion.add(unit);
          // the locus unit is a GENUINE point of disagreement, and it MAXIMIZES this pair's gap
          const gap = Math.abs((va.get(unit) ?? 0) - (vb.get(unit) ?? 0));
          expect(gap).toBeCloseTo(pair.distance, 12);
          expect(gap).toBeGreaterThan(0);
        }
      }
      for (const unit of r.obstructionLocus) expect(lociUnion.has(unit)).toBe(true);
    }
  });
});

// ── symmetry + monotonicity ──────────────────────────────────────────────────────────────────

describe("consistencyRadius — symmetry + monotonicity (property)", () => {
  test("radius / vacuous / glues are INVARIANT under permuting the restriction order", () => {
    const u = rng(88);
    for (let i = 0; i < RUNS; i++) {
      const K = 2 + Math.floor(u() * 4);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const restrictions = ["content", "structure", "form", "extra"].map((p) =>
        randRestriction(u, p, units),
      );
      const r0 = consistencyRadius(restrictions, { units });
      // Fisher-Yates shuffle
      const perm = [...restrictions];
      for (let k = perm.length - 1; k > 0; k--) {
        const j = Math.floor(u() * (k + 1));
        [perm[k], perm[j]] = [perm[j]!, perm[k]!];
      }
      const r1 = consistencyRadius(perm, { units });
      expect(r1.radius).toBeCloseTo(r0.radius, 12);
      expect(r1.vacuous).toBe(r0.vacuous);
      expect(r1.glues).toBe(r0.glues);
      expect(new Set(r1.obstructionLocus)).toEqual(new Set(r0.obstructionLocus));
    }
  });

  test("widening ONE gap never DECREASES the radius (monotone in a single disagreement)", () => {
    const u = rng(99);
    for (let i = 0; i < RUNS; i++) {
      const K = 2 + Math.floor(u() * 4);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const base = new Map(units.map((unit) => [unit, u() * 0.5] as const));
      const seedUnit = units[Math.floor(u() * K)]!;
      const build = (extra: number): PlaneRestriction[] => {
        const p = new Map(base);
        p.set(seedUnit, (base.get(seedUnit) ?? 0) + extra);
        return [sheaf("content", new Map(base)), sheaf("structure", new Map(base)), sheaf("form", p)];
      };
      const deltas = [0, 0.1, 0.3, 0.7]; // strictly ascending gaps
      let prev = -1;
      for (const d of deltas) {
        const r = consistencyRadius(build(d), { units });
        expect(r.radius).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = r.radius;
      }
    }
  });
});

// ── the metric itself is a clean pseudometric ────────────────────────────────────────────────

describe("chebyshevStalkMetric — a clean L∞ pseudometric (property)", () => {
  test("symmetric, zero iff equal-on-overlap, distance realized at the locus", () => {
    const u = rng(1234);
    for (let i = 0; i < RUNS; i++) {
      const K = 1 + Math.floor(u() * 6);
      const units = Array.from({ length: K }, (_, j) => `u${j}`);
      const va = new Map(units.map((k) => [k, u()] as const));
      const vb = new Map(units.map((k) => [k, u()] as const));
      const ab = chebyshevStalkMetric(va, vb, units);
      const ba = chebyshevStalkMetric(vb, va, units);
      expect(ab.distance).toBeCloseTo(ba.distance, 12); // symmetry
      // the reported distance IS the max abs gap over the overlap
      const maxGap = Math.max(...units.map((k) => Math.abs(va.get(k)! - vb.get(k)!)));
      expect(ab.distance).toBeCloseTo(maxGap, 12);
      if (ab.distance > 0) for (const k of ab.locus)
        expect(Math.abs(va.get(k)! - vb.get(k)!)).toBeCloseTo(ab.distance, 12);
      // identical maps ⇒ distance 0, empty locus
      const same = chebyshevStalkMetric(va, new Map(va), units);
      expect(same.distance).toBe(0);
      expect(same.locus).toEqual([]);
    }
  });
});
