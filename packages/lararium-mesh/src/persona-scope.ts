/**
 * persona-scope — the per-group NAME of a PersonaGroup's private plane.
 *
 * ── THE PROBLEM ─────────────────────────────────────────────────────────────────────────────────
 * `@persona` holds ONE PersonaGroup's private plane: its multitude, signer DID, KEL prefix, device
 * delegation. A human runs SEVERAL PersonaGroups across one set of devices — a work compartment and a play
 * compartment on the same laptop and the same phone — so one laptop needs one plane per group. A constant
 * bag id gives it one shelf where the model wants a family, and the second group has nowhere to stand.
 *
 * ── WHY A MAP WOULD HAVE BEEN THE WRONG ANSWER ──────────────────────────────────────────────────
 * The obvious cure — one vessel-level index that lists a person's PersonaGroups and points each at its
 * plane — builds the thing canon forbids. The persona-circle ruling: a human's collection of compartments
 * is a private VAULT, and NOTHING stands above them that links them, because a layer above the vaults would
 * BE the Nymwars root. SDSI says the same from the naming side (RFC 2693; Stiegler): a petname system is a
 * NAMESPACE, not a super-key — a key placed over the compartments becomes a presentable root that
 * correlates them. So the answer must let a vessel FIND each plane without ever holding a thing that
 * ENUMERATES them.
 *
 * ── THE ANSWER, AND THE FOUR BLIND DOMAINS THAT ALREADY AGREE ON IT ─────────────────────────────
 * DERIVE the name from the group's OWN material, one-way, with nothing above it. Each PersonaGroup's
 * plane is named by a domain-separated MAC over that group's own doc id: hold the group, name its plane;
 * hold no group, name nothing. There is no root to present because there is no root.
 *
 * Four unrelated fields converged on this shape long before we met it:
 *   · HD wallets / Monero — one view secret RECOGNISES a thousand subaddresses that observers cannot
 *     join. Recognition without a published index.
 *   · anonymous credentials (Chaum 1985; Camenisch–Lysyanskaya 2001) — one master secret, per-verifier
 *     pseudonyms, and the verifiers cannot link them.
 *   · SDSI/petname naming (RFC 2693) — local names bind locally; no global name authority sits above.
 *   · group crypto (RFC 9420; Keyhive) — co-members cannot hide co-membership, so the same key MUST NOT
 *     appear in two groups. Canon's own words: "the deck stays one deck; the face it wears differs per
 *     handle, and no roster carries a key that appears on another."
 *
 * ── AND THE HOUSE ALREADY STOOD THE PRIMITIVE ───────────────────────────────────────────────────
 * `persona-identity.circleScopeIndex` does exactly this one level down: a domain-separated HMAC over a
 * circle's doc id yields a hardened index, so the same persona presents a DIFFERENT key to each circle it
 * joins. This module carries that convention up one level — from the KEY a persona presents to a circle, to
 * the NAME a PersonaGroup's own plane answers to. One convention, two levels, so neither invents a second law.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────────────────────────
 * The tag hides nothing from someone who already holds the group's doc id — it is a NAME, not a secret,
 * and canon's single-bit test is about what gets PUBLISHED, not about what a holder can compute. What it
 * buys is that the name carries no vessel material: two PersonaGroups on one laptop produce two bag ids
 * with nothing of the laptop, and nothing of each other, inside either one.
 *
 * A peer may still ask a vessel whether it resolves a given bag, and a vessel that answers two probes has
 * told the asker it holds both compartments — canon's Janus interactive-receipt probe
 * (persona-circle#honest-scope). That surface rides the transport, not the name, and it stays named here
 * rather than quietly assumed away.
 *
 * ── STILL OWED ──────────────────────────────────────────────────────────────────────────────────
 * The persona tiddler paths in `lar-uris` (`PERSONA_GROUP_AGENT_ID_TIDDLER`, `SIGNER_DID_TIDDLER`,
 * `PERSONA_SELVES_PREFIX`, the binding prefixes) still hang off the constant. They become functions of a
 * bag id when the openers mount a plane per membership; this module lands the naming law and its guard
 * first, so the wiring has one thing to converge on rather than a second convention to invent.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

import { bagUri, PERSONA_BAG_ID } from "./lar-uris.js";

/** Domain separation. Distinct from `circle-scope`, so the two levels can never derive into each other. */
const PERSONA_SCOPE_HMAC_KEY = new TextEncoder().encode("lares persona-scope v1");

/** How many hex characters of the MAC name a plane. 16 hex = 64 bits — far past any collision a human's
 *  own handful of compartments could reach, and short enough that a person reads a bag id in a log. */
export const PERSONA_SCOPE_TAG_HEX = 16;

/**
 * The stable tag naming ONE PersonaGroup's plane, derived from that group's own doc id.
 *
 * Same group → same tag, on every device, across a rejoin, forever: a vessel re-admitted next year finds
 * the plane it left. Different group → an unrelated tag, with no material of the vessel or of any sibling
 * compartment inside it.
 */
export function personaScopeTag(personaGroupDocIdHex: string): string {
  const mac = hmac(sha256, PERSONA_SCOPE_HMAC_KEY, new TextEncoder().encode(personaGroupDocIdHex));
  return Array.from(mac.subarray(0, PERSONA_SCOPE_TAG_HEX / 2))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The bag id of ONE PersonaGroup's private plane.
 *
 * A DISTINCT bag rather than a path inside `@persona`, because a path under a bag is a tiddler namespace:
 * `@persona/g/<tag>/…` would put one group's plane inside another's document, where a cap that opens the
 * outer bag opens every compartment a person holds. Distinct bags keep the separation the vault requires.
 */
export function personaBagIdFor(personaGroupDocIdHex: string): string {
  return bagUri(`persona-${personaScopeTag(personaGroupDocIdHex)}`);
}

/** Whether a bag id names some group's persona plane — the shape a router matches, never a hard-coded id. */
export function isPersonaBagId(bagId: string): boolean {
  return bagId === PERSONA_BAG_ID || bagId.startsWith(`${PERSONA_BAG_ID}-`);
}
