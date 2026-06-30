import { describe, it, expect, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { MempalaceClient } from "../src/mempalace-client.js";

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
});
