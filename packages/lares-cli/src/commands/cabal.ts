/**
 * `lares cabal <vouch | feed | clock>` — the three doors onto a cabal-realm: stake standing on a joiner, make
 * the offering that keeps a realm alive, and read who feeds it.
 *
 * `vouch <joiner-nym> --realm <realm-doc-id> [--expires <iso>] [--as <n>]` — the JOIN axis's
 * write side: one held face stakes its OWN standing on one joiner, onto the Nexus vouch board.
 *
 * THE CONTRAST WITH `nexus contract`. Contracting a vessel into carriage needs the kahu quorum AND the
 * joiner's own consent — a Nexus may not conscript, and no single kahu seats a carrier alone. A vouch runs the
 * other axis entirely: ONE hand, its OWN standing, no steward asked. The two relations run orthogonal — a
 * human may contract without joining, join without contracting, hold both, or neither.
 *
 * IT ADMITS NOBODY. A vouch rides as signal-2 on the lineage and grants nothing by itself; the crossing prices it
 * later. The vouching itself already paid the cost: the voucher's score SPLITS across everyone they
 * vouch for, so each vouch dilutes the hand that made it. That carries the whole payment, and it needs no ledger.
 *
 * `feed --realm <id> [--as <n>]` — THE OFFERING. A realm lives by being fed: members roll a per-realm lease
 * epoch, one slot per writer, and the realm's liveness reads off that max-register. A FACE feeds, never a
 * device, so adding vessels never inflates a standing. Feeding twice rolls twice — the clock measures how hard
 * each hand feeds, so a repeated offering SHOULD register.
 *
 * `clock --realm <id>` — THE CAPTURE-CLOCK, and it surfaces rather than judges. It reports who feeds and how
 * deep, the spread between leaders and trailers, and how many sit at the leading edge — raw numbers, no
 * "captured" verdict. A minority out-feeding a realm becomes VISIBLE while exit still costs little, which is
 * the whole answer available here: sight plus fork-as-exit, never a gate. The gate would become the captured
 * object.
 *
 * WHAT THE NUMBERS CANNOT SAY. Both verbs read what THIS REPLICA has synced. A maintainer whose roll has not
 * arrived reads as absent, and a realm nobody here has synced reads as unfed — under no-global-now those two
 * generate identically, so the reading names a local sighting and never a total.
 */

import { realmStanding } from "@lararium/mesh";
import { runCabalVouch, CabalVouchError, runCabalJoin, CabalJoinError, loadPersonaGroupRootVerifyingKey, listPersonaRoots } from "@lararium/node";
import type { ParsedArgs } from "../parse-args.js";
import { larDataDir, vesselDid } from "../env.js";
import { runVerb } from "../verb-call.js";
import { summaryOutput } from "../verb-result.js";
import { emit, exitFor } from "../render.js";

function usage(): number {
  console.error("usage: lares cabal <vouch | join | feed | clock>");
  console.error("");
  console.error("  vouch <joiner-nym> --realm <realm-doc-id> [--expires <iso8601>] [--as <root-index>]");
  console.error("        stake YOUR standing on a joiner crossing into that realm. Dilutes you, admits nobody.");
  console.error("  join --realm <realm-doc-id> [--as <root-index>] [--cap <n>]");
  console.error("        PRESENT and cross. Reads the lineage, prices it, writes nothing either way.");
  console.error("  feed --realm <realm-doc-id> [--as <root-index>]");
  console.error("        the OFFERING — roll your face's lease slot, keeping the realm alive.");
  console.error("  clock --realm <realm-doc-id>");
  console.error("        who feeds this realm and how deep — raw numbers, no capture verdict.");
  return 2;
}

/** `lares cabal …` — the realm doors: the JOIN axis, the offering, and the clock. */
export async function cmdCabal(args: ParsedArgs): Promise<number> {
  switch (args.positional[0]) {
    case "vouch": return await cmdVouch(args);
    case "join":  return await cmdJoin(args);
    case "feed":  return await cmdFeed(args);
    case "clock": return await cmdClock(args);
    default:      return usage();
  }
}

class CabalUsageError extends Error {}

