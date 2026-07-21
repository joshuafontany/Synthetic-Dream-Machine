/**
 * `lares nexus charter {seat | rotate | commit | show}` — the operator's door to the founding-kahu ROSTER
 * and its PRE-ROTATED, hash-linked charter-epoch CHAIN (TUF ≈ KERI), the Kapae immune antigen's authority
 * home (#68). The roster lives as data-as-authority in the `bags/@nexus` charter DOC; the antigen roots on
 * the chain's HEAD epoch. The pure antigen fold/verify reads this same doc through `foundingRoster`.
 *
 *   seat    read each held persona's ed25519 VERIFYING key from the vault (NEVER the signing seed), match it
 *           to a founding-kahu display name by PRIVATE pet-name, and establish the GENESIS epoch (sequence 0)
 *           bound to the seated key-set + an operator-supplied PRE-ROTATION commitment (`--next-key-commit`)
 *           to the next epoch's keys. FAILS CLOSED: a kahu with no matching held persona stays unseated; a
 *           quorum-short roster establishes no epoch (the antigen stays inert); a chain already ADVANCED past
 *           genesis refuses re-seat (rotate advances it, never a silent re-genesis).
 *   rotate  advance the chain: the operator has provisioned the pre-committed next key-set into the vault;
 *           rotate REVEALS it, verifies its digest matches the head's `nextKeyCommit` (FAIL CLOSED on
 *           mismatch), seats it as the new head, hash-linked to the prior epoch, and pre-commits the
 *           following key-set (`--next-key-commit`). A broken reveal writes nothing.
 *   commit  compute a key-set commitment digest (`charterKeySetHash`) from a comma-separated `--keys` set +
 *           `--threshold`, so the operator produces the `--next-key-commit` value OFFLINE from the next
 *           epoch's verifying keys, holding the next SIGNING seeds in offline custody.
 *   show    the current roster state — seated/unseated kahu, threshold, chain head epoch, quorum verdict.
 *
 * The pre-rotation is the recovery keel: stealing today's council keys cannot forge tomorrow's charter,
 * because each epoch pre-commits a digest of the NEXT epoch's keys before those keys ever sign.
 */

