/**
 * persona-petname — the PRIVATE own-persona pet-name layer + the multitude-view over the whole self.
 *
 * ZOOKO'S TRIANGLE, own side (canon: lar:///ha.ka.ba/lares/api/pono/persona-policy). The GLOBAL name of
 * a persona stays the pubkey — the veiled-user key the persona-HD tree derives (persona-identity), secure-
 * and-decentralised because it IS the key. MEMORABILITY rides a LOCAL name the human keeps: on the OWN side
 * this pet-name map (a persona → a human's private label for it), on the OTHER side the handle-book (a nym →
 * the recogniser's label for someone ELSE). This module holds the own side ONLY.
 *
 * NEVER PUBLICLY FEDERATES — it FLEET-SYNCS among the human's own vessels. The pet-name map names a human's
 * OWN faces to THEMSELVES — "work", "the-guru", "the throwaway". It rides the private inside of the private
 * Vault (persona-circle#the-vault): a label the human puts on their own compartment, which their own devices
 * SHOULD carry and which no peer outside the fleet ever reads. The boundary the module holds runs PUBLIC, not
 * cross-vessel: nothing here writes to a board, and the multitude-view reads the pet-name locally, never
 * announces it.
 *
 * THE BINDING LAW. Only a PUBLICLY ANNOUNCED HANDLE binds a PersonaGroup to a public glamour (persona-glamour
 * mints that card; who-face announces it). A pet-name string carries no such binding and MUST NOT reach a
 * federating document by any path — a private label that lands on a board publishes a face the human never
 * announced. The chosen string MAY match a glamour word-for-word; the DECLARING act, never the string, makes
 * it public.
 *
 * DEVICE-FLEET (SURFACED, not blocking). A human's own PersonaGroup rides several of their own vessels; the
 * pet-name map SYNCS across that private vessel-pool, private-federated over a PRIVATE BAG in the
 * PersonaGroup. That cross-pool sync rides the device-fleet, which is not yet built (blocks on Beelay). So
 * the shore stays LOCAL-FIRST: the store persists per-vessel today, and a future fleet adapter wraps the
 * same `OwnPersonaPetnameStore` shape over a private bag — the interface never moves, the sync drops in.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */

import { assertHandleIndex, type PersonaVault } from "./persona-vault.js";

/**
 * How a runtime persists the human's PRIVATE own-persona pet-names — a `{handleIndex -> petname}` map,
 * freely renamable, never PUBLICLY federated (it fleet-syncs among the human's own vessels). A platform
 * supplies the shore (node fs JSON / browser IDB), mirroring the PersonaVault's own selector/anchor stores;
 * a later device-fleet adapter wraps this same shape over a private bag for cross-vessel sync (module header).
 */
export interface OwnPersonaPetnameStore {
  /** Read the local pet-name for a persona, or undefined when the human has named none. */
  get(handleIndex: number): Promise<string | undefined>;
  /** Set (or rename) the local pet-name for a persona — moves only the private label. */
  set(handleIndex: number, petname: string): Promise<void>;
  /** Drop the local pet-name for a persona — the persona survives under its key, unnamed. */
  clear(handleIndex: number): Promise<void>;
  /** Every named persona, ascending by handle-index — `[handleIndex, petname]` pairs. */
  entries(): Promise<ReadonlyArray<readonly [number, string]>>;
}

/**
 * renameOwnPersona — set the human's PRIVATE label for one of their own personas. The pet-name carries no
 * authority and no PUBLIC reach — it renames a compartment to its keeper and their own fleet. A blank label reads as a
 * clear-request refused here (the caller uses `clearOwnPersonaPetname` to drop a name) so an empty write
 * never silently erases a label.
 */
