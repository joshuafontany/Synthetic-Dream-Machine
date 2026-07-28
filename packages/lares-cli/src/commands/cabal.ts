/**
 * `lares cabal vouch <joiner-nym> --place <realm-doc-id> [--expires <iso>] [--as <n>]` — the JOIN axis's
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
 */

import { runCabalVouch, CabalVouchError } from "@lararium/node";
import type { ParsedArgs } from "../parse-args.js";

function usage(): number {
  console.error("usage: lares cabal <vouch>");
  console.error("");
  console.error("  vouch <joiner-nym> --place <realm-doc-id> [--expires <iso8601>] [--as <root-index>]");
  console.error("        stake YOUR standing on a joiner crossing into that realm. Dilutes you, admits nobody.");
  return 2;
}

/** `lares cabal …` — the JOIN-axis door. */
export async function cmdCabal(args: ParsedArgs): Promise<number> {
  switch (args.positional[0]) {
    case "vouch": return await cmdVouch(args);
    default:      return usage();
  }
}

async function cmdVouch(args: ParsedArgs): Promise<number> {
  const joiner = args.positional[1];
  const place  = args.options["place"];
  if (!joiner || !place) {
    console.error("usage: lares cabal vouch <joiner-nym> --place <realm-doc-id> [--expires <iso8601>] [--as <root-index>]");
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
      joiner, place,
      ...(args.options["expires"] !== undefined ? { expiresAt: args.options["expires"] } : {}),
      ...(handleIndex !== undefined ? { handleIndex } : {}),
    });
    console.log(r.reMinted ? "RE-VOUCHED (one edge, not two)" : "VOUCHED");
    console.log(`  voucher:   ${r.voucherDid}`);
    console.log(`  joiner:    ${r.joiner}`);
    console.log(`  place:     ${r.place}`);
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
