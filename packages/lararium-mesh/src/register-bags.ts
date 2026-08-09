/**
 * register-bags — which bags a vessel registers with its capability ring, derived from what it HOLDS.
 *
 * ── THE RULING THIS ENCODES ─────────────────────────────────────────────────────────────────────
 * A vessel that FOUNDED its own PersonaGroup stays private: it raised a fleet of one, so it carries its
 * own bags and nothing else. A vessel ADMITTED into a fleet carries all of that user's bags — private and
 * contracted alike — because a fleet that syncs a person's work to some of their devices and not others
 * has not synced it.
 *
 * So the set follows the BINDING, never the platform. The same vessel widens when it is admitted, and a
 * browser and a node under the same binding register the same bags.
 *
 * ── WHY IT LIVES HERE AND NOT AT EACH OPENER ────────────────────────────────────────────────────
 * It rode as two hand-written lists, one per platform, and they had already drifted: the joined browser
 * carried neither the shared substrate bag nor any bag its own catalog named. Keyhive's bag→doc map lives
 * in process memory, so a bag absent from this set can never satisfy a cap check — an operator bag missing
 * here refuses `act LOAD` forever, silently, on the vessel least able to notice.
 *
 * This tree has already paid for that shape once and wrote the lesson down in its own test config: two
 * hand-written lists of one fact drift, and the one that carries authority drifts silently. One derivation,
 * both vessels, so neither enumerates.
 */

import { BAG_IDS, DAEMON_BAG_ID } from "./lar-uris.js";

/**
 * How this vessel's persona binding came to it — the only fact that decides the set.
 *
 * ADMITTED — the binding arrived signed by a persona this vessel does not hold, so it joined a fleet that
 * already stood. FOUNDED — the vessel raised its own PersonaGroup and seated its first persona, a fleet of
 * one. The opener's own words for the difference: an admitted leaf presents a binding it could not have
 * written for itself, and that is the whole difference between joining a group and declaring one.
 *
 * Note what this is NOT: crossing into a Nexus. A vessel reaches a Nexus through the mesh cabal, one level
 * out from the fleet, and a fleet of one may cross while a fleet of five may not have. The bags a vessel
 * carries follow the FLEET it belongs to, because that is whose work they are.
 */
export type PersonaBinding = "admitted" | "founded";

/** What a vessel holds at the moment it registers. Every field a FACT about this vessel, never a platform. */
export interface RegisterBagsInput {
  /** How this vessel's persona binding arrived — see `PersonaBinding`. */
  readonly binding: PersonaBinding;
  /** The wiki slot's bag ids, when a wiki stands in the stack. A Herm carries none — blind by structure. */
  readonly wikiBags?: readonly string[];
  /**
   * Every bag this vessel's own @catalog NAMES — the operator's bags, read from the projection rather
   * than hard-coded. An admitted vessel resolves caps against these; a founded one holds no fleet to carry.
   */
  readonly catalogNamed?: readonly string[];
}

/** The bags every vessel registers whatever it holds — its own daemon, identity, and session ground. */
const OWN_GROUND = [
  DAEMON_BAG_ID, BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions, BAG_IDS.catalog,
  BAG_IDS.oracle, BAG_IDS.lares,
] as const;

/**
 * The bags this vessel registers, derived.
 *
 * FOUNDED → its own ground plus whatever wiki stands in its stack. Nothing of a fleet's, because it
 * belongs to none beyond itself.
 *
 * ADMITTED → that, plus the shared substrate bag and every bag its catalog names. The widening IS the
 * admission: a person's private and contracted work reaches every device of theirs, or the fleet has
 * not synced it.
 *
 * Order stays stable and duplicates collapse, so two vessels under one binding produce one comparable set.
 */
export function deriveRegisterBags(input: RegisterBagsInput): string[] {
  const out = [...OWN_GROUND, ...(input.wikiBags ?? [])];
  if (input.binding === "admitted") {
    out.push(BAG_IDS.lararium, ...(input.catalogNamed ?? []));
  }
  return [...new Set(out)];
}
