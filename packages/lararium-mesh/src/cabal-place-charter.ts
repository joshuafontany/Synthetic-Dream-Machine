/**
 * cabal-place-charter — the PUBLIC face of a cabal-place: its CHARTER, the only
 * thing that ever crosses the read-face wire. A pure disclosure MEMBRANE (mirrors
 * mesh-palace's `snapshotPublicFlowMap`): drop-private, keep-public.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/cabal-place#the-place (NAMED-not-ruled —
 * "the place's identity is content-addressed; the name grants no authority" — though
 * it does leak metadata; see THE VEIL INVARIANT below)
 * + lar:///ha.ka.ba/lararium/mesh/dreamnet-architecture ("cabalGroup = shared
 * charter, read-scope"). The read/veil tier ALREADY EXISTS as the @oracle
 * read-face (content-addressed snapshot + signed pointer, fetch-CORS, anon-read);
 * THIS cut adds NO gate-loosening. It makes a CONTENT decision: it declares WHAT a
 * cabal-place publishes PUBLICLY (its charter — veil-public) vs holds MEMBERS-ONLY
 * (its substrate + roster — private, behind the Seam-B membership / Keyhive CGKA),
 * and wires the charter to the existing read-face's served projection.
 *
 * THE BOUNDARY (the veil-public SET, #the-veil-public-set below):
 *   · VEIL-PUBLIC  — the CHARTER: a small, content-addressed name + bearing + a
 *                    few deliberately-published descriptive fields. Anon-readable.
 *   · MEMBERS-ONLY — the substrate CONTENT + the member ROSTER + the liveness
 *                    lease slots + the epoch keys. NEVER crosses the membrane.
 *
 * THE VEIL INVARIANT (in-process CORRECTNESS, NOT a privacy guarantee):
 * `projectCabalPlaceCharter` reads ONLY the public fields of its input and
 * constructs a literal naming ONLY charter fields. The members-only data (roster /
 * substrate content) rides the SAME input bag yet is structurally unreachable in the
 * output — the membrane never references it, so a roster or substrate content CANNOT
 * leak through THIS function. That kills the accidental roster-in-output bug. It is
 * NOT a guarantee against an adversary, who lives on the WIRE (the signed pointer
 * leaks version / activity / membership-change timing — Pfitzmann-Hansen) and at the
 * members-only STORE (its own sync + access patterns), never inside the projector.
 *
 * Platform-blind: rides ./cabal-place + ./oracle-substrate + automerge only. NO
 * node: imports.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-place
 */

import { from as automergeFrom } from "@automerge/automerge";
import { exportOracleSnapshot, type OracleSnapshot } from "./oracle-substrate.js";
import type { CabalPlace } from "./cabal-place.js";

/**
 * A cabal-place's CHARTER — its PUBLIC face, the only projection that ever crosses
 * the read-face wire. Every field here is DELIBERATELY PUBLIC; the type carries NO
 * substrate content and NO member identities (#the-veil-public-set).
 */
export interface CabalPlaceCharter {
  /** DELIBERATELY PUBLIC — the place's content-addressed NAME (its sentinel DocId,
   *  hex). Canon #the-place: knowing it grants nothing (NAMED-not-ruled), so it is
   *  safe to publish; it is the address a peer needs to find + verify the place. */
  readonly placeDocIdHex: string;
  /** DELIBERATELY PUBLIC — the place's semantic lar: bearing (its label in l-space).
   *  An address, never a credential (lar: NAMES, it does not fetch). */
  readonly genesisUri: string;
  /** DELIBERATELY PUBLIC — a human-facing title, when the place chooses to advertise
   *  one. Omitted when unset (a place may stay name-only). */
  readonly title?: string;
  /** DELIBERATELY PUBLIC — a short public description / purpose line, when set. */
  readonly description?: string;
  /** DELIBERATELY PUBLIC — coarse founding time (ms epoch), when the place chooses to
   *  advertise it. A single public timestamp; carries no per-member information. */
  readonly foundedAt?: number;
  /** DELIBERATELY PUBLIC, BUT GUARDED — a coarse, explicitly-published member count.
   *  DISCLOSURE HAZARD: a raw count can leak faction size and (worse) enable a
   *  membership-DELTA inference — watching the figure tick reveals a join/leave. So
   *  the membrane NEVER derives this from the roster; it crosses ONLY when the place
   *  EXPLICITLY publishes a coarse figure, and the conservative default OMITS it
   *  entirely. The roster itself stays members-only no matter what (#the-veil). */
  readonly memberCount?: number;
}

/**
 * The deliberately-published PUBLIC META a place advertises in its charter — the
 * optional descriptive fields beyond the structural name+bearing. Separate from the
 * place's private state by design: only what a place CHOOSES to surface lives here.
 */
export interface CabalPlacePublicMeta {
  readonly title?:       string;
  readonly description?: string;
  readonly foundedAt?:   number;
  /** A coarse, explicitly-published figure ONLY (see CabalPlaceCharter.memberCount).
   *  Leave undefined — the conservative default — to publish no count at all. */
  readonly memberCount?: number;
}

/**
 * The membrane's INPUT — everything the publishing vessel holds about the place,
 * PUBLIC and MEMBERS-ONLY together. The membrane's job is to keep ONLY the public
 * subset. The members-only fields ride here precisely so the membrane can PROVE it
 * drops them (the roster/substrate sit in the bag; the output never names them).
 */
