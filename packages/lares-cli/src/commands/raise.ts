/**
 * `lares raise sign <challenge-json> [--as <index>]` — the RECOGNISER's half of the raise ceremony.
 *
 * A vessel standing at the floor emits a challenge. A recognised operator signs it on their OWN machine
 * with their OWN persona root and hands the grant back; the caps that arrive at that vessel ride the
 * recogniser's key, and no key of theirs ever rests on the vessel they raise.
 *
 * ── WHY THIS VERB CARRIES NO `ask` OR `answer` YET, SAID PLAINLY ────────────────────────────────
 * Those two halves belong to the ASKING vessel, and the door that holds them lives in that vessel's
 * running process — a raise is presence, held in memory, never written down. Reaching it from a separate
 * CLI process needs the door registered as a daemon verb, at the `wireVerbs` shore in `open-node-vessel`,
 * which means constructing the door there rather than after the open. That is a boot-path change and it
 * waits for its own pass. Naming a verb here that does not stand would spend a reader's trust the first
 * time they typed it.
 *
 * So: this half runs today and needs no daemon at all. The vessel emits its challenge in its own boot
 * output; hand that text here, hand the grant back.
 */

import { runRaiseSign, RaiseSignError } from "@lararium/node";
import type { ParsedArgs } from "../parse-args.js";
import { emit } from "../render.js";

function usage(): number {
  console.error("usage: lares raise sign <challenge-json> [--as <persona-index>]");
  console.error("  the challenge comes from the vessel being raised; the grant goes back to it.");
  return 2;
}

export async function cmdRaise(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (sub !== "sign") {
    if (sub) console.error(`lares raise: unknown sub-verb "${sub}"`);
    return usage();
  }

  const challengeText = args.positional[1];
  if (!challengeText) return usage();

  // WHICH COMPARTMENT ANSWERS BELONGS TO THE OPERATOR. A human holds several persona roots, and the one
  // that signs is the one whose nym the asking vessel's membership fold admits. Defaulting to 0 names the
  // ordinary case without hiding the choice — `--as` moves it.
  const idxRaw = args.options["as"];
  const handleIndex = idxRaw === undefined ? 0 : Number.parseInt(idxRaw, 10);
  if (!Number.isInteger(handleIndex) || handleIndex < 0) {
    console.error(`--as must be a non-negative integer (got "${idxRaw}")`);
    return 2;
  }

  try {
    const grant = await runRaiseSign({ challengeText, handleIndex });
    emit(args, {
      ok: true,
      data: { challenge: { ...grant.challenge }, byNym: grant.byNym, sig: grant.sig },
      human: () => {
        console.log(`raise sign — signed the challenge as persona ${handleIndex}:`);
        console.log(`  your nym:   ${grant.byNym}`);
        console.log(`  for vessel: ${grant.challenge.vesselId.slice(0, 16)}…`);
        console.log(`  at epoch:   ${grant.challenge.epoch}`);
        console.log(`  hand this grant back to that vessel:`);
        console.log(`    ${JSON.stringify(grant)}`);
        console.log(`  it stands only while that Nexus's lease epoch has not rolled past ${grant.challenge.epoch}.`);
      },
    });
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false,
      error: { code: err instanceof RaiseSignError ? "usage" : "error", message: msg },
      human: () => console.error(`lares raise sign: ${msg}`),
    });
    return 1;
  }
}
