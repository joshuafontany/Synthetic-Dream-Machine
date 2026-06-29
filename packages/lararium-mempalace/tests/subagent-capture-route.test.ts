/**
 * subagent-capture-route — the spirit `source_file` carries BOTH channels the @daemon capture path
 * needs: the `__spirits` wing PREFIX (routing) and the `<name>__agent-<id>__run-<run>` BASENAME
 * (provenance buildPatch reads). This proves a spirit turn routed through the capture verb lands the
 * spirits wing + spirit-keyed AST provenance — closing the subagent-AST gap.
 */

import { describe, expect, test } from "vitest";
import { buildPatch, harvestTurnGradient } from "@lararium/mesh";
import { spiritCaptureSourceFile, spiritsWing } from "../src/subagent-mine.js";

describe("spiritCaptureSourceFile", () => {
  const src = spiritCaptureSourceFile("wing_synthetic_dream_machine", "Mapper", "abc123def", "run-99");

  test("prefixes the spirits wing (the routing channel the node wing-stamp decodes)", () => {
    expect(src.split("/")[0]).toBe(spiritsWing("wing_synthetic_dream_machine"));
    expect(src.split("/")[0]).toBe("wing_synthetic_dream_machine__spirits");
  });

  test("the BASENAME drives buildPatch's spirit provenance (lar_agent + sidechain + worldline handle)", () => {
    // buildPatch reads the basename — the wing prefix is invisible to surface/agent/handle derivation.
    const patch = buildPatch(harvestTurnGradient("Lares (Mapper): the verb leads"), src);
    expect(patch["lar_agent"]).toBe("Mapper");
    expect(patch["lar_sidechain"]).toBe(1);
    expect(patch["lar_agent_handle"]).toBe("run-99.abc123def"); // <run>.<agentId> worldline path
    expect(patch["lar_parent_handle"]).toBe("run-99");          // closes back to the main run
    // surface still derives off the basename (a spirit name is not a surface → claude)
    expect(patch["lar_surface"]).toBe("claude");
  });
});