import {
  readNexusCharterDoc, writeNexusCharterDoc, nexusCharterDocPath,
  listPersonaRoots, generateOrLoadPersonaGroupRoot, makeNodePersonaPetnameStore,
  runNexusKapae, runNexusKapaeList, NexusKapaeError,
} from "@lararium/node";
import {
  emptyFoundingCharterDoc, rosterFromCharterDoc, foundingQuorumSeated, charterChainHead,
  ownPersonaPetname, genesisCharterEpoch, rotateCharterEpoch, charterKeySetHash,
  type NexusCharterDoc, type NexusCharterKahu, type CharterEpoch,
} from "@lararium/mesh";
import { larBagsDir, larDataDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class UsageError extends Error {}

function usage(): void {
  console.error("usage: lares nexus <charter | kapae | un_kapae>");
  console.error("");
  console.error("  charter <seat | rotate | commit | show>   the founding-kahu roster + pre-rotated epoch chain");
  console.error("  kapae <nym> [--reason <text>]             raise a quorum-signed ban on a presenter nym");
  console.error("  kapae --list                              read the currently-Kapae'd set (the fold)");
  console.error("  un_kapae <nym>                            mint a quorum-signed lift at a higher version");
}

function charterUsage(): void {
  console.error("usage: lares nexus charter <seat | rotate | commit | show>");
  console.error("");
  console.error("  seat    establish the GENESIS epoch from the held personas' verifying keys (by pet-name)");
  console.error("          + a pre-rotation commitment:  --next-key-commit <digest>");
  console.error("  rotate  reveal the pre-committed next key-set (now in the vault) + advance the chain:");
  console.error("          --next-key-commit <digest-of-the-FOLLOWING-key-set>");
  console.error("  commit  compute a key-set commitment digest:  --keys <k1,k2,...> --threshold <k>");
  console.error("  show    read the current founding-kahu roster + chain head + quorum verdict");
}

export async function cmdNexus(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  switch (verb) {
    case "charter":  return await cmdCharter(args);
    case "kapae":    return await cmdKapae(args);
    case "un_kapae": return await cmdUnKapae(args);
    default:
      if (verb) console.error(`lares nexus: unknown verb "${verb}"`);
      usage();
      return 2;
  }
}

async function cmdCharter(args: ParsedArgs): Promise<number> {
  const sub = args.positional[1];
  try {
    switch (sub) {
      case "seat":   return await charterSeat(args);
      case "rotate": return await charterRotate(args);
      case "commit": return charterCommit(args);
      case "show":   return await charterShow(args);
      default:
        if (sub) console.error(`lares nexus charter: unknown sub-verb "${sub}"`);
        charterUsage();
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof UsageError ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares nexus charter ${sub ?? ""}: ${msg}`) });
    return exitFor(code);
  }
}

/**
 * `lares nexus kapae <nym> [--reason]` raises a quorum-signed ban; `lares nexus kapae --list` folds the
 * current Kapae'd set. FAIL CLOSED: a REFUSAL (unseated charter, sub-quorum, malformed nym) renders as a
 * clean error and writes nothing — main gates every hunk, so the writer never lands a sub-quorum entry.
 */
async function cmdKapae(args: ParsedArgs): Promise<number> {
  if (args.flags["list"]) return await kapaeList(args);
  const nym = args.positional[1];
  if (!nym) {
    console.error("usage: lares nexus kapae <nym> [--reason <text>]   |   lares nexus kapae --list");
    return 2;
  }
  return await kapaeRaise(args, "kapae", nym);
}

async function cmdUnKapae(args: ParsedArgs): Promise<number> {
  const nym = args.positional[1];
  if (!nym) {
    console.error("usage: lares nexus un_kapae <nym>");
    return 2;
  }
  return await kapaeRaise(args, "un_kapae", nym);
}

async function kapaeRaise(args: ParsedArgs, action: "kapae" | "un_kapae", nym: string): Promise<number> {
  const reason = args.options["reason"];
  try {
    const r = await runNexusKapae({ action, nym, ...(reason ? { reason } : {}), bagsDir: larBagsDir() });
    emit(args, {
      ok: true,
      data: {
        action: r.action, nym: r.nym, version: r.version, priorVersion: r.priorVersion,
        charterEpochCid: r.charterEpochCid, threshold: r.threshold, signers: r.signers,
        boardUrl: r.boardUrl, kapaedNow: r.kapaedNow,
      },
      human: () => {
        const verb = action === "kapae" ? "BANNED" : "LIFTED";
        console.log(`nexus ${action} → ${verb} ${nym.slice(0, 16)}… (version ${r.version}${r.priorVersion !== null ? `, superseding ${r.priorVersion}` : ""})`);
        console.log(`  signed by:  ${r.signers.length} of ${r.threshold} required founding-kahu roots`);
        for (const s of r.signers) console.log(`    ${s.slice(0, 16)}…`);
        console.log(`  epoch:      ${r.charterEpochCid}`);
        console.log(`  board:      ${r.boardUrl}`);
        console.log(`  enforced:   ${r.kapaedNow ? "Kapae'd (a presenter under this nym now draws Mu)" : "NOT Kapae'd (a standing lift or higher entry supersedes)"}`);
      },
    });
    return 0;
  } catch (err) {
    const msg  = err instanceof Error ? err.message : String(err);
    const code = err instanceof NexusKapaeError ? "refused" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares nexus ${action}: ${msg}`) });
    return exitFor("error");
  }
}