export async function renameOwnPersona(
  store: OwnPersonaPetnameStore,
  handleIndex: number,
  petname: string,
): Promise<void> {
  assertHandleIndex(handleIndex);
  const trimmed = petname.trim();
  if (trimmed.length === 0) {
    throw new Error(
      `[persona-petname] empty pet-name for persona h${handleIndex} — clear it via clearOwnPersonaPetname, ` +
      `never a blank rename (a blank write would silently erase the label)`,
    );
  }
  await store.set(handleIndex, trimmed);
}

/** Drop the human's PRIVATE label for a persona — the key stands, the name lifts. */
export async function clearOwnPersonaPetname(store: OwnPersonaPetnameStore, handleIndex: number): Promise<void> {
  assertHandleIndex(handleIndex);
  await store.clear(handleIndex);
}

/** Read the human's PRIVATE label for a persona, or undefined when unnamed. */
export async function ownPersonaPetname(store: OwnPersonaPetnameStore, handleIndex: number): Promise<string | undefined> {
  assertHandleIndex(handleIndex);
  return store.get(handleIndex);
}

/**
 * A read over the persona's PUBLIC side — which personas federate a `glamour`, and what it displays. The
 * multitude-view carries it to answer "does this face reach the mesh?" without fusing the public store INTO
 * the private one. persona-glamour supplies the concrete view (`publicHandleViewOf`); a vessel that
 * publishes no faces passes none (every persona reads private-only).
 */
export interface OwnPublicHandleView {
  /** The handle-indices this vessel federates a public glamour for, ascending. */
  list(): Promise<number[]>;
  /** The public display glamour for a persona, or null when it federates none. */
  glamour(handleIndex: number): Promise<string | null>;
}

/** One persona as the human sees it across the vessel — the private label + the public reach, together. */
export interface PersonaMultitudeEntry {
  /** The persona's handle-index — the `handle'` the persona-HD tree derives. */
  readonly handleIndex: number;
  /** The human's PRIVATE local label, or null when unnamed. Never leaves the vessel. */
  readonly petname: string | null;
  /** True when THIS vessel carries the persona's sovereign root (a founder); false for a joinee-only anchor. */
  readonly heldHere: boolean;
  /** True when the persona federates a public glamour onto @crossroads. */
  readonly hasPublicHandle: boolean;
  /** The public display glamour, or null when the persona federates none — the ONE name that reaches peers. */
  readonly glamour: string | null;
}

/**
 * personaMultitudeView — enumerate the human's WHOLE self across the vessel: every persona the vessel
 * touches (a held root, an anchored joinee-face, a named pet-name, or a published glamour), each tagged
 * with its private label, whether the root sits here, and whether a public glamour federates.
 *
 * The union spans FOUR local records so no face hides: the persona-root roster (founder faces), the anchor
 * roster (joinee faces the vessel wears without a root), the pet-name keys (a human may name a face before
 * founding it), and the public-handle roster (a federated glamour). Pet-name stays LOCAL — this read never
 * announces it; it only lays the private label beside the public reach for the human's own eyes.
 */
export async function personaMultitudeView(
  vault: PersonaVault,
  petnames: OwnPersonaPetnameStore,
  publicView?: OwnPublicHandleView,
): Promise<PersonaMultitudeEntry[]> {
  const roots     = await vault.listRoots();
  const anchored  = vault.anchors.list();
  const named     = (await petnames.entries()).map(([i]) => i);
  const federated = publicView ? await publicView.list() : [];

  const rootSet     = new Set(roots);
  const federatedSet = new Set(federated);
  const indices     = [...new Set([...roots, ...anchored, ...named, ...federated])].sort((a, b) => a - b);

  const view: PersonaMultitudeEntry[] = [];
  for (const handleIndex of indices) {
    const hasPublicHandle = federatedSet.has(handleIndex);
    view.push({
      handleIndex,
      petname:         (await petnames.get(handleIndex)) ?? null,
      heldHere:        rootSet.has(handleIndex),
      hasPublicHandle,
      glamour:         hasPublicHandle && publicView ? await publicView.glamour(handleIndex) : null,
    });
  }
  return view;
}
