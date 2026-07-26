/**
 * dyad — the vessel×veil RELATIONSHIP, made first-class.
 *
 * A dyad names neither a place nor a person: it names ONE HUMAN'S RELATIONSHIP WITH ONE DEVICE. That reading
 * carries the whole model. A vessel-key names the PLACE and stays singular per install; a veil-key names a
 * FACE and a human holds many; the dyad names what stands BETWEEN them, and a single vessel holds N of them.
 *
 * WHY THE RELATIONSHIP RATHER THAN EITHER PARTY. Bind identity to a vessel and a human loses themselves when
 * a device dies. Bind it to a veil alone and the vessel carrying it stays anonymous to the model. The dyad
 * holds both ends without merging them — the two-key atom's edge, given a name of its own.
 *
 * ── THE FLEET RIDES AS A CLOSURE, NEVER AS A STORED GROUP ────────────────────────────────────────────────
 * A PersonaGroup gathers a FLEET of dyads under one internal pet-name the human chose. It gathers by that
 * chosen label rather than by any key, so a human may group dyads across faces, and the grouping stays
 * theirs. Per `group-as-closure`, the fleet EVALUATES AS A QUERY and never instantiates: nothing stores a
 * fleet object that could be seized, forged, or synced. `fleetUnderPetname` runs that query.
 *
 * The label stays PRIVATE and LOCAL — the reader's own name for their own relationships. A public Handle
 * rides separately as an OPTIONAL public pet-name over a fleet; the internal label never crosses a wire, so
 * a captured vessel spills the dyads admitted TO IT and never the human's map of themselves.
 *
 * ── WHAT A DYAD ID DOES AND DOES NOT REVEAL ─────────────────────────────────────────────────────────────
 * The id content-addresses the ordered pair, so two parties knowing both keys derive the identical id while
 * the id alone yields neither. Slots key by that id rather than by the veil, so a vessel's own storage never
 * lays its faces out in the open for whoever reads a key list.
 *
 * Platform-blind: rides ./crypto + ./base-doc + ./device-delegation types only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle · lar:///ha.ka.ba/lares/api/pono/group-as-closure
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import { sha256HexSync, canonicalJson } from "./crypto.js";
import type { DeviceDelegationTiddler, LarDid } from "./device-delegation.js";

/** The domain a dyad id hashes under — so an id never collides with another content-address in the tree. */
export const DYAD_ID_DOMAIN = "lar-dyad/v1" as const;

/** The tiddler-key prefix a vessel's dyad slots ride under — N slots, never one `self`. */
export const DYAD_SLOT_PREFIX = "lar:///ha.ka.ba/dreamnet/dyad/" as const;

/** The two ends of one relationship. Order carries meaning: the PLACE first, the FACE second. */
export interface DyadRef {
  /** "0x"+hex — the vessel this relationship runs ON (the PLACE's own key). */
  readonly vesselDid: LarDid;
  /** "0x"+hex — the veil this relationship runs UNDER (the HUMAN's face). */
  readonly veilDid:   LarDid;
}

/**
 * A dyad as a vessel holds it: the relationship, plus the signed edge that establishes it.
 *
 * The edge remains the AUTHORITY — this record adds a name and a slot, never a second source of truth. A
 * reader that trusts the record without verifying the edge trusts a label; the edge stays the thing signed.
 */
export interface DyadRecord {
  readonly kind:      typeof DYAD_ID_DOMAIN;
  readonly dyadId:    string;
  readonly ref:       DyadRef;
  /** The device-delegation the veil signed over this vessel — what makes the relationship real. */
  readonly edge:      DeviceDelegationTiddler;
}

/** Lowercase a DID once, so two spellings of one key never derive two ids. */
function normalizeDid(did: LarDid): string {
  return did.trim().toLowerCase();
}

/**
 * The content-address of one relationship. Deterministic and order-fixed, so both ends derive the same id
 * without coordinating, and re-deriving it later needs no stored mapping.
 */
