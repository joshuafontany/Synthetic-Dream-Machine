/**
 * cabal-vouch — one hand stakes its own standing, end-to-end through the node.
 *
 * Proven against a real vessel identity and real persona roots on a temp LAR_ROOT: a vouch lands on the
 * board and reads back through the VERIFYING read (the only read that stands), a voucher's out-degree grows
 * with each distinct joiner and NOT with re-minting, and every fail-closed shore refuses before writing.
 *
 * What this deliberately does NOT assert: that the vouch admitted anyone. A vouch grants nothing on its
 * own — it rides as signal-2 on the lineage, and the crossing runs elsewhere (`admitOnLineage`).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  hex, hexToBytes, vouchBoardDocUrl, verifiedVouchesFromBoard, materializeSharedLarDoc, vouchDagFromInvites,
} from "@lararium/mesh";
import {
  generateOrLoadVesselIdentity, generateOrLoadPersonaGroupRoot, loadVesselVerifyingKey,
  loadPersonaGroupRootVerifyingKey,
} from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import { runCabalVouch, CabalVouchError } from "../src/commands/cabal-vouch.js";

let root: string;
let priorLarRoot: string | undefined;

const REALM  = "a".repeat(64);
const JOINER = "b".repeat(64);
const OTHER  = "c".repeat(64);
const NOW    = Date.parse("2026-07-14T00:00:00Z");
const LATER  = "2026-08-01T00:00:00Z";

const verify = (bytes: Uint8Array, sigHex: string, did: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(did)).catch(() => false);

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "lares-vouch-"));
  priorLarRoot = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;
  await generateOrLoadVesselIdentity(larDataDir());   // the REALM's key — scopes the board
  await generateOrLoadPersonaGroupRoot(larDataDir()); // the HUMAN's face — the hand that stakes
});
afterEach(async () => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  await new Promise((r) => setTimeout(r, 200));       // past the storage debounce, as the sibling suites do
  rmSync(root, { recursive: true, force: true });
});

/** Read the board back the way any consumer must — through the verifying read. */
async function boardVouches(realm = REALM) {
  const repo   = new Repo({ storage: new NodeFSStorageAdapter(larDataDir()) });
  const handle = await materializeSharedLarDoc(repo, vouchBoardDocUrl(await loadVesselVerifyingKey(larDataDir())), "@vouch-registry");
  const out    = await verifiedVouchesFromBoard(handle.doc(), realm, verify);
  await repo.flush();
  return out;
}

describe("runCabalVouch — the vouch lands, verified, and dilutes the hand that made it", () => {
  it("mints a vouch that reads back through the VERIFYING read, signed by the held face", async () => {
    const r = await runCabalVouch({ joiner: JOINER, realm: REALM, expiresAt: LATER }, NOW);

    expect(r.voucherDid).toBe(await loadPersonaGroupRootVerifyingKey(larDataDir(), 0));
    expect(r.outDegreeFloor).toBe(1);
    expect(r.reMinted).toBe(false);

    const onBoard = await boardVouches();
    expect(onBoard).toHaveLength(1);
    expect(onBoard[0]!.joinerIdentityHex).toBe(JOINER);
    expect(onBoard[0]!.voucherDid).toBe(r.voucherDid);
  });

  it("out-degree GROWS with a distinct joiner and does NOT with a re-mint — re-minting buys no branching", async () => {
    const first = await runCabalVouch({ joiner: JOINER, realm: REALM, expiresAt: LATER }, NOW);
    expect(first.outDegreeFloor).toBe(1);

    const second = await runCabalVouch({ joiner: OTHER, realm: REALM, expiresAt: LATER }, NOW);
    expect(second.outDegreeFloor).toBe(2);            // a real second edge — the voucher's mass now splits two ways

    const again = await runCabalVouch({ joiner: JOINER, realm: REALM, expiresAt: LATER }, NOW);
    expect(again.reMinted).toBe(true);
    expect(again.outDegreeFloor).toBe(2);             // STILL two — a re-mint is one edge, never a free dilution

    const dag = vouchDagFromInvites(await boardVouches());
    expect(dag.edges).toHaveLength(2);
  });

  it("REFUSES to vouch for itself — self-boosting is unrepresentable on a lineage", async () => {
    const self = (await loadPersonaGroupRootVerifyingKey(larDataDir(), 0))!;
    await expect(runCabalVouch({ joiner: self, realm: REALM, expiresAt: LATER }, NOW))
      .rejects.toThrow(CabalVouchError);
    expect(await boardVouches()).toHaveLength(0);   // and nothing landed
  });

  it("REFUSES an already-past expiry — a vouch that arrives expired vouches for nobody", async () => {
    await expect(runCabalVouch({ joiner: JOINER, realm: REALM, expiresAt: "2020-01-01T00:00:00Z" }, NOW))
      .rejects.toThrow(CabalVouchError);
    expect(await boardVouches()).toHaveLength(0);
  });

  it("REFUSES a malformed joiner or realm, and an unheld persona root — before anything is written", async () => {
    await expect(runCabalVouch({ joiner: "nope", realm: REALM }, NOW)).rejects.toThrow(CabalVouchError);
    await expect(runCabalVouch({ joiner: JOINER, realm: "nope" }, NOW)).rejects.toThrow(CabalVouchError);
    await expect(runCabalVouch({ joiner: JOINER, realm: REALM, handleIndex: 99 }, NOW)).rejects.toThrow(CabalVouchError);
    expect(await boardVouches()).toHaveLength(0);
  });

  it("scopes to the realm it names — a vouch elsewhere is not this realm's lineage", async () => {
    await runCabalVouch({ joiner: JOINER, realm: REALM, expiresAt: LATER }, NOW);
    await runCabalVouch({ joiner: OTHER,  realm: "d".repeat(64), expiresAt: LATER }, NOW);

    expect(await boardVouches(REALM)).toHaveLength(1);
    expect(await boardVouches("d".repeat(64))).toHaveLength(1);
  });

  it("defaults the expiry rather than minting an immortal vouch", async () => {
    const r = await runCabalVouch({ joiner: JOINER, realm: REALM }, NOW);
    expect(Date.parse(r.expiresAt)).toBeGreaterThan(NOW);
    expect(Date.parse(r.expiresAt)).toBeLessThanOrEqual(NOW + 31 * 24 * 60 * 60 * 1000);
  });
});
