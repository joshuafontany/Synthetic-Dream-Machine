/**
 * ciphertext-cas-seal — the ENCRYPT-ON-CAS INSTALLER (the node side-effect that lights the member lane).
 *
 * The one call that seals a body @cad: it message-locks the plaintext to the per-Nexus secret, content-addresses
 * the ciphertext (`cid = BLAKE3(ciphertext)`), writes the ciphertext into the fs `cid/` CAS tier, and — AS A
 * SIDE-EFFECT — registers the body's docId into the live `SealedPlaneRegistry`. That side-effect IS the
 * seal-producer: a docId reaches the sealed set ONLY through a successful encrypt+CAS-write, so a cleartext body
 * can NEVER register (no plaintext door), and a doc can NEVER self-label sealed. The member blind-transit lane
 * (`carrierShareDecision`) opens for exactly the docIds this installer sealed.
 *
 * verify-cap ⊥ read-cap: the relay serves + verifies the ciphertext secret-free (`verifyCiphertextCid`); the
 * read-cap (messageKey) the installer returns rides the PRIVATE keyhive lane and NEVER crosses to the relay.
 *
 * FAIL-CLOSED: with NO per-Nexus secret the installer REFUSES (throws) — the body stays local/unsealed, never a
 * plaintext body registered as sealed. The secret's DERIVATION (fork-②, Provisional) is NOT wired here — the
 * secret is an injected 32-byte input; see ciphertext-cas.ts for the surfaced keyhive↔charter gap.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/ciphertext-cas-seal
 */

import {
  interpretAsDocumentId, stringifyAutomergeUrl,
  type BinaryDocumentId, type DocumentId,
} from "@automerge/automerge-repo";
import { sealBodyOnCas, parseDigest, hexToBytes, type SealedBody } from "@lararium/mesh";
import { writeCasEntriesFs } from "./node-cas.js";
import type { SealedPlaneRegistry } from "./plane-seal.js";
import type { NexusEpochSecret } from "./nexus-convergence-keyring.js";

/** The outcome of sealing one body @cad — the public verify-cap (cid + docId + epoch) and the caller-kept read-cap. */
export interface InstalledSealedBody {
  /** `blake3:<hex>` — the ciphertext content-address a relay recomputes secret-free (verify-cap). */
  readonly cid: string;
  /** The Automerge docId derived from the cid — the sealed-plane key the member lane gates on. */
  readonly docId: DocumentId;
  /** The charter epoch this body sealed under — the sidecar a reader looks the keyring secret up by. */
  readonly epoch: number;
  /** The message-locked read-cap (32 bytes) — rides the PRIVATE keyhive lane, NEVER the relay. */
  readonly readCap: Uint8Array;
}

/**
 * Derive a stable Automerge DocumentId from a ciphertext cid — the content-addressed doc that carries the sealed
 * body in the sync graph. A `blake3:<hex>` cid is 32 bytes; a BinaryDocumentId is 16, so the FIRST 16 bytes of
 * the blake3 digest key the doc. Deterministic (same cid ⇒ same docId), so the seal registry, the sharePolicy,
 * and a remote transit leg all name the ONE doc without hand-maintenance.
 */
export function docIdForCiphertextCid(cid: string): DocumentId {
  const { hex } = parseDigest(cid);
  const digest = hexToBytes(hex);
  const idBytes = digest.slice(0, 16) as Uint8Array as BinaryDocumentId;
  return interpretAsDocumentId(stringifyAutomergeUrl({ documentId: idBytes }));
}

/**
 * Seal a body @cad and REGISTER it — the load-bearing side-effect. Order is the discipline: seal (encrypt +
 * content-address) → write the ciphertext to CAS → register the docId. A refusal (no secret, wrong-width secret)
 * throws BEFORE any registration, so a body never half-lands sealed.
 *
 * @param registry    the live sealed-plane registry the vessel sharePolicy holds (`registry.seal`).
 * @param casDir      the fs `cid/` CAS dir (casDirForStorage — the SAME dir a worker resolveByCid reads).
 * @param plaintext   the body bytes leaving the CRDT.
 * @param epochSecret the CURRENT per-Nexus convergence `{epoch, secret}` (from `keyring.current()`). The caller
 *                    with NO keyring MUST NOT reach here — `keyring.current()` throws on empty (fail-closed), so
 *                    the body stays local/unsealed. The seal message-locks to `secret`; the `epoch` records the
 *                    sidecar so a reader looks the matching keyring secret up. The epoch NEVER enters the cid.
 */
export function installSealedBody(
  registry:    SealedPlaneRegistry,
  casDir:      string,
  plaintext:   Uint8Array,
  epochSecret: NexusEpochSecret,
): InstalledSealedBody {
  const sealed: SealedBody = sealBodyOnCas(plaintext, epochSecret.secret);   // throws fail-closed on a bad/absent secret
  writeCasEntriesFs([{ cid: sealed.cid, bytes: sealed.ciphertext }], casDir);
  const docId = docIdForCiphertextCid(sealed.cid);
  registry.register(docId, epochSecret.epoch);                       // THE SIDE-EFFECT (set + epoch sidecar together)
  return { cid: sealed.cid, docId, epoch: epochSecret.epoch, readCap: sealed.readCap };
}