export interface CabalPlacePublishState {
  /** The place itself — its public name (placeDocIdHex) + bearing (genesisUri). */
  readonly place: CabalPlace;
  /** What the place CHOOSES to advertise (optional descriptive fields). */
  readonly meta?: CabalPlacePublicMeta;
  /** MEMBERS-ONLY — the member roster (identity hexes). MUST NOT cross the membrane.
   *  Present here only so the veil can be witnessed to hold. */
  readonly roster?: readonly string[];
  /** MEMBERS-ONLY — the place's substrate content (the shared doc the members
   *  maintain). MUST NOT cross the membrane. Present here only as a veil witness. */
  readonly substrateContent?: unknown;
}

/**
 * THE VEIL-PUBLIC SET — the named, referenceable boundary (a pattern integrity, not
 * folklore). Canon's "shared charter, read-scope": a cabal-place's CHARTER is
 * veil-public (served by the read-face, anon-readable via fetch-CORS); its SUBSTRATE
 * and ROSTER are members-only (private, behind the Seam-B membership / Keyhive CGKA).
 *
 * Reference this const to reason about the boundary; the membrane below ENFORCES it.
 */
export const CABAL_PLACE_VEIL_PUBLIC_SET = {
  /** Crosses the read-face wire — anon-readable. */
  veilPublic: [
    "placeDocIdHex",
    "genesisUri",
    "title",
    "description",
    "foundedAt",
    "memberCount", // coarse + explicitly-published only — never derived from roster
  ],
  /** NEVER crosses the membrane — held behind membership (CGKA / Seam-B). */
  membersOnly: [
    "substrate content",
    "member roster",
    "liveness lease slots",
    "epoch keys",
  ],
} as const;

/**
 * The PURE membrane — project a place's full publish-state to its CHARTER, the
 * veil-public face. Mirrors `publicFlowMap`/`snapshotPublicFlowMap`: keep-public,
 * drop-private. It reads ONLY `state.place` (name + bearing) and `state.meta` (the
 * deliberately-published descriptive fields); it NEVER references `state.roster` or
 * `state.substrateContent`, so those are structurally unreachable in the output.
 *
 * Optional fields stay omitted (never `undefined`-valued) so the charter loads
 * cleanly into Automerge and serializes deterministically.
 */
export function projectCabalPlaceCharter(state: CabalPlacePublishState): CabalPlaceCharter {
  const { place, meta } = state;          // NB: roster + substrateContent deliberately NOT destructured
  const charter: { -readonly [K in keyof CabalPlaceCharter]: CabalPlaceCharter[K] } = {
    placeDocIdHex: place.placeDocIdHex,
    genesisUri:    place.genesisUri,
  };
  if (meta?.title       !== undefined) charter.title       = meta.title;
  if (meta?.description !== undefined) charter.description = meta.description;
  if (meta?.foundedAt   !== undefined) charter.foundedAt   = meta.foundedAt;
  // Coarse, explicitly-published count ONLY — never derived from the roster.
  if (meta?.memberCount !== undefined) charter.memberCount = meta.memberCount;
  return charter;
}

/**
 * A FIXED Automerge actorId for charter loads. Automerge's default `from` mints a
 * RANDOM actor, which lands in the saved bytes — two loads of the SAME charter would
 * then hash differently. Pinning the actor makes the snapshot bytes a PURE function
 * of the charter content, so the cid is a true content address (stable until the
 * place's published meta changes — exactly what a content-addressed read-face wants).
 */
const CHARTER_ACTOR_ID = "00000000000000000000000000000000" as const;

/**
 * Serialize a charter into a content-addressed snapshot (the read-face artifact),
 * reusing the EXACT @oracle mechanism (`exportOracleSnapshot`) the FLOW-map serve
 * uses — load the plain charter into a fixed-actor Automerge doc, export by content
 * hash. Deterministic: the same charter yields the same cid.
 */
export function cabalPlaceCharterSnapshot(charter: CabalPlaceCharter): Promise<OracleSnapshot> {
  // Automerge rejects `undefined` values + the readonly interface; the charter
  // already omits unset keys (projectCabalPlaceCharter), so this clone is total.
  return exportOracleSnapshot(automergeFrom({ ...charter }, CHARTER_ACTOR_ID));
}

/**
 * The read-face wiring helper — produce the `exportSnapshot` membrane variant that
 * serves ONLY a place's charter. Hand it straight to the node-side read-face:
 *
 *   mountOracleReadFace({ …, exportSnapshot: cabalPlaceCharterExporter(state) })
 *
 * The read-face calls it on each change with the live doc; the charter is STATIC
 * public meta, so the exporter ignores that arg and re-snapshots the charter (the
 * cid stays stable until the place's published meta changes; the read-face's
 * ea-breath keeps the pointer fresh). ONLY the charter ever crosses the wire — the
 * substrate + roster never enter this path.
 */
export function cabalPlaceCharterExporter(
  state: CabalPlacePublishState,
): (doc?: unknown) => Promise<OracleSnapshot> {
  const charter = projectCabalPlaceCharter(state);
  return (_doc?: unknown) => cabalPlaceCharterSnapshot(charter);
}
