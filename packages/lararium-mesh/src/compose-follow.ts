/**
 * compose-follow — the ONE gesture that composes the three LOCAL identity stores into a follow.
 *
 * "Adding to a circle IS the follow" (social-seed). A follow reaches for THREE local stores and NEVER a
 * board: it RECOGNISES a nym in the handle-book (TOFU — the recogniser's private memory of others' keys),
 * optionally SETS the recogniser's private label for it (the local petname, per-nym, never on the wire), and
 * ADDS the nym to a circle (the IoC social graph, private to the owning node). All three writes land locally;
 * NOTHING crosses to @crossroads. The ONLY federated surface a human ever presents stays the glamour they
 * DELIBERATELY publish (who-face / handle-announce) — a separate, conscious act this module never performs.
 *
 * NEVER-FEDERATES, STRUCTURALLY. The proof is not a runtime check but the SHAPE of the seams: composeFollow
 * consumes a HandleBook (pure, I/O-free, holds no key and touches no network) and a `CircleStore` (a LOCAL
 * membership store — node-fs / IDB / a future PRIVATE-bag adapter). No board, announce, or @crossroads seam
 * is injectable here, so no follow can reach the wire. `FollowResult.federated` reads the literal `false` —
 * the type says the follow left no central trace. A user leaves no roster entry; the graph stays home.
 *
 * FAIL-CLOSED on recognition. A follow of an UNKNOWN nym with no card to admit it REFUSES (a designation must
 * carry its authority — you cannot name-into-a-circle a handle you have never met). Carry a self-certifying
 * HandleCard to TOFU-admit the nym first; a garbled card draws the book's named verdict, never a silent add.
 *
 * Platform-blind: rides ./handle-book + ./handle-card only. NO node: imports — the CLI and the browser both
 * consume this, each supplying its own local CircleStore adapter.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import type { HandleBook } from "./handle-book.js";
import type { HandleCard, CardVerdict } from "./handle-card.js";

/**
 * A vessel's LOCAL circle-membership store — the IoC social graph's persistence seam. "Adding to a circle IS
 * the follow", so the graph lives HERE and never federates: a node-fs JSON file, an IDB store, or a future
 * PRIVATE-bag adapter, all private to the owning node. The interface holds ONLY local reads/writes — no board
 * write exists on it, which is the never-federates wall made structural (mirroring persona-petname's seam).
 */
export interface CircleStore {
  /** Add a nym to a circle — the follow. Idempotent (a re-add is a no-op). LOCAL only. */
  add(circleId: string, nym: string): Promise<void> | void;
  /** Remove a nym from a circle — the unfollow (kāpae, remove-wins). LOCAL only. */
  remove(circleId: string, nym: string): Promise<void> | void;
  /** The nyms currently in a circle, ascending — the recogniser's private membership. */
  members(circleId: string): Promise<readonly string[]> | readonly string[];
  /** Every circle id this store knows a membership for — the private graph's shape. */
  circles(): Promise<readonly string[]> | readonly string[];
}

/** The outcome of one follow — a follow leaves this, and NOTHING on any board. */
export interface FollowResult {
  /** The nym followed — the other's verifying key (hex). */
  readonly nym:        string;
  /** The circle the nym landed in. */
  readonly circleId:   string;
  /** True → the handle-book already knew this nym, or a carried card admitted it (TOFU). */
  readonly recognized: boolean;
  /** The recogniser's PRIVATE local label for this nym, or null when unnamed. Never leaves the vessel. */
  readonly petname:    string | null;
  /**
   * The never-federates proof at the type level: a follow ALWAYS reads `false`. Nothing composeFollow touches
   * can reach the wire — the literal type says so, so a reader cannot mistake a follow for a publish.
   */
  readonly federated:  false;
}

/** One nym in a circle, read back under the recogniser's OWN names — the "who I follow, under my own names" view. */
export interface FollowView {
  readonly nym:      string;
  /** The recogniser's PRIVATE label for the nym, or null when unnamed. Local only. */
  readonly petname:  string | null;
  /** The nym's own published glamour AS THIS VESSEL LAST SAW IT (from the local handle-book), or null. */
  readonly glamour:  string | null;
}

