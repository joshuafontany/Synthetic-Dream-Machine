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
  runNexusContract, runNexusAcceptCarriage, runNexusMembersList, NexusContractError,
  sealReserveMineShare, writeCharterReserveState, readCharterReserveState,
} from "@lararium/node";
import { federationPostureFromDoc, type FederationPosture } from "@lararium/mesh";
import {
  emptyFoundingCharterDoc, rosterFromCharterDoc, foundingQuorumSeated, charterChainHead,
  ownPersonaPetname, genesisCharterEpoch, rotateCharterEpoch, charterKeySetHash,
  generateReserveSeed, deriveReserveKeySet, reserveNextKeyCommit, splitReserveSeed,
  RESERVE_THRESHOLD, RESERVE_KAHU_COUNT, defaultCryptoProvider,
  type NexusCharterDoc, type NexusCharterKahu, type CharterEpoch, type ReserveCard,
} from "@lararium/mesh";
import { larBagsDir, larDataDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class UsageError extends Error {}

function usage(): void {
  console.error("usage: lares nexus <charter | kapae | un_kapae | contract | revoke | members | accept-carriage | posture>");
  console.error("");
  console.error("  charter <seat | rotate | commit | show>   the founding-kahu roster + pre-rotated epoch chain");
  console.error("  kapae <nym> [--reason <text>]             raise a quorum-signed ban on a presenter nym");
  console.error("  kapae --list                              read the currently-Kapae'd set (the fold)");
  console.error("  un_kapae <nym>                            mint a quorum-signed lift at a higher version");
  console.error("  contract <operator-pubkey> [--sig <hex>]  seat a vessel at the CONTRACT cap-tier (quorum + contract-in)");
  console.error("  revoke <operator-pubkey>                  revoke a member (quorum-only)");
  console.error("  members --list                            read the currently-admitted member set (the fold)");
  console.error("  accept-carriage [--index N]               (joining operator) mint the 'accepts carriage' contract-in");
  console.error("  posture [private | open]                  read / flip the cross-Nexus federation posture");
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
  console.error("  reserve [refresh|show]                     custody the pre-rotation's NEXT key-set:");
  console.error("          reserve         forge one reserve seed, derive the 3 next keys HARDENED, print the");
  console.error("                          --next-key-commit + the 3 recovery cards   [--guardian-a --guardian-b]");
  console.error("          reserve refresh re-seed + re-derive + re-issue the cards + print a NEW commit");
  console.error("          reserve show    the reserve state (commit present, guardians, share sealed)");
}

export async function cmdNexus(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  switch (verb) {
    case "charter":         return await cmdCharter(args);
    case "kapae":           return await cmdKapae(args);
    case "un_kapae":        return await cmdUnKapae(args);
    case "contract":        return await cmdContract(args, "admit");
    case "revoke":          return await cmdContract(args, "revoke");
    case "members":         return await cmdMembers(args);
    case "accept-carriage": return await cmdAcceptCarriage(args);
    case "posture":         return await cmdPosture(args);
    default:
      if (verb) console.error(`lares nexus: unknown verb "${verb}"`);
      usage();
      return 2;
  }
}

/**
 * `lares nexus contract <operator-pubkey> [--sig <hex>]` writes a quorum-signed + contract-in admit onto the
 * members board; `lares nexus revoke <operator-pubkey>` writes a quorum-signed revoke. FAIL CLOSED: an unseated
 * charter, sub-quorum, or (for admit) a missing/invalid operator contract-in REFUSES and writes nothing.
 */
async function cmdContract(args: ParsedArgs, action: "admit" | "revoke"): Promise<number> {
  const nym = args.positional[1];
  if (!nym) {
    console.error(`usage: lares nexus ${action === "admit" ? "contract" : action} <operator-pubkey>${action === "admit" ? " [--sig <hex>]" : ""}`);
    return 2;
  }
  try {
    const contractSig = action === "admit" ? (args.options["sig"] ?? args.options["contract"]) : undefined;
    const r = await runNexusContract({ action, nym, ...(contractSig ? { contractSig } : {}), bagsDir: larBagsDir() });
    emit(args, {
      ok: true,
      data: {
        action: r.action, nym: r.nym, version: r.version, priorVersion: r.priorVersion,
        charterEpochCid: r.charterEpochCid, threshold: r.threshold, signers: r.signers,
        contractIn: r.contractIn, boardUrl: r.boardUrl, memberNow: r.memberNow,
      },
      human: () => {
        const verb = action === "admit" ? "ADMITTED" : "REVOKED";
        console.log(`nexus ${action} → ${verb} ${nym.slice(0, 16)}… (version ${r.version}${r.priorVersion !== null ? `, superseding ${r.priorVersion}` : ""})`);
        console.log(`  signed by:   ${r.signers.length} of ${r.threshold} required founding-kahu roots`);
        for (const s of r.signers) console.log(`    ${s.slice(0, 16)}…`);
        if (action === "admit") console.log(`  contract-in: ${r.contractIn === "self" ? "self-signed (held persona)" : "supplied token"}`);
        console.log(`  epoch:       ${r.charterEpochCid}`);
        console.log(`  board:       ${r.boardUrl}`);
        console.log(`  enforced:    ${r.memberNow ? "MEMBER (a cross-operator under this nym co-federates / blind-transits sealed planes)" : "NOT a member (a standing revoke or higher entry supersedes)"}`);
      },
    });
    return 0;
  } catch (err) {
    const msg  = err instanceof Error ? err.message : String(err);
    const code = err instanceof NexusContractError ? "refused" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares nexus ${action}: ${msg}`) });
    return exitFor("error");
  }
}

/** `lares nexus members --list` folds the currently-admitted operator member set off the members board. */
async function cmdMembers(args: ParsedArgs): Promise<number> {
  if (!args.flags["list"]) {
    console.error("usage: lares nexus members --list");
    return 2;
  }
  try {
    const r = await runNexusMembersList({ bagsDir: larBagsDir() });
    emit(args, {
      ok: true,
      data: {
        charterEpochCid: r.charterEpochCid || null, threshold: r.threshold,
        seatedKeys: r.seatedKeys, members: r.members, entries: r.entries,
      },
      human: () => {
        console.log(`nexus members — the members-registry board fold:`);
        console.log(`  epoch:      ${r.charterEpochCid || "(unseated — the registry stays inert)"}`);
        console.log(`  quorum:     ${r.threshold}-of-N · seated keys: ${r.seatedKeys}`);
        console.log(`  members (${r.members.length}):`);
        for (const n of r.members) console.log(`    ${n}`);
        if (r.members.length === 0) console.log(`    (none contracted — the seated kahu remain the floor)`);
        console.log(`  board entries (${r.entries.length}):`);
        for (const e of r.entries) console.log(`    ${e.action.padEnd(6)} v${e.version}  ${e.nym.slice(0, 16)}…  (${e.signers} sig${e.contractIn ? ", contract-in" : ""})`);
      },
    });
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "error", message: msg }, human: () => console.error(`lares nexus members --list: ${msg}`) });
    return exitFor("error");
  }
}

/**
 * `lares nexus accept-carriage [--index N]` — run by the JOINING operator on their OWN vessel: mint the
 * "accepts carriage" contract-in token the kahu supply to `nexus contract --sig <hex>`. The consent-first
 * seal (track contracts, never identities): the operator signs its pubkey + the charter epoch, nothing more.
 */
async function cmdAcceptCarriage(args: ParsedArgs): Promise<number> {
  const idxRaw = args.options["index"];
  const handleIndex = idxRaw !== undefined ? Number.parseInt(idxRaw, 10) : 0;
  if (!Number.isInteger(handleIndex) || handleIndex < 0) {
    console.error(`--index must be a non-negative integer (got "${idxRaw}")`);
    return 2;
  }
  try {
    const r = await runNexusAcceptCarriage({ handleIndex, bagsDir: larBagsDir() });
    emit(args, {
      ok: true,
      data: { nym: r.nym, charterEpochCid: r.charterEpochCid, contractSig: r.contractSig },
      human: () => {
        console.log(`nexus accept-carriage — signed the 'accepts carriage' contract-in (persona index ${handleIndex}):`);
        console.log(`  your nym:     ${r.nym}`);
        console.log(`  epoch:        ${r.charterEpochCid}`);
        console.log(`  contract-sig: ${r.contractSig}`);
        console.log(`  hand this to a founding kahu:  lares nexus contract ${r.nym} --sig ${r.contractSig}`);
      },
    });
    return 0;
  } catch (err) {
    const msg  = err instanceof Error ? err.message : String(err);
    const code = err instanceof NexusContractError ? "refused" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares nexus accept-carriage: ${msg}`) });
    return exitFor("error");
  }
}

