/**
 * admit-carriage — decode a carried `device-admit/v1` payload.
 *
 * THE ADMIT IS CARRIED, NEVER FETCHED. It is a capability the founder's root already signed, so it
 * verifies on its own and needs no trusted channel: a carrier may WITHHOLD it, never forge it. The bytes
 * may therefore ride anything — a paste, a QR code held up to a screen, a file on a stick, a URL fragment.
 *
 * The fragment earns its place because browsers never transmit one: the payload reaches the vessel and no
 * server sees it in transit, not the relay and not the issuer. The alternative — a vessel that FETCHES its
 * own admission from an endpoint — makes the vessel a client petitioning an authority, and demands that
 * authority be REACHABLE at the moment of asking. That is a global now, and this house does not have one.
 *
 * `parseAdmitCarriage` takes the carriage as a STRING and returns a payload or nothing. It touches no
 * platform: no `location`, no `history`, no clock, no network. Same bytes in, same payload out — which is
 * what lets the crossing be tested without standing a relay up.
 */
import type { DeviceAdmitPayload } from "@lararium/keyhive";

/** The kind this carriage admits. A payload announcing anything else gets refused, never guessed at. */
export const ADMIT_KIND = "device-admit/v1" as const;

/** Base64url → the bytes it encodes. Throws on a malformed input; the caller decides what that means. */
function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decode `#admit=<base64url>` (or a bare `admit=<base64url>`) from a carriage string.
 *
 * Returns the payload, or `null` when the carriage holds none, holds a malformed one, or holds something
 * that is not a device-admit. A refusal is never a throw: a garbled carriage means the admit DID NOT
 * ARRIVE — the vessel then founds its own group and stands at the floor as an anon, which is a correct
 * outcome. A vessel that crashed on a bad paste would fail a human's typo as if it were an attack.
 */
export function parseAdmitCarriage(carriage: string): DeviceAdmitPayload | null {
  const m = /(?:^|[#&?])admit=([A-Za-z0-9_-]+)/.exec(carriage);
  if (!m?.[1]) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(m[1]));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (p["kind"] !== ADMIT_KIND) return null;
  // The BINDING is the joinee's whole authority, so a payload missing any of it gets refused HERE rather
  // than half-applied downstream. `runApplyAdmitPayload` fails closed on the same three fields; this only
  // moves the refusal to the door, where the carriage can still be re-carried.
  if (typeof p["signerDid"] !== "string" || !p["signerDid"]) return null;
  if (typeof p["hearthTrueName"] !== "string" || !p["hearthTrueName"]) return null;
  if (!p["deviceEdge"] || typeof p["deviceEdge"] !== "object") return null;
  return payload as DeviceAdmitPayload;
}

/** Encode a payload into the carriage form the CLI prints and a vessel reads. The round-trip inverse. */
export function toAdmitCarriage(payload: DeviceAdmitPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64url = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `#admit=${b64url}`;
}
