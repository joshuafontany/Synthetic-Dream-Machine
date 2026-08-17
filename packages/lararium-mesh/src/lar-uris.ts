/**
 * lar-uris — lar:/// URI constants and builders for the Lararium namespace.
 * Meme: lar:///ha.ka.ba/lararium/mesh/lar-uris
 * Grammar doc: lar:///ha.ka.ba/lararium/mesh/lar-uris (bags/@lararium/mesh/lar-uris.md)
 */

import type { LarDoc } from "./base-doc.js";
import { emptyLarDoc } from "./base-doc.js";

export const STABLE_L_SPACE = "ha.ka.ba";
export const LAR_PREFIX = `lar:///${STABLE_L_SPACE}/` as const;
export const TAG_PREFIX = `${LAR_PREFIX}tags/` as const;

// ── Volatile VM l-space ───────────────────────────────────────────────────
// Ha/domain=lararium · Ka/quality=local · Ba/dynamic=vm
// Tiddlers here are scratch — never persisted through IslandAdaptor, never
// synced via Automerge. Each vessel's daemon VM owns its own volatile namespace.
export const VOLATILE_VM_L_SPACE = "lararium.local.vm";
export const VOLATILE_VM_PREFIX   = `lar:///${VOLATILE_VM_L_SPACE}/` as const;

export function volatileVmUri(path: string): string {
  return `${VOLATILE_VM_PREFIX}${path.replace(/^\/+/, "")}`;
}

export function isVolatileVmUri(uri: string): boolean {
  return uri.startsWith(VOLATILE_VM_PREFIX);
}

// ── Petname l-space regions (the NAMING / addressing layer) ───────────────
// Petnames and TW5 titles ride the lar: grammar as their own abstraction layer,
// SEPARATE from both federation and persistence
// (lar:///ha.ka.ba/lares/api/pono/lararium-identity#capability-and-petnames).
// This layer classifies an address by NAME-STABILITY only:
//   STABLE   — root ha.ka.ba — a canonical, permanent, shared address.
//   UNSTABLE — any other three-term attitude root — a session/per-relationship/
//              per-place LOCAL name a vessel grows for the peers and places it meets.
// Two axes stay ORTHOGONAL to this naming layer — neither is decided by the namespace:
//   · FEDERATION  — what crosses to peers — is controlled by the RESIDENCY BAG
//                   (which bag holds the content) + capability, never by the name.
//   · PERSISTENCE — local-store writes — covers every meme; only the reserved
//                   volatile VM root (lararium.local.vm) is pure scratch (see below).

/** The authority-less root token of a local-form `lar:///<root>/…` URI; undefined for session-form or non-lar. */
export function larRoot(uri: string): string | undefined {
  const m = /^lar:\/\/\/([^/]+)(?:\/|$)/.exec(uri);
  return m ? m[1] : undefined;
}

/** Stable l-space (ha.ka.ba) — a canonical, permanent, shared address (NAMING only; says nothing about federation or persistence). */
export function isStableLarUri(uri: string): boolean {
  return larRoot(uri) === STABLE_L_SPACE;
}

/** An unstable petname — a session/per-relationship/per-place LOCAL name (any three-term root but the reserved volatile VM). NAMING only. */
export function isUnstablePetnameUri(uri: string): boolean {
  const root = larRoot(uri);
  return root !== undefined && root !== STABLE_L_SPACE && root !== VOLATILE_VM_L_SPACE;
}

/** A lar: URI persists to the local store unless it is pure volatile-VM scratch — every meme persists, stable and unstable alike. */
export function isPersistableLarUri(uri: string): boolean {
  return uri.startsWith("lar:") && !isVolatileVmUri(uri);
}

export function stableLarUri(path: string): string {
  return `${LAR_PREFIX}${path.replace(/^\/+/, "")}`;
}

export function stableTagUri(name: string): string {
  return `${TAG_PREFIX}${name.replace(/^\/+/, "")}`;
}

