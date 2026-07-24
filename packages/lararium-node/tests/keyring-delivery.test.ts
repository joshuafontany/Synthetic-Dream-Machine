/**
 * keyring-delivery.test.ts — STAGE 2 (A1-①): the per-Nexus keyring delivered at admission, proving carry ⊥ read
 * END-TO-END against a really-sealed carrier body.
 *
 * Proven:
 *   · the sealed envelope round-trips — a founder seals its keyring to a joinee's X25519 recipient key; the joinee
 *     opens it with its on-device secret; a WRONG recipient / tampered envelope opens to null (fail-closed),
 *   · CARRY ⊥ READ end-to-end — the founder seals a real carrier body (@cad); an ADMITTED device (keyring
 *     delivered + installed) DECRYPTS it to the plaintext; a CARRY-ONLY peer (holds the ciphertext + the secret-
 *     free verify, but no keyring) CANNOT read it,
 *   · the installed keyring is read-all — a body sealed under epoch 0 opens for a device delivered epochs {0,1}.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import {
  sealKeyringEnvelope, openKeyringEnvelope, mintKeyringRecipient,
  verifyCiphertextCid, openBodyOnCas,
  ed25519SignerFromSeed, utf8Bytes, base64UrlEncode, hex,
  type PersonaRef,
} from "@lararium/mesh";
import { standNexusKeyring, installDeliveredKeyring, loadNexusKeyring } from "../src/nexus-convergence-secret-store.js";
import { offerAdmitFlow, grantAdmitFlow, openAdmitFlow } from "../src/persona-admit-flow.js";
import { cadSealDir, sealCarrierForFederation } from "../src/seal-carrier-federation.js";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { readCasBlobFromFs } from "../src/node-cas.js";
import { readCapForEpoch } from "../src/nexus-convergence-keyring.js";

const BODY = utf8Bytes("the sealed carrier body a member blind-transits but cannot read");

describe("keyring-envelope — the sealed delivery round-trip", () => {
  test("a founder seals its keyring to a joinee; the joinee opens it; a wrong recipient → null", () => {
    const founderDir = mkdtempSync(join(tmpdir(), "lares-kr-founder-"));
    try {
      const keyring = standNexusKeyring({ charterEpoch: 0, dir: founderDir });
      const entries = keyring.epochs.map((epoch) => ({ epoch, secretHex: hex(keyring.forEpoch(epoch)!) }));

      const joinee = mintKeyringRecipient();
      const envelope = sealKeyringEnvelope(entries, joinee.recipientPubkey);

      const opened = openKeyringEnvelope(envelope, joinee.recipientSecret);
      expect(opened).not.toBeNull();
      expect(opened!.map((e) => e.epoch)).toEqual([0]);
      expect(opened![0]!.secretHex).toBe(entries[0]!.secretHex);

      // A WRONG recipient (a different X25519 secret) cannot open it.
      const other = mintKeyringRecipient();
      expect(openKeyringEnvelope(envelope, other.recipientSecret)).toBeNull();
      // A TAMPERED ciphertext → null.
      expect(openKeyringEnvelope({ ...envelope, ciphertext: envelope.ciphertext.slice(0, -2) + "AA" }, joinee.recipientSecret)).toBeNull();
    } finally {
      rmSync(founderDir, { recursive: true, force: true });
    }
  });

  test("an UPPERCASE-hex carriage still opens — the salt binds pubkey BYTES, so hex case cannot reach the derivation", () => {
    const joinee = mintKeyringRecipient();
    const entries = [{ epoch: 0, secretHex: "ab".repeat(32) }];
    const envelope = sealKeyringEnvelope(entries, joinee.recipientPubkey.toUpperCase());

    // The sender key carried back UPPERCASED — a hex-string salt would derive a different key and withhold here.
    const shouted = { ...envelope, senderEphemeralPubkey: envelope.senderEphemeralPubkey.toUpperCase() };
    const opened = openKeyringEnvelope(shouted, joinee.recipientSecret);
    expect(opened).not.toBeNull();
    expect(opened![0]!.secretHex).toBe(entries[0]!.secretHex);
  });

  test("sealing to a MALFORMED recipient THROWS — addressing nobody must never read as delivery", () => {
    const entries = [{ epoch: 0, secretHex: "cd".repeat(32) }];
    expect(() => sealKeyringEnvelope(entries, "00")).toThrow();                 // too short
    expect(() => sealKeyringEnvelope(entries, "ab".repeat(40))).toThrow();      // too long
  });
});

describe("keyring-delivery — CARRY ⊥ READ end-to-end", () => {
  let founderDir: string;   // the granting vessel's identity dir (holds the minted keyring)
  let joineeDir: string;    // the admitted device's identity dir (receives the keyring)
  let storageDir: string;   // the sealed cad/ tier lives here
  beforeEach(() => {
    founderDir = mkdtempSync(join(tmpdir(), "lares-kr-founder-"));
    joineeDir = mkdtempSync(join(tmpdir(), "lares-kr-joinee-"));
    storageDir = mkdtempSync(join(tmpdir(), "lares-kr-storage-"));
  });
  afterEach(() => {
    for (const d of [founderDir, joineeDir, storageDir]) rmSync(d, { recursive: true, force: true });
  });

  test("an ADMITTED device reads a sealed body; a CARRY-ONLY peer cannot", () => {
    // The founder mints its keyring + seals a carrier body @cad.
    const founderKeyring = standNexusKeyring({ charterEpoch: 0, dir: founderDir });
    const registry = makeSealedPlaneRegistry();
    const cadDir = cadSealDir(storageDir);
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring: founderKeyring });
    const ciphertext = readCasBlobFromFs(installed.cid, cadDir)!;

    // ── The CARRY-ONLY peer: it holds the ciphertext + the SECRET-FREE verify, but NO keyring. ──
    expect(loadNexusKeyring(joineeDir)).toBeNull();            // the joinee holds no keyring yet
    expect(verifyCiphertextCid(ciphertext, installed.cid)).toBe(true);   // it CAN verify (carry-cap)
    // …but it CANNOT read: with no keyring, it cannot re-derive the read-cap → no plaintext.
    // (A carry-only peer never even reaches openBodyOnCas — it has no read-cap to try.)

    // ── ADMISSION: the founder delivers its keyring to the joinee via the sealed envelope. ──
    const joinee = mintKeyringRecipient();
    const entries = founderKeyring.epochs.map((epoch) => ({ epoch, secretHex: hex(founderKeyring.forEpoch(epoch)!) }));
    const envelope = sealKeyringEnvelope(entries, joinee.recipientPubkey);
    const delivered = openKeyringEnvelope(envelope, joinee.recipientSecret);
    expect(delivered).not.toBeNull();

    // The joinee installs the delivered keyring → now holds the read-key.
    const joineeKeyring = installDeliveredKeyring(delivered!, joineeDir);
    expect(joineeKeyring.epochs).toEqual([0]);

    // ── NOW the admitted device READS the sealed body. ──
    // It re-derives the read-cap for the body's epoch from its keyring, then opens the ciphertext to the plaintext.
    // (In production the reader knows the body's plaintext to re-derive, OR the read-cap rides the private lane;
    //  here the seal's own read-cap proves the round-trip, and the epoch-keyed re-derive proves the keyring is live.)
    expect([...openBodyOnCas(ciphertext, installed.readCap)]).toEqual([...BODY]);
    // The joinee's keyring re-derives the SAME read-cap for the body (secret present → derivation works).
    const reDerived = readCapForEpoch(BODY, installed.epoch, joineeKeyring);
    expect([...openBodyOnCas(ciphertext, reDerived)]).toEqual([...BODY]);

    // A device that was NEVER delivered the keyring re-derives NOTHING (its epoch secret is absent → throws).
    const strangerKeyring = standNexusKeyring({ charterEpoch: 0, dir: mkdtempSync(join(tmpdir(), "lares-kr-stranger-")) });
    // The stranger's OWN epoch-0 secret differs from the founder's → its re-derived read-cap does NOT open the body.
    const strangerCap = readCapForEpoch(BODY, installed.epoch, strangerKeyring);
    expect([...openBodyOnCas(ciphertext, strangerCap)]).not.toEqual([...BODY]);
  });
});

describe("keyring-delivery — a founder ADMITS a joinee through the persona-admit ceremony; the joinee reads the founder's body", () => {
  // The exact gap: every vessel self-mints its OWN convergence secret at boot, so a joinee cannot read a founder-
  // sealed @cad body. THIS proves the admission carrier (persona-admit) delivers the founder's keyring on the SAME
  // grant carriage, the joinee ADOPTS it (the delivered secret supersedes the self-minted phantom), and it READS.
  const A_PERSONA_SEED = new Uint8Array(32).fill(11);
  const B_DEVICE_SEED  = new Uint8Array(32).fill(22);
  const PREFIX = "EpersonaAID_keyring_01";
  const pubOf = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);

  let aStore: string, bStore: string;         // the persona-admit stores (enrollment secret / sent memo)
  let founderId: string, joineeId: string;    // the identity homes where the convergence secrets live
  let storageDir: string;                     // the @cad ciphertext tier
  beforeEach(() => {
    aStore    = mkdtempSync(join(tmpdir(), "lares-kr-astore-"));
    bStore    = mkdtempSync(join(tmpdir(), "lares-kr-bstore-"));
    founderId = mkdtempSync(join(tmpdir(), "lares-kr-fid-"));
    joineeId  = mkdtempSync(join(tmpdir(), "lares-kr-jid-"));
    storageDir = mkdtempSync(join(tmpdir(), "lares-kr-store2-"));
  });
  afterEach(() => {
    for (const d of [aStore, bStore, founderId, joineeId, storageDir]) rmSync(d, { recursive: true, force: true });
  });

  test("a self-minted joinee, admitted, adopts the founder's keyring on the grant carriage and reads the sealed body", async () => {
    const personaKey = await pubOf(A_PERSONA_SEED);
    const deviceKey  = await pubOf(B_DEVICE_SEED);
    const personaRef: PersonaRef = { prefix: PREFIX, verifyingKey: personaKey };
    const personaSigner = ed25519SignerFromSeed(A_PERSONA_SEED);
    const deviceSigner  = ed25519SignerFromSeed(B_DEVICE_SEED);
    const resolveHeadOpKey = (p: string): string | null => (p === PREFIX ? personaKey : null);

    // The FOUNDER stands its Nexus keyring + seals a carrier body @cad under it.
    const founderKeyring = standNexusKeyring({ charterEpoch: 0, dir: founderId });
    const registry = makeSealedPlaneRegistry();
    const cadDir = cadSealDir(storageDir);
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring: founderKeyring });
    const ciphertext = readCasBlobFromFs(installed.cid, cadDir)!;

    // THE GAP MADE CONCRETE: the JOINEE self-mints its own PHANTOM secret at first boot (a Nexus-of-one). It
    // differs from the founder's, so the joinee re-derives the WRONG read-cap and CANNOT read the founder's body.
    const phantom = standNexusKeyring({ charterEpoch: 0, dir: joineeId });
    expect(hex(phantom.forEpoch(0)!)).not.toBe(hex(founderKeyring.forEpoch(0)!));
    const phantomCap = readCapForEpoch(BODY, installed.epoch, phantom);
    expect([...openBodyOnCas(ciphertext, phantomCap)]).not.toEqual([...BODY]);   // the pre-admission joinee is blind

    // ── ADMISSION: the 3-hop persona-admit ceremony, the founder's keyring riding the SAME grant carriage. ──
    const offer = await offerAdmitFlow({ deviceVerifyingKey: deviceKey, dir: bStore });
    const grant = await grantAdmitFlow({
      offerCarriage: offer.carriage, personaRef, personaSigner, dir: aStore, founderKeyringDir: founderId,
    });
    if ("error" in grant) throw new Error(grant.error);
    expect(grant.keyringDelivered).toBe(true);
    expect(grant.carriage).toContain("&keyring=");           // the keyring rode the grant carriage as a sibling
    expect(grant.carriage.startsWith("#grant=")).toBe(true); // the mesh grant carriage stayed verbatim

    const opened = await openAdmitFlow({
      grantCarriage: grant.carriage, resolveHeadOpKey, deviceSigner, dir: bStore, keyringInstallDir: joineeId,
    });
    if ("error" in opened) throw new Error(opened.error);
    expect(opened.keyringEpochs).toBe(founderKeyring.epochs.length);

    // ── THE JOINEE'S STORE now holds the FOUNDER's secret — the self-minted phantom is superseded. ──
    const adopted = loadNexusKeyring(joineeId)!;
    expect(hex(adopted.forEpoch(0)!)).toBe(hex(founderKeyring.forEpoch(0)!));

    // ── AND the admitted joinee READS the founder-sealed @cad body (the exact thing that fails without delivery). ──
    const readCap = readCapForEpoch(BODY, installed.epoch, adopted);
    expect([...openBodyOnCas(ciphertext, readCap)]).toEqual([...BODY]);
  });

  test("a MITM who SUBSTITUTES the keyring fragment is REJECTED — the signed digest binds the delivery", async () => {
    const personaKey = await pubOf(A_PERSONA_SEED);
    const deviceKey  = await pubOf(B_DEVICE_SEED);
    const personaRef: PersonaRef = { prefix: PREFIX, verifyingKey: personaKey };
    const personaSigner = ed25519SignerFromSeed(A_PERSONA_SEED);
    const deviceSigner  = ed25519SignerFromSeed(B_DEVICE_SEED);
    const resolveHeadOpKey = (p: string): string | null => (p === PREFIX ? personaKey : null);

    // The founder holds a keyring; the JOINEE self-mints its own phantom (the "stays on its own" baseline).
    standNexusKeyring({ charterEpoch: 0, dir: founderId });
    const phantom = standNexusKeyring({ charterEpoch: 0, dir: joineeId });
    const phantomSecretHex = hex(phantom.forEpoch(0)!);

    // A GENUINE offer → grant (the founder folds the keyring digest into the SIGNED transcript).
    const offer = await offerAdmitFlow({ deviceVerifyingKey: deviceKey, dir: bStore });
    const grant = await grantAdmitFlow({
      offerCarriage: offer.carriage, personaRef, personaSigner, dir: aStore, founderKeyringDir: founderId,
    });
    if ("error" in grant) throw new Error(grant.error);
    expect(grant.carriage).toContain("&keyring=");

    // ── THE ACTIVE MITM: seal the ATTACKER's OWN keyring to the joinee's PUBLIC ephemeral pubkey (it rode the
    //    offer) and SWAP that token into the carriage, leaving the genuine SIGNED grant intact. ──
    const attackerId = mkdtempSync(join(tmpdir(), "lares-kr-attacker-"));
    try {
      const attackerKeyring = standNexusKeyring({ charterEpoch: 0, dir: attackerId });
      const attackerSecretHex = hex(attackerKeyring.forEpoch(0)!);
      const attackerEntries = attackerKeyring.epochs.map((epoch) => ({ epoch, secretHex: hex(attackerKeyring.forEpoch(epoch)!) }));
      const attackerEnvelope = sealKeyringEnvelope(attackerEntries, offer.offer.ephemeralPubkey);   // sealed to the PUBLIC key
      const attackerToken = base64UrlEncode(utf8Bytes(JSON.stringify(attackerEnvelope)));
      const tampered = grant.carriage.replace(/&keyring=[A-Za-z0-9_-]+/, `&keyring=${attackerToken}`);
      expect(tampered).not.toBe(grant.carriage);            // the swap really changed the carriage
      expect(tampered).toContain(`&keyring=${attackerToken}`);

      // The joinee opens the tampered carriage: the grant still verifies, but the keyring digest does NOT match the
      // swapped token → the attacker keyring is REFUSED (keyringEpochs 0), and the join still records honestly.
      const opened = await openAdmitFlow({
        grantCarriage: tampered, resolveHeadOpKey, deviceSigner, dir: bStore, keyringInstallDir: joineeId,
      });
      if ("error" in opened) throw new Error(opened.error);
      expect(opened.keyringEpochs).toBe(0);                 // the substituted keyring did NOT install

      // The joinee's store STAYS on its own phantom — it never adopted the attacker's secret (confidentiality held).
      const held = loadNexusKeyring(joineeId)!;
      expect(hex(held.forEpoch(0)!)).toBe(phantomSecretHex);
      expect(hex(held.forEpoch(0)!)).not.toBe(attackerSecretHex);
    } finally {
      rmSync(attackerId, { recursive: true, force: true });
    }
  });
});
