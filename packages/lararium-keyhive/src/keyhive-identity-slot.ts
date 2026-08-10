/**
 * KeyhiveIdentitySlot — the pono IdentitySlot: every method rides the REAL
 * Keyhive capability barrier, never a permissive default.
 *
 * WHY IT LIVES HERE (not in @lararium/mesh): mesh owns the `IdentitySlot`
 * interface but CANNOT import Keyhive — keyhive imports FROM mesh, so a mesh→
 * keyhive edge would close a package cycle. This mirrors the #49 federation-gate
 * precedent exactly: mesh keeps the narrow deny-nothing default (OpenIdentitySlot)
 * as its alpha socket; the crypto-backed implementation slots in behind the
 * SAME interface from the keyhive package, no call-site churn.
 *
 * Each method routes through a real `CapabilityProvider` (KeyhiveProvider in
 * production): `verify` rides genuine `accessForDoc` (Ed25519 membership),
 * `delegate` mints a real revocable delegation event.
 *
 * ── HONEST BOUND ────────────────────────────────────────────────────────────
 * PROVABLY ENFORCES (rides real crypto, at any call site that invokes it):
 *   · A presenter never delegated (or since revoked) CANNOT obtain
 *     verifyCapability → true. The verdict is `provider.verify().ok`, which
 *     resolves bagUrl→docId, materializes the island, and calls Keyhive's
 *     `accessForDoc` — a genuine capability check, not an id-guess gate.
 *   · edit ⇒ admin: a read-only delegation does NOT satisfy verifyCapability(…,
 *     "edit"). "edit" maps to the "admin" rung; admin satisfies read, read never
 *     satisfies admin (KeyhiveProvider.verify §402-419).
 *
 * OUT OF SCOPE (the held wiring second-half + BeeKEM):
 *   · NOTHING in production calls these methods yet. This class is the built,
 *     tested crypto-backed slot; wiring a sharePolicy / LarVessel call site to
 *     construct it (retiring the OpenIdentitySlot default) is a SEPARATE thread.
 *     Until then it enforces at runtime only where a call site chooses to invoke
 *     it — construction alone gates nothing.
 *   · TRUE read-confidentiality — denying a *guessed* doc id and hiding the
 *     bytes at rest — is BeeKEM (Keyhive's encryption layer), not this shore.
 *     This slot gates the sharePolicy ACCESS decision; it does not encrypt.
 *   · verifyDelegation trusts the audience the token NAMES (see its doc): it
 *     confirms that named audience genuinely holds the cap via accessForDoc, but
 *     does not cryptographically bind the *presenter* to the token. Presenter↔
 *     token binding is the WASM sync-time membership proof, not this shore.
 *
 * Meme: lar:///ha.ka.ba/lararium/keyhive/identity-slot
 */
import type { ActorId, CapabilityToken, IdentitySlot } from "@lararium/mesh";
import type { CapabilityAccess } from "@lararium/mesh";
import type { CapabilityProvider } from "./capability-provider.js";

export interface KeyhiveIdentitySlotOpts {
  /** The real capability provider (KeyhiveProvider in production). */
  readonly provider: CapabilityProvider;
  /** This vessel's DID — the presenter asserted by verifyCapability (self). */
  readonly did: string;
}

/**
 * The wire shape of a CapabilityToken this slot mints. Self-describing so a
 * remote verifyDelegation can route the honest accessForDoc check without a
 * side channel. `bytes` (hex) carries the raw Keyhive delegation event the
 * audience ingests over the federation transport.
 */
interface KeyhiveTokenPayload {
  readonly v: 1;
  readonly delegationId: string;
  readonly audience:     string;
  readonly bagUrl:       string;
  readonly access:       CapabilityAccess;
  /** Absolute expiry in POSIX milliseconds if the caller passed expiresIn; else null. WALL-CLOCK, and
   *  deliberately not the word `epoch` — that names the mesh's clockless fencing frontier (`epoch-lease`),
   *  and a reader who meets both spellings in one file has to guess which authority a number carries.
   *  NOTE (shore): the provider's DelegateArgs carries no expiry, so expiry is
   *  token-advisory only — verifyDelegation enforces it, the crypto layer does
   *  not. Real time-boxing waits on a provider expiry surface. */
  readonly expiresAtMs:  number | null;
  readonly bytesHex:     string;
}

/** "edit" is the interface's write verb; the provider's write rung is "admin". */
function accessFor(ability: "read" | "edit"): CapabilityAccess {
  return ability === "edit" ? "admin" : "read";
}

