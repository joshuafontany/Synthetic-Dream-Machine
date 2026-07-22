/**
 * seal-carrier-federation — the @cad seal's FIRST live producer: seal a staged carrier body into the ciphertext
 * federation plane, ADDITIVELY, beside the cleartext-local corpus CAS the wake path reads.
 *
 * TWO LAYERS, TWO JOBS, COMPOSED (never fused). The cas-stage seam already keeps an oversized carrier body OUT of
 * the CRDT: it writes the CLEARTEXT bytes to the corpus CAS + rides a skinny `textCid` handle, and the local wake
 * resolves it cleartext (the operator's own island holds its own read-cap — no seal needed locally). This producer
 * adds the OTHER job: it seals the SAME body's plaintext into the @cad ciphertext plane (`cid = BLAKE3(ciphertext)`)
 * so a CROSS-OPERATOR member may blind-transit the bytes and read NOTHING (carry ⊥ read). The dual representation —
 * a cleartext-local copy + a ciphertext-federated copy — IS the carry⊥read split made concrete: two consumers
 * (local wake vs cross-operator carry), two representations. It NEVER touches the cleartext resolveByCid wake read.
 *
 * VERIFY-CAP ⊥ READ-CAP: the sealed body's cid is `BLAKE3(ciphertext)` — a relay recomputes it holding NO secret
 * (`verifyCiphertextCid`); the read-cap (the message-locked key) rides the private keyring, never the relay. The
 * seal registers the ciphertext docId into the live `SealedPlaneRegistry` as a side-effect, opening the member
 * blind-transit lane for exactly that body — a cleartext body reaches no encrypt path, so nothing self-labels sealed.
 *
 * FAIL-CLOSED: a vessel with NO convergence keyring (`keyring.current()` throws on empty) seals NOTHING — the body
 * stays cleartext-local only, never a plaintext body registered sealed. The caller catches the throw and skips.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/seal-carrier-federation
 */

import { join } from "node:path";
import type { CasHolder } from "@lararium/mesh";
import { installSealedBody, type InstalledSealedBody } from "./ciphertext-cas-seal.js";
import { noteInstalledBody } from "./bag-tracker.js";
import type { BagTracker } from "./bag-tracker.js";
import type { SealedPlaneRegistry } from "./plane-seal.js";
import type { NexusConvergenceKeyring } from "./nexus-convergence-keyring.js";

/** The @cad ciphertext CAS tier — a DISTINCT dir from the cleartext `cas` tier, so the cleartext wake read
 *  (corpus / runtime CAS) is never touched by a sealed body. A member serves + `cas-transit resolveByCid`
 *  fetches from here; the bytes are ciphertext, the cid `BLAKE3(ciphertext)`. */
export function cadSealDir(storageDir: string): string {
  return join(storageDir, "cad");
}

/**
 * Seal one carrier body's PLAINTEXT into the @cad federation plane. Wraps the encrypt-on-CAS installer (the SOLE
 * door into the sealed-plane registry) + the bag-tracker announce, so a cid reaches BOTH the seal set AND the
 * discovery index ONLY through the encrypt path. Returns the installed sealed body (cid + docId + epoch + read-cap);
 * the read-cap stays with the caller (the private keyring), NEVER the relay. Additive: writes only the ciphertext
 * `cad/` tier + the registry + the tracker — the cleartext corpus CAS the wake reads is untouched.
 */
export function sealCarrierForFederation(args: {
  readonly registry:  SealedPlaneRegistry;
  readonly cadDir:    string;
  readonly plaintext: Uint8Array;
  readonly keyring:   NexusConvergenceKeyring;
  /** Optional discovery announce: note the sealed cid on the relay-side bag-tracker under this holder handle. */
  readonly tracker?:  BagTracker;
  readonly self?:     CasHolder;
}): InstalledSealedBody {
  // keyring.current() throws fail-closed on an empty keyring — the caller keeps the body cleartext-local only.
  const installed = installSealedBody(args.registry, args.cadDir, args.plaintext, args.keyring.current());
  if (args.tracker && args.self) noteInstalledBody(args.tracker, installed, args.self);
  return installed;
}
