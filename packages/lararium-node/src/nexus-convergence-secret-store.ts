/**
 * nexus-convergence-secret-store — the node CUSTODY for a vessel's per-Nexus convergence secrets (the cad
 * seal's key source). Mints a secret per charter epoch, persists the `{epoch → secret}` set locally, and stands
 * the `NexusConvergenceKeyring` the encrypt-on-CAS seal producer message-locks against.
 *
 * THE SALT, NOT A CONTENT KEY (nexus-convergence-keyring): a Nexus holds ONE convergence secret per charter
 * epoch — a dedup-domain + GPA salt keying `messageKey = BLAKE3(plaintext, key = nexusSecret)`. This module owns
 * where that secret LIVES on THIS vessel: a member holds the WHOLE `{epoch → secret}` set (read-all — a shared
 * CAS must let every current member read every body, regardless of its own join epoch), so a late joiner never
 * re-derives-forward-only; forward-secrecy for this low-sensitivity salt is a MISFEATURE, not a goal.
 *
 * NO-GLOBAL-NOW: the secret set is a vessel-LOCAL replica. `standNexusKeyring` reads THIS vessel's own persisted
 * secrets + mints the charter-head epoch's secret if absent — never a global truth of the Nexus's secrets.
 *
 * CUSTODY CAVEAT (first-producer, surfaced): the secrets persist as a 0o600 JSON file under the identity home —
 * the SAME at-rest posture as the vessel signing seed beside it. Sealing the secret file under the archive KEK
 * (scrypt/AES-GCM, archive-seal) is a hardening follow-on; the low-sensitivity-salt classification (an accepted
 * insider confirmation-of-file residual, fork-② = A) makes raw-at-rest acceptable for the seal's first producer.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/nexus-convergence-secret-store
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { hex, hexToBytes } from "@lararium/mesh";
import {
  mintNexusSecret, makeNexusConvergenceKeyring,
  type NexusEpochSecret, type NexusConvergenceKeyring,
} from "./nexus-convergence-keyring.js";
import { larIdentityDir } from "./vessel-paths.js";

/** The per-Nexus convergence secrets file — a 0o600 `{epoch → secretHex}` set under the identity home (never synced). */
const SECRETS_FILE = ".nexus-convergence-secrets.json";

type StoredSecret = { readonly epoch: number; readonly secretHex: string };
type SecretsFile  = { readonly secrets?: readonly StoredSecret[] };

function idDirOf(dir?: string): string { return dir ?? larIdentityDir(); }

/** Read the persisted `{epoch, secret}` entries (empty on absent / torn — a re-stand re-mints the head epoch). */
function readStored(dir: string): NexusEpochSecret[] {
  const path = join(dir, SECRETS_FILE);
  if (!existsSync(path)) return [];
  try {
    const raw = (JSON.parse(readFileSync(path, "utf8")) as SecretsFile).secrets ?? [];
    return raw
      .filter((s) => Number.isInteger(s.epoch) && s.epoch >= 0 && /^[0-9a-f]{64}$/.test(s.secretHex))
      .map((s) => ({ epoch: s.epoch, secret: hexToBytes(s.secretHex) }));
  } catch {
    return [];   // a torn secrets file reads empty — the head epoch re-mints (a NEW secret; old sealed bodies re-seal)
  }
}

/** Persist the `{epoch, secret}` set (0o600) — the whole read-all keyring lives here beside the vessel seed. */
function writeStored(dir: string, entries: readonly NexusEpochSecret[]): void {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, SECRETS_FILE);
  const secrets: StoredSecret[] = entries.map((e) => ({ epoch: e.epoch, secretHex: hex(e.secret) }));
  writeFileSync(path, JSON.stringify({ secrets }, null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/**
 * Stand this vessel's convergence keyring, minting the charter-head epoch's secret if it is not yet held. Reads
 * the persisted read-all set; ensures a secret exists for `sealEpoch` (mint + persist on first need — a genesis
 * or a charter-bump); returns the keyring over EVERY held epoch. Idempotent: a re-stand at the same epoch re-reads
 * the same secret (mints nothing). The keyring's `current()` seals under the newest epoch held.
 *
 * FAIL-CLOSED downstream: an empty keyring (which cannot arise here — this always mints the head epoch) would make
 * `installSealedBody` refuse (`keyring.current()` throws), leaving a body local/unsealed — never plaintext sealed.
 */
export function standNexusKeyring(args: { sealEpoch: number; dir?: string }): NexusConvergenceKeyring {
  const dir = idDirOf(args.dir);
  const epoch = Number.isInteger(args.sealEpoch) && args.sealEpoch >= 0 ? args.sealEpoch : 0;
  const held = readStored(dir);
  if (!held.some((e) => e.epoch === epoch)) {
    held.push(mintNexusSecret(epoch));           // the charter-head epoch had no secret yet — mint + persist it
    held.sort((a, b) => a.epoch - b.epoch);
    writeStored(dir, held);
  }
  return makeNexusConvergenceKeyring(held);
}

/** Read the keyring WITHOUT minting — for a reader that must not create a secret (returns null when none held). */
export function loadNexusKeyring(dir?: string): NexusConvergenceKeyring | null {
  const held = readStored(idDirOf(dir));
  return held.length > 0 ? makeNexusConvergenceKeyring(held) : null;
}

/**
 * Install a keyring DELIVERED at admission (the opened `KeyringEnvelope` entries) into THIS vessel's local store —
 * the joinee's path (STAGE 2). The founder ADMITTING the joinee holds the Nexus's source-of-truth secrets (A2:
 * "DISTRIBUTED to each member"), so a DELIVERED epoch is AUTHORITATIVE: it OVERWRITES any secret this vessel holds
 * for that epoch. A joinee self-mints a PHANTOM secret at first boot (a Nexus-of-one that seals only bodies no
 * peer can read); adopting the founder's Nexus at a consented admission RETIRES that phantom for the delivered
 * epochs, so the joinee re-derives the SAME read-cap the founder sealed under and READS the founder's body. Held
 * epochs the delivery does NOT carry SURVIVE (read-all — a member keeps every past epoch it legitimately holds).
 * FAIL-CLOSED: a malformed entry (bad width / negative epoch) is refused before the whole install lands.
 */
export function installDeliveredKeyring(
  delivered: readonly { readonly epoch: number; readonly secretHex: string }[],
  dir?: string,
): NexusConvergenceKeyring {
  const d = idDirOf(dir);
  const byEpoch = new Map<number, NexusEpochSecret>();
  for (const e of readStored(d)) byEpoch.set(e.epoch, e);   // the held set (self-minted phantoms + any prior delivery)
  for (const e of delivered) {
    if (!Number.isInteger(e.epoch) || e.epoch < 0 || !/^[0-9a-f]{64}$/.test(e.secretHex)) {
      throw new TypeError(`installDeliveredKeyring: malformed delivered entry at epoch ${e.epoch} — refusing the install (fail-closed)`);
    }
    // The founder's delivered secret WINS — it names the Nexus's real epoch secret, so it supersedes a phantom.
    byEpoch.set(e.epoch, { epoch: e.epoch, secret: hexToBytes(e.secretHex) });
  }
  const merged = [...byEpoch.values()].sort((a, b) => a.epoch - b.epoch);
  writeStored(d, merged);
  return makeNexusConvergenceKeyring(merged);
}
