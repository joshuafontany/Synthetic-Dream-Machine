/**
 * nexus-identity — the scope a SHARED plane resolves under, and why it names no vessel.
 *
 * ── THE PROBLEM THIS SOLVES ─────────────────────────────────────────────────────────────────────
 * Three boards derive their address from one parameter spelled `nexusPubkey`, and every vessel passes
 * its OWN key. Their docs say the address is meant to be per-island — "every island member resolves
 * the one board with no mint-race" — so within one operator's fleet that holds, and across two
 * contracted operators it does not: each resolves a different board and the island splits in two.
 *
 * A Nexus has no key of its own, so any vessel's key is the wrong name for it: whichever operator's
 * key were chosen, the others would be reading someone's vessel rather than their shared island.
 *
 * ── THE GENESIS EPOCH IS THE ISLAND'S NAME ──────────────────────────────────────────────────────
 * `genesisSealEpochCid` content-addresses the seated key-set and threshold, so every vessel holding
 * the charter derives the SAME value, it names no vessel, and it survives rotation because the
 * genesis sits at the head of the lineage rather than at its end.
 *
 * ── WHICH PLANES MAY USE IT, AND WHICH MUST NOT ─────────────────────────────────────────────────
 * A shared scope is safe exactly where sharing cannot widen a vessel's own authority:
 *   · WHO board       — no write-ACL, cards self-certifying; reading grants nothing.
 *   · antigen (DENY)  — quorum-signed against the charter roster; a foreign ban only TIGHTENS.
 *   · members (ALLOW) — REFUSED. Unsigned local admits that only WIDEN; a partner's admits would
 *                       conscript this vessel into carriage it never consented to.
 * The asymmetry is the point: a deny may be shared, an allow may not.
 */
import { describe, it, expect } from "vitest";
import { nexusIdentity } from "../src/nexus-identity.js";

const OWN = "a".repeat(64);
const GENESIS = "epoch0-" + "b".repeat(64);

describe("nexus-identity — a shared island names no vessel", () => {
  it("★ a seated charter names the island by its GENESIS epoch, not by any vessel ★", () => {
    const r = nexusIdentity({ genesisEpochCid: GENESIS, ownVesselKey: OWN });
    expect(r.scope).toBe(GENESIS);
    expect(r.shared).toBe(true);
    expect(r.scope).not.toContain(OWN);
  });

  it("★ two vessels holding ONE charter derive ONE scope ★", () => {
    const a = nexusIdentity({ genesisEpochCid: GENESIS, ownVesselKey: OWN });
    const b = nexusIdentity({ genesisEpochCid: GENESIS, ownVesselKey: "c".repeat(64) });
    expect(a.scope).toBe(b.scope);
  });

  it("★ no charter falls back to this vessel — it is its own island, and says so ★", () => {
    for (const absent of [null, undefined, ""]) {
      const r = nexusIdentity({ genesisEpochCid: absent, ownVesselKey: OWN });
      expect(r.scope).toBe(OWN);
      expect(r.shared).toBe(false);
      expect(r.reading).toMatch(/own island|no charter|alone/i);
    }
  });

  it("★ a malformed genesis is REFUSED — a bad scope splits an island silently ★", () => {
    // Addressing a board by garbage mints a fresh empty one that nobody else resolves, and the
    // vessel would read a quiet, private island as if it were the shared one.
    for (const bad of ["nope", "epoch0-", "b".repeat(12)]) {
      const r = nexusIdentity({ genesisEpochCid: bad, ownVesselKey: OWN });
      expect(r.scope).toBe(OWN);
      expect(r.shared).toBe(false);
      expect(r.reading).toMatch(/unread|malform|not an epoch/i);
    }
  });

  it("★ the scope is case-stable, so one island never reads as two ★", () => {
    expect(nexusIdentity({ genesisEpochCid: GENESIS.toUpperCase(), ownVesselKey: OWN }).scope).toBe(GENESIS);
  });

  it("★ every reading names whose island it is ★", () => {
    for (const g of [GENESIS, null, "nope"]) {
      expect(nexusIdentity({ genesisEpochCid: g, ownVesselKey: OWN }).reading.length).toBeGreaterThan(40);
    }
  });
});
