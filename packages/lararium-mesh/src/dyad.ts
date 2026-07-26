/**
 * dyad — the vessel×veil RELATIONSHIP, made first-class.
 *
 * A dyad names neither a place nor a person: it names ONE HUMAN'S RELATIONSHIP WITH ONE DEVICE. That reading
 * carries the whole model. A vessel-key names the PLACE; a veil-key names a face AS HELD ON THAT PLACE; the
 * dyad names what stands BETWEEN them, and a single vessel holds N of them.
 *
 * THE VEIL KEY STAYS LOCAL. Every vessel×veil pair reads UNIQUE at the infra layer — a veil key never spans
 * devices, so no infra-layer key ever links one human's places to each other. Nothing at this layer can be
 * correlated into a person, which is exactly the property the layer exists to hold.
 *
 * WHY THE RELATIONSHIP RATHER THAN EITHER PARTY. Bind identity to a vessel and a human loses themselves when
 * a device dies. Bind it to a veil alone and the vessel carrying it stays anonymous to the model. The dyad
 * holds both ends without merging them — the two-key atom's edge, given a name of its own.
 *
 * THE DEEPER READING (operator ruling, 2026-07-26): IDENTITY ALWAYS NAMES A RELATIONSHIP, NEVER A THING.
 * That holds outside this codebase too — every pet-name a human uses names a relation they stand in, and the
 * "thing" underneath reads as an inference nobody ever verifies. So the dyad does not JOIN two identities;
 * the dyad IS the identity, and vessel and veil name its two ends.
 *
 * ── THE PERSONA BRIDGES LOCAL INFRA TO THE SOCIAL LAYER, INTERNAL FIRST ─────────────────────────────────
 * Because infra keys correlate to nothing, SOMETHING must gather a human's places back together — and that
 * something belongs one layer up, where the human stands rather than the machine. The PersonaGroup holds its
 * OWN keys and BINDS the locally-unique dyads into one fleet. The binding runs cryptographic (the group's
 * sentinel membership in the authority graph), never a label anyone could assert.
 *
 * THREE NAMES, THREE JOBS, and none substitutes for another:
 *   · the BINDING — the PersonaGroup's keys, which make the fleet a fact rather than a claim
 *   · the INTERNAL name — one usable label over that group, private and local, for the human alone
 *   · the HANDLE — an OPTIONAL public pet-name over the same group, and the only one that ever federates
 *
 * Per `group-as-closure`, the fleet EVALUATES AS A QUERY over that binding and never instantiates: nothing
 * stores a fleet object to seize, forge, or sync. The internal name never crosses a wire, so a captured
 * vessel spills the dyads admitted TO IT and never the human's map of themselves.
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
import { sha256HexSync, canonicalJson, canonicalJsonBytes } from "./crypto.js";
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
  /**
   * The PRESENTED delegation edge binding this relationship into a fleet, or null while it stands unbound.
   *
   * A bare group-id string would read as a POINTER a reader resolves against whatever replica state it
   * happens to hold — the confused deputy in its textbook form, since the designation names a target while
   * ambient state supplies the authority. This carries its own authority instead: the group root SIGNED this
   * exact relationship at a named epoch, so a verifier needs the edge and the root DID and nothing else.
   */
  readonly binding: DyadBinding | null;
}

/**
 * The group root's signature over ONE relationship — designation carrying authority.
 *
 * WHAT A FOREIGN VERIFIER NEEDS: this edge and the group's root DID. No roster, no replica of the membership
 * graph, no directory, no clock. That matters beyond convenience — the whole membership-CRDT family buys
 * convergence by replicating the op graph to every member, which hands each of them the roster AND the
 * device-to-human linkage. A presented edge hands over neither.
 *
 * REVOCATION RIDES THE EPOCH, POSITIVELY. A binding names the epoch it roots on; advancing the group's epoch
 * leaves a stale edge behind without anyone delivering a negative fact. Every scheme that instead depends on
 * a revocation MESSAGE arriving — CRLs, OCSP, PGP revocation, UCAN's own concession — fails in the partition
 * that motivates it.
 */
export interface DyadBinding {
  /** The group root that signed this edge — the fleet's public identifier, and all a verifier needs. */
  readonly groupRootDid: LarDid;
  /** The epoch this binding roots on. An ORDER, never an instant — a causal island holds no global now. */
  readonly epoch:        string;
  /** ed25519 over `dyadBindingBytes`, by `groupRootDid`. */
  readonly sig:          string;
}

