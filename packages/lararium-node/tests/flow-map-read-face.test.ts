/**
 * flow-map-read-face — a Herm serves its public FLOW-map over real HTTP, and the disclosure
 * membrane holds AT THE WIRE: only the coarse public projection crosses; the private territory
 * (vessel-local dial-records) never leaves. Proves serve → pull → verify end-to-end on localhost,
 * and witnesses the additive read-face refactor (the membrane export variant).
 * Canon: lar:///ha.ka.ba/@lararium/mesh/vessel-caps#lares-viales
 */

import { describe, test, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repo } from "@automerge/automerge-repo";
import {
  pullAndVerifyOracle, dialEntryToRecord,
  type MeshPalaceDoc,
} from "@lararium/mesh";
import { mountFlowMapReadFace } from "../src/oracle-read-face.js";

const SEED = new Uint8Array(32).fill(7); // a fixed, valid ed25519 seed (deterministic)

describe("the FLOW-map read-face — a Herm serves the public projection, membrane at the wire", () => {
  test("serve → pull round-trips, and the membrane drops the private territory", async () => {
    const repo = new Repo({ sharePolicy: async () => true });

    // a mesh-palace doc: one PUBLIC dial (dreamnet scale, crosses) + one vessel-LOCAL dial (no scale, stays).
    const pub = dialEntryToRecord(
      { bearing: "lar:///ha.ka.ba/@oracle", verifyingKeyHex: "a".repeat(64), endpoint: "ws://relay/p", scale: "dreamnet" }, "test");
    const loc = dialEntryToRecord(
      { bearing: "lar:///ha.ka.ba/@daemon", verifyingKeyHex: "b".repeat(64), endpoint: "ws://local/q" }, "test");
    const handle = repo.create<MeshPalaceDoc>({
      schemaVersion: "0.1",
      tiddlers: { [pub.tiddler.title]: pub, [loc.tiddler.title]: loc },
    });

    const server = createServer();
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    const storageDir = mkdtempSync(join(tmpdir(), "herm-flowmap-"));

    const face = await mountFlowMapReadFace({ httpServer: server, meshPalaceHandle: handle, signerSeed: SEED, storageDir });

    // a peer pulls + verifies (pointer signature · hash · freshness) — same client as @oracle.
    const verdict = await pullAndVerifyOracle<MeshPalaceDoc>(`http://127.0.0.1:${port}`, { nowMs: Date.now() });
    expect(verdict.ok).toBe(true);

    const titles = Object.keys(verdict.doc?.tiddlers ?? {});
    expect(titles).toContain(pub.tiddler.title);     // the public dial crossed the wire
    expect(titles).not.toContain(loc.tiddler.title); // the private territory stayed home

    face.dispose();
    await new Promise<void>((r) => server.close(() => r()));
  });
});
