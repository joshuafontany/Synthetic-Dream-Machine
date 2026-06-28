/**
 * herm — the wayfarer CARRIES the FLOW-map: it pulls a source's public FLOW-map, merges it into its
 * own, and re-serves the union, so a downstream peer reads the source's records FROM the Herm. The
 * carriage-by-aggregate-reserve half of the Lares Viales, witnessed across three real HTTP endpoints.
 * Canon: lar:///ha.ka.ba/@lararium/mesh/vessel-caps#lares-viales
 */

import { describe, test, expect } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repo } from "@automerge/automerge-repo";
import { pullAndVerifyOracle, dialEntryToRecord, type MeshPalaceDoc } from "@lararium/mesh";
import { mountFlowMapReadFace } from "../src/oracle-read-face.js";
import { createHerm } from "../src/herm.js";
import { startHerm } from "../src/herm-main.js";

const SEED_A = new Uint8Array(32).fill(7);
const SEED_H = new Uint8Array(32).fill(9);

async function listen(server: Server): Promise<number> {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return (server.address() as { port: number }).port;
}
const tmp = (p: string): string => mkdtempSync(join(tmpdir(), p));

/** Poll a read-face until it serves a record at `title` (the re-issue after a change is async). */
async function pullUntil(url: string, title: string, tries = 30): Promise<MeshPalaceDoc | null> {
  for (let i = 0; i < tries; i++) {
    const v = await pullAndVerifyOracle<MeshPalaceDoc>(url, { nowMs: Date.now() });
    if (v.ok && v.doc && title in v.doc.tiddlers) return v.doc;
    await new Promise((r) => setTimeout(r, 30));
  }
  return null;
}

describe("createHerm — the wayfarer carries the FLOW-map (pull → merge → re-serve)", () => {
  test("a Herm relays a source's public FLOW-map to a downstream peer", async () => {
    const repo = new Repo({ sharePolicy: async () => true });

    // SOURCE — a vessel serving one public dial.
    const srcDial = dialEntryToRecord(
      { bearing: "lar:///ha.ka.ba/@oracle", verifyingKeyHex: "a".repeat(64), endpoint: "ws://src/p", scale: "dreamnet" }, "src");
    const srcHandle = repo.create<MeshPalaceDoc>({ schemaVersion: "0.1", tiddlers: { [srcDial.tiddler.title]: srcDial } });
    const srcServer = createServer();
    const srcPort = await listen(srcServer);
    const srcFace = await mountFlowMapReadFace({ httpServer: srcServer, meshPalaceHandle: srcHandle, signerSeed: SEED_A, storageDir: tmp("src-") });

    // HERM — empty mesh-palace, pulls from the source.
    const hermHandle = repo.create<MeshPalaceDoc>({ schemaVersion: "0.1", tiddlers: {} });
    const hermServer = createServer();
    const hermPort = await listen(hermServer);
    const herm = await createHerm({
      httpServer: hermServer, meshPalaceHandle: hermHandle, signerSeed: SEED_H, storageDir: tmp("herm-"),
      peers: [`http://127.0.0.1:${srcPort}`],
    });

    // after the first pull, the Herm CARRIES the source's record in its own map…
    expect(Object.keys(hermHandle.doc()?.tiddlers ?? {})).toContain(srcDial.tiddler.title);

    // …and RE-SERVES it: a downstream peer reads the source's record FROM the Herm.
    const downstream = await pullUntil(`http://127.0.0.1:${hermPort}`, srcDial.tiddler.title);
    expect(downstream).not.toBeNull();
    expect(Object.keys(downstream?.tiddlers ?? {})).toContain(srcDial.tiddler.title);

    herm.dispose(); srcFace.dispose();
    await new Promise<void>((r) => srcServer.close(() => r()));
    await new Promise<void>((r) => hermServer.close(() => r()));
  });
});

describe("startHerm — the runnable wayfarer boots, serves, closes", () => {
  test("boots on an ephemeral port, serves a valid FLOW-map pointer, closes clean", async () => {
    const running = await startHerm({ port: 0, peers: [], storageDir: tmp("herm-boot-") });
    expect(running.port).toBeGreaterThan(0);
    // even an empty FLOW-map publishes a valid signed pointer + snapshot (an anon, self-certifying wayfarer)
    const v = await pullAndVerifyOracle<MeshPalaceDoc>(`http://127.0.0.1:${running.port}`, { nowMs: Date.now() });
    expect(v.ok).toBe(true);
    await running.close();
  });
});
