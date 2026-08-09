/**
 * register-bags — which bags a vessel registers with its capability ring, derived from what it HOLDS.
 *
 * ── THE RULING THIS ENCODES ─────────────────────────────────────────────────────────────────────
 * A vessel that FOUNDED its own PersonaGroup stays private: it raised a fleet of one, so it carries its
 * own bags and nothing else. A vessel ADMITTED into a fleet carries all of that fleet's bags — private and
 * contracted alike — because a fleet that syncs a person's work to some of their devices and not others
 * has not synced it.
 *
 * ── A VESSEL HOLDS A SET OF MEMBERSHIPS, NEVER ONE ──────────────────────────────────────────────
 * A human runs SEVERAL PersonaGroups, and the same laptop and the same phone may carry more than one of
 * them — a work fleet and a play fleet across one set of devices. So a vessel does not have "a binding";
 * it belongs to a set of fleets, each admitted or founded on its own terms, and the bags it registers are
 * the UNION over that set.
 *
 * The shape takes the set. A caller with one membership passes one, which is what the boot path supplies
 * today; a caller with three passes three and the union answers without this module changing. Writing it
 * as a scalar would have frozen a single-fleet assumption into a fresh module on the day the ruling said
 * otherwise — and a shape becomes load-bearing long before anyone re-reads it.
 *
 * ── ONE PERSONA PLANE PER MEMBERSHIP, NAMED BY DERIVATION ───────────────────────────────────────
 * `@persona` holds ONE PersonaGroup's private plane — its multitude, signer DID, KEL prefix, device
 * delegation — so a vessel in two fleets needs two of them. Each membership therefore contributes its own
 * plane, named by `personaBagIdFor(personaGroupId)`: a domain-separated derivation from that group's own
 * doc id, with nothing above it that could enumerate a person's handles (persona-scope carries the law and
 * the prior art). Both bindings contribute one — a founded fleet of one still keeps its own identity
 * substrate; what a binding decides is whose doc stands behind the plane, never whether a vessel has one.
 *
 * A vessel in NO fleet holds no persona plane, and that reads correctly rather than as a gap: an anonymous
 * vessel~veil dyad stays private, and a plane belongs to a handle, so a vessel with no handle has none.
 *
 * ── WHY IT LIVES HERE AND NOT AT EACH OPENER ────────────────────────────────────────────────────
 * It rode as two hand-written lists, one per platform, and they had already drifted: the admitted browser
 * carried neither the shared substrate bag nor any bag its own catalog named. Keyhive's bag→doc map lives
 * in process memory, so a bag absent from this set can never satisfy a cap check — an operator bag missing
 * here refuses `act LOAD` forever, silently, on the vessel least able to notice.
 *
 * Two hand-written lists of one fact drift, and the one that carries authority drifts silently. One
 * derivation, both vessels, so neither enumerates.
 */

import { BAG_IDS, DAEMON_BAG_ID } from "./lar-uris.js";
import { personaBagIdFor } from "./persona-scope.js";

/**
 * How a vessel's membership in ONE fleet came to it — the fact that decides what that fleet contributes.
 *
 * ADMITTED — the binding arrived signed by a persona this vessel does not hold, so it joined a fleet that
 * already stood. FOUNDED — the vessel raised that PersonaGroup itself and seated its first persona, a
 * fleet of one. The opener's own words for the difference: an admitted leaf presents a binding it could
 * not have written for itself, and that is the whole difference between joining a group and declaring one.
 *
 * Note what this is NOT: crossing into a Nexus. A vessel reaches a Nexus through the mesh cabal, one level
 * out from the fleet, and a fleet of one may cross while a fleet of five may not have. The bags a vessel
 * carries follow the FLEETS it belongs to, because that is whose work they are.
 */
export type PersonaBinding = "admitted" | "founded";

/** One fleet this vessel belongs to, and what that membership carries. */
export interface FleetMembership {
  /** The PersonaGroup this membership names. Distinct fleets contribute distinct bags. */
  readonly personaGroupId: string;
  /** How this membership arrived — see `PersonaBinding`. */
  readonly binding: PersonaBinding;
  /**
   * Every bag this FLEET's catalog NAMES — read from the projection rather than hard-coded. An admitted
   * membership resolves caps against these; a founded one raised no fleet whose work they would be.
   */
  readonly catalogNamed?: readonly string[];
}

/** What a vessel holds at the moment it registers. Every field a FACT about this vessel, never a platform. */
export interface RegisterBagsInput {
  /** Every fleet this vessel belongs to. Empty reads as a vessel that belongs to none. */
  readonly fleets: readonly FleetMembership[];
  /** The wiki slot's bag ids, when a wiki stands in the stack. A Herm carries none — blind by structure. */
  readonly wikiBags?: readonly string[];
}

/**
 * The bags every vessel registers whatever it holds — its own daemon, identity, session and control ground.
 *
 * Every id here belongs to the VESSEL: its control plane, its device identities, its live sessions. No
 * persona plane sits among them, because a plane belongs to a HANDLE and a vessel's handles arrive through
 * its memberships — a vessel holding none holds none.
 */
const OWN_GROUND = [
  DAEMON_BAG_ID, BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions, BAG_IDS.catalog,
  BAG_IDS.oracle, BAG_IDS.lares,
] as const;

/**
 * The bags this vessel registers, derived — its own ground, its wiki, and the union over its fleets.
 *
 * EVERY membership contributes its own persona plane, whichever way it arrived: a handle's private plane
 * belongs to the handle, and a founded fleet of one still keeps its multitude, its signer pin and its
 * device edge. Beyond that plane, a FOUNDED membership contributes nothing — it raised a fleet of one, so
 * there is no other device whose work would arrive. An ADMITTED membership contributes the shared substrate
 * bag and every bag that fleet's catalog names — the widening IS the admission.
 *
 * Order stays stable and duplicates collapse, so two vessels holding the same memberships produce one
 * comparable set, and two fleets naming a bag in common register it once.
 */
export function deriveRegisterBags(input: RegisterBagsInput): string[] {
  const out: string[] = [...OWN_GROUND, ...(input.wikiBags ?? [])];
  for (const fleet of input.fleets) {
    out.push(personaBagIdFor(fleet.personaGroupId));
    if (fleet.binding !== "admitted") continue;
    out.push(BAG_IDS.lararium, ...(fleet.catalogNamed ?? []));
  }
  return [...new Set(out)];
}
