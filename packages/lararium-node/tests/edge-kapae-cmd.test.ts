/**
 * edge-kapae-cmd — raising and lowering a relationship, end-to-end through the node.
 *
 * Proven on a real vessel with a real persona root over a temp LAR_ROOT. What matters: the version CLIMBS
 * from the board so a fresh act supersedes rather than ties; a lower takes the shadow down while BOTH acts
 * survive as the record; a pinned same-version lower leaves the shadow UP (remove-wins, reachable from the
 * verb); and the write asserts no authority — a root with no claim over an edge still lands an act that
 * every reader consulting a different authority drops.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  hex, hexToBytes, edgeKapaeBoardDocUrl, materializeSharedLarDoc,
  edgeKapaeActsFromBoard, shadowSetFromBoard,
} from "@lararium/mesh";
import {
  generateOrLoadVesselIdentity, generateOrLoadPersonaGroupRoot,
  loadVesselVerifyingKey, loadPersonaGroupRootVerifyingKey,
} from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import { runEdgeKapae, EdgeKapaeError } from "../src/commands/edge-kapae-cmd.js";

let root: string;
let priorLarRoot: string | undefined;

const EDGE  = "dyad-".padEnd(20, "a");
const EPOCH = "epoch0-aaa";
const verify = (b: Uint8Array, sig: string, did: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(did)).catch(() => false);

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "lares-kapae-"));
  priorLarRoot = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;
  await generateOrLoadVesselIdentity(larDataDir());
  await generateOrLoadPersonaGroupRoot(larDataDir());
});
afterEach(async () => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  await new Promise((r) => setTimeout(r, 200));   // past the storage debounce, as the sibling suites do
  rmSync(root, { recursive: true, force: true });
});

/** Read the board back the way any consumer must — through the verifying fold, under a named authority. */
async function boardState(authority: string) {
  const repo   = new Repo({ storage: new NodeFSStorageAdapter(larDataDir()) });
  const handle = await materializeSharedLarDoc(
    repo, edgeKapaeBoardDocUrl(await loadVesselVerifyingKey(larDataDir())), "@edge-kapae");
  const acts     = edgeKapaeActsFromBoard(handle.doc());
  const shadowed = await shadowSetFromBoard(handle.doc(), () => authority, verify);
  await repo.flush();
  return { acts, shadowed };
}

describe("runEdgeKapae — a relationship set aside, and taken back", () => {
  it("RAISES, and the shadow stands under the signer that raised it", async () => {
    const r = await runEdgeKapae({ edgeId: EDGE, raised: true, epoch: EPOCH });

    expect(r.version).toBe(1);                     // a monotone counter starts where the law starts it
    expect(r.shadowStands).toBe(true);
    expect(r.signerDid).toBe(await loadPersonaGroupRootVerifyingKey(larDataDir(), 0));

    const { shadowed } = await boardState(r.signerDid);
    expect(shadowed.has(EDGE)).toBe(true);
  });

  it("★ the version CLIMBS from the board, so a lower SUPERSEDES rather than ties ★", async () => {
    const up   = await runEdgeKapae({ edgeId: EDGE, raised: true,  epoch: EPOCH });
    const down = await runEdgeKapae({ edgeId: EDGE, raised: false, epoch: EPOCH });

    expect(up.version).toBe(1);
    expect(down.version).toBe(2);
    expect(down.shadowStands).toBe(false);

    const { acts, shadowed } = await boardState(down.signerDid);
    expect(acts).toHaveLength(2);                  // BOTH acts survive as the record
    expect(shadowed.has(EDGE)).toBe(false);
  });

  it("★ a PINNED same-version lower leaves the shadow UP — remove-wins, reachable from the verb ★", async () => {
    const up   = await runEdgeKapae({ edgeId: EDGE, raised: true,  epoch: EPOCH });
    const tie  = await runEdgeKapae({ edgeId: EDGE, raised: false, epoch: EPOCH, version: up.version });

    expect(tie.version).toBe(up.version);
    expect(tie.shadowStands).toBe(true);           // the raise held the tie
  });

  it("the write asserts NO authority — an act lands, and a reader under a different authority drops it", async () => {
    const r = await runEdgeKapae({ edgeId: EDGE, raised: true, epoch: EPOCH });
    expect(r.shadowStands).toBe(true);

    // the same board, read by someone who holds a DIFFERENT key as the edge's authority
    const stranger = await ed.getPublicKeyAsync(new Uint8Array(32).fill(9)).then(hex);
    const { acts, shadowed } = await boardState(stranger);
    expect(acts).toHaveLength(1);                  // the act sits on the board …
    expect(shadowed.size).toBe(0);                 // … and buys nothing where it holds no claim
  });

  it("acts on DIFFERENT edges never contend — each climbs its own counter", async () => {
    const a = await runEdgeKapae({ edgeId: "edge-a", raised: true, epoch: EPOCH });
    const b = await runEdgeKapae({ edgeId: "edge-b", raised: true, epoch: EPOCH });
    expect(a.version).toBe(1);
    expect(b.version).toBe(1);                     // b's counter never saw a's

    const { shadowed } = await boardState(a.signerDid);
    expect([...shadowed].sort()).toEqual(["edge-a", "edge-b"]);
  });

  it("REFUSES a blank edge, a blank epoch, an unheld root, and a sub-floor version", async () => {
    await expect(runEdgeKapae({ edgeId: "  ", raised: true, epoch: EPOCH })).rejects.toThrow(EdgeKapaeError);
    await expect(runEdgeKapae({ edgeId: EDGE, raised: true, epoch: "  " })).rejects.toThrow(EdgeKapaeError);
    await expect(runEdgeKapae({ edgeId: EDGE, raised: true, epoch: EPOCH, handleIndex: 99 }))
      .rejects.toThrow(EdgeKapaeError);
    await expect(runEdgeKapae({ edgeId: EDGE, raised: true, epoch: EPOCH, version: 0 }))
      .rejects.toThrow(EdgeKapaeError);
  });
});
