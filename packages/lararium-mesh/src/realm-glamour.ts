/**
 * realm-glamour — the PUBLIC face of a cabal-realm: its CHARTER, the only
 * thing that ever crosses the read-face wire. A pure disclosure SHORE (mirrors
 * mesh-palace's `snapshotPublicFlowMap`): drop-private, keep-public.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/cabal-realm#the-realm (NAMED-not-ruled —
 * "the realm's identity is content-addressed; the name grants no authority" — though
 * it does leak metadata; see THE VEIL INVARIANT below)
 * + lar:///ha.ka.ba/lararium/mesh/dreamnet-architecture ("cabalGroup = shared
 * charter, read-scope"). The read/veil tier ALREADY EXISTS as the @oracle
 * read-face (content-addressed snapshot + signed pointer, fetch-CORS, anon-read);
 * THIS cut adds NO gate-loosening. It makes a CONTENT decision: it declares WHAT a
 * ⚠ `charter` HERE NAMES THE PUBLISHED FACE — editorial, delegable, its own rate — and NOT the
 * seal lineage or the roster that `nexus-seal-seed.ts` files under the same word. Six joints ride
 * one name across this package (canon `cabal-realm#six-joints`); the naming ruling stands open.
 *
 * cabal-realm publishes PUBLICLY (its charter — veil-public) vs holds MEMBERS-ONLY
 * (its substrate + roster — private, behind the Keyhive CGKA membership),
 * and wires the charter to the existing read-face's served projection.
 *
 * THE BOUNDARY (the veil-public SET, #the-veil-public-set below):
 *   · VEIL-PUBLIC  — the CHARTER: a small, content-addressed name + bearing + a
 *                    few deliberately-published descriptive fields. Anon-readable.
 *   · MEMBERS-ONLY — the substrate CONTENT + the member ROSTER + the liveness
 *                    lease slots + the epoch keys. NEVER crosses the shore.
 *
 * THE VEIL INVARIANT (in-process CORRECTNESS, NOT a privacy guarantee):
 * `projectRealmGlamour` reads ONLY the public fields of its input and
 * constructs a literal naming ONLY charter fields. The members-only data (roster /
 * substrate content) rides the SAME input bag yet stays structurally unreachable in the
 * output — the shore never references it, so a roster or substrate content CANNOT
 * leak through THIS function. That kills the accidental roster-in-output bug. It guarantees
 * NOTHING against an adversary, who lives on the WIRE (the signed pointer
 * leaks version / activity / membership-change timing — Pfitzmann-Hansen) and at the
 * members-only STORE (its own sync + access patterns), never inside the projector.
 *
 * Platform-blind: rides ./cabal-realm + ./oracle-substrate + automerge only. NO
 * node: imports.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { from as automergeFrom } from "@automerge/automerge";
import { exportOracleSnapshot, type OracleSnapshot } from "./oracle-substrate.js";
import type { CabalRealm } from "./cabal-realm.js";

/**
 * A cabal-realm's CHARTER — its PUBLIC face, the only projection that ever crosses
 * the read-face wire. Every field here rides DELIBERATELY PUBLIC; the type carries NO
 * substrate content and NO member identities (#the-veil-public-set).
 */
export interface RealmGlamour {
  /** DELIBERATELY PUBLIC — the realm's content-addressed NAME (its sentinel DocId,
   *  hex). Canon #the-realm: knowing it grants nothing (NAMED-not-ruled), so publishing it
   *  costs nothing; it carries the address a peer needs to find + verify the realm. */
  readonly realmDocIdHex: string;
  /** DELIBERATELY PUBLIC — the realm's semantic lar: bearing (its label in l-space).
   *  An address, never a credential (lar: NAMES, it does not fetch). */
  readonly genesisUri: string;
  /** DELIBERATELY PUBLIC — a human-facing title, when the realm chooses to advertise
   *  one. Omitted when unset (a realm may stay name-only). */
  readonly title?: string;
  /** DELIBERATELY PUBLIC — a short public description / purpose line, when set. */
  readonly description?: string;
  /** DELIBERATELY PUBLIC — coarse founding time (ms epoch), when the realm chooses to
   *  advertise it. A single public timestamp; carries no per-member information. */
  readonly foundedAt?: number;
  /** DELIBERATELY PUBLIC, BUT GUARDED — a coarse, explicitly-published member count.
   *  DISCLOSURE HAZARD: a raw count can leak faction size and (worse) enable a
   *  membership-DELTA inference — watching the figure tick reveals a join/leave. So
   *  the shore NEVER derives this from the roster; it crosses ONLY when the realm
   *  EXPLICITLY publishes a coarse figure, and the conservative default OMITS it
   *  entirely. The roster itself stays members-only no matter what (#the-veil). */
  readonly memberCount?: number;
}

/**
 * The deliberately-published PUBLIC META a realm advertises in its charter — the
 * optional descriptive fields beyond the structural name+bearing. Separate from the
 * realm's private state by design: only what a realm CHOOSES to surface lives here.
 */
export interface RealmGlamourMeta {
  readonly title?:       string;
  readonly description?: string;
  readonly foundedAt?:   number;
  /** A coarse, explicitly-published figure ONLY (see RealmGlamour.memberCount).
   *  Leave undefined — the conservative default — to publish no count at all. */
  readonly memberCount?: number;
}

