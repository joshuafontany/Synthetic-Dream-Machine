/**
 * seal-import — whether a partner's charter may land here.
 *
 * ── WHY THE PLACEMENT IS LOAD-BEARING ───────────────────────────────────────────────────────────
 * An operator cannot consent to a charter she has never seen, so the founding operator's public
 * material — seated keys, threshold, epoch lineage — must reach her before she signs anything. And
 * `accept-carriage` signs a contract-in against whatever charter stands in the seal home it reads.
 *
 * So dropping a partner's `founding-roster.mem` into a seal home that already holds one does not
 * merely add a file: it REPLACES a founding, and every contract-in signed afterwards binds to the
 * wrong epoch. The witness that proves the crossing carries the file with `cp`, onto a vessel with
 * no charter to lose — which is why nothing has met this yet.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
 * A charter arrives where none stands, or it refuses. Re-importing the same charter passes, because
 * an operator who repeats a step should not be punished for it, and repeating destroys nothing.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/founding-runbook
 */

export interface SealImportVerdict {
  readonly ok:  boolean;
  /** What would happen, or what stopped it and where the charter belongs instead. */
  readonly why: string;
}

/**
 * Read whether an incoming charter may land, from the two epoch ids alone.
 *
 * Takes ids rather than paths so the rule stands testable without a founded vessel, and so the
 * caller cannot accidentally pass a path where a decision belongs.
 */
export function sealImportVerdict(at: { incoming: string; standing: string | null }): SealImportVerdict {
  if (at.incoming.length === 0) {
    return { ok: false,
             why: "the incoming charter names no epoch — a roster carried before its epoch was established "
                + "seats nothing, and writing it here would replace whatever stands with material that "
                + "grants nothing. Ask the founding operator to seat their quorum first." };
  }
  if (at.standing === null) {
    return { ok: true, why: `no charter stands here — ${at.incoming.slice(0, 12)}… lands cleanly` };
  }
  if (at.standing === at.incoming) {
    return { ok: true, why: "the same charter already stands — nothing moves, and a repeated step costs nothing" };
  }
  return { ok: false,
           why: `a DIFFERENT charter already stands here (${at.standing.slice(0, 12)}…), and this write would `
              + `replace it with ${at.incoming.slice(0, 12)}… — that destroys your own founding, and every `
              + "contract-in you signed afterwards would bind to the wrong epoch. A partner's charter belongs "
              + "beside yours, never over it: point the import at a seal home this vessel did not found in." };
}

/** One chair as a charter carries it — seated when it holds a key, declared when it does not. */
export interface CharterChair {
  readonly displayName:  string;
  readonly verifyingKey: string | null;
}

export interface ForeignSeatVerdict {
  readonly ok:      boolean;
  /** The display names of seated chairs this vessel's vault cannot produce. */
  readonly foreign: readonly string[];
  readonly why:     string;
}

/**
 * Which seated chairs in a standing charter this vessel did not found.
 *
 * ── WHY A SEAT MUST ASK ─────────────────────────────────────────────────────────────────────────
 * A joining operator holds the founding operator's charter in her own seal home, because she cannot
 * consent to a charter she has never seen. She also seats her own charter there. A seat that reads
 * the standing doc as its base then APPENDS her chairs to his, and the merged charter seats both.
 *
 * Measured on two vessels: six seated kahu at a threshold of two, so the partner holds quorum over
 * her Nexus using his own keys, with no further act by her. The escalation arrives disguised as the
 * ordinary handoff the runbook instructs.
 *
 * A SEATED chair carries a key and therefore authority; one this vault cannot produce is FOREIGN. An
 * UNSEATED chair carries neither, so it is not foreign and keeping it is what `unstood: "keep"` is
 * for — a declared chair nobody has stood for yet.
 */
export function foreignSeats(chairs: readonly CharterChair[], heldKeys: readonly string[]): ForeignSeatVerdict {
  const mine = new Set(heldKeys.map((k) => k.toLowerCase()));
  const foreign = chairs
    .filter((c) => typeof c.verifyingKey === "string" && c.verifyingKey.length > 0
                && !mine.has(c.verifyingKey.toLowerCase()))
    .map((c) => c.displayName);
  if (foreign.length === 0) {
    return { ok: true, foreign: [], why: "every seated chair holds a key this vessel can produce" };
  }
  return {
    ok: false, foreign,
    why: `the charter standing here seats ${foreign.length} chair(s) this vessel did not found — `
       + `${foreign.join(", ")} — whose keys this vault cannot produce. Seating onto it would MERGE `
       + "their quorum with yours: they would hold quorum over your Nexus using their own keys, with "
       + "no further act by you. A partner's charter belongs beside yours, never beneath your seat.",
  };
}