/**
 * The bytes a binding signs. It covers BOTH ends of the relationship, so an edge cannot lift off one dyad
 * and land on another, and the epoch it roots on, so a verifier scopes it the way the antigen scopes an entry.
 */
export function dyadBindingBytes(ref: DyadRef, groupRootDid: LarDid, epoch: string): Uint8Array {
  return canonicalJsonBytes({
    kind:         "lar-dyad-binding/v1",
    vesselDid:    normalizeDid(ref.vesselDid),
    veilDid:      normalizeDid(ref.veilDid),
    groupRootDid: normalizeDid(groupRootDid),
    epoch,
  });
}

/** Mint the edge — run where the group ROOT lives, never on the vessel presenting it. */
export async function signDyadBinding(
  ref: DyadRef, groupRootDid: LarDid, epoch: string,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<DyadBinding> {
  return { groupRootDid, epoch, sig: await sign(dyadBindingBytes(ref, groupRootDid, epoch)) };
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
export function dyadFromEdge(edge: DeviceDelegationTiddler, binding: DyadBinding | null = null): DyadRecord {
  const ref: DyadRef = { vesselDid: edge.deviceDid, veilDid: edge.operatorDid };
  return { kind: DYAD_ID_DOMAIN, dyadId: dyadId(ref), ref, edge, binding };
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
  const b = p["binding"];
  let binding: DyadBinding | null = null;
  if (typeof b === "object" && b !== null) {
    const x = b as Record<string, unknown>;
    if (typeof x["groupRootDid"] === "string" && typeof x["epoch"] === "string" && typeof x["sig"] === "string") {
      binding = { groupRootDid: x["groupRootDid"], epoch: x["epoch"], sig: x["sig"] };
    }
  }
  const record = dyadFromEdge(edge as unknown as DeviceDelegationTiddler, binding);
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

/**
 * The identifier the GROUP binds when it gathers this relationship.
 *
 * The veil key already reads UNIQUE per vessel×veil by the infra law, so the relationship already holds an
 * identifier of its own — no fresh key material buys what the model already carries. Binding at THIS grain
 * rather than at the vessel's carries three consequences the vessel grain cannot:
 *   · two faces on one device gather INDEPENDENTLY, so a human may bring one and withhold the other
 *   · verifying one face's membership reveals NOTHING about the device beneath it
 *   · a compromised vessel exposes the relationships admitted to it, never the fleet's whole roster
 */
export function dyadAgentDid(record: DyadRecord): LarDid {
  return record.ref.veilDid;
}

/** The dyads one VESSEL carries across every veil — a place's faces. */
export function dyadsOnVessel(dyads: readonly DyadRecord[], vesselDid: LarDid): DyadRecord[] {
  const want = normalizeDid(vesselDid);
  return dyads.filter((d) => normalizeDid(d.ref.vesselDid) === want);
}

/**
 * THE FLEET — the closure the PersonaGroup binding names, evaluated here and never stored.
 *
 * It gathers by the GROUP, because the group's keys are what make a fleet a fact. A label gathers nothing:
 * anyone can write a label, and a fleet assembled from labels would let a forged record walk into a human's
 * own map of themselves. The binding decides membership; the internal name only makes it usable.
 *
 * An UNBOUND dyad joins no fleet — absence of a binding reads as a relationship not yet gathered, never as
 * membership in a default group.
 */
export function fleetOfGroup(dyads: readonly DyadRecord[], groupRootDid: LarDid): DyadRecord[] {
  const want = normalizeDid(groupRootDid);
  if (want.length === 0) return [];
  return dyads.filter((d) => d.binding && normalizeDid(d.binding.groupRootDid) === want);
}

/**
 * The fleet a verifier can STAND BEHIND — each candidate re-checked against the group's own membership.
 *
 * `fleetOfGroup` reads what each record CLAIMS, which suffices for a human reading their own store. This
 * checks each claim against the signature carrying it — one Ed25519 verify per dyad, against the group root
 * DID the caller already names. No roster, no replica of a membership graph, no directory, no clock.
 *
 * THE TIERING THIS MAKES POSSIBLE. A foreign peer verifies presented edges and never sees the fleet; only
 * co-members hold the wider graph. The membership-CRDT family cannot offer that split — it buys convergence
 * by replicating the op graph to everyone, handing each member the roster and the device-to-human linkage.
 *
 * A verify that THROWS reads as refusal rather than as an exception: an unreachable check must never WIDEN a
 * fleet, so absence of an answer lands closed.
 */
export async function verifiedFleetOfGroup(
  dyads: readonly DyadRecord[],
  groupRootDid: LarDid,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: LarDid) => Promise<boolean>,
  shadowed: ReadonlySet<string> = new Set(),
): Promise<DyadRecord[]> {
  // A SHADOWED relationship stands aside before any signature runs. The edge it presents may verify
  // perfectly — a valid edge set aside stays set aside, which is the whole difference between a kāpae and
  // an expiry. Checking here rather than after keeps a raised marker unconditional.
  const claimed = fleetOfGroup(dyads, groupRootDid).filter((d) => !shadowed.has(d.dyadId));
  const verdicts = await Promise.all(claimed.map((d) =>
    verify(dyadBindingBytes(d.ref, d.binding!.groupRootDid, d.binding!.epoch), d.binding!.sig, d.binding!.groupRootDid)
      .catch(() => false)));
  return claimed.filter((_, i) => verdicts[i] === true);
}

/**
 * Every fleet these dyads bind into, as `personaGroupId -> dyads`. The same closure, run once across all
 * bindings — it still computes, and still stores nothing.
 */
export function fleetsOf(dyads: readonly DyadRecord[]): Map<string, DyadRecord[]> {
  const out = new Map<string, DyadRecord[]>();
  for (const d of dyads) {
    if (!d.binding) continue;                    // unbound stays ungathered
    const root = normalizeDid(d.binding.groupRootDid);
    const bucket = out.get(root);
    if (bucket) bucket.push(d); else out.set(root, [d]);
  }
  return out;
}

export function fleetSpan(fleet: readonly DyadRecord[]): number {
  return new Set(fleet.map((d) => normalizeDid(d.ref.vesselDid))).size;
}

// ── The fleet LABEL store — what `fleetUnderPetname` reads ────────────────────────────────────────────────
//
// THE NAME SITS ON THE GROUP, NEVER ON THE BINDING. The PersonaGroup's keys decide WHICH dyads belong; this
// store only makes that fleet addressable to the human who holds it ("my work fleet"). Renaming moves a label
// and never a membership — which is the whole reason the two stay apart. Its sibling
// `OwnPersonaPetnameStore` labels a veil on one vessel; this labels a fleet across them.
//
// PRIVATE AND LOCAL, like its sibling. The label carries no authority, never federates, and never crosses a
// wire — it holds the human's own map of themselves, which a captured vessel must not spill.

/** How a runtime persists the human's PRIVATE fleet names — a `{personaGroupId -> petname}` map. */
export interface FleetPetnameStore {
  get(personaGroupId: string): Promise<string | undefined>;
  set(personaGroupId: string, petname: string): Promise<void>;
  clear(personaGroupId: string): Promise<void>;
  /** Every named fleet — `[personaGroupId, petname]` pairs. */
  entries(): Promise<ReadonlyArray<readonly [string, string]>>;
}

/** Name a fleet. A blank label REFUSES rather than silently erasing one; naming never alters membership. */
export async function nameFleet(store: FleetPetnameStore, personaGroupId: string, petname: string): Promise<void> {
  const trimmed = petname.trim();
  if (trimmed.length === 0) {
    throw new Error("nameFleet: a blank label names no fleet — use `unnameFleet` to drop one.");
  }
  await store.set(personaGroupId, trimmed);
}

/** Drop a fleet's private name. The fleet SURVIVES, unnamed — the binding decides membership, not the label. */
export async function unnameFleet(store: FleetPetnameStore, personaGroupId: string): Promise<void> {
  await store.clear(personaGroupId);
}

/**
 * Snapshot the names once, so rendering a set of fleets stays synchronous and side-effect-free rather than a
 * lookup that could fail halfway through and leave half of them nameless.
 */
export async function fleetPetnameResolver(store: FleetPetnameStore): Promise<(personaGroupId: string) => string | undefined> {
  const map = new Map(await store.entries());
  return (id: string) => map.get(id);
}