async function kapaeList(args: ParsedArgs): Promise<number> {
  try {
    const r = await runNexusKapaeList({ bagsDir: larBagsDir() });
    emit(args, {
      ok: true,
      data: {
        charterEpochCid: r.charterEpochCid || null, threshold: r.threshold,
        seatedKeys: r.seatedKeys, kapaed: r.kapaed, entries: r.entries,
      },
      human: () => {
        console.log(`nexus kapae — the antigen board fold:`);
        console.log(`  epoch:      ${r.charterEpochCid || "(unseated — the antigen stays inert)"}`);
        console.log(`  quorum:     ${r.threshold}-of-N · seated keys: ${r.seatedKeys}`);
        console.log(`  Kapae'd (${r.kapaed.length}):`);
        for (const n of r.kapaed) console.log(`    ${n}`);
        if (r.kapaed.length === 0) console.log(`    (none stand banned)`);
        console.log(`  board entries (${r.entries.length}):`);
        for (const e of r.entries) console.log(`    ${e.action.padEnd(8)} v${e.version}  ${e.nym.slice(0, 16)}…  (${e.signers} sig)`);
      },
    });
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "error", message: msg }, human: () => console.error(`lares nexus kapae --list: ${msg}`) });
    return exitFor("error");
  }
}

/** normalize a display/pet-name for matching — trimmed, case-folded (a pet-name is a private human label). */
const norm = (s: string): string => s.trim().toLowerCase();

/** normalize a commitment/key hex — trimmed, lower-cased (the digest surface stays canonical lowercase hex). */
const normHex = (s: string | undefined): string => (s ?? "").trim().toLowerCase();

/**
 * Seat each kahu's verifying key from the vault by PRIVATE pet-name match. FAIL CLOSED: no match keeps the
 * doc's existing key (never invents, never unseats). A verifying key that is not in the vault can never be
 * seated — only vault reads flow in. Returns the updated kahu + the seated verifying keys (the CURRENT
 * key-set: at genesis the founding keys, at rotate the revealed next key-set the operator provisioned).
 */
async function seatKahuFromVault(
  doc: NexusCharterDoc, dataDir: string,
): Promise<{ kahu: NexusCharterKahu[]; seatedKeys: string[] }> {
  const held = await listPersonaRoots(dataDir);
  const petnames = await makeNodePersonaPetnameStore();
  const byPetname = new Map<string, string>();   // normalized pet-name → verifying key hex
  for (const index of held) {
    const petname = await ownPersonaPetname(petnames, index);
    if (!petname) continue;                       // an unnamed persona cannot match a named kahu
    const root = await generateOrLoadPersonaGroupRoot(dataDir, index);   // loads a held root; never mints here
    byPetname.set(norm(petname), root.verifyingKey);
  }
  const kahu: NexusCharterKahu[] = doc.kahu.map((k) => {
    const matched = byPetname.get(norm(k.displayName));
    return { displayName: k.displayName, verifyingKey: matched ?? k.verifyingKey };
  });
  const seatedKeys = kahu.map((k) => k.verifyingKey).filter((v): v is string => typeof v === "string" && v.length > 0);
  return { kahu, seatedKeys };
}

