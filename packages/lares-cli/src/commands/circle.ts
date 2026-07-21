/**
 * `lares circle {add <nym> --to <circle> | remove <nym> --to <circle> | list [--to <circle>]}` — the FOLLOW
 * VERB, the operator's door to the INVERSION-OF-CONTROL social graph. "Adding to a circle IS the follow"
 * (social-seed): this command edits the LOCAL private graph and NOTHING crosses the wire.
 *
 *   add <nym> --to <circle> [--petname <label>] [--card <file>]
 *                        recognise the nym (already-known, or TOFU-admit a carried self-certifying card),
 *                        optionally set its PRIVATE local label, and add it to the circle — one gesture over
 *                        the three LOCAL stores (handle-book · petname · circle).
 *   remove <nym> --to <circle>   drop the nym from the circle (unfollow; the handle-book memory stays).
 *   list [--to <circle>]         the private follow-view — nyms under the recogniser's OWN names (petname +
 *                                last-seen glamour). No --to lists every circle.
 *
 * NEVER A FEDERATED WRITE. This drives `composeFollow` over the node-fs CircleStore + handle-book — both
 * private files under the identity home, 0o600. No board, announce, or @crossroads seam is reachable here, so
 * a follow leaves NO central trace. Publishing a public glamour stays a SEPARATE, deliberate act (`lares
 * persona` + a who-face publish), never fired here. The default circle is `following` (the primary system
 * circle seedCirclesDoc plants).
 *
 * Fail-closed: following an UNMET nym with no `--card` REFUSES (you cannot name-into-a-circle a handle you
 * have never met) — carry its self-certifying HandleCard to admit it first.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import { readFileSync } from "node:fs";
import {
  composeFollow, composeUnfollow, listFollows, FollowRefused,
  type HandleCard,
} from "@lararium/mesh";
import { makeNodeCircleStore, loadNodeHandleBook, saveNodeHandleBook } from "@lararium/node";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class UsageError extends Error {}

/** The system circles seedCirclesDoc plants — the follow lands in one of these unless the operator names another. */
const DEFAULT_CIRCLE = "following";

function usage(): void {
  console.error("usage: lares circle <add <nym> --to <circle> | remove <nym> --to <circle> | list [--to <circle>]>");
  console.error("");
  console.error("  add <nym> --to <circle> [--petname <label>] [--card <file.json>]");
  console.error("                              follow: recognise the nym + add it to the circle (LOCAL only)");
  console.error("  remove <nym> --to <circle>  unfollow: drop the nym from the circle");
  console.error("  list [--to <circle>]        the private follow-view (petname + last-seen glamour)");
  console.error("");
  console.error(`  the graph is PRIVATE and NEVER federates; default circle = "${DEFAULT_CIRCLE}".`);
  console.error("  an unmet nym needs --card <file.json> (its self-certifying HandleCard) to admit it (TOFU).");
}

/** Read the `--to <circle>` option, defaulting to the primary follow circle. */
function circleOf(args: ParsedArgs): string {
  const to = typeof args.options["to"] === "string" ? args.options["to"].trim() : "";
  return to.length > 0 ? to : DEFAULT_CIRCLE;
}

/** Load + parse a carried HandleCard JSON file — the self-certifying card that TOFU-admits an unmet nym. */
function readCardFile(path: string): HandleCard {
  let raw: string;
  try { raw = readFileSync(path, "utf8"); }
  catch (err) { throw new UsageError(`cannot read --card file "${path}": ${err instanceof Error ? err.message : String(err)}`); }
  try { return JSON.parse(raw) as HandleCard; }
  catch { throw new UsageError(`--card file "${path}" is not valid JSON`); }
}

export async function cmdCircle(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub) { usage(); return 2; }
  try {
    switch (sub) {
      case "add":    return await circleAdd(args);
      case "remove": return await circleRemove(args);
      case "list":   return await circleList(args);
      default:
        console.error(`lares circle: unknown sub-verb "${sub}"`);
        usage();
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err instanceof UsageError) ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares circle ${sub}: ${msg}`) });
    return exitFor(code);
  }
}

async function circleAdd(args: ParsedArgs): Promise<number> {
  const nym = args.positional[1];
  if (!nym) throw new UsageError("a nym is required (e.g. `lares circle add <verifying-key-hex> --to following`)");
  const circleId = circleOf(args);
  const petname  = typeof args.options["petname"] === "string" ? args.options["petname"].trim() : undefined;
  const cardPath = typeof args.options["card"] === "string" ? args.options["card"] : undefined;
  const card     = cardPath ? readCardFile(cardPath) : undefined;

  const circles = makeNodeCircleStore();
  const book    = loadNodeHandleBook();

  let result;
  try {
    result = await composeFollow({
      book, circles, nym, circleId,
      ...(petname && petname.length > 0 ? { petname } : {}),
      ...(card ? { card } : {}),
    });
  } catch (err) {
    if (err instanceof FollowRefused) throw new UsageError(err.message);   // fail-closed → clean usage error
    throw err;
  }
  saveNodeHandleBook(book);   // persist the recogniser's memory (a card ingest / petname landed on it)

  emit(args, {
    ok: true,
    data: { nym: result.nym, circle: result.circleId, recognized: result.recognized, petname: result.petname, federated: result.federated },
    human: () => {
      console.log(`followed ${result.petname ? `"${result.petname}"` : nym.slice(0, 16) + "…"} into circle "${result.circleId}".`);
      console.log(`  the follow is PRIVATE and LOCAL — nothing reached @crossroads (no central trace).`);
      if (!result.petname) console.log(`  name it for yourself with --petname '<label>' (private; never federates).`);
    },
  });
  return 0;
}

async function circleRemove(args: ParsedArgs): Promise<number> {
  const nym = args.positional[1];
  if (!nym) throw new UsageError("a nym is required (e.g. `lares circle remove <verifying-key-hex> --to following`)");
  const circleId = circleOf(args);
  const result = await composeUnfollow({ circles: makeNodeCircleStore(), nym, circleId });
  emit(args, {
    ok: true,
    data: { nym: result.nym, circle: result.circleId, federated: result.federated },
    human: () => console.log(`unfollowed ${nym.slice(0, 16)}… from circle "${result.circleId}" (local; no trace).`),
  });
  return 0;
}

async function circleList(args: ParsedArgs): Promise<number> {
  const circles = makeNodeCircleStore();
  const book    = loadNodeHandleBook();
  const to      = typeof args.options["to"] === "string" ? args.options["to"].trim() : "";
  const circleIds = to.length > 0 ? [to] : [...await circles.circles()];

  const rows = await Promise.all(
    circleIds.map(async (circleId) => ({ circleId, follows: await listFollows(book, circles, circleId) })),
  );

  emit(args, {
    ok: true,
    data: { circles: rows },
    human: () => {
      if (rows.length === 0 || rows.every((r) => r.follows.length === 0)) {
        console.log("no follows yet — add one with `lares circle add <nym> --card <card.json> --to following`.");
        return;
      }
      for (const { circleId, follows } of rows) {
        console.log(`circle "${circleId}" (${follows.length}):`);
        for (const f of follows) {
          console.log(`  ${f.petname ?? "(unnamed)"}  ${f.glamour ? `~ "${f.glamour}"` : ""}  ${f.nym.slice(0, 16)}…`);
        }
      }
      console.log("  (the follow-graph is PRIVATE; only a glamour you deliberately publish ever federates.)");
    },
  });
  return 0;
}
