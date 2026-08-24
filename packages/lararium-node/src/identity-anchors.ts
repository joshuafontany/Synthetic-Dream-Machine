/**
 * identity-anchors — the veiled-Handle's sentinel anchors, persisted in the sovereign
 * identity home (`<lares>/identity/anchors.json`), OUTSIDE the wiped daemon substrate.
 *
 * The founding ceremony mints the PersonaGroup / MeshCabal sentinel doc-ids off keyhive's
 * CSPRNG — a fresh id every run, unreproducible from any seed. Those ids (and the
 * PersonaGroup agentId, which the bootstrap never carried) lived ONLY inside the daemon
 * doc, so a torn daemon doc orphaned the veiled Handle with no way back. Persisting them here,
 * beside the sovereign keypair and out of every substrate wipe, lets a rebirth reforge the
 * daemon store while re-reading the SAME anchors — the Handle survives the substrate.
 */

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { larIdentityDir } from "./vessel-paths.js";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { readIdentityAnchors, type AnchorStore, type IdentityAnchors } from "@lararium/mesh";
import { resolveSealPolicy, sealArchiveBytes, openArchiveBytes, asSelfSovereignSecret, ARCHIVE_PASSPHRASE_ENV } from "./archive-seal.js";

// The IdentityAnchors SHAPE + the AnchorStore shore lift to @lararium/mesh (platform-blind); this node
// adapter implements the fs shore. Re-exported so existing importers keep their spelling.
export type { IdentityAnchors } from "@lararium/mesh";

// PLURALITY PONO at the identity layer: a vessel that WEARS several personas anchors EACH to its OWN
// veiled Handle (distinct PersonaGroup + MeshCabal ids + agentId). The anchor store is therefore a SET
// keyed by handle-index (the `handle'` the persona-HD scheme derives). UNIFORM KEYING — every index
// spells `anchors-h${N}.json` (no founding special-case). Anchors carry PUBLIC doc-ids, so no seal
// touches them (the at-rest seal governs the keyhive ARCHIVE below — a distinct concern). A joinee
// holds only its ONE admitted persona's anchors, no matching root.
function anchorsPath(handleIndex: number): string {
  return join(larIdentityDir(), `anchors-h${handleIndex}.json`);
}

/** The anchored-persona ROSTER filename — the EXPLICIT written record of every index this vessel anchors. */
function anchorRosterPath(): string {
  return join(larIdentityDir(), "anchor-roster.json");
}

/** Read the anchor roster's explicit record (ascending), or [] when none / a torn one reads back. */
function readAnchorRoster(): number[] {
  const file = anchorRosterPath();
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { anchors?: unknown };
    if (Array.isArray(raw.anchors)) {
      return [...new Set(raw.anchors.filter((n): n is number => Number.isSafeInteger(n) && n >= 0))].sort((a, b) => a - b);
    }
  } catch { /* a torn roster reads empty — a re-persist re-records the index it holds */ }
  return [];
}

/** Record an anchored handle-index into the roster (0o600) — the explicit written mark, never a dir-scan. */
function recordAnchor(handleIndex: number): void {
  const anchors = new Set(readAnchorRoster());
  anchors.add(handleIndex);
  const file = anchorRosterPath();
  writeFileSync(file, JSON.stringify({ anchors: [...anchors].sort((a, b) => a - b) }, null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(file, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/** Write ONE persona's anchor set to the identity home (0o600), founding + admit both land it here, and
 *  record the index into the explicit roster. `handleIndex` selects which persona (0 = founding). */
export function persistIdentityAnchors(anchors: IdentityAnchors, handleIndex = 0): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const path = anchorsPath(handleIndex);
  writeFileSync(path, JSON.stringify(anchors, null, 2), "utf8");
  try { chmodSync(path, 0o600); } catch { /* best-effort — a non-POSIX fs still holds the bytes */ }
  recordAnchor(handleIndex);
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
 * detection-gated shore (`archive-seal`). With no key source the archive stays 0o600 CLEARTEXT
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

/** Read ONE persona's anchor set back, or null when the index holds no persona (or a torn write reads
 *  back). `handleIndex` selects which persona (0 = founding). */
export function loadIdentityAnchors(handleIndex = 0): IdentityAnchors | null {
  const path = anchorsPath(handleIndex);
  if (!existsSync(path)) return null;
  try {
    return readIdentityAnchors(JSON.parse(readFileSync(path, "utf8")) as Partial<IdentityAnchors>);
  } catch {
    return null;
  }
}

/** The anchored-persona ROSTER — every handle-index whose veiled-Handle anchors this vessel holds,
 *  ascending, from the explicit written record (never a dir-scan). A one-persona vessel returns `[0]`. */
export function listAnchoredPersonas(): number[] {
  return readAnchorRoster();
}

/** The node fs AnchorStore — the shore the PersonaVault carries. `save` records the index into the
 *  explicit roster; `list` reads it back. Anchors carry public doc-ids, so no seal touches this store. */
export const nodeAnchorStore: AnchorStore = {
  load: (handleIndex) => loadIdentityAnchors(handleIndex),
  save: (handleIndex, anchors) => persistIdentityAnchors(anchors, handleIndex),
  list: () => listAnchoredPersonas(),
};
