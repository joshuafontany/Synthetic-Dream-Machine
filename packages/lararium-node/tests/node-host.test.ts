/**
 * lararium-node — causal island URI resolver + capability invariant tests.
 *
 * All tests are pure and I/O-free.
 * Grammar self-hosting (SharktoothSigil tiddlers in built plugin) verifies
 * in scripts/test-quine.ts.
 *
 * No HTTP, no OAuth routes, no web2 auth ceremony.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lararium/node-host
 */

import { describe, test, expect } from "vitest";
import {
  resolveLarUri,
  parseHostfulLarUri,
  isHostfulLarUri,
} from "@lararium/mesh";

// Minimal inline grammar fixture — exercises [[sigils]] and [[families]] TOML
// ---------------------------------------------------------------------------
// lar:/// URI resolver — isomorphic, pure (no I/O)
// ---------------------------------------------------------------------------

describe("resolveLarUri — canonical URI topology", () => {
  /**
   * THE ROOTLESS CLASS IS RETIRED (lar-uri #path-taxonomy: every path MUST carry a full three-slot
   * root, no class exempt). A single ALLCAPS term once resolved as a virtual caps root — which kept
   * the retired address form REACHABLE, so anything still minting one resolved correctly and went
   * unnoticed. The resolver refuses now; a name that travels nowhere must not read like one that does.
   */
  test("a rootless single-term address refuses — the retired class resolves nowhere", () => {
    for (const uri of ["lar:///AGENTS", "lar:///LARES", "lar:///INDEXES/carriers"]) {
      expect(() => resolveLarUri(uri)).toThrow(/unsupported lar root/);
    }
  });

  test("ha.ka.ba/bags/lares sub-path resolves as tuple-file, non-virtual", () => {
    const r = resolveLarUri("lar:///ha.ka.ba/lares/api/mu");
    expect(["file", "tuple-file"]).toContain(r.kind);
    expect(r.virtual).toBe(false);
    expect(r.root).toBe("ha.ka.ba");
  });

  test("a rooted leaf under the lares scope reads as a plain tuple-file — no name carries a special arm", () => {
    // Topology only: whether a carrier stands at the address stays the caller question.
    const r = resolveLarUri("lar:///ha.ka.ba/lares/README");
    expect(r.kind).toBe("tuple-file");
    expect(r.virtual).toBe(false);
  });

  test("a corpus URI reads as a tuple-file — backable, but WHERE stays the host's question", () => {
    // The resolver answers topology alone. It once computed a disk path into a package tree that the
    // corpus later left, and nothing joined the result, so the dead mapping misled without ever failing.
    const r = resolveLarUri("lar:///ha.ka.ba/lares/api/mu");
    expect(r.kind).toBe("tuple-file");
    expect(r.virtual).toBe(false);
    expect(r.resourcePath).toBe("ha.ka.ba/lares/api/mu");
  });
});

// ---------------------------------------------------------------------------
// isHostfulLarUri / parseHostfulLarUri
// ---------------------------------------------------------------------------

describe("isHostfulLarUri", () => {
  test("hostless lar:///path → false", () => {
    expect(isHostfulLarUri("lar:///AGENTS")).toBe(false);
    expect(isHostfulLarUri("lar:///ha.ka.ba/lares/api/mu")).toBe(false);
  });

  test("hostful lar://node.local/path → true", () => {
    expect(isHostfulLarUri("lar://test-wiki.local/rooms/main")).toBe(true);
    expect(isHostfulLarUri("lar://elyncia.social/ha.ka.ba/lares/api/mu")).toBe(true);
  });
});

describe("parseHostfulLarUri", () => {
  test("extracts host and path from a hostful lar: URI", () => {
    const r = parseHostfulLarUri("lar://test-wiki:agent@elyncia.social/rooms/test-wiki");
    expect(r.authority.host).toBe("elyncia.social");
    expect(r.root).toBeDefined();
  });
});