export class KeyhiveIdentitySlot implements IdentitySlot {
  readonly did: string;
  readonly #provider: CapabilityProvider;

  constructor(opts: KeyhiveIdentitySlotOpts) {
    this.#provider = opts.provider;
    this.did       = opts.did;
  }

  /**
   * Does THIS vessel hold `ability` on docUrl? Presenter = self (this.did):
   * the sharePolicy asks "may I sync this doc", so the vessel presents its own
   * DID against the real barrier. Rides provider.verify → accessForDoc.
   */
  async verifyCapability(docUrl: string, ability: "read" | "edit"): Promise<boolean> {
    const res = await this.#provider.verify({
      presenter: this.did,
      bagUrl:    docUrl,
      access:    accessFor(ability),
    });
    return res.ok;
  }

  /**
   * Mint a real, revocable delegation of `ability` on docUrl to toDid, and
   * serialize it into a self-describing CapabilityToken. The audience peer must
   * already be a known agent to the provider (contactCard exchanged) — the
   * provider throws otherwise, surfacing the missing-introduction honestly.
   */
  async delegateCapability(
    docUrl:     string,
    toDid:      string,
    ability:    "read" | "edit",
    expiresIn?: number,
  ): Promise<CapabilityToken> {
    const result = await this.#provider.delegate({
      audience: toDid,
      bagUrl:   docUrl,
      access:   accessFor(ability),
    });
    const payload: KeyhiveTokenPayload = {
      v:            1,
      delegationId: result.delegationId,
      audience:     toDid,
      bagUrl:       docUrl,
      access:       accessFor(ability),
      expiresAtMs:  expiresIn === undefined ? null : Date.now() + expiresIn * 1000,
      bytesHex:     bytesToHex(result.bytes),
    };
    return JSON.stringify(payload);
  }

  /**
   * Verify a delegation token a remote vessel presents for docUrl.
   *
   * Honest check landed: parse the token, enforce its bag-scope + advisory
   * expiry, then route the NAMED audience through the REAL barrier —
   * provider.verify({presenter: token.audience, bagUrl: docUrl}) rides
   * accessForDoc. A forged token naming an audience never delegated (or since
   * revoked) returns false; only a genuinely-held delegation clears.
   *
   * SHORE (surfaced, not faked): this trusts the audience the token NAMES. The
   * provider surface exposes no token→presenter resolution, so this cannot
   * cryptographically bind the presenting peer to the token — that binding is
   * the WASM sync-time membership proof. It never returns a bare `true`: every
   * clear rides real accessForDoc for the named audience.
   */
  async verifyDelegation(token: CapabilityToken, docUrl: string): Promise<boolean> {
    if (token === null) return false;   // no open default: absent token = deny
    let payload: KeyhiveTokenPayload;
    try {
      payload = JSON.parse(token) as KeyhiveTokenPayload;
    } catch {
      return false;                     // unparseable token = deny
    }
    if (payload.v !== 1)          return false;
    if (payload.bagUrl !== docUrl) return false;   // token scoped to another bag
    if (payload.expiresAtMs !== null && Date.now() > payload.expiresAtMs) return false;

    const res = await this.#provider.verify({
      presenter: payload.audience,
      bagUrl:    docUrl,
      access:    payload.access,
    });
    return res.ok;
  }

  /**
   * Stable Automerge actor id from this identity's DID via Web Crypto SHA-256
   * truncated to 16 bytes. Same logic as OpenIdentitySlot.deriveActorId
   * (identity-slot.ts:121-132) — DUPLICATED, not extended (do not invent new
   * crypto; keep mesh untouched). Deterministic: same DID → same actorId.
   */
  async deriveActorId(): Promise<ActorId> {
    try {
      const enc   = new TextEncoder();
      const hash  = await crypto.subtle.digest("SHA-256", enc.encode(this.did));
      const bytes = new Uint8Array(hash).slice(0, 16);
      return formatUuid(bytes);
    } catch {
      return deterministicUuid(this.did);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers — DUPLICATED from identity-slot.ts (formatUuid/deterministicUuid) so
// mesh stays untouched; keep byte-for-byte identical to that file's logic.
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatUuid(bytes: Uint8Array): string {
  const h = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Non-crypto fallback for environments without SubtleCrypto.
function deterministicUuid(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    h = ((h ^ (h >> 16)) * 0x45d9f3b) >>> 0;
    b[i] = h & 0xff;
  }
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return formatUuid(b);
}