async function charterSeat(args: ParsedArgs): Promise<number> {
  const bagsDir = larBagsDir();
  const dataDir = larDataDir();
  const doc = readNexusCharterDoc(bagsDir) ?? emptyFoundingCharterDoc();

  // FAIL CLOSED: a chain already advanced PAST genesis is never silently re-genesied — a re-seat would
  // strand every antigen entry rooted on a rotated head. The operator advances a live chain via `rotate`.
  if (doc.charterChain && doc.charterChain.length > 1) {
    throw new UsageError("the charter chain has already ROTATED past genesis — advance it with `lares nexus charter rotate`, never re-seat");
  }

  const { kahu, seatedKeys } = await seatKahuFromVault(doc, dataDir);
  const nextKeyCommit = normHex(args.options["next-key-commit"]);

  // Establish the genesis epoch only once a quorum is seatable — below threshold, no epoch roots (inert).
  let charterChain: CharterEpoch[] | undefined;
  let charterEpochCid: string | null = null;
  if (seatedKeys.length >= doc.threshold) {
    const genesis = genesisCharterEpoch(seatedKeys, doc.threshold, nextKeyCommit);
    charterChain = [genesis];
    charterEpochCid = genesis.epochCid;
  }

  const next: NexusCharterDoc = charterChain
    ? { kind: doc.kind, threshold: doc.threshold, charterEpochCid, charterChain, kahu }
    : { kind: doc.kind, threshold: doc.threshold, charterEpochCid, kahu };
  const path = writeNexusCharterDoc(bagsDir, next);
  const quorum = foundingQuorumSeated(next);
  const armed = Boolean(charterChain) && nextKeyCommit.length > 0;

  emit(args, {
    ok: true,
    data: {
      path, threshold: next.threshold, charterEpochCid, quorumSeated: quorum,
      rotationArmed: armed, nextKeyCommit: nextKeyCommit || null,
      kahu: kahu.map((k) => ({ displayName: k.displayName, seated: Boolean(k.verifyingKey), verifyingKey: k.verifyingKey })),
    },
    human: () => {
      console.log(`nexus charter seated (genesis epoch) → ${path}`);
      for (const k of kahu) {
        console.log(`  ${k.verifyingKey ? "seated  " : "UNSEATED"} ${k.displayName}${k.verifyingKey ? `  ${k.verifyingKey.slice(0, 16)}…` : ""}`);
      }
      console.log(`  threshold:  ${next.threshold} of ${kahu.length}`);
      console.log(`  epoch0:     ${charterEpochCid ?? "(unestablished — seat a quorum first)"}`);
      if (quorum) {
        console.log(`  quorum STANDS — the antigen now reads a live roster rooted on the genesis epoch.`);
        console.log(`  rotation:   ${armed ? "ARMED (next key-set pre-committed)" : "UNARMED — supply --next-key-commit <digest> to arm pre-rotation"}`);
      } else {
        const missing = kahu.filter((k) => !k.verifyingKey).map((k) => `"${k.displayName}"`);
        console.log(`  quorum SHORT (fail-closed; the antigen stays inert). Unseated: ${missing.join(", ") || "(none)"}`);
        console.log(`  seat them: lares persona new <index> --name '<displayName>'  →  lares nexus charter seat`);
      }
    },
  });
  return 0;
}

async function charterRotate(args: ParsedArgs): Promise<number> {
  const bagsDir = larBagsDir();
  const dataDir = larDataDir();
  const doc = readNexusCharterDoc(bagsDir);
  const head = charterChainHead(doc);
  if (!doc || !head) {
    throw new UsageError("no genesis charter chain to rotate — establish one with `lares nexus charter seat` first");
  }

  // REVEAL: the operator has provisioned the pre-committed next key-set into the vault; seating from the
  // vault reads it back. The revealed key-set becomes the new head's authorized quorum.
  const { kahu, seatedKeys } = await seatKahuFromVault(doc, dataDir);
  if (seatedKeys.length < doc.threshold) {
    throw new UsageError(`the revealed key-set is short of the ${doc.threshold}-of-${doc.kahu.length} quorum (seated ${seatedKeys.length}) — provision the next personas before rotating`);
  }
  const nextKeyCommit = normHex(args.options["next-key-commit"]);

  // FAIL CLOSED: a revealed key-set whose digest does not match the head's pre-commitment REFUSES, and
  // writes nothing. A stolen current key-set cannot forge a successor it never pre-committed.
  const result = rotateCharterEpoch(head, seatedKeys, doc.threshold, nextKeyCommit);
  if (!result.ok) {
    emit(args, {
      ok: false,
      error: { code: "error", message: `rotation REFUSED (fail-closed): ${result.reason}` },
      human: () => {
        console.error(`nexus charter rotate REFUSED (fail-closed): ${result.reason}`);
        console.error(`  the chain stays at epoch ${head.epoch}; nothing written.`);
      },
    });
    return exitFor("error");
  }

  const charterChain: CharterEpoch[] = [...(doc.charterChain ?? []), result.epoch];
  const charterEpochCid = result.epoch.epochCid;
  const next: NexusCharterDoc = { kind: doc.kind, threshold: doc.threshold, charterEpochCid, charterChain, kahu };
  const path = writeNexusCharterDoc(bagsDir, next);
  const armed = nextKeyCommit.length > 0;

  emit(args, {
    ok: true,
    data: {
      path, epoch: result.epoch.epoch, charterEpochCid, prevEpochCid: result.epoch.prevEpochCid,
      chainDepth: charterChain.length, rotationArmed: armed, nextKeyCommit: nextKeyCommit || null,
      quorumSeated: foundingQuorumSeated(next),
    },
    human: () => {
      console.log(`nexus charter ROTATED → epoch ${result.epoch.epoch} (chain depth ${charterChain.length}) → ${path}`);
      console.log(`  reveal VERIFIED against the prior epoch's pre-commitment.`);
      console.log(`  head epoch: ${charterEpochCid}`);
      console.log(`  prev link:  ${result.epoch.prevEpochCid}`);
      console.log(`  rotation:   ${armed ? "ARMED (next key-set pre-committed)" : "UNARMED — the next rotate refuses until you supply --next-key-commit"}`);
    },
  });
  return 0;
}

