/**
 * Orichalcum ability ladder — causal island permission model.
 *
 * No HTTP routes. No OAuth ceremony. Authority flows through the ability ladder
 * and Orichalcum capabilities. Relay-law exception: pull carries bytes across
 * causal island boundaries without granting read (decrypt) semantics.
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands
 */

import { describe, test, expect } from "vitest";
import {
  abilityImplies,
  capabilityHasAbility,
  ABILITY_LADDER,
} from "../src/index.js";
import type { OrichalcumAbility, OrichalcumCapability, LarPrincipal } from "../src/index.js";

// ---------------------------------------------------------------------------
// ABILITY_LADDER ordering
// ---------------------------------------------------------------------------

describe("ABILITY_LADDER — ordered from least to most privileged", () => {
  test("pull appears before read", () => {
    const pullIdx = ABILITY_LADDER.indexOf("pull");
    const readIdx = ABILITY_LADDER.indexOf("read");
    expect(pullIdx).toBeLessThan(readIdx);
  });

  test("edit appears before admin", () => {
    const editIdx  = ABILITY_LADDER.indexOf("edit");
    const adminIdx = ABILITY_LADDER.indexOf("admin");
    expect(editIdx).toBeLessThan(adminIdx);
  });

  test("all expected abilities present — 4-rung access axis (Keyhive-native verbs)", () => {
    // Access axis = Keyhive's native enum verbs (Pull/Read/Edit/Admin). Retired:
    // "promote"+"propose" (2026-05-31), "sync"+"revoke" (2026-06-01 — sync =
    // pull-at-scale; revoke = an admin operation). See causal-island.ts.
    const expected: OrichalcumAbility[] = ["pull", "read", "edit", "admin"];
    for (const a of expected) expect(ABILITY_LADDER).toContain(a);
    expect(ABILITY_LADDER.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// abilityImplies — reflexive + monotone, relay-law exception
// ---------------------------------------------------------------------------

describe("abilityImplies — ability ladder contracts", () => {
  test("every ability implies itself (reflexive)", () => {
    for (const a of ABILITY_LADDER) {
      expect(abilityImplies(a, a)).toBe(true);
    }
  });

  test("relay-law: pull does NOT imply read (a shrine relay cannot decrypt)", () => {
    expect(abilityImplies("pull", "read")).toBe(false);
    expect(abilityImplies("pull", "write")).toBe(false);
    expect(abilityImplies("pull", "admin")).toBe(false);
  });

  test("read implies read but not edit", () => {
    expect(abilityImplies("read", "read")).toBe(true);
    expect(abilityImplies("read", "edit")).toBe(false);
  });

  test("edit implies read", () => {
    expect(abilityImplies("edit", "read")).toBe(true);
  });

  test("admin implies edit and read (Keyhive Admin satisfies the levels below)", () => {
    expect(abilityImplies("admin", "edit")).toBe(true);
    expect(abilityImplies("admin", "read")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// capabilityHasAbility — token-level gate check
// ---------------------------------------------------------------------------

describe("capabilityHasAbility — token gate", () => {
  const issuer:   LarPrincipal = { kind: "local-operator", alias: "operator" };
  const audience: LarPrincipal = { kind: "did", id: "did:web:altar-fire.elyncia.social" };

  function cap(abilities: OrichalcumAbility[]): OrichalcumCapability {
    return {
      issuer,
      audience,
      resource: "lar:///wikis/altar-fire",
      abilities,
      caveats: [],
    };
  }

  test("read capability grants read", () => {
    expect(capabilityHasAbility(cap(["read"]), "read")).toBe(true);
  });

  test("edit capability grants read (implies)", () => {
    expect(capabilityHasAbility(cap(["edit"]), "read")).toBe(true);
  });

  test("pull capability does NOT grant read (relay-law)", () => {
    expect(capabilityHasAbility(cap(["pull"]), "read")).toBe(false);
  });

  test("capability with no abilities grants nothing", () => {
    expect(capabilityHasAbility(cap([]), "read")).toBe(false);
    expect(capabilityHasAbility(cap([]), "pull")).toBe(false);
  });

  test("admin capability grants edit and read", () => {
    expect(capabilityHasAbility(cap(["admin"]), "edit")).toBe(true);
    expect(capabilityHasAbility(cap(["admin"]), "read")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// requestKeyhivePromotion stub retired 2026-05-31 — the canon-promotion ceremony
// it gated no longer exists. Residency ACTION verbs (ADD/COPY/MOVE/CLEAR/DROP/
// LOAD) are the operator-facing surface; effect-record.ts is the audit-trail
// layer; Keyhive's Tier-1 read/admin gate (capability-provider.ts) handles
// cryptographic authorization. No stub here covers a ceremony that left.
// ---------------------------------------------------------------------------