/**
 * `lares nexus posture [private | open]` — read or flip the per-Nexus federation posture on the @nexus charter
 * doc. Default PRIVATE (a Nexus develops in isolation); OPEN lets cross-Nexus foreign operators co-federate the
 * PUBLIC planes (never a private plane). No arg reads the current posture.
 */
async function cmdPosture(args: ParsedArgs): Promise<number> {
  const bagsDir = larBagsDir();
  const want = args.positional[1];
  const doc = readNexusCharterDoc(bagsDir);
  if (want === undefined) {
    const posture = federationPostureFromDoc(doc);
    emit(args, {
      ok: true,
      data: { posture, present: doc !== null },
      human: () => {
        console.log(`nexus federation posture: ${posture}${doc ? "" : "  (no charter doc — default)"}`);
        console.log(posture === "private"
          ? `  PRIVATE — cross-Nexus foreign operators are denied co-federation; only same-Nexus members co-federate.`
          : `  OPEN — cross-Nexus foreign operators co-federate the PUBLIC planes (never a private plane).`);
      },
    });
    return 0;
  }
  if (want !== "private" && want !== "open") {
    console.error(`usage: lares nexus posture [private | open]   (got "${want}")`);
    return 2;
  }
  if (!doc) {
    emit(args, { ok: false, error: { code: "refused", message: "no @nexus charter doc — run `lares nexus charter seat` before setting a posture" }, human: () => console.error("lares nexus posture: no charter doc — seat the charter first") });
    return exitFor("error");
  }
  const posture: FederationPosture = want;
  const next = { ...doc, federationPosture: posture };
  const path = writeNexusCharterDoc(bagsDir, next);
  emit(args, {
    ok: true,
    data: { posture, path },
    human: () => {
      console.log(`nexus federation posture → ${posture.toUpperCase()} (written ${path})`);
      console.log(posture === "open"
        ? `  the Nexus now co-federates the PUBLIC planes with cross-Nexus foreign operators (private planes stay sealed).`
        : `  the Nexus keeps to itself — only same-Nexus members co-federate (the fail-closed default).`);
      console.log(`  NOTE: a running node reads the posture as-of-boot; bounce it (or await the refresh hook) to apply a live flip.`);
    },
  });
  return 0;
}

