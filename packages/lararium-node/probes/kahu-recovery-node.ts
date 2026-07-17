/**
 * kahu-recovery-node (S3 — the civic-custody crown's recovery half) — a KAHU node that HOLDS a citizen's
 * recovery escrow share cannot RECOVER (become) the citizen alone. The recovery quorum IS the
 * impersonation quorum (Camenisch-Lysyanskaya), made a container exit code: the custodian holds ≤ 1
 * share, from one custodian-type, so it can never assemble a Quorum — while the citizen, holding
 * {device, recorded-code} (two distinct custodians), reconstructs its own root.
 *
 * This is the recovery twin of kahu-blind (S1): S1 proved a custodian that holds the ciphertext cannot
 * READ it; S3 proves a custodian that holds the escrow share cannot RECOVER the citizen. Delivery
 * Service, never Auth Root — the node relays and holds ciphertext/shares, never a quorum.
 *
 * Env: LAR_KAHU_ROLE (citizen|kahu) · LAR_KAHU_SHARED (req, shared volume)
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder#the-recovery · project_civic_recovery_and_waxstamp
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  splitToShares, assembleQuorum, reconstructFromQuorum,
  encodeShareBytes, decodeShareBytes, type RecoveryShare, type CustodianTag,
} from "@lararium/mesh";

const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const ROLE   = envOf("LAR_KAHU_ROLE", "kahu");
const SHARED = envOf("LAR_KAHU_SHARED");
/** The citizen's PersonaGroup root (the "become you" atom) — a fixed seed for the deterministic probe. */
const ROOT = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 61 + 13) & 0xff));
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const P = (name: string): string => join(SHARED, name);

/** Deterministic RNG so the split is reproducible across the two containers — never for production. */
function seededRng(seed: number) {
  let s = seed >>> 0;
  return {
    getRandomValues<T extends Uint8Array<ArrayBuffer>>(arr: T): T {
      for (let i = 0; i < arr.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; arr[i] = (s >>> 24) & 0xff; }
      return arr;
    },
    randomUUID(): string { return "00000000-0000-0000-0000-000000000000"; },
  };
}

async function waitFor(name: string, label: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    if (existsSync(P(name))) return readFileSync(P(name), "utf8");
    if (i === 0) console.log(`[kahu-recovery] (${ROLE}) awaiting ${label}…`);
    await sleep(500);
  }
  throw new Error(`timeout awaiting ${label}`);
}

async function runCitizen(): Promise<void> {
  // Split the root 2-of-3 across three DISTINCT custodians. The kahu holds ONLY the escrow-peer share.
  const custodians: CustodianTag[] = ["device", "recorded-code", "escrow-peer"];
  const shares = splitToShares(ROOT, 2, custodians, 1, seededRng(7));
  const byTag = (t: CustodianTag): RecoveryShare => shares.find((s) => s.custodian === t)!;

  // Hand the KAHU the escrow-peer share ONLY (encoded, as a real escrow custodian would relay).
  writeFileSync(P("escrow-share"), encodeShareBytes(byTag("escrow-peer").bytes));
  writeFileSync(P("citizen-ready"), "ok");

  // The citizen recovers from its OWN two custodians {device, recorded-code} — two distinct custodians.
  const q = assembleQuorum([byTag("device"), byTag("recorded-code")], 2);
  const recovered = reconstructFromQuorum(q);
  if (!recovered.every((b, i) => b === ROOT[i])) { console.log(`[kahu-recovery] CITIZEN ✗ failed to recover its own root`); process.exit(1); }
  console.log(`[kahu-recovery] CITIZEN ✓ recovered its own root from {device, recorded-code}`);
  writeFileSync(P("citizen-recovered"), "ok");

  await waitFor("kahu-done", "the kahu's verdict");
  console.log(`[kahu-recovery] CITIZEN done`);
}

async function runKahu(): Promise<void> {
  // The kahu holds ONLY the citizen's escrow-peer share — full "store access" to its own one share.
  await waitFor("citizen-ready", "the citizen to split + escrow");
  const escrowShareBytes = decodeShareBytes(readFileSync(P("escrow-share"), "utf8"));
  const escrowShare: RecoveryShare = { bytes: escrowShareBytes, custodian: "escrow-peer", recoveryEpoch: 1 };
  console.log(`[kahu-recovery] KAHU holds 1 escrow share (x=${String(escrowShareBytes.x)}) — attempting solo recovery…`);

  // The custodian tries to recover the citizen from what it holds. It has ONE share, ONE custodian —
  // assembleQuorum forbids it (below threshold AND single-custodian). Even duplicating its own share
  // cannot forge a second custodian: the impersonation-quorum guard holds.
  let cannotRecover = false;
  try {
    reconstructFromQuorum(assembleQuorum([escrowShare], 2));
    console.log(`[kahu-recovery] KAHU ✗ CUSTODY BREACH — reconstructed the citizen's root from its one share`);
  } catch { cannotRecover = true; }
  // And a desperate custodian duplicating its own share is still one custodian — still forbidden.
  try {
    reconstructFromQuorum(assembleQuorum([escrowShare, { ...escrowShare, bytes: { x: 99, ys: escrowShareBytes.ys } }], 2));
    console.log(`[kahu-recovery] KAHU ✗ CUSTODY BREACH — a single-custodian quorum was accepted`);
    cannotRecover = false;
  } catch { /* single-custodian quorum forbidden — as it must be */ }

  await waitFor("citizen-recovered", "the citizen to recover (it CAN, the custodian CANNOT)");
  writeFileSync(P("kahu-done"), "ok");

  if (!cannotRecover) { console.log(`[kahu-recovery] KAHU ✗ SECURITY FAILURE — a custodian recovered a citizen alone`); process.exit(1); }
  console.log(`[kahu-recovery] KAHU ✓ holds the escrow share, cannot recover the citizen alone`);
  console.log(`[kahu-recovery] KAHU ✓ the recovery quorum IS the impersonation quorum — Delivery-Service, never Auth-Root`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (!SHARED) throw new Error("LAR_KAHU_SHARED required");
  mkdirSync(SHARED, { recursive: true });
  if (ROLE === "citizen") await runCitizen();
  else await runKahu();
  if (ROLE === "citizen") process.exit(0);
}

main().catch((e) => { console.error(`[kahu-recovery] (${ROLE}) ✗ FATAL:`, e); process.exit(1); });
