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

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync, readdirSync } from "node:fs";
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

// PLURALITY PONO at the identity layer: a vessel that WEARS several personas anchors EACH to its OWN
// veiled Handle (distinct PersonaGroup + MeshCabal ids + agentId). The anchor store is therefore a SET
// keyed by handle-index (the `handle'` the persona-HD scheme derives). Index 0 = the founding persona:
// its file spells `anchors.json`, byte-identical to a one-persona vessel (back-compat). Each higher index
// hangs off `anchors-h${N}.json`. A joinee holds only its ONE admitted persona's anchors at index 0.
function anchorsPath(handleIndex = 0): string {
  const suffix = handleIndex === 0 ? "" : `-h${handleIndex}`;
  return join(larIdentityDir(), `anchors${suffix}.json`);
}

/** Write ONE persona's anchor set to the identity home (0o600), founding + admit both land it here.
 *  `handleIndex` selects which persona (0 = founding, back-compat). */
export function persistIdentityAnchors(anchors: IdentityAnchors, handleIndex = 0): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const path = anchorsPath(handleIndex);
  writeFileSync(path, JSON.stringify(anchors, null, 2), "utf8");
  try { chmodSync(path, 0o600); } catch { /* best-effort — a non-POSIX fs still holds the bytes */ }
}

/** The keyhive Archive carrier path — the sovereign identity floor at rest. Exported so the vault
 *  passphrase-lifecycle surface (`archive-passphrase`) names the ONE carrier location, never a
 *  duplicated magic string that could drift from this writer. */
export function archivePath(): string {
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

/** Read ONE persona's anchor set back, or null when a founding predates the anchor lift (or the index
 *  holds no persona). `handleIndex` selects which persona (0 = founding, back-compat). */
export function loadIdentityAnchors(handleIndex = 0): IdentityAnchors | null {
  const path = anchorsPath(handleIndex);
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

/** The anchored-persona ROSTER — every handle-index whose veiled-Handle anchors this vessel holds,
 *  ascending. A one-persona vessel returns `[0]`. The disk IS the roster (no registry). */
export function listAnchoredPersonas(): number[] {
  const idDir = larIdentityDir();
  if (!existsSync(idDir)) return [];
  const found = new Set<number>();
  for (const f of readdirSync(idDir)) {
    if (f === "anchors.json") { found.add(0); continue; }
    const m = /^anchors-h(\d+)\.json$/.exec(f);
    if (m) found.add(Number(m[1]));
  }
  return [...found].sort((a, b) => a - b);
}
