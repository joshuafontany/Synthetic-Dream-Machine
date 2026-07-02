/**
 * subagent-capture-route — the spirit `source_file` carries BOTH channels the @daemon capture path
 * needs: the `__spirits` wing PREFIX (routing) and the `<surface>__<name>__agent-<id>__run-<run>`
 * BASENAME (provenance buildPatch reads — surface token first, per the main-transcript law). This
 * proves a spirit turn routed through the capture verb lands the spirits wing + spirit-keyed AST
 * provenance, with `lar_surface` stamped by token and the worldline-handle law UNSHIFTED.
 */

import { describe, expect, test } from "vitest";
import { buildPatch, harvestTurnGradient } from "@lararium/mesh";
import { spiritCaptureSourceFile, spiritStageBasename, spiritsWing } from "../src/subagent-mine.js";

describe("spiritCaptureSourceFile", () => {
  const src = spiritCaptureSourceFile("wing_synthetic_dream_machine", "spirit-abc123de", "abc123def", "run-99");

  test("prefixes the spirits wing (the routing channel the node wing-stamp decodes)", () => {
    expect(src.split("/")[0]).toBe(spiritsWing("wing_synthetic_dream_machine"));
    expect(src.split("/")[0]).toBe("wing_synthetic_dream_machine__spirits");
  });

  test("the basename leads with the surface token (the ${surface}__ main-transcript law)", () => {
    expect(src.split("/")[1]).toBe("claude__spirit-abc123de__agent-abc123def__run-run-99.jsonl");
    expect(spiritStageBasename("spirit-abc123de", "abc123def", "run-99")).toBe(src.split("/")[1]);
  });

  test("the BASENAME drives buildPatch's spirit provenance (surface by token · agent label · worldline handle)", () => {
    const patch = buildPatch(harvestTurnGradient("Lares (Scout): the verb leads"), src);
    expect(patch["lar_surface"]).toBe("claude");                  // by token, not by default
    expect(patch["lar_agent"]).toBe("spirit-abc123de");           // surface token stripped before the label
    expect(patch["lar_sidechain"]).toBe(1);
    expect(patch["lar_agent_handle"]).toBe("run-99.abc123def");   // <run>.<agentId> worldline path
    expect(patch["lar_parent_handle"]).toBe("run-99");            // closes back to the main run
  });

  test("legacy un-prefixed spirit names derive UNCHANGED (existing drawers key on the handle)", () => {
    const legacy = "wing_x__spirits/Mapper__agent-abc123def__run-run-99.jsonl";
    const patch = buildPatch(harvestTurnGradient("Lares (Mapper): the verb leads"), legacy);
    expect(patch["lar_agent"]).toBe("Mapper");
    expect(patch["lar_agent_handle"]).toBe("run-99.abc123def");
    expect(patch["lar_surface"]).toBe("claude"); // un-prefixed legacy → claude, as before
  });
});
