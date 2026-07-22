/**
 * `lares persona admit …` — the operator's door to the airgapped PERSONA-ADMISSION 3-hop (a persona moves onto
 * another vessel, isomorphic to a hardware wallet's device-to-device key hand-off). Each hop is a SEPARATE,
 * offline invocation; a QR (or a pasted `#enroll=`/`#grant=`/`#ack=` carriage) crosses the airgap between them.
 *
 *   offer                         (B, target)  mint an enrollment offer for THIS vessel's device key; show QR#1.
 *   grant --offer <c> --index <N> --prefix <aid>
 *                                 (A, granter) seal persona h<N> onto B's offer, signed by the persona's op-key,
 *                                              verified at open against the persona PREFIX head; show QR#2.
 *   open  --grant <c>             (B, target)  open + verify + RECORD into this vessel's local view; show QR#3.
 *   accept --ack <c>              (A, granter) verify B's ACK + RECORD into this vessel's local view.
 *   list                          the PER-VESSEL multitude-view (personas admitted to THIS vessel; never syncs).
 *   reset                         drop any in-flight pending enrollment / grant secrets.
 *
 * This command THIN-WRAPS the proven node flow (`offerAdmitFlow` / `grantAdmitFlow` / `openAdmitFlow` /
 * `acceptAdmitFlow`) — it only builds the signers + the KEL head-resolver from the local vault + board, renders,
 * and prints. The load-bearing invariants (per-vessel-never-syncs, type-blind, wax-seals-only, rotate-not-
 * resurrect, photograph-inert) live in the flow + the ceremony beneath it.
 *
 * ── HONEST BOUNDS (surfaced, not silently relaxed) ──────────────────────────────────────────────────────────
 *  · `--prefix` is the persona's KEL AID: `open` verifies the grant's op-key IS that prefix's CURRENT head
 *    (rotate-not-resurrect), read off THIS vessel's LOCAL persona-KEL board replica. A SAME-Nexus target already
 *    carries the granter's persona-KEL (it federates once); a CROSS-Nexus airgapped target that lacks it gets a
 *    fail-closed refusal until it syncs — the carried-chain-in-grant leg (which may push QR#2 past a static QR to
 *    the reserved bc-ur multi-part path) is the follow-on for the fully-offline cross-Nexus case.
 *  · `grant` signs with the persona-root seed at h<N>. Where a persona has ROTATED its op-key beneath the root,
 *    the operator supplies the head via `--prefix` (the board resolves it); the ceremony never trusts a frozen key.
 */

