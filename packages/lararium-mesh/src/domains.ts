/**
 * domains — THE REGISTRY. Every domain-separation tag this house mints, in one place, as `lar:` URIs.
 *
 * ── WHAT A DOMAIN TAG IS, AND WHY IT LOOKS LIKE A MAGIC STRING ──────────────────────────────────
 * A signature or a derived key is meaningless without the domain it was made in. The tag rides inside the
 * signed bytes (or the HKDF `info`) so that a signature minted for one purpose can never be replayed as
 * another, and two derivations from one secret can never fuse. Its ONLY job is to differ.
 *
 * That is why it reads opaque, and every serious protocol does the same: HKDF's `info` (RFC 5869), TLS
 * 1.3's `"tls13 "`-prefixed HkdfLabel (RFC 8446 §7.1), MLS's `SignWithLabel` / `EncryptWithLabel` under
 * `"MLS 1.0 "` (RFC 9420), BIP-340's tagged hashes, the Noise protocol NAME hashed into the handshake
 * state, EIP-712's domainSeparator. The constant is protocol identity, never a magic number.
 *
 * ── WHY A TABLE, AND NOT JUST THE STRINGS ───────────────────────────────────────────────────────
 * Scattered, they cannot be checked. Thirty-two of them once sat across twenty-five files in TWO
 * spellings — `lar-<name>/v<N>` for signing, `"lares <name> v<N>"` for HMAC keys — and nothing could say
 * they differed. A typo in a domain tag does not fail loudly: it silently mints a SECOND protocol whose
 * signatures verify against nothing. Multiformats sets the sharpest prior art, and its whole value rides
 * on THE TABLE AS THE ARTIFACT rather than on the prefixes.
 *
 * ── THE ONTOLOGY: a domain is a NAME, so it takes the house's naming form ───────────────────────
 * `lar:` names and does not fetch (RFC 4151's `tag:` precedent), which is exactly a domain tag's nature:
 * pure bearing, never a fetchable location, never carrying a per-use value. So every domain reads
 *
 *     lar:///ha.ka.ba/lares/domain/<name>/v1
 *
 * — the stable `ha.ka.ba` root, one path for the whole family, and the version IN BAND so a v2 can never
 * collide with the v1 it replaces. Versions all read v1: early alpha, no outside consumers, and a `2`
 * that records a past migration encodes archaeology into a protocol string.
 *
 * ── AND A VERSION MUST NEVER DO A DOMAIN'S JOB ──────────────────────────────────────────────────
 * A version digit that carries separation fuses on the first reset. `keyring-envelope` carried `/v1` as
 * its SIGNING domain and `/v2` as its HKDF `info` — two purposes told apart by a digit, so a naive reset
 * to v1 would have fused them; `persona-admit/v2/grant-seal` sat the same way. Each carries its own NAME
 * instead: separation belongs to the name, and the version belongs to the protocol's own history.
 *
 * ── HOW TO ADD ONE ──────────────────────────────────────────────────────────────────────────────
 * Add it HERE, exported, and use the export. `tools/domain-registry-witness.sh` refuses a duplicate, a
 * malformed address, and any domain literal written outside this file.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/lar-uri
 */

/** The one path every domain rides. A change here re-keys every signature in the house. */
const DOMAIN_ROOT = "lar:///ha.ka.ba/lares/domain";

/** Mint a domain address. Kept private: a domain must be DECLARED below, never built at a call site. */
const d = (name: string): string => `${DOMAIN_ROOT}/${name}/v1`;

// ── IDENTITY + DELEGATION ───────────────────────────────────────────────────────────────────────
/** A device delegation: an operator root vouching one device into a PersonaGroup. */
export const DEVICE_DELEGATION_DOMAIN = d("device-delegation");
/** A persona's key-event log entry — the inception/rotation chain at persona scale. */
export const PERSONA_KEL_DOMAIN = d("persona-kel");
/** The announced outward face: a self-certifying HandleCard. */
export const HANDLE_CARD_DOMAIN = d("handle-card");
/** A fleet proof: one nym carried across a human's own vessels. */
export const FLEET_PROOF_DOMAIN = d("fleet-proof");
/** The vessel×veil dyad, and the binding that names it. */
export const DYAD_ID_DOMAIN = d("dyad-id");
export const DYAD_BINDING_DOMAIN = d("dyad-binding");

// ── ADMISSION + ENROLMENT ───────────────────────────────────────────────────────────────────────
export const PERSONA_ENROLL_DOMAIN = d("persona-enroll");
export const PERSONA_GRANT_DOMAIN = d("persona-grant");
export const PERSONA_SEALED_DOMAIN = d("persona-sealed-grant");
export const PERSONA_JOIN_DOMAIN = d("persona-join");
/** The grant seal's HKDF `info`. A NAME of its own — never a version digit carrying the separation from
 *  the four signing domains above. */
