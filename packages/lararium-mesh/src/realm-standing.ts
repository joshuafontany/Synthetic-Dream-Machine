/**
 * realm-standing — whether a realm has been visited or is dwelt in, read off who feeds it.
 *
 * ── A REALM IS CONSTITUTED, NEVER CREATED ───────────────────────────────────────────────────────
 * A realm mints no DID and hosts on no machine; nothing stands to create. It begins when someone
 * feeds it, and THE FIRST OFFERING IS THE FOUNDING — never a step after it.
 *
 * ── ONE FIRING IS A VISIT; TWO OPPOSED FIRINGS ARE BELONGING ────────────────────────────────────
 * `hoʻokipa` reads causative of `kipa`: the host causes a visit, one-directional by grammar. So one
 * offering constitutes nothing — reciprocity is required by the morphology rather than stipulated by
 * the model. And the constructor changes at the seam of the living human: below it `compose` binds
 * ONE principal's instruments and buys REACH; at and above it `hoʻokipa` binds DISTINCT LOCI OF COST
 * and deposits DEPTH.
 *
 * THEREFORE THIS COUNTS LOCI, NEVER FEEDS. One face feeding a hundred times has visited a hundred
 * times: a fleet reads nominal BY LAW rather than by measurement, because one locus of cost cannot
 * carry non-aggregative state however deep it rolls. That zero reports which side of the seam a thing
 * sits on and never a weakness to cure.
 *
 * ── AND IT SITS BESIDE THE CLOCK, NEVER INSIDE IT ───────────────────────────────────────────────
 * `realm-clock` stays verdict-free by construction: it reports who feeds and how deep so a human can
 * see a minority out-feeding a realm. A verdict baked into that read would become the captured object.
 * This is a separate reading over the same slots, and it decides nothing about capture.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/identity-enacts-relation
 */

/** One writer's lease slot, as the realm's clock reports it. */
export interface RealmFeedSlot {
  readonly writer: string;
  readonly epoch:  number;
}

export type RealmStandingName = "unfed" | "visit" | "belonging";

export interface RealmStanding {
  readonly standing: RealmStandingName;
  /** DISTINCT loci of cost that have actually fed — never a count of offerings. */
  readonly loci:     number;
  readonly reading:  string;
}

export function realmStanding(slots: readonly RealmFeedSlot[]): RealmStanding {
  // A SLOT AT ZERO IS NO OFFERING. A writer may hold a slot without ever having rolled it, and a
  // hand that has not fed has not visited.
  const fed = new Set(slots.filter((s) => s.epoch > 0).map((s) => s.writer.toLowerCase()));
  const loci = fed.size;

  if (loci === 0) {
    return { standing: "unfed", loci,
             reading: "nobody feeds this realm here — which reads the same as a realm this replica has "
                    + "never synced, and the model offers no way to tell those apart from one side." };
  }
  if (loci === 1) {
    return { standing: "visit", loci,
             reading: "ONE locus of cost feeds this realm — the founding offering, and a visit rather than "
                    + "a dwelling. Depth changes nothing here: one hand cannot carry non-aggregative state, "
                    + "so this reads nominal BY LAW rather than by measurement. A second locus feeding is "
                    + "what constitutes the realm." };
  }
  return { standing: "belonging", loci,
           reading: `${loci} distinct loci of cost feed this realm — opposed firings, so the mutual hold `
                  + "stands and the realm is constituted. Depth sediments from here; it does not gate this." };
}