/**
 * The shore's INPUT — everything the publishing vessel holds about the realm,
 * PUBLIC and MEMBERS-ONLY together. The shore keeps ONLY the public
 * subset. The members-only fields ride here precisely so the shore can PROVE it
 * drops them (the roster/substrate sit in the bag; the output never names them).
 */
export interface CabalRealmPublishState {
  /** The realm itself — its public name (realmDocIdHex) + bearing (genesisUri). */
  readonly realm: CabalRealm;
  /** What the realm CHOOSES to advertise (optional descriptive fields). */
  readonly meta?: RealmGlamourMeta;
  /** MEMBERS-ONLY — the member roster (identity hexes). MUST NOT cross the shore.
   *  Present here only so a witness can watch the veil hold. */
  readonly roster?: readonly string[];
  /** MEMBERS-ONLY — the realm's substrate content (the shared doc the members
   *  maintain). MUST NOT cross the shore. Present here only as a veil witness. */
  readonly substrateContent?: unknown;
}

/**
 * THE VEIL-PUBLIC SET — the named, referenceable boundary (a pattern integrity, not
 * folklore). Canon's "shared charter, read-scope": a cabal-realm's CHARTER rides
 * veil-public (served by the read-face, anon-readable via fetch-CORS); its SUBSTRATE
 * and ROSTER stay members-only (private, behind the Keyhive CGKA membership).
 *
 * Reference this const to reason about the boundary; the shore below ENFORCES it.
 */
export const CABAL_REALM_VEIL_PUBLIC_SET = {
  /** Crosses the read-face wire — anon-readable. */
  veilPublic: [
    "realmDocIdHex",
    "genesisUri",
    "title",
    "description",
    "foundedAt",
    "memberCount", // coarse + explicitly-published only — never derived from roster
  ],
  /** NEVER crosses the shore — held behind membership (Keyhive CGKA). */
  membersOnly: [
    "substrate content",
    "member roster",
    "liveness lease slots",
    "epoch keys",
  ],
} as const;

/**
 * The PURE shore — project a realm's full publish-state to its CHARTER, the
 * veil-public face. Mirrors `publicFlowMap`/`snapshotPublicFlowMap`: keep-public,
 * drop-private. It reads ONLY `state.realm` (name + bearing) and `state.meta` (the
 * deliberately-published descriptive fields); it NEVER references `state.roster` or
 * `state.substrateContent`, so those stay structurally unreachable in the output.
 *
 * Optional fields stay omitted (never `undefined`-valued) so the charter loads
 * cleanly into Automerge and serializes deterministically.
 */
export function projectRealmGlamour(state: CabalRealmPublishState): RealmGlamour {
  const { realm, meta } = state;          // NB: roster + substrateContent deliberately NOT destructured
  const glamour: { -readonly [K in keyof RealmGlamour]: RealmGlamour[K] } = {
    realmDocIdHex: realm.realmDocIdHex,
    genesisUri:    realm.genesisUri,
  };
  if (meta?.title       !== undefined) glamour.title       = meta.title;
  if (meta?.description !== undefined) glamour.description = meta.description;
  if (meta?.foundedAt   !== undefined) glamour.foundedAt   = meta.foundedAt;
  // Coarse, explicitly-published count ONLY — never derived from the roster.
  if (meta?.memberCount !== undefined) glamour.memberCount = meta.memberCount;
  return glamour;
}

/**
 * A FIXED Automerge actorId for charter loads. Automerge's default `from` mints a
 * RANDOM actor, which lands in the saved bytes — two loads of the SAME charter would
 * then hash differently. Pinning the actor makes the snapshot bytes a PURE function
 * of the charter content, so the cid carries a true content address (stable until the
 * realm's published meta changes — exactly what a content-addressed read-face wants).
 */
const CHARTER_ACTOR_ID = "00000000000000000000000000000000" as const;

/**
 * Serialize a charter into a content-addressed snapshot (the read-face artifact),
 * reusing the EXACT @oracle mechanism (`exportOracleSnapshot`) the FLOW-map serve
 * uses — load the plain charter into a fixed-actor Automerge doc, export by content
 * hash. Deterministic: the same charter yields the same cid.
 */
export function realmGlamourSnapshot(charter: RealmGlamour): Promise<OracleSnapshot> {
  // Automerge rejects `undefined` values + the readonly interface; the charter
  // already omits unset keys (projectRealmGlamour), so this clone runs total.
  return exportOracleSnapshot(automergeFrom({ ...charter }, CHARTER_ACTOR_ID));
}

/**
 * The read-face wiring helper — produce the `exportSnapshot` shore variant that
 * serves ONLY a realm's charter. Hand it straight to the node-side read-face:
 *
 *   mountOracleReadFace({ …, exportSnapshot: realmGlamourExporter(state) })
 *
 * The read-face calls it on each change with the live doc; the charter stands STATIC
 * public meta, so the exporter ignores that arg and re-snapshots the charter (the
 * cid stays stable until the realm's published meta changes; the read-face's
 * ea-breath keeps the pointer fresh). ONLY the charter ever crosses the wire — the
 * substrate + roster never enter this path.
 */
export function realmGlamourExporter(
  state: CabalRealmPublishState,
): (doc?: unknown) => Promise<OracleSnapshot> {
  const charter = projectRealmGlamour(state);
  return (_doc?: unknown) => realmGlamourSnapshot(charter);
}