export const PERSONA_ADMIT_SEAL_INFO = d("persona-admit-grant-seal");
/** A burnable boot invite, spent once at a vessel's first waking. */
export const BOOT_INVITE_DOMAIN = d("boot-invite");
/** A cabal invite — the join axis, orthogonal to the carriage contract. */
export const CABAL_INVITE_DOMAIN = d("cabal-invite");

// ── THE NEXUS: charter, carriage, immunity ──────────────────────────────────────────────────────
export const NEXUS_DOC_DOMAIN = d("nexus-doc");
export const KAPAE_ANTIGEN_DOMAIN = d("kapae-antigen");
export const CARRIAGE_ENTRY_DOMAIN = d("carriage-entry");
export const CARRIAGE_CONTRACT_DOMAIN = d("carriage-contract");
export const MEMBERSHIP_RELAY_DOMAIN = d("membership-relay");
/** The kāpae raised over one RELATIONSHIP rather than over a party. */
export const EDGE_KAPAE_DOMAIN = d("edge-kapae");
/** One hand's own stake on a joiner — a vouch admits nobody. */
export const VOUCH_EDGE_DOMAIN = d("vouch-edge");
/** The record that a re-anchoring happened, never what made it valid. */
export const RE_ANCHORING_DOMAIN = d("re-anchoring");
/** A guardian's confirmation on a recovery card. */
export const GUARDIAN_CONFIRM_DOMAIN = d("guardian-confirm");

// ── SEALED CONTENT + TRANSPORT ──────────────────────────────────────────────────────────────────
/** The keyring delivery envelope — the signed wire shape. */
export const KEYRING_ENVELOPE_DOMAIN = d("keyring-envelope");
/** Its HKDF `info`. A NAME of its own, held apart from the signing domain above: a version digit doing a
 *  domain's job fuses the two on the first reset. */
export const KEYRING_ENVELOPE_SEAL_INFO = d("keyring-envelope-seal");
/** The `cad` convergent keystream — ciphertext-addressed bodies. */
export const CAD_KEYSTREAM_INFO = d("cad-keystream");
/** The relay gate's seed derivation — the crossroads transport identity, never the vessel's own. */
export const RELAY_GATE_INFO = d("relay-gate");

// ── PLANES + SCOPES (HMAC name derivations) ─────────────────────────────────────────────────────
/** One PersonaGroup's private plane name, derived from that group's own doc id. */
export const PERSONA_SCOPE_INFO = d("persona-scope");
/** The per-circle hardened index — the key a persona presents to one circle. */
export const CIRCLE_SCOPE_INFO = d("circle-scope");

// ── ARTEFACTS + BOARDS ──────────────────────────────────────────────────────────────────────────
/** The served `oracle` pointer doc. */
export const ORACLE_POINTER_DOMAIN = d("oracle-pointer");
/** The deterministic plugin build's provenance. */
export const PLUGIN_ATTESTATION_DOMAIN = d("plugin-attestation");
/** The Mu void marker — an immune-set refusal carrying no subject. */
export const MU_VOID_DOMAIN = d("mu-void");
/** A vessel's raise challenge — verifier-chosen freshness at the waking floor. */
export const RAISE_CHALLENGE_DOMAIN = d("raise-challenge");

/**
 * Every domain this house mints. The witness folds THIS — so a domain added above and forgotten here
 * still cannot hide: the witness also refuses any domain literal written outside this file.
 */
export const ALL_DOMAINS: readonly string[] = [
  DEVICE_DELEGATION_DOMAIN, PERSONA_KEL_DOMAIN, HANDLE_CARD_DOMAIN,   FLEET_PROOF_DOMAIN, DYAD_ID_DOMAIN, DYAD_BINDING_DOMAIN,
  PERSONA_ENROLL_DOMAIN, PERSONA_GRANT_DOMAIN, PERSONA_SEALED_DOMAIN, PERSONA_JOIN_DOMAIN,
  PERSONA_ADMIT_SEAL_INFO, BOOT_INVITE_DOMAIN, CABAL_INVITE_DOMAIN,
  NEXUS_DOC_DOMAIN, KAPAE_ANTIGEN_DOMAIN, CARRIAGE_ENTRY_DOMAIN, CARRIAGE_CONTRACT_DOMAIN,
  MEMBERSHIP_RELAY_DOMAIN, EDGE_KAPAE_DOMAIN, VOUCH_EDGE_DOMAIN, RE_ANCHORING_DOMAIN,
  GUARDIAN_CONFIRM_DOMAIN,
  KEYRING_ENVELOPE_DOMAIN, KEYRING_ENVELOPE_SEAL_INFO, CAD_KEYSTREAM_INFO, RELAY_GATE_INFO,
  PERSONA_SCOPE_INFO, CIRCLE_SCOPE_INFO,
  ORACLE_POINTER_DOMAIN, PLUGIN_ATTESTATION_DOMAIN, MU_VOID_DOMAIN, RAISE_CHALLENGE_DOMAIN,
];
