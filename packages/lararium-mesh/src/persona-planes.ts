/**
 * persona-planes — the family of PersonaGroup planes a vessel holds, and the ONE it stands in.
 *
 * ── THE TWO VERBS A PLANE ANSWERS TO, AND WHY THEY DIFFER ───────────────────────────────────────
 * A vessel REGISTERS every plane it holds and MOUNTS exactly one. The two verbs carry different loads and
 * a reader who fuses them builds the wrong thing:
 *
 *   · REGISTER — the capability ring learns the bag id, so a cap check over that plane can succeed and the
 *     fleet can sync it. Every group's plane registers, or that group's own devices stop reconciling.
 *   · MOUNT    — the plane becomes a WRITABLE layer of the live wiki composite, which is what "the persona
 *     doc" means to everything above. Exactly one mounts, because the composite resolves a tiddler by
 *     walking its layers: mount two groups' planes and one group's multitude, signer pin and device
 *     edge answer a read meant for the other, silently, in whichever order the layers happened to land.
 *
 * Canon rules the same shape from the human side: "One Persona takes the blame at a time" — the Voice-house
 * pattern, one face surfaces, named, and switching costs nothing (persona-circle#composition). A vessel
 * holds a vault of compartments and stands in one of them.
 *
 * ── THE SWITCH IS THE DANGEROUS PART, AND CANON NAMES THE DANGER ────────────────────────────────
 * "A 'switch/manage between handles' flow MUST NOT become a Janus oracle" (persona-circle#honest-scope) —
 * an interactive receipt that answers, to whoever can ask, whether this vessel also holds that other
 * compartment. Everything here therefore works from what the CALLER already holds: the active group arrives
 * named by its own id, and an unknown name THROWS rather than falling back to a first element. A silent
 * fallback would stand the vessel in a compartment the operator did not choose, and write that group's
 * plane while the operator read another's pet-name on the screen.
 *
 * ── WHAT LIVES ELSEWHERE ────────────────────────────────────────────────────────────────────────
 * The NAME of a plane derives in `persona-scope` (nothing above the compartments that could enumerate
 * them). WHICH bags a vessel registers derives in `register-bags`. This module holds only the family and
 * the one face — the piece both of those leave to the boot path.
 *
 * Nothing here touches a PUBLISHED name. A Handle is the outward pet-name a PersonaGroup announces on a
 * HandleCard, bound by the declaring act alone (persona-policy#two-layer-petnames); these ids and pet-names
 * stay inward, and a private label reaching a board reads as a leak rather than a shortcut.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */

import { personaBagIdFor } from "./persona-scope.js";

/** One PersonaGroup's private plane: the group it belongs to, and the doc that carries it. */
export interface PersonaPlaneRef {
  /** The PersonaGroup whose plane this is. Names the plane inwardly; never travels as an announced face. */
  readonly personaGroupId: string;
  /** Where the doc lives. Automerge URL, resolved by the boot path exactly as any other social doc. */
  readonly url: string;
}

/** A plane with its derived bag id resolved — what a mount or a registration actually consumes. */
export interface ResolvedPersonaPlane extends PersonaPlaneRef {
  readonly bagId: string;
}

/** Resolve each plane's bag id from its own group, so a caller never hand-writes one. */
export function resolvePersonaPlanes(planes: readonly PersonaPlaneRef[]): ResolvedPersonaPlane[] {
  return planes.map((p) => ({ ...p, bagId: personaBagIdFor(p.personaGroupId) }));
}

/**
 * The ONE plane this vessel stands in, chosen by name.
 *
 * Throws when the named group is absent, and the throw is the point: a boot that cannot find the compartment
 * it was told to stand in must stop, because every quieter answer writes one group's plane while the
 * operator believes they hold another. The message says how many planes the vessel holds and never WHICH,
 * since an error string travels further than the vault it came from.
 */
export function activePersonaPlane(
  planes: readonly PersonaPlaneRef[],
  activeGroupId: string,
): ResolvedPersonaPlane {
  const found = planes.find((p) => p.personaGroupId === activeGroupId);
  if (!found) {
    throw new Error(
      `persona-planes: this vessel holds no plane for the active PersonaGroup (it holds ${planes.length}). ` +
      `Admit the group on this vessel, or name one it already carries.`,
    );
  }
  return { ...found, bagId: personaBagIdFor(found.personaGroupId) };
}

/**
 * Whether a family stands well enough to boot on: at least one plane, and no group named twice.
 *
 * A duplicated group would derive one bag id twice and mount a second writable layer over the first —
 * the same silent shadowing the one-face law exists to prevent, arriving through the door of a merge
 * rather than a switch.
 */
export function personaPlanesFault(planes: readonly PersonaPlaneRef[]): string | null {
  if (planes.length === 0) return "no persona plane — a vessel standing in a PersonaGroup must carry its plane";
  const seen = new Set<string>();
  for (const p of planes) {
    if (seen.has(p.personaGroupId)) return "one group appears twice — two writable layers would shadow each other";
    seen.add(p.personaGroupId);
  }
  return null;
}
