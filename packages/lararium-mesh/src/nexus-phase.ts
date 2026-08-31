/**
 * nexus-phase — where a vessel stands on the keeper ladder, read from RELATIONS.
 *
 * ── THE LADDER (genesis-doc#governance) ─────────────────────────────────────────────────────────
 * "founder (n=1, genesis) -> founder-multisig (a 2nd keeper contracts in -> write delegates to a
 * GROUP; the group, not the original key, becomes root) -> k-of-n quorum". Phase 2 arrives when a
 * SECOND KEEPER CONTRACTS IN, and by no other act.
 *
 * ── THE COUNT DECIDES NOTHING ───────────────────────────────────────────────────────────────────
 * A founding seat draws every key from ONE vault: `listPersonaRoots` reads this vessel's own identity
 * home and can reach no other. Three seated chairs at genesis are therefore three faces of one
 * operator — "cryptographically real and not real as a check", since no independent hand can refuse.
 *
 * Under relationship-as-identity the point is sharper than optics. With one operator there is ONE
 * relationship — the operator with themselves — however many keys they hold. A second OPERATOR is the
 * first relation, and a Nexus IS the relation. Until then a vessel holds a seed: prepared to carry
 * this relation and every one after it, and carrying none.
 *
 * ── AND WHICH KAHU THESE ARE ────────────────────────────────────────────────────────────────────
 * The chairs this phase counts belong to the NEXUS SEAL — carriage, antigen, succession — seated from
 * one vessel's own vault. They are NOT the Amorphous Dreams Cabal, which holds `admin` on the ACCESS
 * axis over the corpus bags and the genesis artifact, carries no live command into any vessel, and
 * has no bearing on whether a Nexus stands.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/genesis-doc
 */

export type NexusPhaseName = "seed" | "multisig" | "quorum";

export interface NexusPhase {
  readonly phase:   NexusPhaseName;
  /** Whether a Nexus stands at all — false until a second operator contracts in. */
  readonly isNexus: boolean;
  /** What this phase is, in the words a reader needs to not mistake it for another. */
  readonly reading: string;
}

/**
 * Read the phase.
 *
 * `contractedOperators` counts FOREIGN operators holding a carriage contract — keys this vessel has
 * never held. That is the only input that can move the phase, because it is the only one that names
 * a hand outside this vault.
 */
export function nexusPhase(
  at: { seatedKeys: number; contractedOperators: number; contractedInto?: boolean },
): NexusPhase {
  // A RELATION HAS TWO SIDES, AND EACH HOLDS ITS OWN EVIDENCE. `contractedOperators` counts operators
  // this vessel ADMITTED onto its members board — an immune surface, rightly local, and empty forever
  // on a vessel that joined someone else's Nexus. Her evidence is her OWN SIGNED CONSENT: a contract-in
  // bound to a charter epoch, a fact about this vessel that needs no partner's document to read.
  //
  // So relations ADD from both directions, and neither side's count is the Nexus's roster: a founder
  // sees whom she admitted, a joiner sees that she joined, and no vessel sees the whole.
  const joined = at.contractedInto === true;
  const relations = at.contractedOperators + (joined ? 1 : 0);

  if (relations <= 0) {
    return {
      phase: "seed", isNexus: false,
      reading: at.seatedKeys > 0
        ? `a SEED, not yet a Nexus — ${at.seatedKeys} chair(s) seated, and every key came from this `
          + "vessel's own vault, so one operator holds them all and no independent hand can refuse. "
          + "The Nexus begins when a second operator contracts in."
        : "a SEED with no chair seated — this vessel stands prepared to carry a Nexus and carries none. "
          + "The Nexus begins when a second operator contracts in.",
    };
  }
  if (relations === 1) {
    return {
      phase: "multisig", isNexus: true,
      reading: joined && at.contractedOperators === 0
        ? "FOUNDER-MULTISIG — this vessel CONTRACTED IN to a charter it holds, so the relation stands "
          + "and the GROUP is root rather than the founding key. This side sees only its own consent: "
          + "how many other operators joined is not readable from here, and this vessel never claims it."
        : "FOUNDER-MULTISIG — a second operator has contracted in, so the relation stands and the "
          + "GROUP is root rather than the founding key. This is the Nexus beginning.",
    };
  }
  return {
    phase: "quorum", isNexus: true,
    reading: `a QUORUM of relations — ${relations} this vessel can see (${at.contractedOperators} admitted`
           + `${joined ? " plus its own contract-in" : ""}), admission and eviction by quorum, and the `
           + "founding key may vanish without ending it. The Nexus may hold more; no vessel sees the whole.",
  };
}
