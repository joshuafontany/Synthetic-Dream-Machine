/**
 * operator-key — device Ed25519 keypair lifecycle.
 *
 * Local-first identity root (Brooklyn Zelenka / UCAN / Keyhive alignment):
 *   - keypair is generated device-local, persists to disk with mode 0o600
 *   - verifyingKey (hex 32 bytes) feeds did:key derivation
 *   - did:key derivation happens in the TW5 VM (cold-boot-ceremony module)
 *   - displayName derives from `git config user.name` — local truth, no network call
 *
 * Key file naming:
 *   git email configured:  {dataDir}/.operator-key-{email-slug}.json
 *   git email absent:      {dataDir}/.operator-key.json
 *
 * Different developers on the same machine each get their own keypair.
 * The keypair is random Ed25519 — not derived from GitHub credentials.
 *
 * MUST NOT be placed inside any Automerge doc storage path — MUST NOT sync.
 * Mode 0o600 at write time; caller must ensure dataDir is not world-readable.
 */

import { generateKeyPairSync } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";

// ── Local operator identity hint ──────────────────────────────────────────
// Fully local-first: reads git config only. No network calls, no server tokens.
// Login slug derived from git email (email-prefix, lowercased, sanitized) for
// per-developer key file naming on shared machines. DisplayName from git user.name.
//
// Causal-island law: operator identity derives from local keys — not from any
// server-conferred session. GitHub enrichment was web2 smell; git config is local truth.

const exec = promisify(execFile);

interface LocalOperatorHint { login: string | null; displayName: string | null }

async function readLocalOperatorHint(): Promise<LocalOperatorHint> {
  let displayName: string | null = null;
  let login:       string | null = null;
  try {
    const { stdout } = await exec("git", ["config", "--global", "user.name"], { timeout: 2_000 });
    displayName = stdout.trim() || null;
  } catch { /* git absent or user.name unset */ }
  try {
    const { stdout } = await exec("git", ["config", "--global", "user.email"], { timeout: 2_000 });
    const email = stdout.trim();
    if (email) {
      // Stable, filesystem-safe slug: email prefix, lowercased, non-alnum→dash.
      login = email.split("@")[0]!.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    }
  } catch { /* git absent or user.email unset */ }
  return { login, displayName };
}

interface PersistedKey {
  /** Hex-encoded 32-byte Ed25519 public key. Input to did:key derivation. */
  verifyingKey: string;
  /** Hex-encoded 32-byte Ed25519 private key seed. Local signing only. Never synced. */
  signingKey:   string;
  /** GitHub login at key-generation time. Informational only — not the DID. */
  githubLogin?: string;
}

export interface OperatorIdentity {
  /** Hex-encoded 32-byte Ed25519 verifying key. */
  verifyingKey: string;
  /** Display name from GitHub / local fallback. Enriches IdentityTiddler only. */
  displayName?: string;
}

function keyFileName(login: string | null): string {
  return login ? `.operator-key-${login}.json` : ".operator-key.json";
}

/**
 * Generate or load the device Ed25519 operator keypair.
 *
 * Key file is named by GitHub login for local dev — different developers on the
 * same machine each hold separate keys. Falls back to a shared file when offline.
 *
 * Causal-islands alignment: keypair generation runs as a device-local operation that
 * MUST complete before any Automerge doc opens. The verifyingKey flows into the
 * cold-boot ceremony which writes the IdentityTiddler into IdentitiesDoc via
 * direct handle.change() — not through the TW5 sync adaptor (wrong island).
 */
export async function generateOrLoadOperatorKeypair(
  dataDir: string,
): Promise<OperatorIdentity> {
  mkdirSync(dataDir, { recursive: true });

  const hint     = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const keyFile  = join(dataDir, keyFileName(hint.login));

  let verifyingKey: string;

  if (existsSync(keyFile)) {
    const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
    verifyingKey = raw.verifyingKey;
    console.log(`[operator-key] loaded keypair${hint.login ? ` for ${hint.login}` : ""}`);
  } else {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pubJwk  = publicKey.export({ format: "jwk" }) as { x: string };
    const privJwk = privateKey.export({ format: "jwk" }) as { d: string };

    verifyingKey           = Buffer.from(pubJwk.x,  "base64url").toString("hex");
    const signingKey       = Buffer.from(privJwk.d, "base64url").toString("hex");
    const persisted: PersistedKey = { verifyingKey, signingKey, ...(hint.login ? { githubLogin: hint.login } : {}) };

    writeFileSync(keyFile, JSON.stringify(persisted, null, 2), { mode: 0o600, encoding: "utf8" });
    chmodSync(keyFile, 0o600);
    console.log(`[operator-key] generated new Ed25519 keypair${hint.login ? ` for ${hint.login}` : ""}`);
  }

  const base: OperatorIdentity = { verifyingKey };
  return hint.displayName ? { ...base, displayName: hint.displayName } : base;
}

/**
 * Load the operator's 32-byte Ed25519 SIGNING seed (private key bytes).
 *
 * Separate from `generateOrLoadOperatorKeypair` — that function returns only
 * the public verifying key (sufficient for IdentityTiddler), while this one
 * surfaces the private seed needed by KeyhiveProvider.init({ seed }) and any
 * other capability layer that signs on the operator's behalf.
 *
 * SECURITY: the returned bytes ARE the operator's private signing key. Treat
 * with care: don't log it, don't write it anywhere outside the operator-key
 * file, and don't pass it across process boundaries that aren't already
 * inside the operator's trust domain.
 *
 * Throws when no key file exists — caller must call
 * `generateOrLoadOperatorKeypair(dataDir)` first to ensure one is on disk.
 */
/**
 * Load the operator's hex-encoded Ed25519 PUBLIC verifying key from disk.
 * Cheap read — no crypto. Returns the same `verifyingKey` field
 * generateOrLoadOperatorKeypair surfaces, without regenerating if missing.
 *
 * Used by the CLI to populate job-tiddler `requested-by` with a
 * Keyhive-recognizable DID (`0x` + verifyingKey hex). Throws when no key
 * file exists.
 */
export async function loadOperatorVerifyingKey(dataDir: string): Promise<string> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const keyFile = join(dataDir, keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[operator-key] no key file at ${keyFile} — run \`lares init\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.verifyingKey !== "string" || raw.verifyingKey.length !== 64) {
    throw new Error(`[operator-key] malformed verifyingKey in ${keyFile}`);
  }
  return raw.verifyingKey;
}

export async function loadOperatorSigningSeed(dataDir: string): Promise<Uint8Array> {
  const hint    = await readLocalOperatorHint().catch(() => ({ login: null, displayName: null }));
  const keyFile = join(dataDir, keyFileName(hint.login));
  if (!existsSync(keyFile)) {
    throw new Error(
      `[operator-key] no key file at ${keyFile} — run \`lares init\` first to generate the keypair`,
    );
  }
  const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
  if (typeof raw.signingKey !== "string" || raw.signingKey.length !== 64) {
    throw new Error(`[operator-key] malformed signingKey in ${keyFile}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.signingKey.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
