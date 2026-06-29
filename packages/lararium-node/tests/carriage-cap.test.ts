/**
 * carriage-cap — the composable Herm's carriage: pull a source's public FLOW-map, merge it into the
 * @meshpalace the cap was wired to, so the Herm CARRIES (and re-serves) what it cannot author. The
 * carriage-by-aggregate-reserve half of Lares Viales, witnessed at the cap level (composeVessel wires
 * it over a meshpalace-providing cap). Supersedes the retired createHerm/startHerm unit witness; the
 * live daemon-full relay-chain rides docker-compose.mesh.yml.
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel · …/mesh/vessel-caps#lares-viales
 */

import { describe, test, expect } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repo } from "@automerge/automerge-repo";
import { composeVessel, pullAndVerifyOracle, dialEntryToRecord, type MeshPalaceDoc, type CapModule } from "@lararium/mesh";
import { mountFlowMapReadFace } from "../src/oracle-read-face.js";
import { carriageCap, CAP, type MeshPalaceComponent } from "../src/node-caps.js";

const SEED_A = new Uint8Array(32).fill(7);
async function listen(server: Server): Promise<number> {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return (server.address() as { port: number }).port;
}
const tmp = (p: string): string => mkdtempSync(join(tmpdir(), p));

/** A meshpalace-providing cap (the carriage's declared dep) handing back a given handle. */
const meshpalaceProviding = (handle: MeshPalaceComponent["handle"]): CapModule =>
  ({ id: CAP.meshpalace, build: () => ({ handle } as MeshPalaceComponent) });

describe("carriageCap — the composable Herm carries a peer's FLOW-map (pull → merge)", () => {
  test("pullOnce merges a source's records into the @meshpalace the cap was wired to", async () => {
    const repo = new Repo({ sharePolicy: async () => true });

    // SOURCE — a vessel serving one public dial over a real read-face.
    const srcDial = dialEntryToRecord(
      { bearing: "lar:///ha.ka.ba/@oracle", verifyingKeyHex: "a".repeat(64), endpoint: "ws://src/p", scale: "dreamnet" }, "src");
    const srcHandle = repo.create<MeshPalaceDoc>({ schemaVersion: "0.1", tiddlers: { [srcDial.tiddler.title]: srcDial } });
    const srcServer = createServer();
    const srcPort = await listen(srcServer);
    const srcFace = await mountFlowMapReadFace({ httpServer: srcServer, meshPalaceHandle: srcHandle, signerSeed: SEED_A, storageDir: tmp("src-") });

    // HERM cap-stack — a meshpalace-providing cap + the carriage cap wired over it by composeVessel.
    const hermHandle = repo.create<MeshPalaceDoc>({ schemaVersion: "0.1", tiddlers: {} });
    const vessel = await composeVessel([
      meshpalaceProviding(hermHandle),
      carriageCap({ peers: [`http://127.0.0.1:${srcPort}`], pullIntervalMs: 1_000_000 }), // no auto-repeat in-test
    ]);
    const carriage = vessel.get<{ pullOnce: () => Promise<number> }>(CAP.carriage)!;

    const merged = await carriage.pullOnce();
    expect(merged).toBe(1);
    expect(Object.keys(hermHandle.doc()?.tiddlers ?? {})).toContain(srcDial.tiddler.title); // CARRIES the source's record

    await vessel.dispose(); // reverse order → carriage stops its loop
    srcFace.dispose();
    await new Promise<void>((r) => srcServer.close(() => r()));
  });

  test("a peer down is no error — feed-or-fade (pullOnce returns 0, never throws)", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const hermHandle = repo.create<MeshPalaceDoc>({ schemaVersion: "0.1", tiddlers: {} });
    const vessel = await composeVessel([
      meshpalaceProviding(hermHandle),
      carriageCap({ peers: ["http://127.0.0.1:1/unreachable"], pullIntervalMs: 1_000_000 }),
    ]);
    const carriage = vessel.get<{ pullOnce: () => Promise<number> }>(CAP.carriage)!;
    expect(await carriage.pullOnce()).toBe(0); // unreachable peer → 0 merged, no throw
    await vessel.dispose();
  });
});
