/**
 * `lares edge {kapae | un-kapae} <edge-id> --epoch <e> [--as <root-index>] [--version <n>]` — set one
 * RELATIONSHIP aside, or take the marker back down.
 *
 * SCOPED UNDER `edge` to mirror `nexus kapae` / `nexus un_kapae`, and to keep them apart. Both acts set
 * something aside and both deserve the word, but they set aside DIFFERENT KINDS of thing: the nexus pair
 * shadows a PRESENTER on the antigen board under a kahu quorum, while this pair shadows one RELATIONSHIP
 * under whichever key holds it. One bare `kapae` covering both would read as a single act with two
 * meanings — the pet-name failure this house keeps catching.
 *
 * The marker rides an EDGE, never a party. Setting a relationship aside says nothing about either end of it:
 * a vessel keeps standing, a face keeps standing, and only THAT relation stops counting. Every comparable
 * system raises its tombstone over a party instead, which is why each needed the whole world to agree.
 *
 * RAISING WINS A TIE; LOWERING TAKES A DELIBERATE HAND. Under partition two peers may disagree and the raised
 * marker holds the merge, so an eviction never quietly reverses when the partition heals. Nothing un-shadows
 * by accident — a lower is its own signed act, and it lands in the record beside the raise it supersedes.
 *
 * THE WRITE ASSERTS NO AUTHORITY. It signs with a named persona root; whether that root holds the edge gets
 * decided by whichever reader consults the shadow. A raise by a root with no claim lands, verifies, and gets
 * dropped everywhere it matters.
 */

import { runEdgeKapae, EdgeKapaeError } from "@lararium/node";
import type { ParsedArgs } from "../parse-args.js";

function usage(): number {
  console.error("usage: lares edge {kapae | un-kapae} <edge-id> --epoch <epoch> [--as <root-index>] [--version <n>]");
  console.error("");
  console.error("  kapae <edge-id>      set the relationship aside (a raised marker wins a tie under partition)");
  console.error("  un-kapae <edge-id>   take the marker back down — a deliberate re-admission, never a fall-through");
  return 2;
}

export async function cmdEdge(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  if (verb !== "kapae" && verb !== "un-kapae") return usage();

  const edgeId = args.positional[1];
  const epoch  = args.options["epoch"];
  if (!edgeId || !epoch) return usage();

  const asRaw = args.options["as"];
  const verRaw = args.options["version"];
  const handleIndex = asRaw === undefined ? undefined : Number(asRaw);
  const version     = verRaw === undefined ? undefined : Number(verRaw);
  if (handleIndex !== undefined && !Number.isInteger(handleIndex)) {
    console.error(`--as expects a persona-root index, got "${asRaw}"`);
    return 2;
  }
  if (version !== undefined && !Number.isInteger(version)) {
    console.error(`--version expects an integer, got "${verRaw}"`);
    return 2;
  }

  try {
    const r = await runEdgeKapae({
      edgeId, epoch, raised: verb === "kapae",
      ...(handleIndex !== undefined ? { handleIndex } : {}),
      ...(version !== undefined ? { version } : {}),
    });
    console.log(r.raised ? "RAISED — the relationship stands aside" : "LOWERED — the relationship stands again");
    console.log(`  edge:     ${r.edgeId}`);
    console.log(`  version:  ${r.version}`);
    console.log(`  epoch:    ${r.epoch}`);
    console.log(`  signer:   ${r.signerDid}`);
    console.log(`  board:    ${r.boardUrl}`);
    // What a reader consulting THIS signer as the edge's authority would now see — never a claim that every
    // reader agrees, since authority gets decided at the fold and this vessel does not get to decide it.
    console.log(`  shadow:   ${r.shadowStands ? "STANDS" : "down"} (as read under this signer)`);
    return 0;
  } catch (err) {
    if (err instanceof EdgeKapaeError) { console.error(`refused: ${err.message}`); return 1; }
    throw err;
  }
}
