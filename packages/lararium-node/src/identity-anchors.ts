/**
 * identity-anchors — the veiled-Handle's sentinel anchors, persisted in the sovereign
 * identity home (`<state>/identity/anchors.json`), OUTSIDE the wiped `@daemon` substrate.
 *
 * The founding ceremony mints the PersonaGroup / MeshCabal sentinel doc-ids off keyhive's
 * CSPRNG — a fresh id every run, unreproducible from any seed. Those ids (and the
 * PersonaGroup agentId, which the bootstrap never carried) lived ONLY inside the @daemon
 * doc, so a torn @daemon orphaned the veiled Handle with no way back. Persisting them here,
 * beside the sovereign keypair and out of every substrate wipe, lets a rebirth reforge the
 * @daemon store while re-reading the SAME anchors — the Handle survives the substrate.
 */

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { larIdentityDir } from "./vessel-paths.js";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { resolveSealPolicy, sealArchiveBytes, openArchiveBytes, asSelfSovereignSecret, ARCHIVE_PASSPHRASE_ENV } from "./archive-seal.js";

/** The sentinel anchors that bind a vessel to its veiled Handle. Hex doc-ids + agentId. */
export interface IdentityAnchors {
  readonly personaGroupDocIdHex: string;
  readonly meshCabalDocIdHex: string;
  /** The PersonaGroup agentId — Gate-C membership needs it, and the bootstrap never held it. */
  readonly personaGroupAgentIdHex: string;
}

function anchorsPath(): string {
  return join(larIdentityDir(), "anchors.json");
}

/** Write the anchor set to the identity home (0o600), founding + admit both land it here. */
export function persistIdentityAnchors(anchors: IdentityAnchors): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const path = anchorsPath();
  writeFileSync(path, JSON.stringify(anchors, null, 2), "utf8");
  try { chmodSync(path, 0o600); } catch { /* best-effort — a non-POSIX fs still holds the bytes */ }
}

function archivePath(): string {
  return join(larIdentityDir(), "keyhive-archive.bin");
}

let _warnedCleartext = false;

/**
 * Write the keyhive Archive (the membership/capability DAG + prekey secrets + contact card)
 * into the identity home, crash-safe (temp→rename) so a torn write never strands a half
 * archive. The restore path already lives in keyhive-provider (`new KH.Archive(bytes)`); this
 * supplies the bytes a boot reads back. Concurrent exporters serialize through the sync write
 * (last-write-wins — a newer full archive supersedes an older one).
 *
 * Secrets-at-rest (G1): the bytes carry RAW prekey secret material, so the write SEALS them
 * when a key source is configured — an AES-256-GCM envelope keyed by a scrypt-derived
 * passphrase (`LARES_ARCHIVE_PASSPHRASE`), the WSL2-safe default; the OS-keychain leg rides a
 * detection-gated seam (`archive-seal`). With no key source the archive stays 0o600 CLEARTEXT
 * (strict parity with the signing seed beside it — no new exposure), warned once so the state
 * never hides. The recovery keel is device RE-ADMISSION, not this at-rest seal — sealing is
 * hygiene / defense-in-depth.
 */
export function persistIdentityArchive(bytes: Uint8Array): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const path = archivePath();
  const policy = resolveSealPolicy();
  // Self-Only Secret Surface: these bytes ARE the daemon's own sovereign identity — brand them
  // self so the type-guarded sealer accepts them. A held/citizen principal's secret never reaches
  // here (a civic node holds their ciphertext + public edges, never their secret).
  atomicWriteFileSync(path, sealArchiveBytes(asSelfSovereignSecret(bytes), policy));
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
  if (policy.mode === "cleartext" && !_warnedCleartext) {
    _warnedCleartext = true;
    console.warn(
      `[lararium] keyhive archive written CLEARTEXT (no ${ARCHIVE_PASSPHRASE_ENV} set) — ` +
      `set a passphrase to seal the sovereign secrets at rest`,
    );
  }
}

/**
 * Read the persisted keyhive Archive back, or null when none has landed yet. A SEALED archive
 * unseals here; a wrong/absent key throws LOUD (never a silent null — that would boot a fresh
 * empty identity over the sealed one). A bare read failure (file vanished) still reads null.
 */
export function loadIdentityArchive(): Uint8Array | null {
  const path = archivePath();
  if (!existsSync(path)) return null;
  let stored: Uint8Array;
  try { stored = readFileSync(path); } catch { return null; }
  return openArchiveBytes(stored); // unseal or pass-through; throws loud on sealed-without-key / tamper
}

/** Read the anchor set back, or null when a founding predates the anchor lift. */
export function loadIdentityAnchors(): IdentityAnchors | null {
  const path = anchorsPath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<IdentityAnchors>;
    if (
      typeof parsed.personaGroupDocIdHex === "string" &&
      typeof parsed.meshCabalDocIdHex === "string" &&
      typeof parsed.personaGroupAgentIdHex === "string"
    ) {
      return parsed as IdentityAnchors;
    }
    return null;
  } catch {
    return null;
  }
}