async function cmdCharter(args: ParsedArgs): Promise<number> {
  const sub = args.positional[1];
  try {
    switch (sub) {
      case "seat":    return await charterSeat(args);
      case "rotate":  return await charterRotate(args);
      case "commit":  return charterCommit(args);
      case "show":    return await charterShow(args);
      case "reserve": return await cmdCharterReserve(args);
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
      console.log(`  posture:    ${federationPostureFromDoc(doc)} (cross-Nexus federation — default private)`);
      const reserve = readCharterReserveState();
      console.log(`  reserve:    ${reserve ? `commit ${reserve.nextKeyCommit.slice(0, 16)}… (epoch ${reserve.reserveEpoch}, guardians ${reserve.guardianA ?? "unassigned"}/${reserve.guardianB ?? "unassigned"})` : "(none — run `lares nexus charter reserve` to custody the pre-rotation)"}`);
    },
  });
  return 0;
}

// ── The charter reserve keel — custody the pre-rotation's NEXT key-set ────────────────────────────────
//
// The reserve seed is forged IN MEMORY, derives the three next-epoch kahu keys HARDENED (SLIP-0010, off a
// SEPARATE seed — never the live signing seed), and Shamir-splits 2-of-3 into three cards. The vessel keeps
// only Share 1 ("mine"), SEALED; the seed NEVER lands on disk (zeroized the instant the split returns).

