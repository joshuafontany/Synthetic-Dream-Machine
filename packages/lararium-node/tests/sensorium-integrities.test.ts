import { describe, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSensoriumManifest, sensoriumContract, writeManifest } from "../src/sensorium.js";
import { attachPetName, proposePetName } from "../src/sensorium-petnames.js";

function root(): string {
  return mkdtempSync(join(tmpdir(), "lar-integrities-"));
}

describe("sensorium pattern integrities", () => {
  test("memory and a text-cloud test bed differ by lifecycle, not a named type", () => {
    const dir = root();
    try {
      const caps = {
        content: { absDir: join(dir, "content"), engine: "content" },
        structure: { absDir: join(dir, "structure"), engine: "structurepalace" },
        form: { absDir: join(dir, "form"), engine: "formpalace" },
        persistence: { absDir: join(dir, "persistence"), engine: "persistence", variance: "cosheaf" as const },
        worldline: { absDir: join(dir, "worldline"), engine: "worldline" },
      };
      const memory = buildSensoriumManifest(join(dir, "memory"), { sensorium: "memory", lar: "lar:///memory", caps });
      const twain = buildSensoriumManifest(join(dir, "twain"), { sensorium: "testbed", lar: "lar:///twain", caps, ephemeral: true });
      expect(sensoriumContract(memory)).toEqual(sensoriumContract(twain));
      expect(memory.ephemeral).toBe(false);
      expect(twain.ephemeral).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a child-hosting sensorium carries its bridge shape without pretending to be a text-cloud", () => {
    const dir = root();
    try {
      const mesh = buildSensoriumManifest(dir, {
        sensorium: "mesh", lar: "lar:///mesh", caps: {},
        children: ["who", "authority", "flow"].map((sensorium) => ({ sensorium, absDir: join(dir, sensorium) })),
      });
      writeManifest(dir, mesh);
      const operator = attachPetName(dir, { subject: "root", label: "mesh" });
      const proposal = proposePetName(dir, { subject: "child:flow", label: "current", projection: "ki", evidence: [] });
      expect(mesh.coupling.children.map((child) => child.sensorium)).toEqual(["who", "authority", "flow"]);
      expect(operator.status).toBe("accepted");
      expect(proposal.status).toBe("proposed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
