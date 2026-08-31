/**
 * bag-copy-plan — the bag-grain COPY, planned before anything executes.
 *
 * ── THE APPROVED PAIR, AND THE HALF THAT REMAINED ───────────────────────────────────────────────
 * Residency canon approves two bag-grain verbs: CREATE mints a coordinate, and bag-grain COPY grants
 * every title in a source its residency in the destination — "`change-id` preserved per title; one
 * `transfer-id` family audits the batch". CREATE landed. This plans the other half.
 *
 * A plan carries no side effects on purpose. The rite executes on the sovereign-worker rail, and what
 * a batch WOULD do reads better before it runs than after: a crossing grants residency across a plane
 * boundary and lands an accession in the union catalog, and canon holds the reverse crossing does not
 * exist. So the batch earns a reading first.
 *
 * ── THE TWO LAWS A BATCH MUST HOLD ──────────────────────────────────────────────────────────────
 * ONE TRANSFER FAMILY. The batch names a single transfer-id, so the ledger reads the crossing as one
 * act rather than as N unrelated grants — that pairing lets an auditor find the whole of what moved.
 * It rides the PLAN, not each action: a residency action grants, an effect record audits, and only the
 * second carries a family.
 *
 * EACH TITLE KEEPS ITS OWN CHANGE-ID. A change-id names a title's own lineage; folding them into one
 * would erase which version of each title crossed, and residency grants a title where it stands rather
 * than re-minting it.
 */
import { describe, it, expect } from "vitest";
import { bagCopyPlan } from "../src/bag-copy-plan.js";

const titles = [
  { title: "alpha", changeId: "c-alpha" },
  { title: "beta",  changeId: "c-beta"  },
];
const at = { requestId: "req-1", requestedBy: "did:lar:operator", transferId: "t-1" };

describe("bag-copy-plan — one crossing, many grants", () => {
  it("★ every title becomes a COPY into the destination ★", () => {
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles }, at);
    expect(p.ok).toBe(true);
    expect(p.actions).toHaveLength(2);
    expect(p.actions.map((a) => a.title)).toEqual(["alpha", "beta"]);
    expect(p.actions.every((a) => a.verb === "COPY" && a.fromBag === "src" && a.toBag === "dst")).toBe(true);
  });

  it("★ ONE transfer family audits the batch, carried by the PLAN ★", () => {
    // A residency action grants; an effect record audits, and only the second carries a family. So the
    // batch names its transfer-id once rather than stamping it onto every grant.
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles }, at);
    expect(p.transferId).toBe("t-1");
    expect(p.actions.every((a) => !("transferId" in a))).toBe(true);
  });

  it("★ EACH title keeps its own change-id — a batch never folds lineages ★", () => {
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles }, at);
    expect(p.actions.map((a) => a.changeId)).toEqual(["c-alpha", "c-beta"]);
  });

  it("★ an EMPTY source plans nothing and says so — never an error ★", () => {
    // A bag with no titles crosses cleanly as a no-op; refusing would make an honest state a fault.
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles: [] }, at);
    expect(p.ok).toBe(true);
    expect(p.actions).toHaveLength(0);
    expect(p.reading).toMatch(/no title|empty|nothing to grant/i);
  });

  it("★ a bag copied onto ITSELF refuses — a title cannot cross to where it stands ★", () => {
    const p = bagCopyPlan({ fromBag: "src", toBag: "src", titles }, at);
    expect(p.ok).toBe(false);
    expect(p.actions).toHaveLength(0);
    expect(p.reading).toMatch(/itself|same bag|already stands/i);
  });

  it("★ a DUPLICATE title refuses — one crossing must not grant one title twice ★", () => {
    // Two grants of one title in a single transfer family would read as one crossing that landed two
    // accessions for the same lineage, and the ledger could not say which one the destination holds.
    const dup = [...titles, { title: "alpha", changeId: "c-alpha-2" }];
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles: dup }, at);
    expect(p.ok).toBe(false);
    expect(p.reading).toMatch(/alpha/);
    expect(p.reading).toMatch(/twice|duplicate|more than once/i);
  });

  it("★ a title with no change-id refuses — a grant with no lineage names no version ★", () => {
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles: [{ title: "alpha", changeId: "" }] }, at);
    expect(p.ok).toBe(false);
    expect(p.reading).toMatch(/change-id|lineage/i);
  });

  it("★ the reading names the batch size and both coordinates ★", () => {
    const p = bagCopyPlan({ fromBag: "src", toBag: "dst", titles }, at);
    expect(p.reading).toContain("src");
    expect(p.reading).toContain("dst");
    expect(p.reading).toMatch(/2/);
  });
});