export function dyadId(ref: DyadRef): string {
  return sha256HexSync(canonicalJson({
    kind:      DYAD_ID_DOMAIN,
    vesselDid: normalizeDid(ref.vesselDid),
    veilDid:   normalizeDid(ref.veilDid),
  }));
}

/** The tiddler key one dyad rides under. Keyed by ID, so a key list never enumerates a human's faces. */
export function dyadSlotKey(id: string): string {
  return `${DYAD_SLOT_PREFIX}${id}`;
}

/**
 * Build the record for a relationship the edge already establishes. It DERIVES the ref from the edge rather
 * than accepting one alongside it, because two sources for one fact eventually disagree, and the signed one
 * must win. An edge names its operator (the veil that signed) and its device (the vessel that carries).
 */
export function dyadFromEdge(edge: DeviceDelegationTiddler): DyadRecord {
  const ref: DyadRef = { vesselDid: edge.deviceDid, veilDid: edge.operatorDid };
  return { kind: DYAD_ID_DOMAIN, dyadId: dyadId(ref), ref, edge };
}

/**
 * Land a dyad onto a doc draft — one slot per relationship, so a vessel carrying three faces carries three
 * slots rather than overwriting one. Call INSIDE a `handle.change()` callback.
 */
export function writeDyad(draft: LarDoc, record: DyadRecord): void {
  const key = dyadSlotKey(record.dyadId);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(record) }, record.dyadId);
}

/** A parsed payload reads as a dyad only at the exact FLOOR shape, and only when its id RE-DERIVES. */
function coerceDyad(parsed: unknown): DyadRecord | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== DYAD_ID_DOMAIN) return null;
  const edge = p["edge"];
  if (typeof edge !== "object" || edge === null) return null;
  const e = edge as Record<string, unknown>;
  if (e["kind"] !== "device-delegation") return null;
  if (typeof e["operatorDid"] !== "string" || typeof e["deviceDid"] !== "string") return null;
  const record = dyadFromEdge(edge as unknown as DeviceDelegationTiddler);
  // A slot claiming an id its own edge does not produce reads as torn — drop it rather than trust the label
  // over the signature. The id costs nothing to recompute, so nothing excuses trusting the stored one.
  if (typeof p["dyadId"] === "string" && p["dyadId"] !== record.dyadId) return null;
  return record;
}

/** Every well-formed dyad a doc carries. A torn or foreign tiddler drops in silence; an absent doc yields none. */
export function dyadsFromDoc(doc: LarDoc | undefined | null): DyadRecord[] {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];
  const out: DyadRecord[] = [];
  for (const record of Object.values(tiddlers)) {
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }
    const dyad = coerceDyad(parsed);
    if (dyad !== null) out.push(dyad);
  }
  return out;
}

/** The dyads one VEIL holds across every vessel — a face's reach. */
export function dyadsOfVeil(dyads: readonly DyadRecord[], veilDid: LarDid): DyadRecord[] {
  const want = normalizeDid(veilDid);
  return dyads.filter((d) => normalizeDid(d.ref.veilDid) === want);
}

/** The dyads one VESSEL carries across every veil — a place's faces. */
export function dyadsOnVessel(dyads: readonly DyadRecord[], vesselDid: LarDid): DyadRecord[] {
  const want = normalizeDid(vesselDid);
  return dyads.filter((d) => normalizeDid(d.ref.vesselDid) === want);
}

/**
 * THE FLEET — the closure a PersonaGroup names, evaluated here and never stored.
 *
 * The human labels relationships; the dyads carrying one label form the fleet. Grouping runs off that CHOSEN
 * label rather than off any key, so a human may gather dyads across faces and the gathering stays theirs
 * alone. `petnameOf` reads the caller's own private store, which is why no fleet object exists to seize.
 *
 * An unlabelled dyad belongs to no fleet — absence of a label reads as an ungathered relationship, never as
 * membership in a default group.
 */
