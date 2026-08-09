/**
 * persona-declare — what a persona DECLARES about itself outward: its Handle name, and whether it stands
 * for a Kahu seat. The third own-side store, and the one that keeps the other two from welding together.
 *
 * WHY A THIRD STORE. The pet-name (persona-petname) names a compartment to its keeper and their own fleet;
 * the published record (persona-glamour) remembers a face this vessel ALREADY announced. Between them sits a
 * gap: a name the human INTENDS to wear outward, chosen and not yet announced. Reading that intent off the
 * pet-name would weld the private label to the public name — a human whose compartment reads "the-burner"
 * could then never stand under a different declared Handle, and every private label would silently become a public
 * commitment. So the intent gets its own store and its own act.
 *
 * THE BINDING LAW HOLDS ABOVE THIS MODULE (persona-policy#the-binding-law). A declaration DECLARES; only a
 * publicly announced Handle BINDS a PersonaGroup to a public glamour. Nothing here reaches a board — a
 * declared Handle that never announces stays a private intent, and the announce (persona-glamour) remains the
 * separate, deliberate act it always was. The declared string and the pet-name MAY read word-for-word
 * identical; two acts, two owners, and the DECLARING act — never the characters — makes a name public.
 *
 * THE SEAT STANDS APART FROM THE HANDLE. `handle` names what a persona answers to outward; `seat` says this
 * persona stands for a Kahu chair on THIS node. A persona may declare a Handle and stand for no seat (the
 * ordinary case), and the two travel together only because one human usually decides both in one breath.
 *
 * NEVER PUBLICLY FEDERATES — like the pet-name, it fleet-syncs among the human's own vessels. A seat is a
 * claim about a chair on a node, and the node's own document records who actually sits (nexus-seal-seed);
 * this store only carries what the human declared, so a peer reading it would learn an intent, never a fact.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */

import { assertHandleIndex } from "./persona-vault.js";

/** What one persona declares outward — the Handle it answers to, and whether it stands for a Kahu seat. */
export interface PersonaDeclaration {
  /** The public Handle name this persona answers to. Absent = the persona declares no outward name. */
  readonly handle?: string;
  /** True when this persona stands for a Kahu chair on this node. Absent/false = it stands for none. */
  readonly seat?: boolean;
}

/**
 * How a runtime persists the human's own-persona DECLARATIONS — a `{handleIndex -> PersonaDeclaration}` map.
 * A platform supplies the shore (node fs JSON / browser IDB), mirroring the pet-name store beside it; the
 * device-fleet adapter wraps this same shape over a private bag so a declaration rides the human's vessels.
 */
export interface PersonaDeclarationStore {
  /** Read a persona's declaration, or undefined when it has declared nothing. */
  get(handleIndex: number): Promise<PersonaDeclaration | undefined>;
  /** Write a persona's declaration whole — the caller merges, so a partial write never drops a field. */
  set(handleIndex: number, declaration: PersonaDeclaration): Promise<void>;
  /** Drop a persona's declaration — the persona survives, declaring nothing outward. */
  clear(handleIndex: number): Promise<void>;
  /** Every declaring persona, ascending by handle-index. */
  entries(): Promise<ReadonlyArray<readonly [number, PersonaDeclaration]>>;
}

/**
 * declarePersonaHandle — name the Handle this persona answers to outward, leaving any seat claim untouched.
 * A blank string REFUSES rather than silently erasing a declaration (the caller uses `clearPersonaDeclaration`),
 * so an empty write never quietly un-names a face the human means to wear.
 */
export async function declarePersonaHandle(
  store: PersonaDeclarationStore,
  handleIndex: number,
  handle: string,
): Promise<void> {
  assertHandleIndex(handleIndex);
  const trimmed = handle.trim();
  if (trimmed.length === 0) {
    throw new Error(
      `[persona-declare] empty Handle for persona h${handleIndex} — drop it via clearPersonaDeclaration, ` +
      `never by writing a blank name.`,
    );
  }
  const held = (await store.get(handleIndex)) ?? {};
  await store.set(handleIndex, { ...held, handle: trimmed });
}

/**
 * standForKahuSeat — declare that this persona stands for (or steps back from) a Kahu chair on this node.
 * Standing carries no authority: the node's own seal decides who sits, and this only says who offers.
 */
export async function standForKahuSeat(
  store: PersonaDeclarationStore,
  handleIndex: number,
  stands: boolean,
): Promise<void> {
  assertHandleIndex(handleIndex);
  const held = (await store.get(handleIndex)) ?? {};
  await store.set(handleIndex, { ...held, seat: stands });
}

/** Drop a persona's whole declaration — it keeps its key and its pet-name, and declares nothing outward. */
export async function clearPersonaDeclaration(
  store: PersonaDeclarationStore,
  handleIndex: number,
): Promise<void> {
  assertHandleIndex(handleIndex);
  await store.clear(handleIndex);
}

/** Read the Handle a persona declared, or undefined when it declared none. */
export async function declaredHandle(
  store: PersonaDeclarationStore,
  handleIndex: number,
): Promise<string | undefined> {
  assertHandleIndex(handleIndex);
  return (await store.get(handleIndex))?.handle;
}

/**
 * personasStandingForSeat — the personas that BOTH declared a Handle and stand for a Kahu seat, as
 * `[handleIndex, handle]` pairs ascending. A persona standing for a seat WITHOUT a declared Handle answers to
 * no chair name, so it cannot join a seal roster and never appears here — the seal's own door reports that
 * gap rather than seating a nameless claim.
 */
export async function personasStandingForSeat(
  store: PersonaDeclarationStore,
): Promise<ReadonlyArray<readonly [number, string]>> {
  const all = await store.entries();
  return all
    .filter(([, d]) => d.seat === true && typeof d.handle === "string" && d.handle.trim().length > 0)
    .map(([index, d]) => [index, d.handle!.trim()] as const);
}
