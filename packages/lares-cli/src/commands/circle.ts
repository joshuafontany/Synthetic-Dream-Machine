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
 * NEVER A FEDERATED WRITE. This drives `composeFollow` over the circles-backed CircleStore (the FOLLOW-GRAPH
 * daemon verbs — circle-add/circle-remove/circle-list — over the sovereign circles doc) + the LOCAL handle-
 * book (the recogniser's private memory, a 0o600 file under the identity home). The membership rides the circles doc,
 * a PRIVATE bag the self-slot FLEET-syncs same-operator (a follow lands on ALL the operator's own devices) and
 * NEVER federates to a stranger. No board, announce, or crossroads shore is reachable here, so a follow leaves
 * NO central trace. Publishing a public glamour stays a SEPARATE, deliberate act (`lares persona` + a who-face
 * publish), never fired here. The default circle is `following` (the primary system circle seedCirclesDoc plants).
 *
 * Fail-closed: following an UNMET nym with no `--card` REFUSES (you cannot name-into-a-circle a handle you
 * have never met) — carry its self-certifying HandleCard to admit it first. Recognition stays CLIENT-side
 * (the local handle-book) ahead of the circles membership write; the handle-book co-move is the open fork.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import { readFileSync } from "node:fs";
import {
  composeFollow, composeUnfollow, listFollows, FollowRefused,
  parseHandleCardCarriage,
  type HandleCard,
} from "@lararium/mesh";
import { loadNodeHandleBook, saveNodeHandleBook } from "@lararium/node";
import { makeDaemonCircleStore } from "../daemon-circle-store.js";
import { vesselDid } from "../env.js";
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
  console.error("  card <carriage | @file | -> seed the handle-book from a carried HandleCard (paste / QR /");
  console.error("                              #card=… fragment / stdin) — TOFU-admit a nym so a later `add`");
  console.error("                              needs no --card");
  console.error("  remove <nym> --to <circle>  unfollow: drop the nym from the circle");
  console.error("  list [--to <circle>]        the private follow-view (petname + last-seen glamour)");
  console.error("");
  console.error(`  the graph is PRIVATE and NEVER federates; default circle = "${DEFAULT_CIRCLE}".`);
  console.error("  an unmet nym needs its self-certifying HandleCard admitted first — either `circle card <paste>`");
  console.error("  (ahead of time) or `add … --card <file.json>` (inline).");
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
      case "card":   return await circleCard(args);
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

  const circles = makeDaemonCircleStore(await vesselDid());
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
      console.log(`  the follow is PRIVATE and LOCAL — nothing reached the crossroads plane (no central trace).`);
      if (!result.petname) console.log(`  name it for yourself with --petname '<label>' (private; never federates).`);
    },
  });
  return 0;
}

/** Read the carriage argument for `circle card`: a bare string, `@<path>` (a file), or `-` (stdin). The bytes
 *  ride verbatim to the decoder, which shapes them; the handle-book verifies. WITHHOLD-not-forge: a read fault
 *  reads as a usage error, never a crash. */
function readCarriageArg(raw: string): string {
  if (raw === "-") {
    try { return readFileSync(0, "utf8"); }   // fd 0 = stdin (a piped paste)
    catch (err) { throw new UsageError(`cannot read the carriage from stdin: ${err instanceof Error ? err.message : String(err)}`); }
  }
  if (raw.startsWith("@")) {
    const path = raw.slice(1);
    try { return readFileSync(path, "utf8"); }
    catch (err) { throw new UsageError(`cannot read the carriage file "${path}": ${err instanceof Error ? err.message : String(err)}`); }
  }
  return raw;
}

/**
 * `lares circle card <carriage | @file | ->` — the CARD-ARRIVAL front door. Decode a carried, self-certifying
 * HandleCard (a paste, a QR scan, a `#card=…` URL fragment, or stdin) and INGEST it into the local handle-book
 * (TOFU / monotone reader rule). A pure LOCAL recognition write — nothing crosses the wire. Afterward the nym is
 * KNOWN, so `lares circle add <nym> --to <circle>` follows it WITHOUT carrying `--card`.
 *
 * Fail-closed: a garbled / absent / wrong-domain carriage refuses (the card did not arrive — re-carry it); a card
 * whose signature or lineage the book rejects refuses with the book's named verdict. Neither ever half-admits.
 */
async function circleCard(args: ParsedArgs): Promise<number> {
  const raw = args.positional[1];
  if (!raw) throw new UsageError("a carriage is required (e.g. `lares circle card '#card=<base64url>'`, `@card.txt`, or `-` for stdin)");
  const card = parseHandleCardCarriage(readCarriageArg(raw));
  if (!card) throw new UsageError("no self-certifying HandleCard in the carriage — the card did not arrive (re-carry a `#card=<base64url>` token).");

  const book    = loadNodeHandleBook();
  const verdict = await book.ingest(card);
  if (!verdict.ok) throw new UsageError(`handle-card refused (${verdict.reject}) — the book holds this nym to its own lineage (anti-rollback / anti-fork).`);
  saveNodeHandleBook(book);   // persist the recogniser's memory — the nym is now known, ready to follow

  const rec = book.get(card.nym);
  emit(args, {
    ok: true,
    data: { nym: card.nym, version: card.version, glamour: card.glamour ?? null, petname: rec?.petname ?? null, recognized: true },
    human: () => {
      console.log(`admitted ${card.glamour ? `"${card.glamour}" ` : ""}${card.nym.slice(0, 16)}… into the handle-book (v${card.version}, TOFU).`);
      console.log(`  now follow it locally:  lares circle add ${card.nym} --to ${DEFAULT_CIRCLE}`);
      console.log(`  the admission is PRIVATE and LOCAL — nothing reached the wire.`);
    },
  });
  return 0;
}

async function circleRemove(args: ParsedArgs): Promise<number> {
  const nym = args.positional[1];
  if (!nym) throw new UsageError("a nym is required (e.g. `lares circle remove <verifying-key-hex> --to following`)");
  const circleId = circleOf(args);
  const result = await composeUnfollow({ circles: makeDaemonCircleStore(await vesselDid()), nym, circleId });
  emit(args, {
    ok: true,
    data: { nym: result.nym, circle: result.circleId, federated: result.federated },
    human: () => console.log(`unfollowed ${nym.slice(0, 16)}… from circle "${result.circleId}" (local; no trace).`),
  });
  return 0;
}

async function circleList(args: ParsedArgs): Promise<number> {
  const circles = makeDaemonCircleStore(await vesselDid());
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
