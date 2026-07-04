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

import { afterEach, describe, expect, test } from "vitest";

import { makePersistencePalace, _livePersistenceHolderCount, type PersistencePalace } from "../src/persistence-palace.js";

const TEST_TIMEOUT = 60_000;
const prov = { signer: "vessel-A", frontier: "f0" };

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
    const { claimCid } = await pal.record("innovation", [0.1, 0.2, 0.3], prov, { vow: "provisional" });
    expect(claimCid).toMatch(/^[0-9a-f]{64}$/);                 // content-addressed
    const t = await pal.get(claimCid);
    expect(t).not.toBeNull();
    expect(t!.provenance).toEqual(prov);
    expect(t!.pubinfo).toEqual({ vow: "provisional" });
    expect(t!.witnesses).toEqual([]);
    const re = await pal.reentry(claimCid);
    expect(re!.voice).toBe("silent");                      // no witnesses → the floor
  }, TEST_TIMEOUT);

  test("a DISTINCT-signer witness speaks it — standing derived THROUGH the keel from the persisted log", async () => {
    const pal = openPalace(await palaceDir());
    const { claimCid } = await pal.record("innovation", [1, 0], prov);
    await pal.witness(claimCid, { signer: "vessel-B", frontier: "f1", polarity: 1 });
    const re = await pal.reentry(claimCid);
    expect(re!.voice).toBe("spoken");
    expect(re!.standing).toBeGreaterThan(3);               // above the floor
  }, TEST_TIMEOUT);

  test("frequency-capture defense survives the round-trip: SAME signer 5× stays silent", async () => {
    const pal = openPalace(await palaceDir());
    const { claimCid } = await pal.record("innovation", [1, 0], prov);
    for (let i = 0; i < 5; i++) await pal.witness(claimCid, { signer: "vessel-A", frontier: `f${i}`, polarity: 1 });
    expect((await pal.reentry(claimCid))!.voice).toBe("silent"); // self-signer weighs zero
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
