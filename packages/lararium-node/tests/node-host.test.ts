/**
 * lararium-node — causal island URI resolver + capability invariant tests.
 *
 * All tests are pure and I/O-free.
 * Grammar self-hosting (SharktoothSigil tiddlers in built plugin) verifies
 * in scripts/test-quine.ts.
 *
 * No HTTP, no OAuth routes, no web2 auth ceremony.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/v0.1/lararium/node-host
 */

import { describe, test, expect } from "vitest";
import {
  resolveLarUri,
  parseHostfulLarUri,
  isHostfulLarUri,
  abilityImplies,
} from "@lararium/mesh";

// Minimal inline grammar fixture — exercises [[sigils]] and [[families]] TOML
// ---------------------------------------------------------------------------
// lar:/// URI resolver — isomorphic, pure (no I/O)
// ---------------------------------------------------------------------------

describe("resolveLarUri — canonical URI topology", () => {
  test("AGENTS root resolves as caps-file, non-virtual", () => {
    const r = resolveLarUri("lar:///AGENTS");
    expect(r.kind).toBe("caps-file");
    expect(r.virtual).toBe(false);
    expect(r.root).toBe("AGENTS");
  });

  test("LARES root resolves as caps-file", () => {
    const r = resolveLarUri("lar:///LARES");
    expect(r.kind).toBe("caps-file");
    expect(r.virtual).toBe(false);
  });

  test("ha.ka.ba/@lares sub-path resolves as tuple-file, non-virtual", () => {
    const r = resolveLarUri("lar:///ha.ka.ba/@lares/api/v0.1/mu");
    expect(["file", "tuple-file"]).toContain(r.kind);
    expect(r.virtual).toBe(false);
    expect(r.root).toBe("ha.ka.ba");
  });

  test("ha.ka.ba/@lares/AGENTS shorthand resolves as caps-file", () => {
    const r = resolveLarUri("lar:///ha.ka.ba/@lares/AGENTS");
    expect(r.kind).toBe("caps-file");
    expect(r.virtual).toBe(false);
  });

  test("INDEXES/* paths are virtual (cannot be materialized from disk)", () => {
    const r = resolveLarUri("lar:///INDEXES/carriers");
    expect(r.virtual).toBe(true);
  });

  test("resolves laresRelPath for grammar carrier", () => {
    const r = resolveLarUri("lar:///ha.ka.ba/@lares/api/v0.1/mu");
    expect(r.laresRelPath).toBeTruthy();
    expect(r.laresRelPath).toMatch(/\.md$/);
  });
});

// ---------------------------------------------------------------------------
// isHostfulLarUri / parseHostfulLarUri
// ---------------------------------------------------------------------------

describe("isHostfulLarUri", () => {
  test("hostless lar:///path → false", () => {
    expect(isHostfulLarUri("lar:///AGENTS")).toBe(false);
    expect(isHostfulLarUri("lar:///ha.ka.ba/@lares/api/v0.1/mu")).toBe(false);
  });

  test("hostful lar://node.local/path → true", () => {
    expect(isHostfulLarUri("lar://altar-fire.local/rooms/main")).toBe(true);
    expect(isHostfulLarUri("lar://elyncia.social/ha.ka.ba/@lares/api/v0.1/mu")).toBe(true);
  });
});

describe("parseHostfulLarUri", () => {
  test("extracts host and path from a hostful lar: URI", () => {
    const r = parseHostfulLarUri("lar://altar-fire:vessel@elyncia.social/rooms/altar-fire");
    expect(r.authority.host).toBe("elyncia.social");
    expect(r.root).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("Node-vessel causal island capabilities", () => {
  test("node vessel holds promote ability (can gate canon ceremony)", () => {
    // Admin implies promote — the node vessel must hold admin to gate promotions.
    expect(abilityImplies("admin", "promote")).toBe(true);
  });

  test("room-level write does NOT imply canon promote (content ≠ authority)", () => {
    expect(abilityImplies("write", "promote")).toBe(false);
  });

  test("relay (pull) cannot read room content (causal island boundary law)", () => {
    expect(abilityImplies("pull", "read")).toBe(false);
  });
});
