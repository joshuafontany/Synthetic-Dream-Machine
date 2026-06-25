/**
 * genesis-region-cid.test.ts — the two genesis ratchets (G-D2 / G-D3).
 *
 * Locks the load-bearing property of the engine/plugins content-CID split: the
 * engine CID (the hearth true-name, slow ratchet) is a pure function of the TW5
 * core version + sha and is NEVER perturbed by a plugin change, while the plugins
 * CID (fast ratchet) bumps on any plugin id/version/sha change and is order-blind.
 */

import { describe, it, expect } from "vitest";
import { computeEngineCid, computePluginsCid } from "../src/genesis-doc.js";

describe("genesis region content-CIDs — the two ratchets", () => {
  const plugins = [
    { id: "lar:///plugins/b", version: "1.0", sha256: "bb" },
    { id: "lar:///plugins/a", version: "2.1", sha256: "aa" },
  ];

  it("engineCid is deterministic and a pure function of core version + sha", () => {
    expect(computeEngineCid("5.3.0", "abcd")).toBe(computeEngineCid("5.3.0", "abcd"));
    expect(computeEngineCid("5.3.0", "abcd")).not.toBe(computeEngineCid("5.3.1", "abcd")); // version moves it
    expect(computeEngineCid("5.3.0", "abcd")).not.toBe(computeEngineCid("5.3.0", "ef01")); // core sha moves it
  });

  it("pluginsCid is order-independent (sorted by id) and deterministic", () => {
    const reversed = [...plugins].reverse();
    expect(computePluginsCid(plugins)).toBe(computePluginsCid(reversed)); // write-order never perturbs it
  });

  it("a plugin change bumps pluginsCid but NEVER the engineCid (the two ratchets)", () => {
    const engineBefore  = computeEngineCid("5.3.0", "abcd");
    const pluginsBefore = computePluginsCid(plugins);
    const bumped = plugins.map((p) => (p.id === "lar:///plugins/a" ? { ...p, version: "2.2" } : p));
    expect(computePluginsCid(bumped)).not.toBe(pluginsBefore);    // fast ratchet moves
    expect(computeEngineCid("5.3.0", "abcd")).toBe(engineBefore); // slow ratchet stays stable
  });
});