/** The realm doc id, fail-closed — a stray value never becomes a lease prefix. */
function realmOf(args: ParsedArgs): string {
  const realm = (args.options["realm"] ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(realm)) {
    throw new CabalUsageError("--realm expects a 64-hex cabal-realm doc id");
  }
  return realm;
}

/**
 * WHICH FACE ACTS — the persona root the operator named, or the first held one.
 *
 * A realm is fed by a face, so the writer resolves from a root this vessel HOLDS and never from a value the
 * caller typed. Naming a root the vault does not custody refuses here rather than writing a slot under a face
 * nobody can stand behind.
 */
async function actingFace(args: ParsedArgs): Promise<string> {
  const dataDir = larDataDir();
  const held = await listPersonaRoots(dataDir);
  if (held.length === 0) {
    throw new CabalUsageError("no persona root held on this vessel — a realm is fed by a face, and this vessel holds none.");
  }
  const asRaw = args.options["as"];
  const index = asRaw === undefined ? held[0]! : Number(asRaw);
  if (!Number.isInteger(index)) throw new CabalUsageError(`--as expects a persona-root index, got "${asRaw}"`);
  if (!held.includes(index)) throw new CabalUsageError(`persona root ${index} is not held here (held: ${held.join(", ")}).`);
  const did = await loadPersonaGroupRootVerifyingKey(dataDir, index);
  if (!did) throw new CabalUsageError(`persona root ${index} surfaces no usable verifying key — nothing to feed with.`);
  return did.toLowerCase();
}

/** Drive one realm verb through the daemon, surfacing its refusal as itself. */
async function realmVerb(verb: string, verbArgs: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await runVerb(verb, verbArgs, await vesselDid());
  if (r.status === "error") throw new Error(r.errorMessage ?? `${verb} failed`);
  return summaryOutput(r) ?? {};
}

/**
 * `lares cabal feed` — make the offering. The realm's liveness rides a max-register, so this rolls only THIS
 * face's own slot; two members feeding concurrently never clobber each other.
 */
async function cmdFeed(args: ParsedArgs): Promise<number> {
  try {
    const realm  = realmOf(args);
    const writer = await actingFace(args);
    const out = await realmVerb("realm-feed", { realm, writer });
    emit(args, {
      ok: true,
      data: out,
      human: () => {
        console.log(out["first"] === true ? "FED (your first offering to this realm)" : "FED");
        console.log(`  realm:  ${realm}`);
        console.log(`  face:   ${writer}`);
        console.log(`  epoch:  ${out["priorEffective"]} -> ${out["epoch"]}`);
        console.log(`  (the roll counts the slots THIS replica has synced — a peer may hold deeper ones)`);
      },
    });
    return 0;
  } catch (err) {
    return cabalFailure(args, "feed", err);
  }
}

/**
 * `lares cabal clock` — read who feeds the realm. It hands back numbers and draws no conclusion: what spread
 * or concentration counts as capture stays the operator's calibration.
 */
async function cmdClock(args: ParsedArgs): Promise<number> {
  try {
    const realm = realmOf(args);
    const out = await realmVerb("realm-clock", { realm });
    const maintainers = Array.isArray(out["maintainers"])
      ? (out["maintainers"] as Array<{ writerId: string; epoch: number }>) : [];
    // THE STANDING SITS BESIDE THE CLOCK, NEVER INSIDE IT. The clock stays verdict-free by
    // construction — a verdict baked into that read would become the captured object. This is a
    // separate reading over the same slots, and it says only what the model constitutes: one locus
    // feeding is a VISIT, two opposed firings are BELONGING. It decides nothing about capture.
    const standing = realmStanding(maintainers.map((m) => ({ writer: m.writerId, epoch: m.epoch })));
    emit(args, {
      ok: true,
      data: { ...out, standing },
      human: () => {
        console.log(`realm ${realm}`);
        if (maintainers.length === 0) {
          console.log("  nobody feeds it here — which reads the same as a realm this replica has never synced.");
          return;
        }
        console.log(`  maintainers: ${out["maintainerCount"]}   effective epoch: ${out["effectiveEpoch"]}`);
        console.log(`  spread:      ${out["spread"]} (leaders ${out["leadingCount"]} at the edge, trailing at ${out["trailingEpoch"]})`);
        for (const m of maintainers) console.log(`    ${String(m.epoch).padStart(6)}  ${m.writerId}`);
        console.log(`  standing:    ${standing.standing.toUpperCase()} — ${standing.reading}`);
        console.log("  no CAPTURE verdict rides here — what these numbers mean stays your calibration.");
      },
    });
    return 0;
  } catch (err) {
    return cabalFailure(args, "clock", err);
  }
}

