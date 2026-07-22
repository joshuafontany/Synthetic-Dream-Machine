import { describe, expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateManifest, readManifest } from "../src/sensorium.js";

describe("sensorium manifest migration", () => {
  test("upgrades a rooted stream declaration while preserving cap-owned evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "lar-manifest-migration-"));
    try {
      writeFileSync(join(root, "manifest.json"), JSON.stringify({
        sensorium: "memory", lar: "lar:///memory", ephemeral: false,
        has: { content: { dir: "content", engine: "content", variance: "sheaf" } },
        persistencePolicy: { halfLife: null },
        worldline: { real: ["turn-dag"], arbitrary: ["source-sequence"] },
      }) + "\n");
      const migrated = migrateManifest(root);
      expect(migrated).not.toBeNull();
      expect(migrated!.schema).toBe(1);
      expect(migrated!.created).toEqual(expect.any(String));
      expect(readManifest(root)).toEqual(migrated);
      expect(JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"))["worldline"]).toEqual({ real: ["turn-dag"], arbitrary: ["source-sequence"] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
