/**
 * kahu-recovery-node (S3 — the civic-custody crown's recovery half) — a KAHU node that HOLDS a citizen's
 * recovery escrow share cannot RECOVER (become) the citizen alone. The recovery quorum IS the
 * impersonation quorum (Camenisch-Lysyanskaya), made a container exit code: the custodian holds ≤ 1
 * share, from one custodian-type, so it can never assemble a Quorum — while the citizen, holding
 * {device, recorded-code} (two distinct custodians), reconstructs its own root.
 *
 * The recovery twin of kahu-blind (S1): S1 = a custodian can't READ; S3 = a custodian can't RECOVER.
 *
 * Env: LAR_KAHU_ROLE (citizen|kahu) · LAR_KAHU_SHARED (req, shared volume)
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder#the-recovery · project_civic_recovery_and_waxstamp
 */

import {
  splitToShares, assembleQuorum, reconstructFromQuorum,
  encodeShareBytes, decodeShareBytes, type RecoveryShare, type CustodianTag,
} from "@lararium/mesh";
import { envOf, ProbeVolume, runProbeRole } from "./probe-ceremony.js";

const SHARED = envOf("LAR_KAHU_SHARED");
const ROLE   = envOf("LAR_KAHU_ROLE", "kahu");
/** The citizen's PersonaGroup root (the "become you" atom) — a fixed seed for the deterministic probe. */
const ROOT = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 61 + 13) & 0xff));

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

async function runCitizen(vol: ProbeVolume): Promise<void> {
  // Split the root 2-of-3 across three DISTINCT custodians. The kahu holds ONLY the escrow-peer share.
  const custodians: CustodianTag[] = ["device", "recorded-code", "escrow-peer"];
  const shares = splitToShares(ROOT, 2, custodians, 1, seededRng(7));
  const byTag = (t: CustodianTag): RecoveryShare => shares.find((s) => s.custodian === t)!;

  vol.putText("escrow-share", encodeShareBytes(byTag("escrow-peer").bytes));   // hand the kahu ONE share
  vol.mark("citizen-ready");

  // The citizen recovers from its OWN two custodians {device, recorded-code} — two distinct custodians.
  const recovered = reconstructFromQuorum(assembleQuorum([byTag("device"), byTag("recorded-code")], 2));
  if (!recovered.every((b, i) => b === ROOT[i])) { console.log(`[kahu-recovery] CITIZEN ✗ failed to recover its own root`); process.exit(1); }
  console.log(`[kahu-recovery] CITIZEN ✓ recovered its own root from {device, recorded-code}`);
  vol.mark("citizen-recovered");

  await vol.waitFor("kahu-done", "the kahu's verdict");
  console.log(`[kahu-recovery] CITIZEN done`);
}

async function runKahu(vol: ProbeVolume): Promise<void> {
  // The kahu holds ONLY the citizen's escrow-peer share — full "store access" to its own one share.
  await vol.waitFor("citizen-ready", "the citizen to split + escrow");
  const escrowShareBytes = decodeShareBytes(vol.readText("escrow-share"));
  const escrowShare: RecoveryShare = { bytes: escrowShareBytes, custodian: "escrow-peer", recoveryEpoch: 1 };
  console.log(`[kahu-recovery] KAHU holds 1 escrow share (x=${String(escrowShareBytes.x)}) — attempting solo recovery…`);

  // The custodian tries to recover from what it holds: ONE share, ONE custodian → assembleQuorum forbids
  // it (below threshold AND single-custodian). Even DUPLICATING its own share is still one custodian.
  let cannotRecover = false;
  try {
    reconstructFromQuorum(assembleQuorum([escrowShare], 2));
    console.log(`[kahu-recovery] KAHU ✗ CUSTODY BREACH — reconstructed from its one share`);
  } catch { cannotRecover = true; }
  try {
    reconstructFromQuorum(assembleQuorum([escrowShare, { ...escrowShare, bytes: { x: 99, ys: escrowShareBytes.ys } }], 2));
    console.log(`[kahu-recovery] KAHU ✗ CUSTODY BREACH — a single-custodian quorum was accepted`);
    cannotRecover = false;
  } catch { /* single-custodian quorum forbidden — as it must be */ }

  await vol.waitFor("citizen-recovered", "the citizen to recover (it CAN, the custodian CANNOT)");
  vol.mark("kahu-done");

  if (!cannotRecover) { console.log(`[kahu-recovery] KAHU ✗ SECURITY FAILURE — a custodian recovered a citizen alone`); process.exit(1); }
  console.log(`[kahu-recovery] KAHU ✓ holds the escrow share, cannot recover the citizen alone`);
  console.log(`[kahu-recovery] KAHU ✓ the recovery quorum IS the impersonation quorum — Delivery-Service, never Auth-Root`);
  process.exit(0);
}

if (!SHARED) throw new Error("LAR_KAHU_SHARED required");
const vol = new ProbeVolume(SHARED, ROLE);
await runProbeRole("LAR_KAHU_ROLE", { citizen: () => runCitizen(vol), kahu: () => runKahu(vol) });
if (ROLE === "citizen") process.exit(0);
