/**
 * members-board-root — WHOSE members board a vessel reads.
 *
 * ── AN ADDRESS, NOT A PERMISSION ────────────────────────────────────────────────────────────────
 * The members board is a SHARED doc at `carriageDocUrl(<key>)`, and which key addresses it decides
 * which Nexus a vessel is reading about. A vessel that reads its own key reads its own board, which
 * is right for the operator who FOUNDED the charter and wrong for everyone she contracts.
 *
 * Canon puts the weight here: "a second OPERATOR is the first relation, and a Nexus IS the relation".
 * A relation both sides cannot read is one side's record of a relation.
 *
 * ── THE ROOT TRAVELS WITH THE CHARTER ───────────────────────────────────────────────────────────
 * The charter is what a joining operator holds before she can consent, and it is public material by
 * construction — seated keys, threshold, epoch lineage, all verifiable and none of them secret. The
 * board's address belongs in exactly that envelope: it names WHERE the relation she is consenting to
 * is written, and grants nothing. It rides outside the epoch CID (`sealEpochCidOf` covers epoch,
 * keySetHash, nextKeyCommit and prevEpochCid only), so carrying it re-founds nothing.
 *
 * ── AND THE ABSENCE STAYS HONEST ────────────────────────────────────────────────────────────────
 * A charter seated without a root reads this vessel's own board — the address it always had — and
 * SAYS so. Reporting a local board under a Nexus-scoped name is how the one-sided relation went
 * unnoticed; the reading carries its own scope so a caller can tell the two apart.
 */

/** 32 bytes of ed25519 verifying key, hex. Anything else addresses no board. */
const KEY_RE = /^[0-9a-f]{64}$/;

export interface MembersBoardRoot {
  /** The verifying key whose carriage doc holds the board to read. Always lowercase hex. */
  readonly root:    string;
  /** Whether that board is this vessel's own — true for a founder, and for any unrecorded root. */
  readonly own:     boolean;
  /** Whose board this is, in the words a caller needs to not mistake one Nexus for another. */
  readonly reading: string;
}

/**
 * Which board this vessel reads for the charter it holds.
 *
 * A malformed root is REFUSED rather than addressed: `carriageDocUrl` over garbage materializes an
 * EMPTY board, which reads as "nobody has contracted" — a fabricated verdict where the honest answer
 * is that the charter cannot be trusted to name its Nexus.
 */
export function membersBoardRoot(
  at: { charterRoot?: string | null; ownVesselKey: string },
): MembersBoardRoot {
  const own      = at.ownVesselKey.trim().toLowerCase();
  const declared = (at.charterRoot ?? "").trim().toLowerCase();

  if (declared.length === 0) {
    return { root: own, own: true,
             reading: "this charter records no board root, so this reading is THIS VESSEL'S OWN board. "
                    + "A Nexus this vessel contracted into keeps its board at the founder's address, and "
                    + "nothing here can reach it — the absence is the gap, never a verdict about members." };
  }
  if (!KEY_RE.test(declared)) {
    return { root: own, own: true,
             reading: "this charter's board root is unreadable as a verifying key, so it addresses no "
                    + "board and this reading falls back to THIS VESSEL'S OWN. Addressing a malformed "
                    + "root would materialize an EMPTY board and report it as nobody having contracted." };
  }
  if (declared === own) {
    return { root: own, own: true,
             reading: "this vessel founded the charter it holds, so its own board IS the Nexus board — "
                    + "the address a founder reads and the address she writes are the same one." };
  }
  return { root: declared, own: false,
           reading: `this charter names another vessel's board (${declared.slice(0, 12)}…) — the Nexus this `
                  + "vessel contracted into. The relation was written on the founder's board, so that is "
                  + "where both sides read it; this vessel's own board carries a different Nexus." };
}
