/**
 * identity-home-closure — whether a vessel's identity home stands closed to other users.
 *
 * ── THE INVARIANT THIS READS ────────────────────────────────────────────────────────────────────
 * The identity module writes keypairs at 0600 and leaves the directory to its caller: "caller must
 * ensure the identity dir is not world-readable". A recursive mkdir takes the process umask instead,
 * so an ordinary boot leaves 0755.
 *
 * What rests there sets the stake. Persona-root signing seeds sit in cleartext, so whoever reads that
 * directory can mint this vessel's signatures — seat a chair, sign a stamp, counter-sign a quorum act
 * as one of its faces. A charter names the seated keys and a stamp names the signer; neither survives
 * a reader who holds the seed behind them.
 *
 * ── AND IT PROMISES ONLY WHAT A MODE BIT PROMISES ───────────────────────────────────────────────
 * Group and other bits hold off another USER. They hold off nothing already running as this one, so a
 * same-uid neighbour reaches this home whatever they say — and canon runs two vessels under one uid on
 * purpose, listing the machine and the disk among what sovereign vessels MAY co-hold.
 *
 * So this answers a narrow question honestly rather than a broad one loosely, and every reading
 * carries what it does not cover. A check that implied more would sell a boundary the filesystem
 * declines to draw.
 *
 * It reports and never repairs: a vessel whose home stands open may have reasons, and a silent chmod
 * would hide the misconfiguration an operator wants to read.
 */

export interface IdentityHomeClosure {
  /** Whether the mode holds this home shut against OTHER users. Never a claim about the same user. */
  readonly closed:  boolean;
  /** What the mode says, and what it declines to say. */
  readonly reading: string;
}

/** The bits that let anyone but the owner in — group and other, in every permission. */
const OPEN_TO_OTHERS = 0o077;

const SAME_USER_CAVEAT =
  " A mode bit answers about other users alone: anything already running as the same uid reaches this "
+ "home whatever these bits hold, and sovereign vessels MAY co-hold one machine by canon.";

/**
 * Read a directory mode for closure.
 *
 * A null mode reports OPEN rather than closed: a stat that failed carries no evidence, and answering
 * the safe-sounding thing on none would be the reassurance a caller least wants.
 */
export function identityHomeClosure(mode: number | null | undefined): IdentityHomeClosure {
  if (mode === null || mode === undefined) {
    return { closed: false,
             reading: "no mode reached this reading, so it cannot tell whether the identity home stands "
                    + "closed. An absent answer differs from a reassuring one, and this declines to "
                    + "supply the second." + SAME_USER_CAVEAT };
  }
  const open = mode & OPEN_TO_OTHERS;
  if (open === 0) {
    return { closed: true,
             reading: "this identity home stands closed to other users — owner bits alone." + SAME_USER_CAVEAT };
  }
  const who: string[] = [];
  if (mode & 0o070) who.push("the GROUP");
  if (mode & 0o007) who.push("all other users");
  return { closed: false,
           reading: `this identity home opens to ${who.join(" and ")} (mode ${mode.toString(8)}). Persona-root `
                  + "signing seeds rest here in cleartext, so a reader of this directory can mint this "
                  + "vessel's signatures as one of its faces." + SAME_USER_CAVEAT };
}
