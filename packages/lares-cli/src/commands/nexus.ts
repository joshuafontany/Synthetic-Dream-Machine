/**
 * `lares nexus charter {seat | show}` — the operator's door to the founding-kahu ROSTER, the Kapae immune
 * antigen's authority home (#66). The roster lives as data-as-authority in the `bags/@nexus` charter DOC;
 * `seat` mints/updates it from the vault, `show` reads it back. The pure antigen fold/verify reads this
 * same doc through `foundingRoster`.
 *
 *   seat   read each held persona's ed25519 VERIFYING key from the vault (NEVER the signing seed), match it
 *          to a founding-kahu display name by PRIVATE pet-name, and write the seated roster + a genesis
 *          charter-epoch inception into the doc. FAILS CLOSED: a kahu with no matching held persona stays
 *          unseated; a quorum-short roster establishes no epoch (the antigen stays inert).
 *   show   the current roster state — seated/unseated kahu, threshold, charter epoch, quorum verdict.
 *
 * The CHARTER EPOCH is a genesis inception content-address bound to the seated key-set (KERI genesis) — NOT
 * the full pre-rotated wax-stamp epoch-chain (a surfaced follow-on: it needs the next epoch's keys in
 * offline custody + a `lares rotate-root` ceremony before this epoch ever seals).
 */

import {
  readNexusCharterDoc, writeNexusCharterDoc, nexusCharterDocPath,
  listPersonaRoots, generateOrLoadPersonaGroupRoot, makeNodePersonaPetnameStore,
} from "@lararium/node";
import {
  emptyFoundingCharterDoc, genesisCharterEpochCid, rosterFromCharterDoc, foundingQuorumSeated,
  ownPersonaPetname, type NexusCharterDoc, type NexusCharterKahu,
} from "@lararium/mesh";
import { larBagsDir, larDataDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class UsageError extends Error {}

function usage(): void {
  console.error("usage: lares nexus charter <seat | show>");
  console.error("");
  console.error("  seat   seat the held personas' verifying keys into the bags/@nexus charter doc (by pet-name)");
  console.error("  show   read the current founding-kahu roster + quorum verdict");
}

export async function cmdNexus(args: ParsedArgs): Promise<number> {
  if (args.positional[0] !== "charter") { usage(); return 2; }
  const sub = args.positional[1];
  try {
    switch (sub) {
      case "seat": return await charterSeat(args);
      case "show": return await charterShow(args);
      default:
        if (sub) console.error(`lares nexus charter: unknown sub-verb "${sub}"`);
        usage();
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof UsageError ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares nexus charter ${sub ?? ""}: ${msg}`) });
    return exitFor(code);
  }
}

/** normalize a display/pet-name for matching — trimmed, case-folded (a pet-name is a private human label). */
const norm = (s: string): string => s.trim().toLowerCase();

async function charterSeat(args: ParsedArgs): Promise<number> {
  const bagsDir = larBagsDir();
  const dataDir = larDataDir();
  const doc = readNexusCharterDoc(bagsDir) ?? emptyFoundingCharterDoc();

  // Read the vault: each held persona's PUBLIC verifying key (never the seed) + its private pet-name.
  const held = await listPersonaRoots(dataDir);
  const petnames = await makeNodePersonaPetnameStore();
  const byPetname = new Map<string, string>();   // normalized pet-name → verifying key hex
  for (const index of held) {
    const petname = await ownPersonaPetname(petnames, index);
    if (!petname) continue;                       // an unnamed persona cannot match a named kahu
    const root = await generateOrLoadPersonaGroupRoot(dataDir, index);   // loads a held root; never mints here
    byPetname.set(norm(petname), root.verifyingKey);
  }

  // Seat each kahu from a pet-name match. FAIL CLOSED: no match keeps the doc's existing key (never invents,
  // never unseats). A verifying key that is not in the vault can never be seated — only vault reads flow in.
  const kahu: NexusCharterKahu[] = doc.kahu.map((k) => {
    const matched = byPetname.get(norm(k.displayName));
    return { displayName: k.displayName, verifyingKey: matched ?? k.verifyingKey };
  });

  const seatedKeys = kahu.map((k) => k.verifyingKey).filter((v): v is string => typeof v === "string" && v.length > 0);
  // Establish the genesis charter epoch only once a quorum is seatable — below threshold, no epoch roots.
  const charterEpochCid = seatedKeys.length >= doc.threshold
    ? genesisCharterEpochCid(seatedKeys, doc.threshold)
    : null;

  const next: NexusCharterDoc = { kind: doc.kind, threshold: doc.threshold, charterEpochCid, kahu };
  const path = writeNexusCharterDoc(bagsDir, next);
  const quorum = foundingQuorumSeated(next);

  emit(args, {
    ok: true,
    data: {
      path, threshold: next.threshold, charterEpochCid, quorumSeated: quorum,
      kahu: kahu.map((k) => ({ displayName: k.displayName, seated: Boolean(k.verifyingKey), verifyingKey: k.verifyingKey })),
    },
    human: () => {
      console.log(`nexus charter seated → ${path}`);
      for (const k of kahu) {
        console.log(`  ${k.verifyingKey ? "seated  " : "UNSEATED"} ${k.displayName}${k.verifyingKey ? `  ${k.verifyingKey.slice(0, 16)}…` : ""}`);
      }
      console.log(`  threshold:  ${next.threshold} of ${kahu.length}`);
      console.log(`  epoch:      ${charterEpochCid ?? "(unestablished — seat a quorum first)"}`);
      if (quorum) {
        console.log(`  quorum STANDS — the antigen now reads a live roster.`);
      } else {
        const missing = kahu.filter((k) => !k.verifyingKey).map((k) => `"${k.displayName}"`);
        console.log(`  quorum SHORT (fail-closed; the antigen stays inert). Unseated: ${missing.join(", ") || "(none)"}`);
        console.log(`  seat them: lares persona new <index> --name '<displayName>'  →  lares nexus charter seat`);
      }
    },
  });
  return 0;
}

async function charterShow(args: ParsedArgs): Promise<number> {
  const bagsDir = larBagsDir();
  const doc = readNexusCharterDoc(bagsDir);
  const roster = rosterFromCharterDoc(doc);
  const quorum = foundingQuorumSeated(doc);

  emit(args, {
    ok: true,
    data: {
      path: nexusCharterDocPath(bagsDir),
      present: doc !== null,
      threshold: roster.threshold,
      charterEpochCid: roster.charterEpochCid || null,
      seatedKeys: roster.keys.length,
      quorumSeated: quorum,
      kahu: (doc?.kahu ?? []).map((k) => ({ displayName: k.displayName, seated: Boolean(k.verifyingKey) })),
    },
    human: () => {
      if (!doc) {
        console.log(`no nexus charter doc — run \`lares nexus charter seat\` (the antigen stays inert until a quorum stands).`);
        console.log(`  expected at: ${nexusCharterDocPath(bagsDir)}`);
        return;
      }
      console.log(`nexus charter (${nexusCharterDocPath(bagsDir)}):`);
      for (const k of doc.kahu) console.log(`  ${k.verifyingKey ? "seated  " : "UNSEATED"} ${k.displayName}`);
      console.log(`  threshold:  ${roster.threshold} · seated keys: ${roster.keys.length}`);
      console.log(`  epoch:      ${roster.charterEpochCid || "(unestablished)"}`);
      console.log(`  quorum:     ${quorum ? "STANDS (roster live)" : "SHORT (fail-closed — antigen inert)"}`);
    },
  });
  return 0;
}
