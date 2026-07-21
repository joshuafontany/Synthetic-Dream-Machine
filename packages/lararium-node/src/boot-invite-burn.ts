/**
 * boot-invite-burn — the LOCAL, causal-island burn store for the traceless boot-invite, plus the node-side
 * mint + spend-on-boot. The burn is deliberately LOCAL: a spent invite id lands in this vessel's OWN store and
 * never federates. A mesh-wide "which invites are spent" list would re-introduce the tracking the doctrine
 * forbids (and demand a global now) — so single-use is enforced island-local, not by a federated registry.
 *
 * SPEND-ON-BOOT ATOMICITY: `runBootInviteSpend` decides then BURNS BEFORE returning `admitted:true`. A crash
 * between burn and grant loses only the grant (the vessel re-boots to the anon floor — fail-closed); it never
 * double-spends a granted invite, because the id is already burned when the grant is attempted.
 *
 * WITHHOLD-NEVER-FORGE: every refusal (garbled, wrong-Nexus, expired, already-spent, bad-seal) returns the pure
 * `BootVerdict{admitted:false}` — the caller reads that as "found your own group at the anon floor", never a throw.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-invite
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import * as ed25519 from "@noble/ed25519";
import {
  decideBootInvite, signBootInvite, bootInviteId, hexToBytes,
  type BootInvite, type BootInvitePolicy, type BootVerdict,
} from "@lararium/mesh";
import { larDataDir } from "./vessel-paths.js";
import { loadVesselSigningSeed, loadVesselVerifyingKey } from "./node-vessel-identity.js";

/** The local burn ledger path — one spent invite-id per line, under the vessel store. Never federated. */
export function bootInviteBurnPath(storageDir: string): string {
  return join(storageDir, "boot-invite-burned");
}

/** Read the local spent-set — the burned invite-ids on THIS island. An absent ledger reads the empty set. */
export function readBurnSet(storageDir: string): Set<string> {
  const path = bootInviteBurnPath(storageDir);
  if (!existsSync(path)) return new Set<string>();
  try {
    return new Set(readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter((l) => l.length > 0));
  } catch {
    return new Set<string>();   // an unreadable ledger fails closed to empty (a fresh invite may still spend once)
  }
}

/** Is this invite id burned on THIS island already? A LOCAL fact — never a federated lookup. */
export function isBurned(storageDir: string, burnId: string): boolean {
  return readBurnSet(storageDir).has(burnId);
}

/** Burn an invite id — append it to the local ledger (idempotent; a re-burn is a no-op). */
export function burn(storageDir: string, burnId: string): void {
  const set = readBurnSet(storageDir);
  if (set.has(burnId)) return;
  set.add(burnId);
  const path = bootInviteBurnPath(storageDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, [...set].sort().join("\n") + "\n", "utf8");
}

/** Verify an ed25519 signature-hex over bytes against a verifying-key hex — false on any malformed input. */
async function verifyHex(bytes: Uint8Array, sigHex: string, keyHex: string): Promise<boolean> {
  try { return await ed25519.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(keyHex)); }
  catch { return false; }
}

/**
 * Mint a traceless boot-invite sealed by THIS node's Nexus authority key (its own vessel signing seed). A random
 * nonce makes each token unique; the seal is IDENTICAL in shape for every invite, so it reveals no inviter. The
 * caller carries the token out-of-band (paste / QR / URL fragment) to the joining vessel — no board records it.
 */
export async function runBootInviteMint(opts: {
  expiresInDays?: number; storageDir?: string; now?: Date;
}): Promise<BootInvite> {
  const storageDir  = opts.storageDir ?? larDataDir();
  const nexusPubkey = await loadVesselVerifyingKey(storageDir);
  const seed        = await loadVesselSigningSeed(storageDir);
  const now         = opts.now ?? new Date();
  const expiresAt   = new Date(now.getTime() + (opts.expiresInDays ?? 14) * 86_400_000).toISOString();
  const nonce       = randomBytes(16).toString("hex");
  return signBootInvite(
    { nexusPubkey, nonce, expiresAt },
    async (bytes) => Buffer.from(await ed25519.signAsync(bytes, seed)).toString("hex"),
  );
}

/**
 * Decide a carried boot-invite AND spend it on boot — the atomic decide-then-burn. Verifies the seal against
 * THIS node's Nexus pubkey, checks the local spent-set, and — on an admission — BURNS the id BEFORE returning
 * `admitted:true`. A refused invite (garbled / wrong-Nexus / expired / already-spent / bad-seal) returns
 * `admitted:false` and burns nothing (the vessel founds its own group at the anon floor).
 */
export async function runBootInviteSpend(opts: {
  invite: BootInvite | null; policy?: BootInvitePolicy; storageDir?: string; now?: Date;
}): Promise<BootVerdict> {
  const storageDir  = opts.storageDir ?? larDataDir();
  const nexusPubkey = await loadVesselVerifyingKey(storageDir);
  const verdict = await decideBootInvite({
    policy:      opts.policy ?? { kind: "invite-only" },
    nexusPubkey,
    invite:      opts.invite,
    now:         opts.now ?? new Date(),
    verify:      verifyHex,
    isSpent:     (burnId) => isBurned(storageDir, burnId),
  });
  // SPEND-ON-BOOT: burn FIRST, then the caller grants. A crash after the burn re-boots to the anon floor (safe);
  // it never re-grants a spent invite.
  if (verdict.admitted && verdict.burnId) burn(storageDir, verdict.burnId);
  return verdict;
}

/** Re-export the pure id fn so a caller can pre-compute a burn key without re-deciding. */
export { bootInviteId };
