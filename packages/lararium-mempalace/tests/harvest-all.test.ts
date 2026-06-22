import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MempalaceClient } from "../src/mempalace-client.js";
import { harvestAll } from "../src/harvest-all.js";
import { queryBearings } from "../src/bearing-index.js";

const FAKE = fileURLToPath(new URL("./fixtures/fake-sidecar.mjs", import.meta.url));

describe("harvestAll (read-leg -> parse -> local index loop)", () => {
  let client: MempalaceClient;
  afterEach(async () => {
    await client?.stop();
  });

  it("pages drawers, harvests framed turns, appends bearings to the index", async () => {
    const dir = mkdtempSync(join(tmpdir(), "harvest-all-"));
    const indexPath = join(dir, "mempalace", "bearing-index.ndjson");
    try {
      client = new MempalaceClient({ submoduleRoot: process.cwd(), command: "node", args: [FAKE] });
      await client.start();
      const summary = await harvestAll(client, { indexPath, sessionId: "s1", now: "2026-06-21T10:00:00Z" });
      expect(summary.drawersScanned).toBe(1);
      expect(summary.framed).toBe(1);
      expect(summary.unframed).toBe(0);
      expect(summary.appended).toBe(1);

      const rows = queryBearings(indexPath, { aimLike: "operator.weighs" });
      expect(rows).toHaveLength(1);
      expect(rows[0].sourceDrawerId).toBe("sweep_s1_m1");
      expect(rows[0].yield).toContain("council.fork.named");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