// ── Lares verb-tiddler namespace (DOM summon → verse-event) ────────────────
// A TW5 <$button> summons a verb by writing a tiddler whose TITLE names the verb
// (`…/verb/<verb>` — PURE BEARING, the URI-carries-bearing law: the address names the
// verb, nothing per-invocation) and whose `verb` field re-states it. Per-invocation
// ARGS ride as sibling `arg-<name>` fields on the same tiddler, NOT smuggled into the
// URI — the reaction-router lifts them into a structured args payload the verse-event
// carries (#48). A GENUINE dispatch also sets the `lares-dispatch` marker field; the
// router fires a verb verse-event ONLY on a marked tiddler, so the verb machinery's own
// lar:-titled writes (`…/verbs/<id>` invocations, `@daemon/outcomes/<id>` outcomes —
// which carry a `verb` field but never the marker) stay router-inert BY CONSTRUCTION,
// and no dispatch loop can form. The VOLATILE namespace keeps the summon tiddler
// reaction-routable (lar: prefix) yet unpersisted/unsynced (isVolatileVmUri → the
// capture path skips it).
export const LARES_VERB_URI_PREFIX = volatileVmUri("verb/");

/**
 * The dispatch-intent MARKER field. A genuine DOM verb-summon carries `lares-dispatch`
 * (truthy); the reaction-router fires the verb verse-event only on a marked tiddler.
 * The verb machinery's own invocation/outcome builders NEVER set it — that positive,
 * fail-safe discriminator (absent → no fire) is what breaks the reaction loop (#48).
 */
export const LARES_DISPATCH_FIELD = "lares-dispatch";

/** Field-name prefix carrying a summon's named args (`arg-slug`, `arg-bagUrl`, …). The
 *  reaction-router lifts every `arg-<name>` field into the structured args payload. */
export const LARES_VERB_ARG_PREFIX = "arg-";

/** The single flat-wire key the structured summon args ride as a JSON string. IslandMsg_Event
 *  payloads admit only scalars (GP-2), so the router's structured args serialize to this key
 *  crossing the worker→vessel boundary; the vessel re-parses via `verbArgsFromPayload` (#48). */
export const LARES_VERB_ARGS_WIRE_FIELD = "verb-args";

/** Re-parse the structured summon args off a flat verse-event payload (`verb-args` JSON string).
 *  Empty object when absent or malformed — a summon with no args is the common case. */
