/**
 * persistence-palace — the TS op-surface bridging the DUMB python store (persistence_io) to the
 * SOVEREIGN mesh keel (persistence-keel). Driven END-TO-END against a REAL temp-dir palace (venv
 * python + chromadb): record a Testimony (born silent) → witness it (distinct signer speaks it,
 * derived through the keel from the persisted log) → the admit gate (novel admits, dupe refused).
 * Proves the two halves compose live and never fuse (store persists, keel decides).
 *
 * First call per palace pays a one-time chroma open, so timeouts are generous. Each test opens its
 * own temp palace and closes it (killing the holder) so vitest exits clean.
 */

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, test } from "vitest";
import * as ed25519 from "@noble/ed25519";
import { signWitness, verifyWitnessSig, hex, type Witness } from "@lararium/mesh";

import { makePersistencePalace, _livePersistenceHolderCount, type PersistencePalace } from "../src/sensorium.js";

const TEST_TIMEOUT = 60_000;

// Two test keypairs — vessel A (the recorder, also the self-signer) and vessel B (a distinct corroborator).
// The palace `witness` gate verifies deny-by-default against `edge.signer`, so a witnessing signer MUST carry
// its raw ed25519 verifying-key hex; a signed edge minted by signWitness passes the gate, an unsigned one denies.
const seedA = new Uint8Array(32).fill(7);
const seedB = new Uint8Array(32).fill(11);
let pubA = "";
let pubB = "";
const signA = async (bytes: Uint8Array) => hex(await ed25519.signAsync(bytes, seedA));
const signB = async (bytes: Uint8Array) => hex(await ed25519.signAsync(bytes, seedB));
beforeAll(async () => {
  pubA = hex(await ed25519.getPublicKeyAsync(seedA));
  pubB = hex(await ed25519.getPublicKeyAsync(seedB));
});
const prov = (): { signer: string; frontier: string } => ({ signer: pubA, frontier: "f0" });

const opened: PersistencePalace[] = [];
function openPalace(dir: string): PersistencePalace {
  const pal = makePersistencePalace(dir);
  opened.push(pal);
  return pal;
}
const palaceDir = (): Promise<string> => mkdtemp(join(tmpdir(), "persistence-"));
afterEach(async () => { await Promise.all(opened.splice(0).map((p) => p.close())); });

describe("makePersistencePalace (keel ⊕ store, driven live)", () => {
  test("record → get round-trips a Testimony, born silent", async () => {
    const pal = openPalace(await palaceDir());
    const { claimCid } = await pal.record("innovation", [0.1, 0.2, 0.3], prov(), { vow: "provisional" });
    expect(claimCid).toMatch(/^[0-9a-f]{64}$/);                 // content-addressed
    const t = await pal.get(claimCid);
    expect(t).not.toBeNull();
    expect(t!.provenance).toEqual(prov());
    expect(t!.pubinfo).toEqual({ vow: "provisional" });
    expect(t!.witnesses).toEqual([]);
    const re = await pal.reentry(claimCid);
    expect(re!.voice).toBe("silent");                      // no witnesses → the floor
  }, TEST_TIMEOUT);

  test("a DISTINCT-signer witness speaks it — standing derived THROUGH the keel from the persisted log", async () => {
    const pal = openPalace(await palaceDir());
    const { claimCid } = await pal.record("innovation", [1, 0], prov());
    // A REAL signed edge from a distinct signer (vessel B); the gate verifies it and the store keeps it.
    const edge = await signWitness({ claimCid, signer: pubB, frontier: "f1", polarity: 1, sign: signB });
    const r = await pal.witness(claimCid, edge);
    expect(r.ok).toBe(true);                               // the verify-gate accepted the signed edge
    const re = await pal.reentry(claimCid);
    expect(re!.voice).toBe("spoken");
    expect(re!.standing).toBeGreaterThan(3);               // above the floor
    // The SIGNATURE survives the round-trip through the dumb py store: get() returns the edge with its
    // string intact, and it re-verifies off disk — so a re-loaded edge stands proven, not merely present.
    const reloaded = (await pal.get(claimCid))!.witnesses.at(-1)!;
    expect(reloaded.signature).toBe(edge.signature);
    expect(await verifyWitnessSig(claimCid, reloaded)).toBe(true);
  }, TEST_TIMEOUT);

  test("frequency-capture defense survives the round-trip: SAME signer 5× stays silent", async () => {
    const pal = openPalace(await palaceDir());
    const { claimCid } = await pal.record("innovation", [1, 0], prov());
    // Five SIGNED self-witnesses (vessel A === the recorder): each passes the gate, but a self-signer weighs
    // zero in the distinct-signer arithmetic — so the trace stays silent despite five valid edges in the log.
    for (let i = 0; i < 5; i++) {
      const edge = await signWitness({ claimCid, signer: pubA, frontier: `f${i}`, polarity: 1, sign: signA });
      expect((await pal.witness(claimCid, edge)).ok).toBe(true);
    }
    expect((await pal.reentry(claimCid))!.voice).toBe("silent"); // self-signer weighs zero
  }, TEST_TIMEOUT);

  test("the verify-gate DENIES an unsigned/invalid edge and ACCEPTS a valid one — deny-by-default, log unchanged", async () => {
    const pal = openPalace(await palaceDir());
    const { claimCid } = await pal.record("innovation", [1, 0], prov());

    // an UNSIGNED edge — malformed; the gate refuses it and appends nothing, so the trace stays silent
    const unsigned = { signer: pubB, frontier: "f1", polarity: 1 as const } as Witness;
    const denied = await pal.witness(claimCid, unsigned);
    expect(denied.ok).toBe(false);
    expect(denied.witnesses).toBe(0);
    expect((await pal.reentry(claimCid))!.voice).toBe("silent"); // log unchanged — no unsigned path

    // a signature that does NOT bind this claim (signed over a different claimCid) — verify fails, denied
    const wrongClaim = await signWitness({ claimCid: "some-other-claim", signer: pubB, frontier: "f1", polarity: 1, sign: signB });
    expect((await pal.witness(claimCid, wrongClaim)).ok).toBe(false);
    expect((await pal.reentry(claimCid))!.voice).toBe("silent"); // still silent — the invalid edge never entered

    // now a VALID edge bound to this claim — accepted, persisted, and the trace speaks
    const valid = await signWitness({ claimCid, signer: pubB, frontier: "f1", polarity: 1, sign: signB });
    expect((await pal.witness(claimCid, valid)).ok).toBe(true);
    expect((await pal.reentry(claimCid))!.voice).toBe("spoken");
  }, TEST_TIMEOUT);

  test("the admit gate: an outlier admits, a near-duplicate is refused", async () => {
    const pal = openPalace(await palaceDir());
    for (let i = 0; i < 6; i++) await pal.record("innovation", [10 + i * 0.05, -3], { signer: "vessel-A", frontier: `f${i}` });
    expect((await pal.admit([40, 12])).admit).toBe(true);   // outlier
    expect((await pal.admit([10.1, -3])).admit).toBe(false); // sits in the cloud
  }, TEST_TIMEOUT);

  test("one holder per palace, never a pile", async () => {
    const dir = await palaceDir();
    openPalace(dir); openPalace(dir);                       // two opens, same dir
    await pal_noop();
    expect(_livePersistenceHolderCount()).toBe(1);
  }, TEST_TIMEOUT);
});

async function pal_noop(): Promise<void> { /* let the acquires settle */ }