export function fleetUnderPetname(
  dyads: readonly DyadRecord[],
  petname: string,
  petnameOf: (dyadId: string) => string | undefined,
): DyadRecord[] {
  const want = petname.trim();
  if (want.length === 0) return [];
  return dyads.filter((d) => petnameOf(d.dyadId)?.trim() === want);
}

/**
 * Every fleet the human has gathered, as `petname -> dyads`. A convenience over the same closure — it still
 * computes, still stores nothing, and still reads only the caller's own labels.
 */
export function fleetsOf(
  dyads: readonly DyadRecord[],
  petnameOf: (dyadId: string) => string | undefined,
): Map<string, DyadRecord[]> {
  const out = new Map<string, DyadRecord[]>();
  for (const d of dyads) {
    const label = petnameOf(d.dyadId)?.trim();
    if (!label) continue;                       // ungathered stays ungathered
    const bucket = out.get(label);
    if (bucket) bucket.push(d); else out.set(label, [d]);
  }
  return out;
}

/**
 * How many DISTINCT vessels a fleet spans — the number that decides whether exit means anything.
 *
 * A fleet gathered entirely on one vessel provides no continuity when that vessel dies or turns hostile; the
 * same fleet spread across several provides it without asking anyone's permission. Exit disciplines a holder
 * only while leaving stays cheap, and leaving stays cheap only while the fleet reaches past one place.
 */
export function fleetSpan(fleet: readonly DyadRecord[]): number {
  return new Set(fleet.map((d) => normalizeDid(d.ref.vesselDid))).size;
}

// ── The fleet LABEL store — what `fleetUnderPetname` reads ────────────────────────────────────────────────
//
// TWO LABELS, TWO OBJECTS, and they do not collapse. `OwnPersonaPetnameStore` labels a VEIL — one face,
// keyed by its handle-index ("my work face"). This labels a DYAD — one relationship ("gather this one into
// my work fleet"). A human who gathers only whole faces will see the two agree; a human who gathers CERTAIN
// relationships across faces needs the finer key, and the model admits that gathering, so the store must too.
//
// PRIVATE AND LOCAL, like its sibling. The label carries no authority, never federates, and never crosses a
// wire — it holds the human's own map of themselves, which a captured vessel must not spill.

/** How a runtime persists the human's PRIVATE fleet labels — a `{dyadId -> petname}` map, freely renamable. */
export interface DyadPetnameStore {
  get(dyadId: string): Promise<string | undefined>;
  set(dyadId: string, petname: string): Promise<void>;
  clear(dyadId: string): Promise<void>;
  /** Every labelled relationship — `[dyadId, petname]` pairs. */
  entries(): Promise<ReadonlyArray<readonly [string, string]>>;
}

/** Gather one relationship into a named fleet. A blank label REFUSES rather than silently erasing one. */
export async function gatherDyad(store: DyadPetnameStore, id: string, petname: string): Promise<void> {
  const trimmed = petname.trim();
  if (trimmed.length === 0) {
    throw new Error("gatherDyad: a blank label names no fleet — use `ungatherDyad` to drop one.");
  }
  await store.set(id, trimmed);
}

/** Drop a relationship out of its fleet. The dyad survives, ungathered — never deleted by losing a label. */
export async function ungatherDyad(store: DyadPetnameStore, id: string): Promise<void> {
  await store.clear(id);
}

/**
 * Snapshot the labels into the pure resolver `fleetUnderPetname`/`fleetsOf` take. Reading the whole map ONCE
 * keeps the closures synchronous and side-effect-free, so a fleet stays a computation over data the caller
 * already holds rather than a lookup that could fail halfway through and yield half a fleet.
 */
export async function dyadPetnameResolver(store: DyadPetnameStore): Promise<(id: string) => string | undefined> {
  const map = new Map(await store.entries());
  return (id: string) => map.get(id);
}