function charterCommit(args: ParsedArgs): number {
  const raw = args.options["keys"];
  if (!raw) throw new UsageError("provide the next epoch's verifying keys: --keys <k1,k2,...> [--threshold <k>]");
  const keys = raw.split(",").map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);
  if (keys.length === 0) throw new UsageError("no keys supplied to --keys");
  const thRaw = args.options["threshold"];
  const threshold = thRaw !== undefined ? Number.parseInt(thRaw, 10) : keys.length;
  if (!Number.isInteger(threshold) || threshold < 1) throw new UsageError(`--threshold must be a positive integer (got "${thRaw}")`);
  const digest = charterKeySetHash(keys, threshold);

  emit(args, {
    ok: true,
    data: { digest, keys: keys.length, threshold },
    human: () => {
      console.log(`key-set commitment digest (${keys.length} keys, ${threshold}-of-${keys.length}):`);
      console.log(`  ${digest}`);
      console.log(`  supply it as:  lares nexus charter {seat|rotate} --next-key-commit ${digest}`);
      console.log(`  hold the matching SIGNING seeds in offline custody until the rotate ceremony reveals them.`);
    },
  });
  return 0;
}

async function charterShow(args: ParsedArgs): Promise<number> {
  const bagsDir = larBagsDir();
  const doc = readNexusCharterDoc(bagsDir);
  const roster = rosterFromCharterDoc(doc);
  const quorum = foundingQuorumSeated(doc);
  const head = charterChainHead(doc);
  const chainDepth = doc?.charterChain?.length ?? 0;

  emit(args, {
    ok: true,
    data: {
      path: nexusCharterDocPath(bagsDir),
      present: doc !== null,
      threshold: roster.threshold,
      charterEpochCid: roster.charterEpochCid || null,
      chainDepth,
      rotationArmed: head ? head.nextKeyCommit.length > 0 : false,
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
      console.log(`  chain:      ${chainDepth > 0 ? `${chainDepth} epoch(s), head at seq ${chainDepth - 1}` : "(none — legacy/unestablished)"}`);
      console.log(`  head epoch: ${roster.charterEpochCid || "(unestablished)"}`);
      console.log(`  rotation:   ${head && head.nextKeyCommit.length > 0 ? "ARMED" : "UNARMED"}`);
      console.log(`  quorum:     ${quorum ? "STANDS (roster live)" : "SHORT (fail-closed — antigen inert)"}`);
    },
  });
  return 0;
}
