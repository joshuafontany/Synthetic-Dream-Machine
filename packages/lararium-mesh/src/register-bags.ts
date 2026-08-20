/**
 * register-bags — which bags a vessel registers with its capability ring, derived from what it HOLDS.
 *
 * ── THE RULING THIS ENCODES ─────────────────────────────────────────────────────────────────────
 * An anonymous vessel~veil dyad stays private: it stands in no PersonaGroup, so it carries its own ground
 * and nothing else. A vessel that JOINS a PersonaGroup carries that group's work — private and contracted
 * alike — because a fleet that syncs a person's bags to some of their devices and not others has not
 * synced them.
 *
 * The axis is JOINED-OR-NOT, and it is worth naming what it is NOT: founded-versus-admitted. How a
 * membership arrived decides whose signature stands behind the binding; it decides nothing about which
 * bags are the person's work. A founder's own laptop carries their catalog exactly as a phone admitted
 * into the same group does — and the live openers already said so, one registering its catalog while the
 * other did not, which is the drift this module exists to end.
 *
 * ── A VESSEL HOLDS A SET OF MEMBERSHIPS, NEVER ONE ──────────────────────────────────────────────
 * A human runs SEVERAL PersonaGroups, and the same laptop and the same phone may carry more than one of
 * them — a work compartment and a play compartment across one set of devices. So the bags a vessel
 * registers are the UNION over its memberships, each contributing its own persona plane and its own catalog.
 *
 * ── PLANES REGISTER, ONE PLANE MOUNTS, EVERY PLANE ANSWERS TO ONE NAME ──────────────────────────
 * Every group's plane registers here, or that group's own devices stop reconciling. Exactly one MOUNTS
 * as a writable composite layer, because two would shadow each other — that law and its switch live in
 * `persona-planes`, and the name each plane answers to derives in `persona-scope`.
 *
 * A PLANE CARRIES ONE NAME EVERYWHERE: seeded under it, mounted under it, registered under it, named by it
 * in the `@oracle` registry and in the admit payload. The capability layer hashes a bag URL to SEED the
 * Keyhive Document behind it and then looks the URL up verbatim to grant access — so two spellings of one
 * plane seed two documents that no later aliasing reconciles. Deixis resolves once, at the boot path that
 * reads a vessel's own sentinels; only absolute names reach this function (canon:
 * persona-circle#the-plane-name).
 *
 * ── WHY IT LIVES HERE AND NOT AT EACH OPENER ────────────────────────────────────────────────────
 * It rode as two hand-written lists, one per platform, and they had drifted: one carried the shared
 * substrate bag and every bag its catalog named, the other carried neither. Keyhive's bag→doc map lives in
 * process memory, so a bag absent from this set can never satisfy a cap check — an operator bag missing
 * here refuses `act LOAD` forever, silently, on the vessel least able to notice.
 *
 * Two hand-written lists of one fact drift, and the one that carries authority drifts silently. One
 * derivation, both vessels, so neither enumerates.
 */

import { type LarDoc, tiddlerText } from "./base-doc.js";
import { BAG_IDS, DAEMON_BAG_ID, isBagId } from "./lar-uris.js";
import { personaScopedBagIds } from "./persona-scope.js";

/**
 * The bag URIs the `@catalog` registry NAMES — the PersonaGroup's own work, read from the projection.
 *
 * The catalog keys by bag URI, each entry's text carrying that bag's automerge url. `act CREATE` writes a
 * durable entry here and nothing else registers the bag with keyhive, whose bag→doc map lives in process
 * memory — so reading the catalog at boot is what lets a cap check resolve for a bag the person made
 * yesterday, across restarts, without this module ever learning its name.
 *
 * An entry whose text carries no automerge url names a bag that never minted; it is skipped rather than
 * registered as a doc that cannot resolve.
 *
 * IT ADMITS ONLY BAGS. The catalog holds other kinds keyed the same way — a wiki slot's per-device draft
 * pointer is a `wikis/@slug/drafts/<did>` title whose text is an automerge url, indistinguishable from a
 * bag entry by shape alone. Registering one mints a Keyhive Document for a thing that is not a bag, and
 * nothing throws. A reader that walks a registry and takes every entry for its own kind will register
 * whatever else was written there, and something else is always written there.
 *
 * It lived at ONE opener, which is why the other could not open its own operator's bags.
 */
export function catalogNamedBags(doc: LarDoc | undefined | null): string[] {
  const tiddlers = doc?.tiddlers ?? {};
  return Object.keys(tiddlers).filter(
    (title) => isBagId(title) && (tiddlerText(tiddlers[title]) ?? "").startsWith("automerge:"),
  );
}

/** One PersonaGroup this vessel stands in, and the work that group brings with it. */
export interface FleetMembership {
  /** The PersonaGroup this membership names. Distinct groups contribute distinct planes. */
  readonly personaGroupId: string;
  /**
   * Every bag this group's catalog NAMES — read from the projection rather than hard-coded, so a bag the
   * person made yesterday registers today without this module learning its name.
   */
  readonly catalogNamed?: readonly string[];
}

/** What a vessel holds at the moment it registers. Every field a FACT about this vessel, never a platform. */
export interface RegisterBagsInput {
  /** Every PersonaGroup this vessel stands in. Empty reads as the anon dyad — a posture, never a gap. */
  readonly fleets: readonly FleetMembership[];
  /** The wiki slot's bag ids, when a wiki stands in the stack. A Herm carries none — blind by structure. */
  readonly wikiBags?: readonly string[];
}

/**
 * The bags every vessel registers whatever it stands in — its own control plane, and the shared substrate.
 *
 * Every id here belongs to the VESSEL or to the mesh beneath it: its daemon, the catalog and oracle it
 * reads through, and the substrate bags a vessel needs to stand at all. NO PLANE OF A FACE sits among
 * them — not the persona plane, and not the circles, identities or sessions that travel with it. Those
 * belong to a PERSONAGROUP and arrive through this vessel's memberships, so a vessel standing in no group
 * holds none of them, and a vessel standing in several holds one set per face.
 */
const OWN_GROUND = [
  DAEMON_BAG_ID, BAG_IDS.catalog, BAG_IDS.oracle, BAG_IDS.lares, BAG_IDS.lararium,
] as const;

/**
 * The bags this vessel registers, derived — its ground, its wiki, and the union over the groups it stands in.
 *
 * Each membership contributes THE WHOLE FACE — its persona plane and the circles, identities and sessions
 * that travel with it, all four derived off the one tag that group's doc id yields — plus every bag that
 * group's catalog names. Order stays stable and duplicates collapse, so two vessels in the same groups
 * produce one comparable set, and two groups naming a bag in common register it once.
 */
export function deriveRegisterBags(input: RegisterBagsInput): string[] {
  const out: string[] = [...OWN_GROUND, ...(input.wikiBags ?? [])];
  for (const fleet of input.fleets) {
    const face = personaScopedBagIds(fleet.personaGroupId);
    out.push(face.persona, face.circles, face.identities, face.sessions, ...(fleet.catalogNamed ?? []));
  }
  return [...new Set(out)];
}
