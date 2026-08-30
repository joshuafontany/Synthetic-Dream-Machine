/**
 * seal-import — receiving a partner's charter must never destroy your own.
 *
 * ── THE ACT, AND WHY IT IS DANGEROUS ────────────────────────────────────────────────────────────
 * Before an operator can consent to carriage she must hold the founding operator's charter: seated
 * keys, threshold, epoch lineage — public material, and she "cannot consent to a charter she has
 * never seen". `accept-carriage` then signs a contract-in against whatever charter stands in the
 * seal home it reads.
 *
 * Which makes the placement load-bearing. An operator who has founded her OWN Nexus and drops a
 * partner's `founding-roster.mem` into her seal home has overwritten her own charter — and every
 * contract-in she signs afterwards binds to the wrong epoch. The witness that proves the crossing
 * carries the file with `cp`, on a vessel that had no charter to lose, so nothing has ever met this.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
 * A charter arrives where none stands, or it refuses. Re-importing the SAME charter is not a
 * destruction and passes — an operator who runs a step twice should not be punished for it.
 */
import { describe, it, expect } from "vitest";
import { sealImportVerdict } from "../src/seal-import.js";

const A = "epoch0-" + "a".repeat(64);
const B = "epoch0-" + "b".repeat(64);

describe("seal-import — a charter arrives where none stands", () => {
  it("★ a charter lands cleanly on a vessel holding none ★", () => {
    const v = sealImportVerdict({ incoming: A, standing: null });
    expect(v.ok).toBe(true);
  });

  it("★ a DIFFERENT charter over a standing one REFUSES — that write destroys a founding ★", () => {
    const v = sealImportVerdict({ incoming: A, standing: B });
    expect(v.ok).toBe(false);
    // The refusal must name what would have been lost, so the operator can tell this from a typo.
    expect(v.why).toMatch(/own charter|already stands|would replace/i);
    expect(v.why).toContain(B.slice(0, 12));
  });

  it("★ re-importing the SAME charter passes — idempotent, not destructive ★", () => {
    expect(sealImportVerdict({ incoming: A, standing: A }).ok).toBe(true);
  });

  it("★ an incoming charter with no epoch refuses — unseated material seats nothing ★", () => {
    // A roster carried before its epoch was established grants nothing and would overwrite something.
    expect(sealImportVerdict({ incoming: "", standing: null }).ok).toBe(false);
  });

  it("★ the refusal says where the charter SHOULD go, not only that it stopped ★", () => {
    const v = sealImportVerdict({ incoming: A, standing: B });
    expect(v.why.length).toBeGreaterThan(60);
  });
});
