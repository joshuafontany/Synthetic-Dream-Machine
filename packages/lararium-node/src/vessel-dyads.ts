/**
 * vessel-dyads — the live read path onto `mesh/dyad`: what relationships does this vessel hold?
 *
 * ── WHY A BRIDGE RATHER THAN A MIGRATION ────────────────────────────────────────────────────────
 * `mesh/dyad` names a relationship first-class — one human's relationship with one device — and until
 * this module nothing outside its own unit test ever called it. A model specified in code and reached
 * by no live path reads as built and behaves as absent.
 *
 * The bridge costs nothing to take. It mints no key, changes no wire format, and touches no ceremony:
 * a delegation edge ALREADY names a relationship, and this presents it as the thing it already is.
 *
 * ── WHAT IT REFUSES TO INVENT ───────────────────────────────────────────────────────────────────
 * A dyad read from an edge carries `binding: null`, because nothing has signed one. That absence
 * travels rather than hides: `fleetOfGroup` gathers only bound dyads, so an unbound one joins no
 * fleet and cannot pass as a gathered member. Presenting the relationship and claiming its gathering
 * are different acts, and only the first one has happened.
 *
 * ⚠ AND THE VEIL STAYS UNRULED. `dyadFromEdge` reads the edge's persona ROOT where the model wants a
 * per-vessel VEIL, and says so in its own comment: a root SPANS devices while a veil never does. Until
 * that ruling lands, a dyad read here names (device × root) and the model's local-key property waits.
 * This module inherits the ambiguity rather than resolving it by assertion.
 *
 * ── THE TWO SOURCES, UNIONED ────────────────────────────────────────────────────────────────────
 * A vessel holds its edge at ONE key today — `DEVICE_DELEGATION_SELF_TIDDLER`, a single `self` —
 * while `DYAD_SLOT_PREFIX` exists so a vessel carrying three faces carries three slots. Reading both
 * means the count follows the vessel rather than the reader: the day slots start landing, this returns
 * more without changing.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */

import {
  dyadFromEdge, dyadsFromDoc, DEVICE_DELEGATION_SELF_TIDDLER,
  type DyadRecord, type LarDoc, type DeviceDelegationTiddler,
} from "@lararium/mesh";

/**
 * Every relationship this vessel holds — the `self` delegation edge, plus any dyad slots on the doc.
 *
 * De-duplicated by `dyadId`, which content-addresses the ordered pair: the same relationship reached
 * through both sources reads ONCE. A slot WINS over the derived edge, because a slot may carry a
 * binding the edge cannot.
 *
 * Never throws on an absent or torn doc — a place holding no face holds no relationship, and that
 * reads as the waking floor rather than as a fault.
 */
export function vesselDyads(doc: LarDoc | undefined | null): DyadRecord[] {
  const bySlot = dyadsFromDoc(doc);
  const seen = new Map<string, DyadRecord>(bySlot.map((d) => [d.dyadId, d]));

  const record = doc?.tiddlers?.[DEVICE_DELEGATION_SELF_TIDDLER];
  const edge = record?.tiddler as unknown as DeviceDelegationTiddler | undefined;
  // A torn or absent edge yields nothing rather than a half-built dyad — the id derives from both
  // ends, so an edge missing either names no relationship at all.
  if (edge?.deviceDid && edge.personaRootDid && !seen.has(dyadFromEdge(edge).dyadId)) {
    const d = dyadFromEdge(edge);
    seen.set(d.dyadId, d);
  }
  return [...seen.values()];
}