function cabalFailure(args: ParsedArgs, verb: string, err: unknown): number {
  const msg  = err instanceof Error ? err.message : String(err);
  const code = err instanceof CabalUsageError ? "usage" : "error";
  emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares cabal ${verb}: ${msg}`) });
  return exitFor(code);
}

async function cmdVouch(args: ParsedArgs): Promise<number> {
  const joiner = args.positional[1];
  const realm  = args.options["realm"];
  if (!joiner || !realm) {
    console.error("usage: lares cabal vouch <joiner-nym> --realm <realm-doc-id> [--expires <iso8601>] [--as <root-index>]");
    return 2;
  }
  const asRaw = args.options["as"];
  const handleIndex = asRaw === undefined ? undefined : Number(asRaw);
  if (handleIndex !== undefined && !Number.isInteger(handleIndex)) {
    console.error(`--as expects a persona-root index, got "${asRaw}"`);
    return 2;
  }

  try {
    const r = await runCabalVouch({
      joiner, realm,
      ...(args.options["expires"] !== undefined ? { expiresAt: args.options["expires"] } : {}),
      ...(handleIndex !== undefined ? { handleIndex } : {}),
    });
    console.log(r.reMinted ? "RE-VOUCHED (one edge, not two)" : "VOUCHED");
    console.log(`  voucher:   ${r.voucherDid}`);
    console.log(`  joiner:    ${r.joiner}`);
    console.log(`  realm:     ${r.realm}`);
    console.log(`  expires:   ${r.expiresAt}`);
    console.log(`  board:     ${r.boardUrl}`);
    // The number that matters to the voucher — stated as a FLOOR, because it counts what this replica has
    // synced. A peer may hold edges we have not seen, so real dilution reads at or above this.
    console.log(`  out-degree: at least ${r.outDegreeFloor}  (this replica sees your standing split ${r.outDegreeFloor} way${r.outDegreeFloor === 1 ? "" : "s"} — a peer may hold more)`);
    return 0;
  } catch (err) {
    if (err instanceof CabalVouchError) { console.error(`refused: ${err.message}`); return 1; }
    throw err;
  }
}

/** `lares cabal join` — the applicant's half. Reads only; a refusal anergizes and bans nobody. */
async function cmdJoin(args: ParsedArgs): Promise<number> {
  try {
    const realm = realmOf(args);
    // Names a face outright, else this vessel's acting one — a steward reads a crossing for a face
    // they do not hold.
    const applicant = (args.options["applicant"] ?? await actingFace(args)).trim().toLowerCase();
    const capRaw = args.options["cap"];
    const cap = capRaw === undefined ? undefined : Number(capRaw);
    if (cap !== undefined && !Number.isInteger(cap)) {
      throw new CabalUsageError(`--cap expects an integer out-degree ceiling, got "${capRaw}"`);
    }

    const v = await runCabalJoin({
      realm, applicant,
      ...(cap !== undefined ? { maxVouchesPerVoucher: cap } : {}),
    });

    emit(args, {
      ok: true,
      data: { admitted: v.admitted, refusal: v.refusal, voucherDid: v.voucherDid, capped: v.capped.length },
      human: () => {
        if (v.admitted) {
          console.log("ADMITTED");
          console.log(`  applicant: ${applicant}`);
          console.log(`  realm:     ${realm}`);
          console.log(`  voucher:   ${v.voucherDid}  (the hand the co-pay falls on)`);
        } else {
          console.log(`REFUSED — ${v.refusal}`);
          console.log(`  applicant: ${applicant}`);
          console.log(`  realm:     ${realm}`);
          console.log("  nothing was written; the applicant stands where it stood.");
        }
        // The fold's budget, stated rather than trusted.
        if (v.capped.length > 0) console.log(`  capped:    ${v.capped.length} edge(s) the per-voucher choke turned away`);
      },
    });
    return v.admitted ? 0 : 1;
  } catch (err) {
    return cabalFailure(args, "join", err);
  }
}
