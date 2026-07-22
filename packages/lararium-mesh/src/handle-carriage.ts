/**
 * handle-carriage — decode a carried, self-certifying `HandleCard` (the recogniser's front door).
 *
 * THE CARD IS CARRIED, NEVER FETCHED. A HandleCard is self-certifying — its `sig` verifies against the `nym` it
 * names — so it needs no trusted channel and no reachable authority: a carrier may WITHHOLD it, never forge it.
 * The bytes ride anything a human can hand over — a paste, a QR code held to a screen, a `#card=…` URL fragment,
 * a file on a stick. This is the SAME posture as the boot-invite / device-admit carriage, applied to recognition:
 * it lets a follow admit an unmet nym without the CLI's `--card <file>`, the card arriving by paste instead.
 *
 * The fragment earns its place because a browser never transmits one — the card reaches the vessel and no relay
 * or issuer sees it in transit. This module touches no platform: no `location`, no clock, no network. Same string
 * in, same card out — which is what lets the recognition be tested without a transport.
 *
 * `parseHandleCardCarriage` takes the carriage as a STRING and returns a card or `null`. It only SHAPES the card
 * (domain + the load-bearing fields present) — it does NOT verify the signature or the lineage. That trust gate
 * stays where it belongs: `HandleBook.ingest`, which runs the full TOFU/monotone reader rule and returns a named
 * verdict. WITHHOLD-not-forge: a garbled / absent / wrong-domain carriage returns `null` (the card DID NOT
 * ARRIVE — the operator re-carries it), never a throw, so a human's typo never reads as an attack.
 *
 * Platform-blind: rides ./crypto (base64url) + ./handle-card (the card shape) only. NO node imports — the CLI and
 * the browser both consume it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import { base64UrlEncode, base64UrlDecode, utf8Bytes } from "./crypto.js";
import { HANDLE_CARD_DOMAIN, type HandleCard } from "./handle-card.js";

/** The carriage key a HandleCard rides under — `#card=<base64url>`, a distinct fragment from `#admit=`. */
export const HANDLE_CARD_CARRIAGE_KEY = "card" as const;

/**
 * Decode `#card=<base64url>` (or a bare `card=<base64url>`, or a raw base64url token) into a HandleCard, or
 * `null` when the carriage holds none / a malformed one / something that is not a handle-card. A refusal is
 * never a throw. The signature is NOT checked here — `HandleBook.ingest` is the trust gate; this only shapes.
 */
export function parseHandleCardCarriage(carriage: string): HandleCard | null {
  // Accept a keyed carriage (`#card=…`, `&card=…`, `card=…`) OR a bare base64url token (a raw paste).
  const keyed = /(?:^|[#&?])card=([A-Za-z0-9_-]+)/.exec(carriage);
  const token = keyed?.[1] ?? (/^[A-Za-z0-9_-]+$/.test(carriage.trim()) ? carriage.trim() : null);
  if (!token) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(token)));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  // The load-bearing shape a HandleCard MUST carry — refused HERE rather than half-admitted downstream. The
  // domain fixes what this carriage admits; the nym + sig + version are what `ingest`'s reader rule then trusts.
  if (p["kind"] !== HANDLE_CARD_DOMAIN) return null;
  if (typeof p["nym"] !== "string" || !p["nym"]) return null;
  if (typeof p["sig"] !== "string" || !p["sig"]) return null;
  if (typeof p["version"] !== "number") return null;
  return parsed as HandleCard;
}

/** Encode a HandleCard into the carriage form the announcer prints and a recogniser pastes — the round-trip
 *  inverse of {@link parseHandleCardCarriage}. The whole card (incl. its `sig`) rides verbatim, so `ingest`
 *  re-verifies it on the far side. */
export function toHandleCardCarriage(card: HandleCard): string {
  return `#${HANDLE_CARD_CARRIAGE_KEY}=${base64UrlEncode(utf8Bytes(JSON.stringify(card)))}`;
}
