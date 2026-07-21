/**
 * nexus-convergence-keyring — the per-Nexus convergence-secret SOURCE the @cad seal message-locks against.
 *
 * THE SALT, NOT A CONTENT KEY. A Nexus holds ONE convergence secret per charter epoch. That secret is a
 * dedup-domain + GPA salt — it keys `messageKey = BLAKE3(plaintext, key = nexusSecret)` so (a) the same body
 * seals to the same cid ONLY within one Nexus (per-Nexus dedup; no cross-Nexus confirmation-of-file), and (b)
 * an outsider lacking the secret cannot precompute a suspected plaintext's cid. It is NOT the content read-cap:
 * content confidentiality rides the per-bag read-cap (the messageKey) on the private keyhive lane. So the
 * secret's compromise grants only the INSIDER confirmation-of-file already accepted (fork-② = A, 2026-07-21).
 *
 * SOURCE = A2 (operator-ruled 2026-07-21): an independent high-entropy 32-byte secret, minted at Nexus genesis
 * and on each charter-epoch bump, VERSIONED by the wax-sealed charter epoch, DISTRIBUTED to each member over the
 * private keyhive lane at admission (the same lane the read-caps ride). A member holds the WHOLE `{epoch → secret}`
 * keyring, so it reads every body regardless of its own join epoch (the read-all invariant — a shared CAS must let
 * every current member read every body). Forward-secrecy for THIS salt is a MISFEATURE, not a goal: a late joiner
 * gets every past epoch's secret, never re-derives-forward-only.
 *
 * NO-GLOBAL-NOW: the keyring is a member-LOCAL replica read as-of-last-admission-sync; `current()` names the
 * highest epoch THIS member has been handed, never a global present. A charter-epoch bump reaches a member only
 * when its admission material refolds — the member reads its own keyring, never a global truth.
 *
 * NORTH-STAR (documented, NOT built now): once a Nexus-scope CGKA group stands for other reasons, the secret
 * could derive as an MLS-style EXPORTER off that group's epoch state (`BLAKE3(nexusGroupRoot_e, "…nexus-
 * convergence")`) — member-re-derivable, zero separate custody. But CGKA is forward-only, so a late joiner must
 * STILL be backfilled a past-epoch keyring to preserve read-all — the exporter path converges on THIS keyring
 * shape anyway (RFC 9420 §8 exporter_secret; MLS resumption-PSK: a member joined after epoch N cannot re-derive
 * epoch N). A2 ships that keyring directly; A1 only adds a derivation layer the low-sensitivity salt never needs.
 *
 * FAIL-CLOSED: an empty keyring has NO `current()` → the seal installer throws → the body stays local/unsealed
 * (never a plaintext body registered as sealed). A `forEpoch` miss on read returns `undefined` → the read helper
 * throws an EXPLICIT missing-epoch error → never a silent wrong-key decrypt.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/nexus-convergence-keyring
 */

import { randomBytes } from "node:crypto";
import { require32, deriveMessageKey, CONVERGENCE_SECRET_LEN } from "@lararium/mesh";

/** One charter-epoch's convergence secret: the integer epoch it versions on + its 32-byte salt. */
export interface NexusEpochSecret {
  /** The wax-sealed charter epoch this secret versions on (a non-negative integer; genesis = 0). */
  readonly epoch: number;
  /** The 32-byte per-Nexus convergence salt for that epoch (width-guarded at every boundary). */
  readonly secret: Uint8Array;
}

/**
 * A member's local view of its Nexus's convergence secrets — a `{epoch → secret}` keyring handed over the private
 * lane at admission. `current()` seals under the newest epoch the member holds; `forEpoch` reads any past epoch so
 * a body sealed before this member joined still opens (read-all).
 */
export interface NexusConvergenceKeyring {
  /** The newest `{epoch, secret}` this member holds — the seal-time epoch. THROWS on an empty keyring (fail-closed). */
  current(): NexusEpochSecret;
  /** The salt for a specific past/present epoch, or `undefined` when this member never received it (fail-closed read). */
  forEpoch(epoch: number): Uint8Array | undefined;
  /** Every epoch the member holds, ascending — audit / read-all proofs. */
  readonly epochs: readonly number[];
}

/** Reject a non-integer / negative epoch — a charter epoch is a monotone non-negative integer (genesis = 0). */
function requireEpoch(epoch: number): number {
  if (!Number.isInteger(epoch) || epoch < 0) {
    throw new TypeError(`nexus-convergence-keyring: epoch MUST be a non-negative integer, got ${epoch}`);
  }
  return epoch;
}

/**
 * Mint a FRESH per-Nexus convergence secret for a charter epoch — 32 CSPRNG bytes tagged with the epoch. Called at
 * Nexus GENESIS and on a CHARTER-EPOCH BUMP ONLY (never per-body, never per-session): rotation resets the dedup
 * domain deliberately, so it costs a charter act. The minted secret then rides the private lane to every member.
 */
export function mintNexusSecret(charterEpoch: number): NexusEpochSecret {
  requireEpoch(charterEpoch);
  return { epoch: charterEpoch, secret: new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN)) };
}

/**
 * Stand a member's convergence keyring from the `{epoch → secret}` entries it was handed at admission. Each secret
 * is width-guarded through the ONE seal boundary (`require32`); a duplicate epoch reads torn (never a silent
 * last-wins that could mask a distribution fault). `current()` names the HIGHEST epoch held — an empty keyring
 * fails closed (no seal). The keyring is immutable; a charter bump stands a NEW keyring on the next admission fold.
 */
export function makeNexusConvergenceKeyring(entries: Iterable<NexusEpochSecret>): NexusConvergenceKeyring {
  const byEpoch = new Map<number, Uint8Array>();
  for (const { epoch, secret } of entries) {
    requireEpoch(epoch);
    require32(secret, `nexusSecret@epoch ${epoch}`);
    if (byEpoch.has(epoch)) {
      throw new TypeError(`nexus-convergence-keyring: duplicate secret for epoch ${epoch} — a torn distribution, refuse it`);
    }
    byEpoch.set(epoch, secret);
  }
  const epochs = [...byEpoch.keys()].sort((a, b) => a - b);
  return {
    current(): NexusEpochSecret {
      if (epochs.length === 0) {
        throw new Error("nexus-convergence-keyring: EMPTY keyring — no convergence secret to seal under (fail-closed)");
      }
      const epoch = epochs[epochs.length - 1]!;
      return { epoch, secret: byEpoch.get(epoch)! };
    },
    forEpoch(epoch: number): Uint8Array | undefined { return byEpoch.get(epoch); },
    epochs,
  };
}

/**
 * Re-derive the message-locked read-cap for a body sealed at a NAMED epoch — the epoch-gated operation. Looks up
 * the epoch's salt (`forEpoch`) and re-derives `messageKey = BLAKE3(plaintext, key = nexusSecret_epoch)`. A member
 * MISSING that epoch's secret throws an EXPLICIT missing-epoch error — never a silent wrong-key derivation. This
 * is the path a member walks to CONFIRM/dedup a body it already holds the plaintext for, or to re-seal on rotation.
 */
export function readCapForEpoch(
  plaintext: Uint8Array,
  epoch: number,
  keyring: NexusConvergenceKeyring,
): Uint8Array {
  const secret = keyring.forEpoch(requireEpoch(epoch));
  if (secret === undefined) {
    throw new Error(`nexus-convergence-keyring: no secret for epoch ${epoch} — this member cannot re-derive that body's read-cap (fail-closed)`);
  }
  return deriveMessageKey(plaintext, secret);
}
