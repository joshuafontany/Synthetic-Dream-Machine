/**
 * seal-carrier-federation.test.ts — STAGE 1 (B): the cad seal's FIRST live producer, additive to the
 * cleartext-local wake.
 *
 * Proven:
 *   · KEYRING CUSTODY — standNexusKeyring mints the charter-head epoch's secret, persists it read-all, and is
 *     idempotent (a re-stand re-reads, mints nothing); a later epoch appends (read-all across epochs),
 *   · THE PRODUCER — sealCarrierForFederation runs installSealedBody (a production shore, not a test fixture) →
 *     the SealedPlaneRegistry entry appears → the member blind-transit lane opens for that docId,
 *   · VERIFY-CAP ⊥ READ-CAP — the ciphertext's cid is BLAKE3(ciphertext): verifyCiphertextCid holds SECRET-FREE
 *     (no keyring); a carry-only holder cannot read (a wrong read-cap decrypts to garbage, not the plaintext),
 *   · cas-transit resolveByCid reads the sealed body back + re-verifies BLAKE3==cid at the fetcher,
 *   · WAKE UNCHANGED (regression guard) — the seal writes ONLY the ciphertext `cad/` tier; the cleartext corpus
 *     CAS the wake reads is a DISTINCT dir, untouched, still returning the plaintext.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyCiphertextCid, openBodyOnCas, makeCidResolver, sha256HexBytesSync, utf8Bytes,
  type CasTransitTransport,
} from "@lararium/mesh";
import { standNexusKeyring, loadNexusKeyring } from "../src/nexus-convergence-secret-store.js";
import { cadSealDir, sealCarrierForFederation } from "../src/seal-carrier-federation.js";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { makeBagTracker } from "../src/bag-tracker.js";
import { readCasBlobFromFs, writeCasEntriesFs } from "../src/node-cas.js";

// A carrier body — modest here, but the seal path is SIZE-AGNOSTIC (cas-stage already externalized the size; this
// producer only encrypts whatever plaintext it is handed, whether 1 KB or the 16 M that once felled the seed).
const BODY = utf8Bytes("Call me Ishmael. ".repeat(4000));   // ~68 KB — stands for an oversized staged carrier

describe("nexus-convergence-secret-store — the keyring custody", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "lares-cad-secret-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("mints the charter-head epoch, persists read-all, is idempotent, appends a later epoch", () => {
    expect(loadNexusKeyring(dir)).toBeNull();                 // nothing minted yet
    const k0 = standNexusKeyring({ sealEpoch: 0, dir });
    expect(k0.epochs).toEqual([0]);
    const secret0 = k0.current().secret;

    // Idempotent — a re-stand at the same epoch re-reads the SAME secret (mints nothing).
    const k0b = standNexusKeyring({ sealEpoch: 0, dir });
    expect([...k0b.forEpoch(0)!]).toEqual([...secret0]);
    // A charter bump appends epoch 1 — the keyring holds BOTH (read-all: a body sealed at 0 still opens).
    const k1 = standNexusKeyring({ sealEpoch: 1, dir });
    expect(k1.epochs).toEqual([0, 1]);
    expect([...k1.forEpoch(0)!]).toEqual([...secret0]);       // epoch-0 secret survives the bump
    expect(k1.current().epoch).toBe(1);                        // seals under the newest epoch
  });
});

describe("seal-carrier-federation — the seal's first producer (additive)", () => {
  let storageDir: string;
  let idDir: string;
  beforeEach(() => {
    storageDir = mkdtempSync(join(tmpdir(), "lares-cad-storage-"));
    idDir = mkdtempSync(join(tmpdir(), "lares-cad-id-"));
  });
  afterEach(() => { rmSync(storageDir, { recursive: true, force: true }); rmSync(idDir, { recursive: true, force: true }); });

  test("seals a carrier body → registry opens the member lane → verify-cap ⊥ read-cap → cas-transit reads back", async () => {
    const registry = makeSealedPlaneRegistry();
    const tracker  = makeBagTracker();
    const keyring  = standNexusKeyring({ sealEpoch: 0, dir: idDir });
    const cadDir   = cadSealDir(storageDir);

    // THE PRODUCER — a production shore (not a test's own installSealedBody call).
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring, tracker, self: "self-holder" });

    // The member blind-transit lane opens for exactly this body's docId.
    expect(registry.seal.isSealedPlane(installed.docId)).toBe(true);
    expect(registry.epochFor(installed.docId)).toBe(0);
    expect(tracker.holdersOf(installed.cid)).toContain("self-holder");

    // The ciphertext rests in the `cad/` tier under its content-address.
    const ciphertext = readCasBlobFromFs(installed.cid, cadDir);
    expect(ciphertext).not.toBeNull();

    // VERIFY-CAP ⊥ READ-CAP: a relay recomputes BLAKE3(ciphertext)==cid holding NO secret.
    expect(verifyCiphertextCid(ciphertext!, installed.cid)).toBe(true);
    // The read-cap (message-locked key) opens it to the plaintext.
    expect([...openBodyOnCas(ciphertext!, installed.readCap)]).toEqual([...BODY]);
    // A CARRY-ONLY holder (verify passes, no read-cap) cannot read — a wrong key decrypts to garbage, not the body.
    const wrongKey = new Uint8Array(32).fill(9);
    expect([...openBodyOnCas(ciphertext!, wrongKey)]).not.toEqual([...BODY]);

    // cas-transit resolveByCid reads the sealed body back (local hit) + the transport re-verifies BLAKE3==cid.
    const local = (cid: string) => readCasBlobFromFs(cid, cadDir);
    const transit: CasTransitTransport = { discover: async () => [], fetchBlock: async () => null };   // local hit → transit unused
    const resolve = makeCidResolver(local, transit, () => {});
    const fetched = await resolve(installed.cid);
    expect(fetched).not.toBeNull();
    expect(verifyCiphertextCid(fetched!, installed.cid)).toBe(true);
  });

  test("WAKE UNCHANGED: the seal writes only the ciphertext cad/ tier — the cleartext corpus CAS is untouched", () => {
    const registry = makeSealedPlaneRegistry();
    const keyring  = standNexusKeyring({ sealEpoch: 0, dir: idDir });
    const cadDir   = cadSealDir(storageDir);

    // The cleartext-local wake path: cas-stage wrote the plaintext to the corpus CAS under sha256; the wake reads
    // it cleartext. Model that dir as DISTINCT from the seal's cad/ tier.
    const corpusDir = join(storageDir, "cas");
    const corpusCid = sha256HexBytesSync(BODY);
    writeCasEntriesFs([{ cid: corpusCid, bytes: BODY }], corpusDir);

    // Seal for FEDERATION — writes the ciphertext cad/ tier only.
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring });

    // The cleartext wake read is UNTOUCHED — same bytes, same dir, still cleartext.
    expect([...readCasBlobFromFs(corpusCid, corpusDir)!]).toEqual([...BODY]);
    // The seal never wrote its ciphertext into the corpus (wake) dir — the cad cid is absent there.
    expect(existsSync(join(corpusDir, installed.cid))).toBe(false);
    // And the two tiers are distinct dirs.
    expect(cadDir).not.toBe(corpusDir);
  });
});
