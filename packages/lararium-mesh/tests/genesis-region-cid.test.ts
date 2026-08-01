/**
 * genesis-region-cid — the engine/plugins content-CID split, and the false-schism cure.
 *
 * The engine CID reads as the hearth's TRUE-NAME and a pure function of the core BLOB's bytes; a plugin
 * change must never perturb it. The plugins CID tracks the composition and stays order-blind.
 *
 * THE LOAD-BEARING PROPERTY HERE READS AS A REFUSAL. Neither preimage carries a VERSION LABEL, because a
 * label makes a pure re-tag — identical bytes, renamed — mint a fresh identity, and any system that
 * identifies peers by these digests would then manufacture a schism out of an editorial act. The sha256
 * already binds every byte a label could describe. These tests assert the label cannot move anything.
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/genesis-doc
 */

import { describe, it, expect } from "vitest";
import { computeEngineCid, computePluginsCid } from "../src/genesis-doc.js";

describe("genesis region content-CIDs — bytes name the region, labels never do", () => {
  const plugins = [
    { id: "lar:///plugins/b", version: "1.0", sha256: "bb" },
    { id: "lar:///plugins/a", version: "2.1", sha256: "aa" },
  ];

  it("engineCid runs deterministic and moves with the core BYTES", () => {
    expect(computeEngineCid("5.3.0", "abcd")).toBe(computeEngineCid("5.3.0", "abcd"));
    expect(computeEngineCid("5.3.0", "abcd")).not.toBe(computeEngineCid("5.3.0", "ef01"));
  });

  it("★ a pure RE-TAG never moves the engineCid — the false-schism cure ★", () => {
    // Identical bytes, a new label. A digest that moved here would excommunicate every peer over an
    // editorial act, and no reader could tell that apart from a real change.
    expect(computeEngineCid("5.5.0-prerelease", "abcd")).toBe(computeEngineCid("5.5.0", "abcd"));
    expect(computeEngineCid("", "abcd")).toBe(computeEngineCid("whatever-a-packager-called-it", "abcd"));
  });

  it("pluginsCid stays order-independent (sorted by id) and deterministic", () => {
    const reversed = [...plugins].reverse();
    expect(computePluginsCid(plugins)).toBe(computePluginsCid(reversed));   // write-order never perturbs it
  });

  it("★ a plugin RE-TAG never moves the pluginsCid, and a plugin's BYTES always do ★", () => {
    const reTagged = plugins.map((p) => (p.id === "lar:///plugins/a" ? { ...p, version: "2.2" } : p));
    expect(computePluginsCid(reTagged)).toBe(computePluginsCid(plugins));

    const rebuilt = plugins.map((p) => (p.id === "lar:///plugins/a" ? { ...p, sha256: "zz" } : p));
    expect(computePluginsCid(rebuilt)).not.toBe(computePluginsCid(plugins));
  });

  it("a plugin change NEVER perturbs the engineCid — the true-name holds through composition", () => {
    const engineBefore = computeEngineCid("5.3.0", "abcd");
    const rebuilt = plugins.map((p) => (p.id === "lar:///plugins/a" ? { ...p, sha256: "zz" } : p));
    expect(computePluginsCid(rebuilt)).not.toBe(computePluginsCid(plugins));
    expect(computeEngineCid("5.3.0", "abcd")).toBe(engineBefore);
  });

  it("an ADDED plugin moves the composition — the pair names WHAT composed, never WHO belongs", () => {
    const grown = [...plugins, { id: "lar:///plugins/c", version: "0.1", sha256: "cc" }];
    expect(computePluginsCid(grown)).not.toBe(computePluginsCid(plugins));
  });
});
