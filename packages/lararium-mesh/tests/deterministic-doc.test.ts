/**
 * deterministic-doc.test.ts — per-Nexus addresses every island member computes alike.
 *
 * Proven: the same nexus-pubkey yields the same @crossroads + WHO-board URL (so no advertisement is needed);
 * different nexuses yield different addresses (per-island sharding); and materializeSharedLarDoc lands the doc
 * under exactly the deterministic id, resolving the same handle on a second call (find-first, no re-mint).
 */
import { describe, test, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { deterministicDocUrl, crossroadsDocUrl, whoBoardDocUrl, materializeSharedLarDoc } from "../src/deterministic-doc.js";

const NX = "abcdef0123456789";

describe("deterministic per-Nexus addresses", () => {
  test("the same nexus-pubkey yields the same addresses — every island member computes them alike", () => {
    expect(crossroadsDocUrl(NX)).toBe(crossroadsDocUrl(NX));
    expect(whoBoardDocUrl(NX)).toBe(whoBoardDocUrl(NX));
    // the @crossroads doc and the WHO board are DISTINCT addresses
    expect(whoBoardDocUrl(NX)).not.toBe(crossroadsDocUrl(NX));
  });

  test("a different Nexus yields different addresses — the plane shards per island", () => {
    expect(crossroadsDocUrl("nexusA")).not.toBe(crossroadsDocUrl("nexusB"));
    expect(whoBoardDocUrl("nexusA")).not.toBe(whoBoardDocUrl("nexusB"));
  });

  test("deterministicDocUrl is a stable pure function of its seed", () => {
    expect(deterministicDocUrl("seed-x")).toBe(deterministicDocUrl("seed-x"));
    expect(deterministicDocUrl("seed-x")).not.toBe(deterministicDocUrl("seed-y"));
    expect(deterministicDocUrl("seed-x")).toMatch(/^automerge:/);
  });
});

describe("materializeSharedLarDoc — first vessel mints under the id, later ones find it", () => {
  test("the board lands under exactly the deterministic id, and a second call finds the same handle", { timeout: 10_000 }, async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const url  = whoBoardDocUrl(NX);
    const first  = await materializeSharedLarDoc(repo, url, "board:who-face");
    expect(first.url).toBe(url);                    // materialized under the deterministic address, not a random one

    const second = await materializeSharedLarDoc(repo, url, "board:who-face");
    expect(second.url).toBe(first.url);             // find-first — the same doc, never a re-mint
  });
});