async function cmdCharterReserve(args: ParsedArgs): Promise<number> {
  const op = args.positional[2];
  switch (op) {
    case undefined:
    case "provision": return await charterReserveProvision(args, "provision");
    case "refresh":   return await charterReserveProvision(args, "refresh");
    case "show":      return await charterReserveShow(args);
    default:
      console.error(`lares nexus charter reserve: unknown op "${op}" (expected refresh | show | <none>)`);
      return 2;
  }
}

/** Emit the three cards + the seat instruction — shared by provision and refresh. */
function reserveCardsEmission(
  args: ParsedArgs,
  data: Record<string, unknown>,
  cards: readonly ReserveCard[],
  nextKeyCommit: string,
  humanHead: () => void,
): void {
  emit(args, {
    ok: true,
    data,
    human: () => {
      humanHead();
      console.log(``);
      console.log(`  Place these THREE cards by hand (web3-pure — no cloud/email/API coupling):`);
      for (const c of cards) {
        console.log(`    ── ${c.label} ──`);
        console.log(`       share code:   ${c.shareCode}`);
        console.log(`       confirm:      ${c.confirmPhrase}   (read out-of-band to verify the card)`);
      }
      console.log(``);
      console.log(`  "mine" seals on THIS vessel; a printed/emailed copy of "mine" carries the SAME share —`);
      console.log(`  an operator-full-compromise reveals ONE share → nothing. The two guardian cards recover`);
      console.log(`  WITHOUT you; any TWO of the three rebuild the reserve.`);
      console.log(``);
      console.log(`  Arm the pre-rotation:  lares nexus charter seat --next-key-commit ${nextKeyCommit}`);
    },
  });
}

