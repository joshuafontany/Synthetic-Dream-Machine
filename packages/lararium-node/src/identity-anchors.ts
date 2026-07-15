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

/**
 * Write the keyhive Archive (the membership/capability DAG + prekey secrets + contact card)
 * into the identity home, crash-safe (temp→rename) so a torn write never strands a half
 * archive. The restore path already lives in keyhive-provider (`new KH.Archive(bytes)`); this
 * supplies the bytes a boot reads back. Concurrent exporters serialize through the sync write
 * (last-write-wins — a newer full archive supersedes an older one).
 *
 * Secrets-at-rest: the bytes carry RAW prekey secret material. This lands 0o600 CLEARTEXT,
 * strict parity with the signing seed already sitting cleartext 0o600 in this same home —
 * no new exposure surface. An at-rest encryption wrapper stays OWED for post-alpha.
 */
export function persistIdentityArchive(bytes: Uint8Array): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const path = archivePath();
  atomicWriteFileSync(path, bytes);
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/** Read the persisted keyhive Archive back, or null when none has landed yet. */
export function loadIdentityArchive(): Uint8Array | null {
  const path = archivePath();
  if (!existsSync(path)) return null;
  try { return readFileSync(path); } catch { return null; }
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
