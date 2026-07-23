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
  // than half-applied downstream. `runApplyAdmitPayload` fails closed on the same fields; this only moves
  // the refusal to the door, where the carriage can still be re-carried. The persona-KEL PREFIX is part of
  // that authority now — the joinee's Binding Gate pins it and walks the KEL to the head.
  if (typeof p["signerDid"] !== "string" || !p["signerDid"]) return null;
  if (typeof p["personaKelPrefix"] !== "string" || !p["personaKelPrefix"]) return null;
  if (typeof p["hearthTrueName"] !== "string" || !p["hearthTrueName"]) return null;
  if (!p["deviceEdge"] || typeof p["deviceEdge"] !== "object") return null;
  return payload as DeviceAdmitPayload;
}

/**
 * Take a carriage a HUMAN pasted, in whichever of its forms they had to hand.
 *
 * The CLI prints two things and a browser shows a third, so a human arrives holding any of: the whole
 * `#admit=…` line, a URL that ends in one, the bare base64url token with the `admit=` rubbed off by a
 * chat client, or the pretty-printed JSON payload written to stdout. Every one of them carries the SAME
 * signed capability; refusing four of the five would make the human retype bytes they already hold.
 *
 * The recognition stays one function deep: each form normalizes to a carriage string and goes through
 * `parseAdmitCarriage` — so the kind-check and the binding-field refusal live in exactly one place, and a
 * paste never reaches a second, looser door. Returns null on anything it cannot read; a typo fails soft.
 */
export function parseAdmitPaste(text: string): DeviceAdmitPayload | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const direct = parseAdmitCarriage(trimmed);
  if (direct) return direct;
  // The JSON the CLI writes to stdout — re-encoded into a carriage so ONE parser adjudicates it.
  if (trimmed.startsWith("{")) {
    try {
      return parseAdmitCarriage(toAdmitCarriage(JSON.parse(trimmed) as DeviceAdmitPayload));
    } catch {
      return null;
    }
  }
  // A bare token: the `admit=` rubbed off in transit. Re-attach the label and re-read.
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return parseAdmitCarriage(`#admit=${trimmed}`);
  return null;
}

/**
 * Write the exact line the operator runs on the NODE to admit the vessel that shows it.
 *
 * The vessel is the only place its own key exists, so the vessel says it — as the command, not as a fact
 * the human must assemble. The key rides as 64-char lowercase hex with no `0x`: that is the one form
 * `runDeviceAdmitEdge` accepts, and a decorated key produces a command that fails at the node with the
 * human standing at a different device.
 */
export function formatAdmitCommand(verifyingKey: string): string {
  const hex = verifyingKey.trim().replace(/^0x/i, "").toLowerCase();
  return `lares device-admit --joinee-key ${hex}`;
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
