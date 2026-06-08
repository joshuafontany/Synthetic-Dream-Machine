/**
 * IdentitySlot — pluggable DID-based identity abstraction.
 *
 * Designed to be satisfied by three concrete implementations:
 *
 *   BlueskyIdentitySlot    — AT Protocol DID (did:plc or did:web:user.bsky.social)
 *   GitHubIdentitySlot     — OAuth token mapped to did:web:github.com/<username>
 *   KeyhiveIdentitySlot    — Keyhive convergent capabilities (Ink & Switch)
 *
 * STATUS NOTE (2026-06-08, drift-reconcile): Keyhive is NO LONGER pending — it runs
 * LIVE at the OPERATOR level (bootAdminKeyhive Gates A/B/C, the V3 peer-boundary gate,
 * resolveOrMintBinding) in @lararium/keyhive. THIS slot governs only USER-level access
 * (Bluesky/GitHub/keyhive-user), which remains the alpha stub. The node sharePolicy
 * already gates inbound network peers via the V3 admin-auth gate; the browser admits
 * only same-origin/in-process peers (a legitimate asymmetry, not an open hole). See
 * lararium-canonical-model #open-drift (point 4).
 *
 * The interface is intentionally narrow — only what LarVessel and the Automerge
 * sharePolicy need to function. Keyhive's full three-layer stack (convergent
 * capabilities + Group CRDT + BeeKEM) slots in without changing the interface.
 *
 * DNS-based identity namespace:
 *   User identity is expressed as a DID — typically did:web:<handle> for
 *   Bluesky (e.g. did:web:user.bsky.social) or did:web:github.com/<user>.
 *   The DID's signing key is used to derive stable Automerge actor IDs and
 *   (future) to derive deterministic doc URLs per user namespace.
 *
 * URI convention:
 *   lar://did:web:user.bsky.social/wikis/altar-fire
 *         └─ userNamespace ──────┘└─ path ────────┘
 *
 * Quine fit:
 *   The IdentitySlot implementation class lives in TypeScript (it must — crypto
 *   primitives can't live in the wiki). BUT the identity config (which DID to
 *   use, which OAuth provider, which capability token) MUST be stored as
 *   lar: URI tiddlers so users can inspect and override from within the wiki:
 *     lar:///ha.ka.ba/@lararium/config/identity/did
 *     lar:///ha.ka.ba/@lararium/config/identity/provider
 *     lar:///ha.ka.ba/@catalog
 *   Reserve $:/ ONLY for TW5 core + TW5 plugins. All Lararium config is lar:.
 *   Tiddlers with lar: URIs serve as the heleuma sync candidates; $:/ tiddlers do not.
 */

/** Automerge-compatible actor ID — 16-byte UUID string, stable per vessel. */
export type ActorId = string;

/**
 * CapabilityToken — an opaque token proving access to a document.
 *
 * In UCAN mode: a JWT string with proof chain.
 * In Keyhive mode: a serialized convergent capability (ConcAp token).
 * In alpha/open mode: null (sharePolicy returns true unconditionally).
 */
export type CapabilityToken = string | null;

/**
 * IdentitySlot — minimum surface LarVessel needs from an identity provider.
 *
 * All methods are async so implementations can lazily fetch keys from
 * IndexedDB (browser) or a key file (node) without blocking construction.
 */
export interface IdentitySlot {
  /** The vessel/operator DID — e.g. "did:web:user.bsky.social" or "did:plc:xxxxx". */
  readonly did: string;

  /**
   * Derive a stable Automerge actor ID from this identity's signing key.
   * Must be deterministic: same key → same actorId across reboots.
   * Typically: first 16 bytes of BLAKE3(signingPublicKey), formatted as UUID.
   */
  deriveActorId(): Promise<ActorId>;

  /**
   * Verify that this vessel holds a valid capability to access the given doc.
   * Called from Automerge Repo's sharePolicy.
   * Returns true if the vessel should be allowed to sync docUrl.
   */
  verifyCapability(docUrl: string, ability: "read" | "edit"): Promise<boolean>;

  /**
   * Issue a capability token delegating access to docUrl to another vessel DID.
   * Used for wiki invitations: the island author issues tokens; joiners present them.
   */
  delegateCapability(
    docUrl:     string,
    toDid:      string,
    ability:    "read" | "edit",
    expiresIn?: number,  // seconds; undefined = no expiry
  ): Promise<CapabilityToken>;

  /**
   * Verify a capability token presented by a remote vessel.
   * The Automerge Repo sharePolicy calls this when a vessel requests a doc.
   */
  verifyDelegation(token: CapabilityToken, docUrl: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// OpenIdentitySlot — the alpha/beta stub: all access permitted.
// Replace with BlueskyIdentitySlot or KeyhiveIdentitySlot as auth lands.
// ---------------------------------------------------------------------------

/**
 * OpenIdentitySlot — permits all access; uses vesselId hash for stable actorId.
 *
 * Current alpha stub. The sharePolicy wired to it returns true
 * unconditionally (same as the current hardcoded `async () => true`), but now
 * the actorId is stable across reboots — derived from the vesselId string.
 */
export class OpenIdentitySlot implements IdentitySlot {
  readonly did: string;
  private readonly _vesselId: string;

  constructor(vesselId: string) {
    this._vesselId = vesselId;
    // Placeholder DID until user logs in via Bluesky (elyncia.social) or GitHub.
    // Real login sets did:web:elyncia.social or did:web:github.com/<user>.
    this.did = `did:web:elyncia.app/vessels/${encodeURIComponent(vesselId)}`;
  }

  async deriveActorId(): Promise<ActorId> {
    // Stable UUID derived from vesselId via Web Crypto SHA-256 truncated to 16 bytes.
    // Falls back to a simple string hash in environments without SubtleCrypto.
    try {
      const enc  = new TextEncoder();
      const hash = await crypto.subtle.digest("SHA-256", enc.encode(this._vesselId));
      const bytes = new Uint8Array(hash).slice(0, 16);
      return formatUuid(bytes);
    } catch {
      return deterministicUuid(this._vesselId);
    }
  }

  async verifyCapability(_docUrl: string, _ability: "read" | "edit"): Promise<boolean> {
    return true; // alpha: open
  }

  async delegateCapability(
    _docUrl: string, _toDid: string, _ability: "read" | "edit",
  ): Promise<CapabilityToken> {
    return null; // alpha: no token required
  }

  async verifyDelegation(_token: CapabilityToken, _docUrl: string): Promise<boolean> {
    return true; // alpha: open
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUuid(bytes: Uint8Array): string {
  const h = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

// Non-crypto fallback for environments without SubtleCrypto (e.g. old Node).
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