export function verbArgsFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const raw = payload[LARES_VERB_ARGS_WIRE_FIELD];
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Build a verb-summon tiddler title: `…/verb/<verb>` — PURE BEARING, no args (they ride
 *  the tiddler's `arg-<name>` fields; #48 retired the args-in-URI smuggling). */
export function laresVerbUri(verb: string): string {
  return `${LARES_VERB_URI_PREFIX}${verb}`;
}

// ── Bag / Wiki / Cid identity — the three kind-planes ──────────────────────
// The KIND rides the first path segment (the heaviest-weight slot in lar: law):
// `bags/@slug` names a composable recipe piece (mutable, the IPNS-shaped content
// plane); `wikis/@slug` names a #has bag-stack (per-wiki layers route off it);
// `cid/<hash>` names a content-addressed artifact (immutable, the /ipfs/ plane).
// Ownership never enters the address.
//
// A meme's URI carries NO relation to a bag's URI — a meme lives in several bags at
// once, and `bagsFileToUri` derives a meme URI from its interior path alone, dropping
// the holding bag. So a kind-segment names IDENTITY alone; it never prefixes a meme
// path, and the ha.ka.ba root arity holds.
//
// These minters MUST precede the Content-plane consts below: those consts call `bagUri`
// at module-init, and a `const` in its temporal dead zone cannot be read by a hoisted
// function called before its own line.
//
// Canon: lar:///ha.ka.ba/lararium/api/bag-wiki-uri-split
export const BAGS_SEGMENT  = "bags"  as const;
export const WIKIS_SEGMENT = "wikis" as const;
export const CID_SEGMENT   = "cid"   as const;

/** Mint the canonical URI of a BAG (a composable recipe piece; mutable, the IPNS plane). */
export function bagUri(slug: string): string {
  return stableLarUri(`${BAGS_SEGMENT}/@${slug.replace(/^@/, "")}`);
}

/**
 * Whether a string names a BAG — the `bags/@slug` surface and nothing else.
 *
 * The grammar mints first segments that name no bag: `tags/`, `state/`, the plugin memes, the bare-`@`
 * sentinel documents, the `cid/` bodies, the `wikis/` identities and their slots. A reader that walks a
 * registry, or classifies an address, must be able to ask this question rather than infer the answer from
 * a list of what a bag is NOT — such a list is an enumeration, and it cannot notice what it missed.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/one-name-one-relation
 */
export function isBagId(uri: string): boolean {
  return /^lar:\/\/\/ha\.ka\.ba\/bags\/@[^/]+$/.test(uri);
}

/** Mint the canonical URI of a WIKI (a #has bag-stack; mutable). */
export function wikiUri(slug: string): string {
  return stableLarUri(`${WIKIS_SEGMENT}/@${slug.replace(/^@/, "")}`);
}

/** Mint the canonical URI of a content-addressed ARTIFACT — the /ipfs/ plane. The name
 *  IS the content hash, so it never changes; a frozen blob answers to it forever, and the
 *  @oracle `cid:` pointer (the /ipns/ plane) names which cid stands current. Per lar: law
 *  this NAMES the artifact; the CAS store resolves it to bytes. No `@` — a cid carries no
 *  petname, only its hash. */
export function cidUri(cid: string): string {
  return stableLarUri(`${CID_SEGMENT}/${cid}`);
}

/** The parse-back reciprocal of `cidUri` — read the content hash out of a `lar:///…/cid/<hash>`
 *  URI. Returns null for any URI that does NOT name a content-addressed artifact (a bag/wiki
 *  address, a web2 `http(s)://`/`data:` media src, an unstable root), so a caller can
 *  scheme-discriminate a media `_canonical_uri`: a lar cid → resolve by CID; anything else →
 *  leave to the native/DOM path. Tolerant of a trailing `#fragment`. */
export function cidFromUri(uri: string): string | null {
  if (typeof uri !== "string") return null;
  const marker = `/${CID_SEGMENT}/`;
  const at = uri.indexOf(marker);
  if (at < 0 || !uri.startsWith(LAR_PREFIX)) return null;
  const rest = uri.slice(at + marker.length);
  const hash = rest.split(/[#/?]/, 1)[0] ?? "";
  return hash.length > 0 ? hash : null;
}

/** Read the identity slug off a bag or wiki URI (`bags/@x`, `wikis/@x`); null when the URI names none.
 *
 *  The pattern still ACCEPTS a root-level `@x`, which nothing mints: `@` opens a bag DIRECTORY name and so
 *  always follows a `bags/` or `wikis/` segment. The tolerance costs a reader nothing and lets a store written
 *  before that rule settled still answer; it grants no way to write one. */
export function identitySlug(uri: string): string | null {
  const m = /^lar:\/\/\/ha\.ka\.ba\/(?:bags\/|wikis\/)?@([^/]+)$/.exec(uri);
  return m ? m[1]! : null;
}

// ── Content plane ─────────────────────────────────────────────────────────

// @oracle = the runtime SYSTEM ISLAND (genesis-loaded: engine BLOBs + bag→doc
// oracle + genesis-cid); the universal floor of every wiki-recipe. Split from
// the @lararium memetic corpus (disk-projection #oracle-split).
export const ORACLE_DOC_URI    = bagUri("oracle");
// @lararium = the engine's memetic CORPUS (authored self-doc memes; a library bag).
export const LARARIUM_DOC_URI  = bagUri("lararium");
export const CATALOG_DOC_URI   = bagUri("catalog");
export const LARES_DOC_URI     = bagUri("lares");
// @crossroads = the PUBLIC oracle plane (third leg of the three-plane model,
// canon: lararium/docs/crossroads). Where @oracle carries system-bag pointers
// and @catalog carries the operator's PRIVATE bag oracles (OCAP grants),
// @crossroads carries oracles to PUBLIC + infrastructure bags — the layers a
// stranger may mount without standing in any operator's grant graph. "Public"
// names a generous grant to an anonymous principal, never an absence of the gate
// (pull ≠ read). The per-Nexus WHO face rides here (its oracle-key = nexusHandlesUri).
export const CROSSROADS_DOC_URI = bagUri("crossroads");
// The memetic-wikitext engine plugin — a named blob CARRIED IN @oracle's blobs. Its
// title lives in the @lararium MEME NAMESPACE (not the bag doc): a meme/module address
// the disk projector discards-from-bag, keyed on by plugin.info + the TW5 pack pipeline.
// A meme namespace carries no relation to a bag-doc identity, so it takes no `bags/`
// kind-segment.
export const LARES_MEMETIC_WIKITEXT_PLUGIN_URI = stableLarUri("lararium/plugins/lares/memetic-wikitext");

// Shared tag/state law — consumed by vessel projections, not owned by any one runtime.
export const GRAMMAR_TAG = stableTagUri("SharktoothSigil");
export const PARSE_WARNING_TAG = stableTagUri("lararium-parse-warnings");
export const LARARIUM_BAG_MIRROR_TAG = stableTagUri("lararium-bag-mirror");
export const LARES_VERB_TAG = stableTagUri("lares-verb");
export const LARES_VERB_EVENT_TAG = stableTagUri("lares-verb-event");
export const LARES_PIN_TAG = stableTagUri("lares-pin");
/** Keyhive capability events persisted in the daemon doc. Sub-tags: .../prekey, .../cgka, .../delegation, .../revocation */
export const CAP_EVENT_TAG = stableTagUri("cap-event");
export const CAP_EVENT_PREKEY_TAG     = stableTagUri("cap-event/prekey");
export const CAP_EVENT_CGKA_TAG       = stableTagUri("cap-event/cgka");
export const CAP_EVENT_DELEGATION_TAG = stableTagUri("cap-event/delegation");
export const CAP_EVENT_REVOCATION_TAG = stableTagUri("cap-event/revocation");
export const BOOT_SPLASH_ACTIVE_URI = stableLarUri("state/boot-splash/active");

// ── Social plane ──────────────────────────────────────────────────────────

export const IDENTITIES_DOC_URI = bagUri("identities");
export const CIRCLES_DOC_URI    = bagUri("circles");
export const SESSIONS_DOC_URI   = bagUri("sessions");

// ── URI builders ──────────────────────────────────────────────────────────

/**
 * Canonical URI of a corpus bag.
 *   corpusLarUri("elyncia") → "lar:///ha.ka.ba/bags/@elyncia"
 *
 * Every corpus is a first-class bag at child[1] under the bag-tag rule
 * (see lar:///ha.ka.ba/lares/api/pono/lar-uri#bag-tag-rule).
 */
export function corpusLarUri(slug: string): string {
  return bagUri(slug);
}

/**
 * Registry-entry URI inside @catalog that points at a corpus bag.
 *   catalogCorpusEntryUri("elyncia") → "lar:///ha.ka.ba/bags/@catalog/corpus/elyncia"
 *
 * The tiddler at this title lives in the @catalog bag and carries the
 * corpus bag's AutomergeUrl as its `text` field. Registry pattern: catalog
 * catalogs; it does not host.
 */
export function catalogCorpusEntryUri(slug: string): string {
  return `${CATALOG_DOC_URI}/corpus/${slug}`;
}

/** Prefix used to discover catalog corpus-registry entries. */
export const CATALOG_CORPUS_PREFIX = `${CATALOG_DOC_URI}/corpus/`;

// ── Federation scale (the RESIDENCY-BAG axis) ─────────────────────────────
// A catalog/residency entry MAY declare the federation scale of the bag it
// registers — what controls how far the bag federates and (at boot) how long a
// joiner waits for it. The five scales map to the five aperture bands; reach
// (so patience) grows. Federation is governed HERE, on the bag's residency
// entry — never by the lar: namespace (which is the naming layer above).
export type MeshScale = "vessel" | "persona-group" | "cabal" | "nexus" | "dreamnet";
export const MESH_SCALES: readonly MeshScale[] = ["vessel", "persona-group", "cabal", "nexus", "dreamnet"];

/** Read a declared scale off a catalog entry; undefined when absent or unrecognized (the caller then defaults patience). */
export function parseMeshScale(s: string | null | undefined): MeshScale | undefined {
  return typeof s === "string" && (MESH_SCALES as readonly string[]).includes(s) ? (s as MeshScale) : undefined;
}

// The wiki canon/draft URI builders live in wiki-recipe.ts (wikiBagUri /
// wikiDraftBagUri). The bag/wiki/cid minters they build on sit above the Content
// plane consts (those consts call bagUri at module-init, so the minters precede them).

// ── Daemon bag + Persona bag ─────────────────────────────────────────────────

/** Daemon wiki bag id — the lararium's own central daemon `@daemon` bag (one-recipe model).
 *  SOVEREIGN-per-vessel: this vessel's own control-plane, never shared across vessels. */
export const DAEMON_BAG_ID    = bagUri("daemon");

/** e.g. flowUri("crystal") → "lar:///ha.ka.ba/lararium/daemon/flows/crystal" — a Flow's
 *  pet-name IS its address: a callable, composed cap-stack tiddler in the @daemon bag. */
export function flowUri(petname: string): string {
  return `${DAEMON_BAG_ID}/flows/${petname}`;
}

/** The persona NAMESPACE — two jobs, and a reader who fuses them will look for a bag that does not exist.
 *
 *  The word is deliberate. SDSI's ruling on this exact shape reads "a NAMESPACE, not a super-key" — a place
 *  local names hang from, carrying no authority of its own. Calling it a ROOT would claim the opposite and
 *  name the very thing canon forbids above a person's compartments.
 *
 *  ① The TITLE prefix every PersonaGroup plane uses INSIDE its own document: the signer pin, the KEL
 *     prefix, the selves, the binding records all spell `@persona/...` whichever plane holds them. Titles
 *     resolve verbatim within a document and the composite finds one by walking layers, so every plane
 *     carries the same internal shape regardless of the bag it answers to.
 *  ② The STEM a plane's own bag id extends — `personaBagIdFor` derives `@persona-<tag>` from that group's
 *     doc id, and `isPersonaBagId` matches the family by that shape rather than by any fixed id.
 *
 *  It NAMES NO BAG on its own. A vessel holds one plane per PersonaGroup it stands in, each seeded,
 *  mounted, registered and reached under its own derived name; nothing answers to the bare stem. */
export const PERSONA_NAMESPACE    = bagUri("persona");

// ── Recipe + bag descriptor URI builders ──────────────────────────────────

/** e.g. recipeUri("@lararium", "default") → "lar:///ha.ka.ba/lararium/recipes/default" */
export function recipeUri(root: string, name: string): string {
  // Root-aware: a full bag URI (`bags/@x`) passes through; a bare slug or legacy `@slug`
  // normalizes to the bag root, so every call site follows the bags/@ move untouched.
  const base = root.startsWith("lar:") ? root : bagUri(root);
  return `${base}/recipes/${name}`;
}

/** e.g. bagDescriptorUri("lar:///ha.ka.ba/bags/@lararium") → "lar:///ha.ka.ba/lararium/descriptor" */
export function bagDescriptorUri(bagId: string): string {
  return `${bagId}/descriptor`;
}

// ── Social plane URI builders ──────────────────────────────────────────────

// These nested titles live INSIDE a bag doc — built from the const so they stay keyed
// to the doc the daemon composite mounts (a bare literal would drift from it).
/** identityTiddlerUri("did:key:z…") → "…/bags/@identities/did:key:z…" */
export function identityTiddlerUri(did: string): string {
  return `${IDENTITIES_DOC_URI}/${did}`;
}

/** circleTiddlerUri("admins") → "…/bags/@circles/admins" */
export function circleTiddlerUri(id: string): string {
  return `${CIRCLES_DOC_URI}/${id}`;
}

/** sessionTiddlerUri("sess-abc") → "…/bags/@sessions/sess-abc" */
export function sessionTiddlerUri(id: string): string {
  return `${SESSIONS_DOC_URI}/${id}`;
}

/** sessionEventLogUri("sess-abc") → "…/bags/@sessions/sess-abc/events" */
export function sessionEventLogUri(sessionId: string): string {
  return `${SESSIONS_DOC_URI}/${sessionId}/events`;
}

/** deviceDelegationUri(opDid, devDid) → "…/bags/@identities/{opDid}/devices/{devDid}" */
export function deviceDelegationUri(personaRootDid: string, deviceDid: string): string {
  return `${IDENTITIES_DOC_URI}/${encodeURIComponent(personaRootDid)}/devices/${encodeURIComponent(deviceDid)}`;
}

/** nexusTrustUri("abcdef…") → "…/bags/@identities/trust/nexus/abcdef…" */
export function nexusTrustUri(nexusPubkey: string): string {
  return `${IDENTITIES_DOC_URI}/trust/nexus/${nexusPubkey}`;
}

// ── The @nexus plane — a confederation's per-Nexus faces (causal island) ──────
// A Nexus is a confederation of lararia (PersonaGroup → MeshCabal → Nexus), a causal
// island: no global now, no global registry (canon: causal-islands, oracle-governance).
// Each face keys by the confederation's nexus-pubkey (the MeshCabal key), so it scopes
// to ONE island; crossing to another Nexus re-announces onto that island's own faces.

/** The `@nexus` bag root — the confederation plane, one sub-tree per nexus-pubkey. */
export const NEXUS_DOC_URI = bagUri("nexus");

/** nexusRegistryUri("abcdef…") → "…/bags/@nexus/abcdef…" — the confederation's MEMBERS roster (its lararia). */
export function nexusRegistryUri(nexusPubkey: string): string {
  return `${NEXUS_DOC_URI}/${nexusPubkey}`;
}

/**
 * nexusHandlesUri("abcdef…") → "…/bags/@nexus/abcdef…/handles" — the per-Nexus WHO face: the announced
 * Handles known in this confederation. A DISTINCT doc from the members registry (WHO ⊥ the lararia roster),
 * sibling to it under the same nexus-pubkey. Handle-cards ride it as tiddlers keyed by their own nym (the
 * portable identity KIND), while this doc URI carries the island-scoped REACH — so the same card re-announces
 * onto another Nexus's handles-face under a stable key. Federates read-open within the island; never global.
 *
 * This URI doubles as the WHO face's ORACLE-KEY on the PUBLIC plane: a @crossroads tiddler at this key holds
 * the face doc's automerge: URL (resolveOracleDoc), so a stranger resolves the per-Nexus WHO board through
 * @crossroads without standing in any operator's grant graph (canon: lararium/docs/crossroads).
 */
export function nexusHandlesUri(nexusPubkey: string): string {
  return `${NEXUS_DOC_URI}/${nexusPubkey}/handles`;
}

// ── Social plane doc-type aliases + empty constructors ────────────────────

/** IdentitiesDoc — each principal = one tiddler at identityTiddlerUri(did). */
export type IdentitiesDoc = LarDoc;
/** CirclesDoc — each group = one tiddler at circleTiddlerUri(id). */
export type CirclesDoc = LarDoc;
/** SessionsDoc — each session = one tiddler at sessionTiddlerUri(id). */
export type SessionsDoc = LarDoc;

export function emptyIdentitiesDoc(): IdentitiesDoc { return emptyLarDoc(); }
export function emptyCirclesDoc(): CirclesDoc       { return emptyLarDoc(); }
export function emptySessionsDoc(): SessionsDoc     { return emptyLarDoc(); }

// ── DreamNet identity sentinel URIs ──────────────────────────────────────
// These URIs serve as ChangeId seeds for Keyhive sentinel Documents that carry
// DreamNet membership chains. DocumentId uniqueness comes from Keyhive's internal
// EphemeralSigner (CSPRNG) — the URI is a semantic label only.
//
// Two-level identity lattice:
//   PersonaGroup  — vessels belonging to one operator (Vessel Individual → PersonaGroup)
//   MeshCabal    — operators participating in one Nexus (PersonaGroup → MeshCabal)

/** Sentinel URI for a vessel's PersonaGroup membership document. */
export const PERSONA_GROUP_SENTINEL_URI = stableLarUri("sentinel/persona-group");
/**
 * Sentinel URI for a Nexus's MeshCabal membership document — the body of KAHU, the kuleana-bearing tenders
 * of one nexus-mesh, each seated as a PersonaGroup.
 *
 * The name says a ROLE, never a rank. A cabal seat carries the tending a Nexus lives by; it confers no tier
 * above anyone, and the members hold no power over each other that the membership graph does not already
 * carry. `admin` named this slot while the design still spoke web2, and imported an authority the seat never
 * held — the exact blur that word carries wherever it lands.
 */
export const MESH_CABAL_SENTINEL_URI   = stableLarUri("sentinel/kahu-cabal");

// PersonaGroup-identity sentinel tiddlers re-home to the @persona namespace — they name
// the operator's veiled identity (the PersonaGroup), the membership-sync surface. MeshCabal
// (nexus-affiliation, NOT personGroup-identity) stays under @daemon.
/**
 * One membership entry — this vessel stands in that PersonaGroup. Keyed by the plane's derived tag, text
 * carrying the group's own doc id, so the family reads back without an order or an index to maintain.
 *
 * A LIST OF A PERSON'S GROUPS IS PERMITTED HERE, AND ONLY HERE. Canon's single-bit test: local-only reads
 * as COLLECT (unlinkable); published reads as MERGE (links every self). This list lives on the vessel's own
 * disk and crosses no wire — a vessel plainly must know which compartments it carries in order to carry
 * them. What stays forbidden is presenting it: the moment such an index reaches a board, a payload or a
 * probe answer, it becomes the correlation key the vault exists to withhold.
 */
export const PERSONA_MEMBERSHIP_PREFIX = `${PERSONA_NAMESPACE}/membership`;

/** The membership entry naming one PersonaGroup this vessel stands in. */
export function personaMembershipUri(planeTag: string): string {
  return `${PERSONA_MEMBERSHIP_PREFIX}/${planeTag}`;
}

/** Persona oracle tiddler: PersonaGroup Document ID (hex). Legacy sentinel target (the Binding Gate superseded it). */
export const PERSONA_GROUP_DOC_ID_TIDDLER   = `${PERSONA_NAMESPACE}/sentinel/persona-group/doc-id`;
/** Persona oracle tiddler: PersonaGroup agent Identifier (hex). Used by boot Gate C. */
export const PERSONA_GROUP_AGENT_ID_TIDDLER = `${PERSONA_NAMESPACE}/sentinel/persona-group/agent-id`;
/** Daemon oracle tiddler: MeshCabal Document ID (hex) — NEXUS-affiliation, sovereign-per-vessel. Used by boot Gate C. */
export const MESH_CABAL_DOC_ID_TIDDLER     = `${DAEMON_BAG_ID}/sentinel/mesh-cabal/doc-id`;

/**
 * The HEARTH's @daemon url — the door this vessel knocks on to ask its face for a seat.
 *
 * An admitted vessel seeds its OWN @daemon, because that plane never crosses; so the one url it cannot
 * derive is where its hearth listens. The admit payload carries it once, and this tiddler keeps it, so a
 * joinee that has long since spent its payload still knows where to ask. Absent on a vessel that founded
 * its own face — such a vessel IS the hearth, and knocks on no one.
 */
export const HEARTH_DAEMON_URL_TIDDLER     = `${DAEMON_BAG_ID}/hearth/daemon-url`;
/** Persona oracle tiddler: the PINNED signer DID ("0x"+hex) the Binding Gate verifies the edge against —
 *  self-DID for an anon (self-signed), a granting root-DID for a delegated/operator vessel. */
export const SIGNER_DID_TIDDLER            = `${PERSONA_NAMESPACE}/binding/signer-did`;
/** Persona oracle tiddler: the hearth true-name (engine content-CID) this vessel binds TO — the place in (vessel × hearthTrueName). */
export const HEARTH_TRUE_NAME_TIDDLER      = `${PERSONA_NAMESPACE}/hearth/true-name`;
/** The prefix every OWN-PERSONA self tiddler sits under — the human's labels for their own faces, one per
 *  handle-index. @persona rides the PRIVATE tier: the self-slot FLEET-syncs it same-operator, and the
 *  DeterministicFederationGate never volunteers it to a cross-operator, so these labels reach the human's own
 *  devices and no stranger. */
export const PERSONA_SELVES_PREFIX         = `${PERSONA_NAMESPACE}/selves`;
/** personaSelfTiddlerUri(2) → "…/bags/@persona/selves/h2" — one tiddler per own persona. */
export function personaSelfTiddlerUri(handleIndex: number): string {
  return `${PERSONA_SELVES_PREFIX}/h${handleIndex}`;
}
/** Read a handle-index back off a self tiddler title, or null when the title names something else. */
export function handleIndexFromSelfTiddlerUri(title: string): number | null {
  if (!title.startsWith(`${PERSONA_SELVES_PREFIX}/h`)) return null;
  const n = Number(title.slice(`${PERSONA_SELVES_PREFIX}/h`.length));
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
/** Persona oracle tiddler: this vessel's OWN signed device-delegation edge (signer→vessel) — the public binding the Binding Gate verifies. */
export const DEVICE_DELEGATION_SELF_TIDDLER = `${PERSONA_NAMESPACE}/delegation/self`;
/** Persona oracle tiddler: the persona-KEL identifier PREFIX (AID) the Binding Gate PINS — stable across every
 *  op-key rotation. The gate walks the per-Nexus KEL board to this prefix's current head op-key and verifies
 *  the device edge against THAT head (Reading-B continuity); the raw signer-DID is provenance only. */
export const PERSONA_KEL_PREFIX_TIDDLER     = `${PERSONA_NAMESPACE}/binding/persona-kel-prefix`;

// ── @personal / @draft binding tiddler prefixes ───────────────────────────
// The (PersonaGroup × recipe-fingerprint) → docUrl bindings live as tiddlers
// under these prefixes (now @persona-namespaced — PersonaGroup-scoped, cross-device).
// One fingerprint produces THREE bindings (@personal, @draft, @working) that
// share a lifecycle. The binding tiddler title is `${PREFIX}/${fingerprintHex}`;
// its `text` carries the bound URL.
// Canon: lar:///ha.ka.ba/lararium/api/personal-slot#core-claim
export const PERSONAL_BINDINGS_PREFIX = `${PERSONA_NAMESPACE}/personal-bindings`;
export const DRAFT_BINDINGS_PREFIX    = `${PERSONA_NAMESPACE}/draft-bindings`;
// @working binds like @personal (PersonaGroup×fingerprint, cross-device) — the
// SAVED live write layer; normal edits route here, canon publishes on promotion.
export const WORKING_BINDINGS_PREFIX  = `${PERSONA_NAMESPACE}/working-bindings`;

// ── Well-known bag slot IDs ────────────────────────────────────────────────
// Six root docs (two planes) + in-memory leaves.
// Bag ID = lar: URI of the owning Automerge doc.

/**
 * Vessel-wide system bag URIs. These exist once per vessel and serve all wikis.
 *
 * Per-wiki recipe slots (`@temp`, `@draft`, `@<wiki-slug>`, library bags) live
 * in `wiki-recipe.ts` — slot URIs in the same lar:///ha.ka.ba/bags/@<name>
 * namespace. Structural slots arrive as typed IslandGrants on the manifest;
 * @lares rides the @lararium doc's well-known tiddlers; library bags resolve
 * island-side from @catalog.
 */
export const BAG_IDS = {
  oracle:     ORACLE_DOC_URI,
  lararium:   LARARIUM_DOC_URI,
  catalog:    CATALOG_DOC_URI,
  lares:      LARES_DOC_URI,
  crossroads: CROSSROADS_DOC_URI,
  identities: IDENTITIES_DOC_URI,
  groups:     CIRCLES_DOC_URI,
  sessions:   SESSIONS_DOC_URI,
} as const;
