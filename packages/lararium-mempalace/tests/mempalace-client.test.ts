import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MempalaceClient } from "../src/mempalace-client.js";
import { harvestTurn } from "../src/harvest-turn.js";
import { appendBearing, queryBearings } from "../src/bearing-index.js";

const FAKE_SIDECAR = fileURLToPath(new URL("./fixtures/fake-sidecar.mjs", import.meta.url));

function newClient(): MempalaceClient {
  // Drive the real client against a node fake sidecar — exercises spawn,
  // NDJSON framing, handshake, id correlation, and the double-parse.
  return new MempalaceClient({ submoduleRoot: process.cwd(), command: "node", args: [FAKE_SIDECAR] });
}

describe("mempalace-client (read leg, against a fake NDJSON sidecar)", () => {
  let client: MempalaceClient;
  afterEach(async () => {
    await client?.stop();
  });

  it("handshakes and lists drawers", async () => {
    client = newClient();
    await client.start();
    const res = await client.listDrawers({ limit: 20 });
    expect(res.total).toBe(1);
    expect(res.drawers[0].drawer_id).toBe("sweep_s1_m1");
  });

  it("fetches verbatim drawer content (double-parse)", async () => {
    client = newClient();
    await client.start();
    const drawer = await client.getDrawer("sweep_s1_m1");
    expect(drawer.drawer_id).toBe("sweep_s1_m1");
    expect(drawer.content).toContain("<<~ lares aim");
  });

  it("end-to-end: read leg -> parse -> local index -> drift query", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bearings-e2e-"));
    const file = join(dir, "mempalace", "bearing-index.ndjson");
    try {
      client = newClient();
      await client.start();
      const list = await client.listDrawers({ limit: 100 });
      for (const d of list.drawers) {
        const drawer = await client.getDrawer(d.drawer_id);
        const record = harvestTurn(drawer.content, {
          ts: "2026-06-21T10:00:00Z",
          sessionId: "s1",
          turn: d.drawer_id,
          sourceDrawerId: d.drawer_id,
        });
        if (record) appendBearing(file, record);
      }
      const clean = queryBearings(file, { minConfidence: 18 });
      expect(clean).toHaveLength(1);
      expect(clean[0].aim).toContain("operator.weighs.deps");
      expect(clean[0].yield).toContain("council.fork.named");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