/** A named refusal a follow may hit — fail-closed, never a silent add. */
export class FollowRefused extends Error {
  constructor(
    readonly reason: "unknown-nym" | "card-rejected",
    message: string,
    /** Present when a carried card drew a book verdict — the book's own reason. */
    readonly verdict?: CardVerdict,
  ) {
    super(message);
    this.name = "FollowRefused";
  }
}

/**
 * composeFollow — the IoC graph edit. Compose the three LOCAL stores into one follow:
 *   1. RECOGNISE — if a self-certifying card is carried, TOFU-admit the nym through the handle-book (a bad
 *      card draws a named verdict and REFUSES); else require the nym already known (fail-closed).
 *   2. LABEL (optional) — set the recogniser's PRIVATE petname for the nym in the handle-book. Local only.
 *   3. FOLLOW — add the nym to the circle in the LOCAL CircleStore. "Adding to a circle IS the follow".
 *
 * Every write lands locally; the function reaches no board, so a follow leaves NO central trace. Returns the
 * FollowResult (federated:false) — the deliberate glamour publish stays a separate act this never performs.
 */
export async function composeFollow(args: {
  readonly book:     HandleBook;
  readonly circles:  CircleStore;
  readonly nym:      string;
  readonly circleId: string;
  /** Optional private label to attach to the nym in the handle-book (never federated). */
  readonly petname?: string | null;
  /** A self-certifying HandleCard to TOFU-admit an unmet nym. Absent → the nym must already be known. */
  readonly card?:    HandleCard;
  /** Clock for the card's lease check (the book reads it against the LOCAL now). */
  readonly now?:     number;
}): Promise<FollowResult> {
  const { book, circles, nym, circleId } = args;

  // 1. RECOGNISE. A carried card runs through the book's TOFU/monotone rule; a rejection fails closed.
  let recognized = book.get(nym) !== undefined;
  if (args.card) {
    if (args.card.nym !== nym) {
      throw new FollowRefused("card-rejected", `follow: card names ${args.card.nym.slice(0, 12)}…, not the followed nym`);
    }
    const verdict = await book.ingest(args.card, args.now);
    if (!verdict.ok) {
      throw new FollowRefused("card-rejected", `follow: handle-card refused (${verdict.reject})`, verdict);
    }
    recognized = true;
  }
  if (!recognized) {
    throw new FollowRefused(
      "unknown-nym",
      `follow: nym ${nym.slice(0, 12)}… is unknown — carry a self-certifying HandleCard to admit it (TOFU) before following`,
    );
  }

  // 2. LABEL (optional). The private petname rides the handle-book, per-nym, and never on the wire.
  if (args.petname !== undefined && args.petname !== null) {
    book.setPetname(nym, args.petname);
  }

  // 3. FOLLOW. Adding to the circle IS the follow — a LOCAL write, never a board announce.
  await circles.add(circleId, nym);

  return { nym, circleId, recognized, petname: book.get(nym)?.petname ?? null, federated: false };
}

/**
 * composeUnfollow — drop a nym from a circle (kāpae, remove-wins). The handle-book memory stays (the
 * recogniser still knows the key it met); only the graph edge lifts. LOCAL only, never a board write.
 */
export async function composeUnfollow(args: {
  readonly circles:  CircleStore;
  readonly nym:      string;
  readonly circleId: string;
}): Promise<{ readonly nym: string; readonly circleId: string; readonly federated: false }> {
  await args.circles.remove(args.circleId, args.nym);
  return { nym: args.nym, circleId: args.circleId, federated: false };
}

/**
 * listFollows — read a circle's members back under the recogniser's OWN names: for each nym, its private
 * petname (local) beside the glamour the handle-book last saw (the nym's own published face). A pure read
 * over the two local stores — it announces nothing.
 */
export async function listFollows(book: HandleBook, circles: CircleStore, circleId: string): Promise<FollowView[]> {
  const members = await circles.members(circleId);
  return members.map((nym) => {
    const rec = book.get(nym);
    return { nym, petname: rec?.petname ?? null, glamour: rec?.card.glamour ?? null };
  });
}
