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
import { composeVessel, pullAndVerifyOracle, dialEntryToRecord, routingSlotToRecord, radialCoordinate, type MeshPalaceDoc, type CapModule } from "@lararium/mesh";
import { mountFlowMapReadFace } from "../src/oracle-read-face.js";
import { carriageCap, CAP, incommensurablePullMs, discoverPeers, dampedRadius, type MeshPalaceComponent } from "../src/node-caps.js";

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

  test("FFZ axis-2: the pull cadence is per-node INCOMMENSURABLE + renewal-randomized (no global fixed interval)", () => {
    const half = () => 0.5; // fixed jitter → isolate the per-node deterministic factor
    // distinct node-ids → distinct mean cadences (mutually incommensurable, not one global interval)
    const a = incommensurablePullMs("aaaa", 30_000, half);
    const b = incommensurablePullMs("bbbb", 30_000, half);
    const c = incommensurablePullMs("cccc", 30_000, half);
    expect(new Set([a, b, c]).size).toBe(3);            // three node-ids, three different cadences
    // deterministic factor is REPRODUCIBLE (same seed + same rand → same delay) — coordination-free
    expect(incommensurablePullMs("aaaa", 30_000, half)).toBe(a);
    // renewal: same seed, varying rand → the realization VARIES (the secret phase, never a fixed instant)
    const lo = incommensurablePullMs("aaaa", 30_000, () => 0);
    const hi = incommensurablePullMs("aaaa", 30_000, () => 0.999);
    expect(hi).toBeGreaterThan(lo);
    // bounded + floored (never a runaway-tight or zero cadence)
    expect(lo).toBeGreaterThanOrEqual(250);
    expect(hi).toBeLessThan(30_000 * 1.3 * 1.25 + 1);   // ≤ max factor × max jitter
  });

  test("discoverPeers — self-peering: bootstrap ∪ carried dials, http-only, self-excluded, deduped, bounded", () => {
    const docWith = (...endpoints: string[]): MeshPalaceDoc => {
      const tiddlers: Record<string, ReturnType<typeof dialEntryToRecord>> = {};
      endpoints.forEach((ep, i) => {
        const rec = dialEntryToRecord(
          { bearing: `lar:///ha.ka.ba/@oracle/herm/d${i}`, verifyingKeyHex: "a".repeat(64), endpoint: ep, scale: "dreamnet" }, "test");
        tiddlers[rec.tiddler.title] = rec;
      });
      return { schemaVersion: "0.1", tiddlers };
    };
    // union + http-only + self-excluded + deduped
    const doc = docWith("http://a:8080", "http://b:8080", "ws://c:8080/ws", "http://self:8080", "http://a:8080");
    const peers = discoverPeers(doc, ["http://boot:8080"], "http://self:8080", 16);
    expect(peers).toContain("http://boot:8080");                          // bootstrap kept
    expect(peers).toEqual(expect.arrayContaining(["http://a:8080", "http://b:8080"])); // dials discovered
    expect(peers).not.toContain("ws://c:8080/ws");                        // ws sync-endpoint skipped
    expect(peers).not.toContain("http://self:8080");                      // self excluded
    expect(peers.filter((p) => p === "http://a:8080").length).toBe(1);    // deduped
    // bounded by maxFanout (bootstrap first)
    const bounded = discoverPeers(docWith("http://a:8080", "http://b:8080", "http://c:8080"), ["http://boot:8080"], undefined, 2);
    expect(bounded).toEqual(["http://boot:8080", "http://a:8080"]);
    // a leaf with no carried dials → bootstrap only
    expect(discoverPeers(undefined, ["http://boot:8080"], undefined, 16)).toEqual(["http://boot:8080"]);
  });

  test("discoverPeers — with a selfCoord, RE-RANKS carried dials by l-space proximity (nearest first)", () => {
    const self = { r: 1.0, theta: 0.4 };
    const tiddlers: Record<string, ReturnType<typeof dialEntryToRecord>> = {};
    const mk = (i: number, ep: string, r: number) => {
      const b = `lar:///ha.ka.ba/@oracle/herm/n${i}`;
      const dial = dialEntryToRecord({ bearing: b, verifyingKeyHex: "a".repeat(64), endpoint: ep, scale: "dreamnet" }, "test");
      const slot = routingSlotToRecord({ bearing: b, r, theta: 0.4 }, "test"); // same θ → distance = |r − self.r|
      tiddlers[dial.tiddler.title] = dial;
      tiddlers[slot.tiddler.title] = slot;
    };
    mk(0, "http://far:8080", 5.0);   // farthest
    mk(1, "http://near:8080", 1.2);  // nearest
    mk(2, "http://mid:8080", 3.0);   // middle
    const doc: MeshPalaceDoc = { schemaVersion: "0.1", tiddlers };
    expect(discoverPeers(doc, [], undefined, 1, self)).toEqual(["http://near:8080"]);             // nearest only
    expect(discoverPeers(doc, [], undefined, 2, self)).toEqual(["http://near:8080", "http://mid:8080"]); // then mid
    // without a selfCoord → insertion order (federation-by-dials, no re-rank)
    expect(discoverPeers(doc, [], undefined, 1)).toEqual(["http://far:8080"]);
  });

  test("dampedRadius — PSO-β low-pass: r DRIFTS toward radialCoordinate(degree), never snaps (no oscillation)", () => {
    const r0 = 8, deg = 20;
    const target = radialCoordinate(deg, { R: 8, minDegree: 1 }); // high degree → low r (hub near center)
    const r1 = dampedRadius(r0, deg);
    expect(r1).toBeLessThan(r0);                            // drifts down (more carriage → nearer center)
    expect(r1).toBeGreaterThan(target);                    // but does NOT snap — a partial (γ=0.15) move
    expect(r1).toBeCloseTo(0.85 * r0 + 0.15 * target, 9);  // exactly the low-pass
    let r = 8; for (let i = 0; i < 80; i++) r = dampedRadius(r, deg);
    expect(r).toBeCloseTo(target, 3);                      // iterating converges (stable, monotone)
    let rHi = 8, rLo = 8;
    for (let i = 0; i < 80; i++) { rHi = dampedRadius(rHi, 50); rLo = dampedRadius(rLo, 2); }
    expect(rHi).toBeLessThan(rLo);                         // higher degree → lower steady-state r
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
