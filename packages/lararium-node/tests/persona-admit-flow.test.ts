/**
 * persona-admit-flow.test.ts — the airgapped 3-hop between TWO simulated vessels, through the real flow
 * functions (ceremony + per-vessel store + QR render), each vessel a separate temp identity dir.
 *
 * Proven:
 *   · THE FULL FLOW — B offers → A grants → B opens (records + ACKs) → A accepts (records); BOTH vessels' LOCAL
 *     multitude-views end holding the SAME persona join, each written to its OWN dir (per-vessel, never shared),
 *   · each hop renders a scannable terminal QR of its carriage,
 *   · B's ephemeral secret is CONSUMED on open (a second open finds no pending enrollment),
 *   · PHOTOGRAPH-INERT at the flow level — a captured grant carriage opened on a THIRD vessel (no pending
 *     enrollment / wrong ephemeral) records nothing,
 *   · ROTATE-NOT-RESURRECT — a grant refused by the head resolver records nothing on either side.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { ed25519SignerFromSeed, type PersonaRef } from "@lararium/mesh";
import { hex } from "@lararium/mesh";
import { offerAdmitFlow, grantAdmitFlow, openAdmitFlow, acceptAdmitFlow } from "../src/persona-admit-flow.js";
import { listAdmittedPersonas } from "../src/node-persona-admit-store.js";

const A_PERSONA_SEED = new Uint8Array(32).fill(1);
const B_DEVICE_SEED  = new Uint8Array(32).fill(2);
const PREFIX = "EpersonaAID_flow_01";
const pubOf = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);

describe("persona-admit-flow — the airgapped 3-hop between two vessels", () => {
  let aDir: string;   // vessel A (granter)
  let bDir: string;   // vessel B (target)
  beforeEach(() => {
    aDir = mkdtempSync(join(tmpdir(), "lares-vessel-a-"));
    bDir = mkdtempSync(join(tmpdir(), "lares-vessel-b-"));
  });
  afterEach(() => { rmSync(aDir, { recursive: true, force: true }); rmSync(bDir, { recursive: true, force: true }); });

  async function fixtures() {
    const personaKey = await pubOf(A_PERSONA_SEED);
    const deviceKey  = await pubOf(B_DEVICE_SEED);
    const personaRef: PersonaRef = { prefix: PREFIX, verifyingKey: personaKey };
    const personaSigner = ed25519SignerFromSeed(A_PERSONA_SEED);
    const deviceSigner  = ed25519SignerFromSeed(B_DEVICE_SEED);
    const resolveHeadOpKey = (prefix: string): string | null => (prefix === PREFIX ? personaKey : null);
    return { personaKey, deviceKey, personaRef, personaSigner, deviceSigner, resolveHeadOpKey };
  }

  test("THE FULL FLOW: both vessels end holding the SAME join in their OWN local view", async () => {
    const f = await fixtures();

    // HOP 1 (B): offer + a scannable QR; the secret stashes in B's dir.
    const offer = await offerAdmitFlow({ deviceVerifyingKey: f.deviceKey, dir: bDir });
    expect(offer.terminalQr.length).toBeGreaterThan(0);
    expect(offer.carriage.startsWith("#enroll=")).toBe(true);

    // HOP 2 (A): grant sealed to B's ephemeral, signed by the persona prefix key; memo stashes in A's dir.
    const grant = await grantAdmitFlow({ offerCarriage: offer.carriage, personaRef: f.personaRef, personaSigner: f.personaSigner, dir: aDir });
    expect("error" in grant).toBe(false);
    if ("error" in grant) return;
    expect(grant.carriage.startsWith("#grant=")).toBe(true);

    // HOP 3 (B): open + record + ACK.
    const opened = await openAdmitFlow({ grantCarriage: grant.carriage, resolveHeadOpKey: f.resolveHeadOpKey, deviceSigner: f.deviceSigner, dir: bDir });
    expect("error" in opened).toBe(false);
    if ("error" in opened) return;
    expect(opened.carriage.startsWith("#ack=")).toBe(true);

    // HOP 3-close (A): accept + record.
    const accepted = await acceptAdmitFlow({ ackCarriage: opened.carriage, dir: aDir });
    expect("error" in accepted).toBe(false);
    if ("error" in accepted) return;

    // BOTH local views hold the SAME persona join — dual-admission, each in its OWN per-vessel dir.
    const aView = listAdmittedPersonas(aDir);
    const bView = listAdmittedPersonas(bDir);
    expect(aView).toHaveLength(1);
    expect(bView).toHaveLength(1);
    expect(aView[0]!.personaRef.prefix).toBe(PREFIX);
    expect(aView[0]).toEqual(bView[0]);                       // the matching mutually-signed record
    expect(aView[0]!.targetVesselId).toBe(f.deviceKey);
  });

  test("B's ephemeral secret is CONSUMED on open (a replayed grant finds no pending enrollment)", async () => {
    const f = await fixtures();
    const offer = await offerAdmitFlow({ deviceVerifyingKey: f.deviceKey, dir: bDir });
    const grant = await grantAdmitFlow({ offerCarriage: offer.carriage, personaRef: f.personaRef, personaSigner: f.personaSigner, dir: aDir });
    if ("error" in grant) throw new Error("grant failed");
    const first = await openAdmitFlow({ grantCarriage: grant.carriage, resolveHeadOpKey: f.resolveHeadOpKey, deviceSigner: f.deviceSigner, dir: bDir });
    expect("error" in first).toBe(false);

    // A second open of the SAME grant — the secret is gone.
    const second = await openAdmitFlow({ grantCarriage: grant.carriage, resolveHeadOpKey: f.resolveHeadOpKey, deviceSigner: f.deviceSigner, dir: bDir });
    expect("error" in second).toBe(true);
  });

  test("PHOTOGRAPH-INERT: a captured grant opened on a THIRD vessel (no pending enrollment) records nothing", async () => {
    const f = await fixtures();
    const offer = await offerAdmitFlow({ deviceVerifyingKey: f.deviceKey, dir: bDir });
    const grant = await grantAdmitFlow({ offerCarriage: offer.carriage, personaRef: f.personaRef, personaSigner: f.personaSigner, dir: aDir });
    if ("error" in grant) throw new Error("grant failed");

    // A photographer's vessel (a fresh dir with no enrollment) tries the captured grant.
    const thiefDir = mkdtempSync(join(tmpdir(), "lares-vessel-thief-"));
    try {
      const stolen = await openAdmitFlow({ grantCarriage: grant.carriage, resolveHeadOpKey: f.resolveHeadOpKey, deviceSigner: f.deviceSigner, dir: thiefDir });
      expect("error" in stolen).toBe(true);
      expect(listAdmittedPersonas(thiefDir)).toEqual([]);
    } finally {
      rmSync(thiefDir, { recursive: true, force: true });
    }
  });

  test("ROTATE-NOT-RESURRECT: a grant the head resolver rejects records nothing on B", async () => {
    const f = await fixtures();
    const offer = await offerAdmitFlow({ deviceVerifyingKey: f.deviceKey, dir: bDir });
    const grant = await grantAdmitFlow({ offerCarriage: offer.carriage, personaRef: f.personaRef, personaSigner: f.personaSigner, dir: aDir });
    if ("error" in grant) throw new Error("grant failed");

    // The persona rotated: the resolver returns a different head than the grant's op-key → refuse, record nothing.
    const rotatedHead = await pubOf(new Uint8Array(32).fill(9));
    const opened = await openAdmitFlow({ grantCarriage: grant.carriage, resolveHeadOpKey: () => rotatedHead, deviceSigner: f.deviceSigner, dir: bDir });
    expect("error" in opened).toBe(true);
    expect(listAdmittedPersonas(bDir)).toEqual([]);
  });
});
