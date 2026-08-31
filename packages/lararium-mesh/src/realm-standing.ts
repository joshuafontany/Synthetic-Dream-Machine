/**
 * realm-standing — what the feed slots can honestly say, and where the claim stops.
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
 * ── NOR CAN THEY SEE PAST THIS VESSEL ───────────────────────────────────────────────────────────
 * The count is a FLOOR, never a total. The slots ride `bags/daemon/lease-epoch/`, and each vessel
 * reads that bag's URL off its OWN social bootstrap, so a contracted peer's offering rides its own
 * vessel's slots and never arrives here. Two operators contracted into one Nexus, both feeding one
 * realm, read only their own faces — walked in `mesh-scenarios.sh realm-crossing`.
 *
 * Every reading therefore names its scope. A caller that needs a fact about the realm ACROSS a Nexus
 * has no instrument here, and none elsewhere either: residency temperature is local for the same
 * reason one axis over.
 *
 * ── AND THE SLOTS CANNOT SEE A LOCUS ────────────────────────────────────────────────────────────
 * The constituting condition wants DISTINCT LOCI. The slots carry FACES: the writer rides as the
 * persona-root DID, and the daemon "cannot re-verify from its side that the caller custodies that
 * root" — so "a human running several of their own faces at one realm reads as the Sybil-of-one the
 * plane already prices SOCIALLY, never in crypto."
 *
 * SO A FACE COUNT IS NOT A LOCUS COUNT, and this must not convert one into the other. Several faces
 * feeding is a fact; whether they are several hands is a reading this side cannot make. Calling it
 * "belonging" would manufacture the reciprocity the morphology requires be earned — the same
 * fake reciprocity the model's own Sybil definition names when one hand sits at both ends.
 *
 * What DOES hold either way: one face feeding a hundred times has visited a hundred times. Depth
 * never becomes a second hand, and that zero reports which side of the seam a thing sits on rather
 * than a weakness to cure.
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

export type RealmStandingName = "unfed" | "visit" | "many-faces";

export interface RealmStanding {
  readonly standing: RealmStandingName;
  /**
   * DISTINCT FACES that have actually fed — never a count of offerings, and never a count of HANDS.
   * The slots cannot distinguish one human's several faces from several humans.
   */
  readonly faces:    number;
  readonly reading:  string;
}

export function realmStanding(slots: readonly RealmFeedSlot[]): RealmStanding {
  // A SLOT AT ZERO IS NO OFFERING. A writer may hold a slot without ever having rolled it, and a
  // hand that has not fed has not visited.
  const fed = new Set(slots.filter((s) => s.epoch > 0).map((s) => s.writer.toLowerCase()));
  const faces = fed.size;

  if (faces === 0) {
    return { standing: "unfed", faces,
             reading: "nobody feeds this realm here — which reads the same as a realm this replica has "
                    + "never synced, and the model offers no way to tell those apart from one side." };
  }
  if (faces === 1) {
    return { standing: "visit", faces,
             reading: "ONE face feeds this realm on this replica — the founding offering, and a visit "
                    + "rather than a dwelling. Depth changes nothing here: one hand cannot carry "
                    + "non-aggregative state, so this reads nominal BY LAW rather than by measurement. A "
                    + "contracted peer's offering does not appear in these slots at all." };
  }
  return { standing: "many-faces", faces,
           reading: `${faces} faces feed this realm ON THIS REPLICA, and the count is a floor rather than a `
                  + "total: a contracted peer's offering rides its own vessel's slots and never arrives here. "
                  + `Whether these are ${faces} HANDS is a second thing this side cannot read — a human `
                  + "running several of their own faces reads as the Sybil-of-one, which this plane prices "
                  + "SOCIALLY and never in crypto. The mutual hold that constitutes a realm wants distinct "
                  + "loci of cost; these slots carry faces, so the count is a fact and the constitution "
                  + "stays your reading." };
}
