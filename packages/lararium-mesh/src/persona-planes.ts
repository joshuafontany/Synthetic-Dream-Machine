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

import { PERSONA_MEMBERSHIP_PREFIX } from "./lar-uris.js";
import { personaBagIdFor, personaScopeTag } from "./persona-scope.js";

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
 * mountedPlaneBagId — THE ONE PLACE DEIXIS RESOLVES. Everything downstream carries the absolute name.
 *
 * ── THE LAW THIS ENCODES, AND WHERE IT COMES FROM ───────────────────────────────────────────────
 * A caller says "the plane I stand in" — a deictic, an indexical, a gesture. This function turns that
 * gesture into the plane's ABSOLUTE name, derived from that group's own material, and only the absolute
 * name travels onward into any map. Nine naming systems and the capability literature converged on that
 * one move from opposite directions:
 *
 *   · Resolve once at the edge, store the absolute. AT-Proto resolves a Handle to a DID and binds the DID
 *     everywhere downstream; Nostr's NIP-05 goes further — a later change to the binding MUST NOT rewrite
 *     what was already stored. Resolution never re-fires backward.
 *   · A local name may enter RESOLUTION; it may never stand as an operand in the DECISION. SPKI/SDSI
 *     (RFC 2693) reduces names to keys FIRST, and only then computes authorization.
 *   · Miller (Robust Composition): hardening a system consists of ELIMINATING name-centric designation,
 *     not elaborating it — a callee receives the reference, never the caller's word for it. His CapDesk
 *     keeps the deixis in the human gesture and resolves it in the shell, in the user's own namespace.
 *   · Capsicum, given this exact fork for the filesystem, BANNED the deictic token: `AT_FDCWD` sits
 *     forbidden in capability mode beside absolute paths and `..`.
 *   · MITRE names the general shape CWE-386 — a constant symbolic reference whose referent moves.
 *
 * The one permissive precedent does not reach us. seL4 does resolve against an implicit per-thread root,
 * and survives because that root sits kernel-installed, per-subject, unforgeable, and NOT a string any
 * caller can utter. A bag id is a string in a document.
 *
 * ── WHY THIS MATTERS MORE THAN A STYLE PREFERENCE ───────────────────────────────────────────────
 * The capability layer hashes a bag URL to SEED the Keyhive Document behind it, then looks the URL up
 * verbatim to decide access. So the name is not a label on a plane — for a stretch of the stack it IS the
 * plane. Two spellings seed two documents that no later aliasing reconciles, which makes a rename after
 * the ring goes live a re-founding rather than an edit.
 *
 * ── THE STATE THIS FUNCTION SITS IN, STATED PLAINLY ─────────────────────────────────────────────
 * The boot path still names the mounted plane by the constant, coherently: the composite layer, the
 * `@oracle` registry entry, the admit payload's read of that entry and the registration all say the same
 * string, so nothing half-wires. This function stands as the resolution point that lets those move onto
 * absolute names together, in one pass, rather than one at a time — and the move costs least while the
 * inner capability ring stays unwired, because nothing has hashed a name into a document yet.
 */
export function mountedPlaneBagId(planes: readonly PersonaPlaneRef[], activeGroupId: string): string {
  return activePersonaPlane(planes, activeGroupId).bagId;
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

/** One entry as a reader hands it over — shape-agnostic, so a bootstrap plugin and a LarDoc both fit. */
export interface PlaneEntry {
  readonly title: string;
  readonly text: string | null;
}

/**
 * The family of planes this vessel carries, read from its own local entries.
 *
 * A membership entry names a PersonaGroup; that group's plane answers to a derived bag id, and the entry
 * under THAT id carries the doc url. So the two halves join by derivation rather than by an index someone
 * must keep in step — add a membership and its plane resolves, drop one and it stops resolving, with no
 * third place to update.
 *
 * A membership whose plane entry is missing is SKIPPED rather than returned half-formed: a plane with no
 * document cannot mount, cannot register, and cannot sync, so returning it would hand every caller a
 * reference that fails later and further away.
 */
export function readPersonaPlanes(entries: readonly PlaneEntry[]): PersonaPlaneRef[] {
  const urlOf = new Map(entries.map((e) => [e.title, e.text]));
  const out: PersonaPlaneRef[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.title.startsWith(`${PERSONA_MEMBERSHIP_PREFIX}/`)) continue;
    const groupId = e.text;
    if (!groupId || seen.has(groupId)) continue;
    const url = urlOf.get(personaBagIdFor(groupId));
    if (!url) continue;
    seen.add(groupId);
    out.push({ personaGroupId: groupId, url });
  }
  return out;
}

/** The membership entries a vessel writes when it comes to stand in one more PersonaGroup. */
export function personaMembershipEntries(plane: PersonaPlaneRef): PlaneEntry[] {
  return [
    { title: `${PERSONA_MEMBERSHIP_PREFIX}/${personaScopeTag(plane.personaGroupId)}`, text: plane.personaGroupId },
    { title: personaBagIdFor(plane.personaGroupId),                                    text: plane.url },
  ];
}
