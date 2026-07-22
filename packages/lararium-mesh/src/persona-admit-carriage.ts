/**
 * persona-admit-carriage — the CARRIED envelopes for the 3-hop persona-admission choreography.
 *
 * Each hop rides a base64url carriage under its OWN fragment key — the SAME posture as handle-carriage /
 * admit-carriage: the payload is CARRIED (a QR held to a camera, a paste, a `#enroll=…` URL fragment), never
 * fetched, so no relay or issuer sees it in transit and the ceremony needs no reachable authority. A browser
 * never transmits a fragment, so the sealed grant reaches the vessel with no server in the middle.
 *
 * The three keys stay DISTINCT so a hop can never be mistaken for another (`#enroll=` / `#grant=` / `#ack=`).
 * These functions only SHAPE — they carry the ceremony objects verbatim; the crypto verification lives in
 * persona-admit (open / verifyJoinAck). WITHHOLD-not-forge: a garbled / wrong-key / wrong-domain carriage
 * decodes to `null`, never a throw (a bad paste means the hop DID NOT ARRIVE, never an attack).
 *
 * Platform-blind: rides ./crypto (base64url) + ./persona-admit (the hop shapes) only. NO node imports — the CLI,
 * the node daemon, and the browser all consume it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/persona-admit#carriage
 */

import { base64UrlEncode, base64UrlDecode, utf8Bytes } from "./crypto.js";
import {
  PERSONA_ENROLL_DOMAIN, PERSONA_SEALED_DOMAIN, PERSONA_JOIN_DOMAIN,
  type EnrollmentOffer, type SealedGrant, type JoinAck,
} from "./persona-admit.js";

/** The fragment keys each hop rides under — distinct, so a hop is never mistaken for another. */
export const ENROLL_CARRIAGE_KEY = "enroll" as const;
export const GRANT_CARRIAGE_KEY  = "grant" as const;
export const ACK_CARRIAGE_KEY    = "ack" as const;

/** Decode a keyed base64url carriage (`#<key>=<b64url>`, `&<key>=…`, `<key>=…`, or a bare token) to a value. */
function decodeCarriage(key: string, carriage: string): Record<string, unknown> | null {
  const keyed = new RegExp(`(?:^|[#&?])${key}=([A-Za-z0-9_-]+)`).exec(carriage);
  const token = keyed?.[1] ?? (/^[A-Za-z0-9_-]+$/.test(carriage.trim()) ? carriage.trim() : null);
  if (!token) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(token))) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Encode any hop object into its `#<key>=<b64url>` carriage form — the round-trip inverse of the parsers below. */
function encodeCarriage(key: string, value: unknown): string {
  return `#${key}=${base64UrlEncode(utf8Bytes(JSON.stringify(value)))}`;
}

// ── QR#1 — the enrollment offer ────────────────────────────────────────────────────────────────────────────
export function toEnrollmentCarriage(offer: EnrollmentOffer): string {
  return encodeCarriage(ENROLL_CARRIAGE_KEY, offer);
}
export function parseEnrollmentCarriage(carriage: string): EnrollmentOffer | null {
  const p = decodeCarriage(ENROLL_CARRIAGE_KEY, carriage);
  if (!p || p["kind"] !== PERSONA_ENROLL_DOMAIN) return null;
  if (typeof p["targetVesselId"] !== "string" || typeof p["ephemeralPubkey"] !== "string") return null;
  if (typeof p["nonceB"] !== "string" || typeof p["expiry"] !== "number") return null;
  return p as unknown as EnrollmentOffer;
}

// ── QR#2 — the sealed grant ────────────────────────────────────────────────────────────────────────────────
export function toGrantCarriage(sealed: SealedGrant): string {
  return encodeCarriage(GRANT_CARRIAGE_KEY, sealed);
}
export function parseGrantCarriage(carriage: string): SealedGrant | null {
  const p = decodeCarriage(GRANT_CARRIAGE_KEY, carriage);
  if (!p || p["kind"] !== PERSONA_SEALED_DOMAIN) return null;
  if (typeof p["senderEphemeralPubkey"] !== "string" || typeof p["aeadNonce"] !== "string") return null;
  if (typeof p["nonceA"] !== "string" || typeof p["expiry"] !== "number" || typeof p["ciphertext"] !== "string") return null;
  return p as unknown as SealedGrant;
}

// ── QR#3 — the ACK ─────────────────────────────────────────────────────────────────────────────────────────
export function toAckCarriage(ack: JoinAck): string {
  return encodeCarriage(ACK_CARRIAGE_KEY, ack);
}
export function parseAckCarriage(carriage: string): JoinAck | null {
  const p = decodeCarriage(ACK_CARRIAGE_KEY, carriage);
  if (!p || typeof p["ackSig"] !== "string") return null;
  const rec = p["joinRecord"] as Record<string, unknown> | undefined;
  if (!rec || rec["kind"] !== PERSONA_JOIN_DOMAIN) return null;
  return p as unknown as JoinAck;
}
