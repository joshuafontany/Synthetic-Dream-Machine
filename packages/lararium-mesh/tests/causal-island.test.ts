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

  test("admin appears before revoke", () => {
    const adminIdx  = ABILITY_LADDER.indexOf("admin");
    const revokeIdx = ABILITY_LADDER.indexOf("revoke");
    expect(adminIdx).toBeLessThan(revokeIdx);
  });

  test("all expected abilities present", () => {
    // "promote" + "propose" retired 2026-05-31 — neither ceremony exists today;
    // residency-model bag-priority cascade subsumes the gating semantic.
    const expected: OrichalcumAbility[] = ["pull", "read", "sync", "write", "admin", "revoke"];
    for (const a of expected) expect(ABILITY_LADDER).toContain(a);
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
    expect(abilityImplies("pull", "sync")).toBe(false);
    expect(abilityImplies("pull", "write")).toBe(false);
    expect(abilityImplies("pull", "admin")).toBe(false);
  });

  test("read implies read but not write", () => {
    expect(abilityImplies("read", "read")).toBe(true);
    expect(abilityImplies("read", "write")).toBe(false);
  });

  test("write implies read and sync", () => {
    expect(abilityImplies("write", "read")).toBe(true);
    expect(abilityImplies("write", "sync")).toBe(true);
  });

  test("admin implies write, sync, read", () => {
    expect(abilityImplies("admin", "write")).toBe(true);
    expect(abilityImplies("admin", "sync")).toBe(true);
    expect(abilityImplies("admin", "read")).toBe(true);
  });

  test("revoke implies admin and write", () => {
    expect(abilityImplies("revoke", "admin")).toBe(true);
    expect(abilityImplies("revoke", "write")).toBe(true);
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

  test("write capability grants read (implies)", () => {
    expect(capabilityHasAbility(cap(["write"]), "read")).toBe(true);
  });

  test("pull capability does NOT grant read (relay-law)", () => {
    expect(capabilityHasAbility(cap(["pull"]), "read")).toBe(false);
  });

  test("capability with no abilities grants nothing", () => {
    expect(capabilityHasAbility(cap([]), "read")).toBe(false);
    expect(capabilityHasAbility(cap([]), "pull")).toBe(false);
  });

  test("admin capability grants write and read", () => {
    expect(capabilityHasAbility(cap(["admin"]), "write")).toBe(true);
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