import { ed25519SignerFromSeed, type PersonaRef } from "@lararium/mesh";
import {
  offerAdmitFlow, grantAdmitFlow, openAdmitFlow, acceptAdmitFlow, makeLocalPersonaKelHeadResolver,
  listAdmittedPersonas, clearPersonaAdmitPending,
  loadVesselSigningSeed, loadVesselVerifyingKey,
  generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed,
} from "@lararium/node";
import { larDataDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class UsageError extends Error {}

function admitUsage(): void {
  console.error("usage: lares persona admit <offer | grant | open | accept | list | reset>");
  console.error("");
  console.error("  offer                                    (target) mint an enrollment offer + QR#1");
  console.error("  grant --offer <carriage> --index <N> --prefix <aid>   (granter) seal persona h<N> onto the offer + QR#2");
  console.error("  open  --grant <carriage>                 (target) open + verify + record + QR#3 (the ACK)");
  console.error("  accept --ack <carriage>                  (granter) verify the ACK + record the join");
  console.error("  list                                     the per-vessel multitude-view (never syncs)");
  console.error("  reset                                    drop any in-flight pending secrets");
}

/** Print a hop's scannable QR + its carriage (the carriage always travels; the QR is the tabletop convenience). */
function printHop(label: string, hop: { carriage: string; terminalQr: string; qrEcc: string | null; qrOversized: boolean }): void {
  console.log(`${label}:`);
  if (hop.qrOversized) {
    console.log(`  (payload exceeds a single static QR even at ECC-L — paste the carriage, or use the bc-ur multi-part leg)`);
  } else {
    console.log(hop.terminalQr);
    console.log(`  (QR at ECC ${hop.qrEcc})`);
  }
  console.log(`  carriage: ${hop.carriage}`);
}

export async function cmdPersonaAdmit(args: ParsedArgs): Promise<number> {
  const op = args.positional[1];
  const dataDir = larDataDir();
  try {
    switch (op) {
      case "offer": {
        const deviceVerifyingKey = await loadVesselVerifyingKey(dataDir);
        const hop = await offerAdmitFlow({ deviceVerifyingKey });
        emit(args, { ok: true, data: { carriage: hop.carriage, ephemeralPubkey: hop.offer.ephemeralPubkey, expiry: hop.offer.expiry }, human: () => printHop("enrollment offer (hand QR#1 to the granting vessel)", hop) });
        return 0;
      }
      case "grant": {
        const offerCarriage = String(args.options["offer"] ?? "");
        const prefix = String(args.options["prefix"] ?? "");
        const idxRaw = args.options["index"];
        const index = idxRaw !== undefined ? Number.parseInt(String(idxRaw), 10) : 0;
        if (!offerCarriage) throw new UsageError("grant needs --offer <carriage> (the target's QR#1)");
        if (!prefix) throw new UsageError("grant needs --prefix <persona-kel-aid> (the persona's stable identifier)");
        if (!Number.isInteger(index) || index < 0) throw new UsageError(`--index must be a non-negative integer (got "${idxRaw}")`);
        const root = await generateOrLoadPersonaGroupRoot(dataDir, index);
        const personaRef: PersonaRef = { prefix, verifyingKey: root.verifyingKey };
        const personaSigner = ed25519SignerFromSeed(await loadPersonaGroupRootSeed(dataDir, index));
        const r = await grantAdmitFlow({ offerCarriage, personaRef, personaSigner });
        if ("error" in r) throw new UsageError(r.error);
        emit(args, { ok: true, data: { carriage: r.carriage, oversized: r.qrOversized }, human: () => printHop("sealed grant (hand QR#2 back to the target vessel)", r) });
        return 0;
      }
      case "open": {
        const grantCarriage = String(args.options["grant"] ?? "");
        if (!grantCarriage) throw new UsageError("open needs --grant <carriage> (the granter's QR#2)");
        const deviceSigner = ed25519SignerFromSeed(await loadVesselSigningSeed(dataDir));
        const resolveHeadOpKey = await makeLocalPersonaKelHeadResolver();
        const r = await openAdmitFlow({ grantCarriage, resolveHeadOpKey, deviceSigner });
        if ("error" in r) throw new UsageError(r.error);
        emit(args, {
          ok: true,
          data: { carriage: r.carriage, personaPrefix: r.joinRecord.personaRef.prefix },
          human: () => {
            console.log(`admitted persona ${r.joinRecord.personaRef.prefix} onto this vessel (recorded locally, never synced).`);
            printHop("acknowledgement (hand QR#3 back to the granting vessel to close the join)", r);
          },
        });
        return 0;
      }
      case "accept": {
        const ackCarriage = String(args.options["ack"] ?? "");
        if (!ackCarriage) throw new UsageError("accept needs --ack <carriage> (the target's QR#3)");
        const r = await acceptAdmitFlow({ ackCarriage });
        if ("error" in r) throw new UsageError(r.error);
        emit(args, {
          ok: true,
          data: { personaPrefix: r.joinRecord.personaRef.prefix, targetVesselId: r.joinRecord.targetVesselId },
          human: () => {
            console.log(`join CLOSED — persona ${r.joinRecord.personaRef.prefix} now stands admitted on vessel ${r.joinRecord.targetVesselId.slice(0, 16)}….`);
            console.log(`  both vessels hold the matching mutually-signed record (recorded locally on each, never synced).`);
          },
        });
        return 0;
      }
      case "list": {
        const admitted = listAdmittedPersonas();
        emit(args, {
          ok: true,
          data: { admitted: admitted.map((j) => ({ prefix: j.personaRef.prefix, targetVesselId: j.targetVesselId, expiry: j.expiry })) },
          human: () => {
            console.log(`personas admitted to THIS vessel (${admitted.length}) — the per-vessel multitude-view (never federates):`);
            for (const j of admitted) console.log(`  ${j.personaRef.prefix}  → vessel ${j.targetVesselId.slice(0, 16)}…  (granter ${j.granterKey.slice(0, 16)}…)`);
            if (admitted.length === 0) console.log(`  (none — admit one with the offer → grant → open → accept 3-hop)`);
          },
        });
        return 0;
      }
      case "reset": {
        clearPersonaAdmitPending();
        emit(args, { ok: true, data: { reset: true }, human: () => console.log("dropped any in-flight pending enrollment / grant secrets.") });
        return 0;
      }
      default:
        if (op) console.error(`lares persona admit: unknown op "${op}"`);
        admitUsage();
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof UsageError ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares persona admit ${op ?? ""}: ${msg}`) });
    return exitFor(code);
  }
}
