/**
 * nexus-kapae.test.ts — the RAISE side of the Kapae immune antigen (#65), end-to-end through the node command.
 *
 * Proven, against a SYNTHETIC seated roster on a temp LAR_ROOT (real vessel identity, real founder persona-
 * roots, a real Automerge board on disk):
 *   · the full loop RAISE → board → read → fold → isKapaed — a 2-of-3 signed ban lands on the always-carried
 *     board and folds the victim nym to Kapae'd (the exact set the antigen-ring enforces on),
 *   · a SUB-QUORUM raise REFUSES (fewer than threshold HELD roots sit in the roster) — nothing written,
 *   · an UNSEATED charter REFUSES (no roster to root on),
 *   · un_kapae at a STRICTLY HIGHER version LIFTS; the fold reflects it,
 *   · the written tiddler PERSISTS across Repo instances (a fresh Repo reads the prior write back).
 *
 * The signing is the a-multitude-of-one: one operator holds all three founding persona-roots and signs the
 * quorum with two of their OWN held roots (the real-cabal collect-signatures ceremony is the surfaced fork).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { hex, genesisSealEpochCid, type NexusDoc } from "@lararium/mesh";
import {
  generateOrLoadVesselIdentity, generateOrLoadPersonaGroupRoot,
} from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import { writeNexusDoc } from "../src/nexus-doc.js";
import { runNexusKapae, runNexusKapaeList, NexusKapaeError } from "../src/commands/nexus-kapae.js";

const VICTIM = "beadfeed".repeat(8);   // the presenter nym a ban targets

let root: string;
let priorLarRoot: string | undefined;

/** The bags dir under the isolated LAR_ROOT — mirrors the CLI's `larBagsDir()` (LAR_BAGS ?? <root>/bags). */
const sealHome = (): string => join(root, "state", "nexus");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lares-kapae-"));
  priorLarRoot = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;   // isolates data/state/bags under the temp tree
});

afterEach(() => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  rmSync(root, { recursive: true, force: true });
});

/** Seat a legacy-inception charter DOC binding the given verifying keys at 2-of-3 into `bags/@nexus`. */
function seatCharter(keys: string[], threshold = 2): void {
  const doc: NexusDoc = {
    kind: "lar-nexus-doc/v1",
    threshold,
    sealEpochCid: genesisSealEpochCid(keys, threshold),
    kahu: [
      { displayName: "Kahu Alpha", verifyingKey: keys[0] ?? null },
      { displayName: "Kahu Beta",        verifyingKey: keys[1] ?? null },
      { displayName: "Kahu Gamma",        verifyingKey: keys[2] ?? null },
    ],
  };
  writeNexusDoc(sealHome(), doc);
}

describe("nexus kapae — the RAISE side end-to-end (#65)", () => {
  it("RAISE → board → fold → isKapaed: a 2-of-3 held-root ban Kapae's the victim", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.map((r) => r.verifyingKey));

    const res = await runNexusKapae({ action: "kapae", nym: VICTIM, sealHome: sealHome() });
    expect(res.version).toBe(1);
    expect(res.priorVersion).toBeNull();
    expect(res.signers).toHaveLength(2);       // exactly the 2-of-3 quorum
    expect(res.kapaedNow).toBe(true);          // folds to Kapae'd against the seated roster

    // A FRESH Repo (inside runNexusKapaeList) reads the persisted board back — the loop the ring runs.
    const list = await runNexusKapaeList({ sealHome: sealHome() });
    expect(list.kapaed).toContain(VICTIM);
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0]).toMatchObject({ nym: VICTIM, action: "kapae", version: 1, signers: 2 });
  });

  it("un_kapae at a STRICTLY HIGHER version LIFTS the standing ban", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.map((r) => r.verifyingKey));

    await runNexusKapae({ action: "kapae", nym: VICTIM, sealHome: sealHome() });   // ban @ v1
    const lift = await runNexusKapae({ action: "un_kapae", nym: VICTIM, sealHome: sealHome() });
    expect(lift.version).toBe(2);              // strictly higher than the standing ban
    expect(lift.priorVersion).toBe(1);
    expect(lift.kapaedNow).toBe(false);        // the fold lifts it

    const list = await runNexusKapaeList({ sealHome: sealHome() });
    expect(list.kapaed).not.toContain(VICTIM);
    expect(list.entries).toHaveLength(2);      // both entries accrete; the fold picks the higher

    // A re-ban at a yet-higher version re-imposes it (monotone both ways).
    const reban = await runNexusKapae({ action: "kapae", nym: VICTIM, sealHome: sealHome() });
    expect(reban.version).toBe(3);
    expect(reban.kapaedNow).toBe(true);
  });

  it("SUB-QUORUM REFUSES: one held root against a 2-of-3 roster writes NOTHING", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const held = await generateOrLoadPersonaGroupRoot(larDataDir(), 0);   // the ONLY held root
    // Two roster co-signers the vessel does NOT hold — real ed25519 keys, just not in this vault.
    const stranger1 = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(7)));
    const stranger2 = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(8)));
    seatCharter([held.verifyingKey, stranger1, stranger2]);

    await expect(runNexusKapae({ action: "kapae", nym: VICTIM, sealHome: sealHome() }))
      .rejects.toBeInstanceOf(NexusKapaeError);

    // Fail-closed: nothing landed on the board.
    const list = await runNexusKapaeList({ sealHome: sealHome() });
    expect(list.entries).toHaveLength(0);
    expect(list.kapaed).toHaveLength(0);
  });

  it("UNSEATED charter REFUSES: no roster to root a ban on", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    // No seatCharter — the authority home is absent.
    await expect(runNexusKapae({ action: "kapae", nym: VICTIM, sealHome: sealHome() }))
      .rejects.toBeInstanceOf(NexusKapaeError);
  });

  it("a malformed nym REFUSES before any quorum work", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.map((r) => r.verifyingKey));
    await expect(runNexusKapae({ action: "kapae", nym: "not-a-key", sealHome: sealHome() }))
      .rejects.toBeInstanceOf(NexusKapaeError);
  });
});
