/**
 * operator-key — device Ed25519 keypair lifecycle.
 *
 * Local-first identity root (Brooklyn Zelenka / UCAN / Keyhive alignment):
 *   - keypair is generated device-local, persists to disk with mode 0o600
 *   - verifyingKey (hex 32 bytes) feeds did:key derivation
 *   - did:key derivation happens in the TW5 VM (cold-boot-ceremony module)
 *   - GitHub / BlueSky auth enriches displayName; it does not own the DID
 *
 * Key file naming:
 *   Local dev (gh CLI active):  {dataDir}/.operator-key-{login}.json
 *   CI / offline:               {dataDir}/.operator-key.json
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
import type { LarAuthReceipt } from "@lararium/mesh";

// ── gh CLI operator receipt ───────────────────────────────────────────────
// Local-first dev path: reads the active `gh auth login` session. Returns null
// when gh is absent, unauthenticated, or the GitHub API call fails (offline).

const exec = promisify(execFile);

interface GitHubUser { login: string; id: number; name?: string; email?: string }

async function readGhToken(): Promise<string | null> {
  try {
    const { stdout } = await exec("gh", ["auth", "token"], { timeout: 3000 });
    return stdout.trim() || null;
  } catch { return null; }
}

async function fetchGitHubUser(token: string): Promise<GitHubUser | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "lararium-node/0.1" },
    });
    if (!res.ok) return null;
    return await res.json() as GitHubUser;
  } catch { return null; }
}

async function getGhCliOperatorReceipt(): Promise<LarAuthReceipt | null> {
  const token = await readGhToken();
  if (!token) return null;
  const user = await fetchGitHubUser(token);
  if (!user) return null;
  const now = new Date();
  const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return {
    provider: "github-vscode", subject: `github:${user.login}`,
    displayName: user.name ?? user.login,
    issuedAt: now.toISOString(), expiresAt: expires.toISOString(),
    scopes: [{ with: "lararium:*", can: "*" }],
    principal: { provider: "github-vscode", login: user.login, githubId: String(user.id), editor: "vscode-insiders", localInstanceId: `gh-cli:${user.login}` },
  };
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

  const ghReceipt  = await getGhCliOperatorReceipt().catch(() => null);
  const ghLogin    = ghReceipt?.subject?.replace("github:", "") ?? null;
  const keyFile    = join(dataDir, keyFileName(ghLogin));

  let verifyingKey: string;

  if (existsSync(keyFile)) {
    const raw = JSON.parse(readFileSync(keyFile, "utf8")) as PersistedKey;
    verifyingKey = raw.verifyingKey;
    console.log(`[operator-key] loaded keypair${ghLogin ? ` for github:${ghLogin}` : ""}`);
  } else {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pubJwk  = publicKey.export({ format: "jwk" }) as { x: string };
    const privJwk = privateKey.export({ format: "jwk" }) as { d: string };

    verifyingKey           = Buffer.from(pubJwk.x,  "base64url").toString("hex");
    const signingKey       = Buffer.from(privJwk.d, "base64url").toString("hex");
    const persisted: PersistedKey = { verifyingKey, signingKey, ...(ghLogin ? { githubLogin: ghLogin } : {}) };

    writeFileSync(keyFile, JSON.stringify(persisted, null, 2), { mode: 0o600, encoding: "utf8" });
    chmodSync(keyFile, 0o600);
    console.log(`[operator-key] generated new Ed25519 keypair${ghLogin ? ` for github:${ghLogin}` : ""}`);
  }

  const base: OperatorIdentity = { verifyingKey };
  return ghReceipt?.displayName ? { ...base, displayName: ghReceipt.displayName } : base;
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
  const ghReceipt = await getGhCliOperatorReceipt().catch(() => null);
  const ghLogin   = ghReceipt?.subject?.replace("github:", "") ?? null;
  const keyFile   = join(dataDir, keyFileName(ghLogin));
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
  const ghReceipt = await getGhCliOperatorReceipt().catch(() => null);
  const ghLogin   = ghReceipt?.subject?.replace("github:", "") ?? null;
  const keyFile   = join(dataDir, keyFileName(ghLogin));
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