async function charterReserveProvision(args: ParsedArgs, mode: "provision" | "refresh"): Promise<number> {
  const guardianA = args.options["guardian-a"] ?? null;
  const guardianB = args.options["guardian-b"] ?? null;

  // The reserve epoch advances on refresh; founding provision seats epoch 1. A refresh with no prior state
  // still seats epoch 1 (nothing to advance) — surfaced in the human head below.
  const prior = readCharterReserveState();
  const reserveEpoch = mode === "refresh" ? (prior?.reserveEpoch ?? 0) + 1 : 1;

  // Read the charter chain to name the reconciliation route (below) — this command NEVER mutates the charter.
  const doc = readNexusCharterDoc(larBagsDir());
  const chainDepth = doc?.charterChain?.length ?? 0;

  const rng = defaultCryptoProvider;
  const reserveSeed = generateReserveSeed(rng);
  try {
    const { verifyingKeys } = await deriveReserveKeySet(reserveSeed, reserveEpoch);
    const nextKeyCommit = reserveNextKeyCommit(verifyingKeys);      // charterKeySetHash(3 keys, threshold 2)
    const { cards, mineShare } = splitReserveSeed(reserveSeed, guardianA, guardianB, reserveEpoch, rng);

    // Seal ONLY the "mine" share; record the PUBLIC state (commit + guardians). The seed reaches neither.
    sealReserveMineShare(mineShare);
    writeCharterReserveState({
      reserveEpoch, nextKeyCommit, threshold: RESERVE_THRESHOLD, kahuCount: RESERVE_KAHU_COUNT,
      guardianA, guardianB, mineShareSealed: true, issuedAt: new Date().toISOString(),
    });

    // The refresh reconciliation FORK — named, never auto-resolved (the seated pre-commitment is frozen
    // into its epochCid; a reserve refresh cannot retro-fit a sealed head).
    const reconcile = mode === "provision"
      ? null
      : chainDepth <= 1
        ? "re-commit-before-seal"   // genesis-only (unrotated): re-run `seat --next-key-commit` to re-mint genesis
        : "full-rotation";          // rotated: the CURRENT reserve keys reveal at the pending rotate; this commit arms the FOLLOWING epoch

    reserveCardsEmission(
      args,
      {
        mode, reserveEpoch, nextKeyCommit, threshold: RESERVE_THRESHOLD, kahuCount: RESERVE_KAHU_COUNT,
        guardianA, guardianB, chainDepth, reconcile,
        cards: cards.map((c) => ({ slot: c.slot, label: c.label, custodian: c.custodian, shareCode: c.shareCode, confirmPhrase: c.confirmPhrase })),
      },
      cards,
      nextKeyCommit,
      () => {
        if (mode === "provision") {
          console.log(`nexus charter reserve — forged the pre-rotation's next key-set (reserve epoch ${reserveEpoch}).`);
          console.log(`  the reserve seed lived IN MEMORY only; the vessel keeps one SEALED share, never the seed.`);
        } else {
          console.log(`nexus charter reserve REFRESH — re-seeded + re-derived (reserve epoch ${reserveEpoch}).`);
          console.log(`  new --next-key-commit: ${nextKeyCommit}`);
          if (reconcile === "re-commit-before-seal") {
            console.log(`  RECONCILE (chain depth ${chainDepth}, genesis-only/unrotated): re-run`);
            console.log(`    lares nexus charter seat --next-key-commit ${nextKeyCommit}`);
            console.log(`  — a genesis re-mint is permitted BEFORE the first rotate (the pre-committed keys never signed yet).`);
          } else {
            console.log(`  RECONCILE (chain depth ${chainDepth}, ALREADY rotated): the CURRENT reserve keys must reveal`);
            console.log(`  at the pending \`rotate\` FIRST (a sealed head's pre-commitment is frozen into its epochCid).`);
            console.log(`  This new commit arms the FOLLOWING epoch — supply it at the NEXT:`);
            console.log(`    lares nexus charter rotate --next-key-commit ${nextKeyCommit}`);
          }
        }
      },
    );
    return 0;
  } finally {
    reserveSeed.fill(0);   // the reserve seed never lands on disk, and never lingers past the split
  }
}

async function charterReserveShow(args: ParsedArgs): Promise<number> {
  const state = readCharterReserveState();
  emit(args, {
    ok: true,
    data: state
      ? {
          present: true, reserveEpoch: state.reserveEpoch, nextKeyCommit: state.nextKeyCommit,
          threshold: state.threshold, kahuCount: state.kahuCount,
          guardianA: state.guardianA, guardianB: state.guardianB,
          mineShareSealed: state.mineShareSealed, issuedAt: state.issuedAt,
        }
      : { present: false },
    human: () => {
      if (!state) {
        console.log(`no charter reserve — run \`lares nexus charter reserve\` to custody the pre-rotation's next key-set.`);
        return;
      }
      console.log(`nexus charter reserve:`);
      console.log(`  commit:     ${state.nextKeyCommit}   (${state.threshold}-of-${state.kahuCount})`);
      console.log(`  epoch:      ${state.reserveEpoch}   (issued ${state.issuedAt})`);
      console.log(`  guardians:  A=${state.guardianA ?? "unassigned"}  B=${state.guardianB ?? "unassigned"}`);
      console.log(`  mine share: ${state.mineShareSealed ? "SEALED on this vessel" : "NOT sealed"}`);
      console.log(`  (the seed and the full share-set are NEVER shown — only the public commit + labels)`);
    },
  });
  return 0;
}
