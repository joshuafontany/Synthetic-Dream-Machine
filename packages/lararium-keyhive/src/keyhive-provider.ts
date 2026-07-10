/**
 * KeyhiveProvider — CapabilityProvider implementation atop @keyhive/keyhive
 * pre-alpha (0.0.0-alpha.56c).
 *
 * Mapping:
 *   - Lararium bag URL ↔ Keyhive Document, 1:1
 *   - Operator ed25519 seed → Signer.memorySignerFromBytes
 *   - Peer DID = hex-encoded Identifier bytes (matches Keyhive.idString)
 *   - Access "read" / "admin" passes through verbatim
 *
 * Bag URL ↔ DocumentId mapping lives in-memory; TODO: persist it as
 * tiddler fields under each cap event so it survives daemon restart.
 *
 * Caveats (pre-alpha):
 *   - No security audit; not for adversarial multi-peer use
 *   - Wire format may rev between alpha versions; pin @keyhive/keyhive
 *     and treat upgrades as planned breaking changes
 *   - PREKEY_ROTATED fires often; production EventStore should batch
 */

// SLIM build (manual init) — NOT the default "." export, whose wasm-bindgen auto-init
// (`new URL(keyhive_wasm_bg.wasm, import.meta.url)`) mis-resolves in a Web Worker bundle
// and kills the module at evaluation. The slim build does NOT auto-init on import; we feed
// its wasm as CONTENT (off the module graph), the same law the engine bytes obey.
import * as KH from "@keyhive/keyhive/slim";
// @ts-expect-error — keyhive's base64 .d.ts is a `declare module` augmentation, not a module
// (TS2306); the runtime export `wasmBase64` (a base64 string) resolves fine in node + vite.
import { wasmBase64 } from "@keyhive/keyhive/keyhive_wasm.base64.js";
import type {
  CapabilityProvider, CapabilityProviderInitOpts,
  DelegateArgs, DelegateResult, VerifyArgs, VerifyResult,
  PeerDID, KeyhiveAccess,
} from "./capability-provider.js";

/** setPanicHook installs a global Rust→JS error translator. Calling it twice
 *  panics ("a global default trace dispatcher has already been set"). Guard
 *  with a module-level flag so multiple providers in one process play nice. */
let panicHookInstalled = false;
function ensurePanicHook(): void {
  if (panicHookInstalled) return;
  try { (KH as unknown as { setPanicHook?: () => void }).setPanicHook?.(); } catch { /* already installed */ }
  panicHookInstalled = true;
}

/** The keyhive WASM must instantiate before ANY KH call (including setPanicHook). The slim
 *  build is fed content, never an asset URL — default the inlined base64; a host MAY feed
 *  content-addressed bytes (CID/CAS, the engine-bytes law) via setKeyhiveWasmBytes() first. */
let keyhiveWasmReady = false;
let keyhiveWasmBytesOverride: Uint8Array | undefined;
export function setKeyhiveWasmBytes(bytes: Uint8Array): void { keyhiveWasmBytesOverride = bytes; }
export function ensureKeyhiveWasm(): void {
  if (keyhiveWasmReady) return;
  keyhiveWasmReady = true; // set first — re-entry + double-init are both no-ops
  try {
    if (keyhiveWasmBytesOverride) {
      (KH as unknown as { initSync: (o: { module: Uint8Array }) => void }).initSync({ module: keyhiveWasmBytesOverride });
    } else {
      KH.initFromBase64Wasm(wasmBase64);
    }
  } catch {
    // The worker entry may have already instantiated this same bundled wasm instance
    // (init-before-chain-eval). A second init throws ("already initialized") — harmless;
    // the module's wasm is live either way.
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error(`bad hex length: ${hex}`);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Stable ChangeId for a bag URL — deterministic so two registrations of
 *  the same URL produce the same Keyhive Document seed. Hash via SHA-256. */
async function changeIdForBag(bagUrl: string): Promise<KH.ChangeId> {
  const bytes = new TextEncoder().encode(bagUrl);
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  return new KH.ChangeId(new Uint8Array(hashBuf));
}

export class KeyhiveProvider implements CapabilityProvider {
  private kh:         KH.Keyhive | null = null;
  private eventStore: CapabilityProviderInitOpts["eventStore"] | null = null;
  /** bagUrl → DocumentId bytes (hex). DocumentId class wraps bytes; we
   *  keep the hex form to use as a stable string key. */
  private readonly bagToDocId = new Map<string, string>();
  /** Reverse: docId hex → bagUrl. */
  private readonly docIdToBag = new Map<string, string>();
  /** delegationId (hex of SignedDelegation.signature) → signature bytes. */
  private readonly delegations = new Map<string, Uint8Array>();
  /** delegationId → audience DID (so revoke can rebuild the addMember target). */
  private readonly delegationAudience = new Map<string, string>();
  /** delegationId → bag URL (so revoke knows which Document.toMembered() to use). */
  private readonly delegationBag = new Map<string, string>();

  async init(opts: CapabilityProviderInitOpts): Promise<void> {
    if (this.kh) throw new Error("KeyhiveProvider: already initialized");
    if (opts.seed.length !== 32) throw new Error(`seed must be 32 bytes (got ${opts.seed.length})`);
    ensureKeyhiveWasm();
    ensurePanicHook();
    this.eventStore = opts.eventStore;

    const signer = KH.Signer.memorySignerFromBytes(opts.seed);
    const store  = KH.CiphertextStore.newInMemory();

    const handler = (event: unknown): void => {
      // Fire-and-forget persistence. Errors get swallowed at this seam —
      // the EventStore impl logs its own failures.
      const e = event as KH.Event;
      try {
        const variant = e.variant;
        const bytes   = e.toBytes();
        // The in-memory store uses synthetic hashes here; a
        // tiddler-backed store will compute content hashes itself.
        const hash    = `${variant}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        void this.eventStore?.put({ hash, variant, bytes });
      } catch (err) {
        console.error("[keyhive] event capture failed:", err);
      }
    };

    // forward_secrecy: false — documents carry the CGKA predecessor key chain, so a
    // LATER-admitted device derives the doc key by replaying events (the multi-vessel
    // admit path / Model-B). `true` would rotate keys forward and lock new readers out
    // of prior state, requiring explicit rekey delivery. For one operator's own device
    // swarm, replayable access is the right default (threat model = the operator's devices).
    this.kh = await KH.Keyhive.init(signer, store, handler, false);
  }

  private requireKh(): KH.Keyhive {
    if (!this.kh) throw new Error("KeyhiveProvider: not initialized — call init() first");
    return this.kh;
  }

  async whoami(): Promise<PeerDID> {
    // NOT idString — that formatter trims per-byte leading zeros and
    // produces strings of inconsistent length (~60 chars vs the canonical
    // 64). Use the raw bytes via `whoami: IndividualId` and our own hex.
    return bytesToHex(this.requireKh().whoami.bytes);
  }

  async contactCard(): Promise<Uint8Array> {
    // ContactCard serializes as JSON (toJson / fromJson) in alpha.56c.
    // We wrap it in a UTF-8 byte form so transport layers stay byte-uniform.
    const card = await this.requireKh().contactCard();
    return new TextEncoder().encode(card.toJson());
  }

  async receiveContactCard(bytes: Uint8Array): Promise<{ id: PeerDID }> {
    const json = new TextDecoder().decode(bytes);
    const card = KH.ContactCard.fromJson(json);
    const individual = await this.requireKh().receiveContactCard(card);
    const idBytes = individual.id.toBytes();
    return { id: bytesToHex(idBytes) };
  }

  async registerBag(bagUrl: string): Promise<{ docId: string }> {
    const cached = this.bagToDocId.get(bagUrl);
    if (cached) return { docId: cached };

    const cid = await changeIdForBag(bagUrl);
    const doc = await this.requireKh().generateDocument([], cid, []);
    const docIdHex = bytesToHex(doc.id.toBytes());
    this.bagToDocId.set(bagUrl, docIdHex);
    this.docIdToBag.set(docIdHex, bagUrl);
    return { docId: docIdHex };
  }

  async delegate(args: DelegateArgs): Promise<DelegateResult> {
    const docIdHex = this.bagToDocId.get(args.bagUrl);
    if (!docIdHex) throw new Error(`bag not registered: ${args.bagUrl} (call registerBag first)`);
    const docId = new KH.DocumentId(hexToBytes(docIdHex));

    const access = KH.Access.tryFromString(args.access);
    if (!access) throw new Error(`invalid access: ${args.access} (Keyhive accepts only "read" or "admin")`);

    const audienceId = new KH.Identifier(hexToBytes(args.audience));
    const audienceAgent = await this.requireKh().getAgent(audienceId);
    if (!audienceAgent) throw new Error(`audience not known to this provider — exchange contact cards first`);

    // Need the actual Document, not just its id, to call toMembered().
    const doc = await this.requireKh().getDocument(docId);
    if (!doc) throw new Error(`document not in scope (lost from local state?): ${args.bagUrl}`);

    // 0.1.0: addMember returns AddMemberUpdate { delegation: SignedDelegation, leafSecrets }.
    const update = await this.requireKh().addMember(
      audienceAgent, doc.toMembered(), access, [],
    );

    // SignedDelegation exposes .signature: Uint8Array (unique per delegation) — we use
    // its hex as a stable delegationId for revocation. The transport bytes for the
    // audience peer flow through the event_handler (DELEGATED + the CGKA ops addMember
    // also fires) into the EventStore; callers ship those to admit a peer.
    const sigBytes = update.delegation.signature;
    const delegationId = bytesToHex(sigBytes);
    this.delegations.set(delegationId, sigBytes);
    // Track audience+bag+access for revoke().
    this.delegationAudience.set(delegationId, args.audience);
    this.delegationBag.set(delegationId, args.bagUrl);
    return { delegationId, bytes: sigBytes };
  }

  /**
   * Revoke a delegation by its id (the delegation's signature hex from `delegate()`).
   *
   * Bridges our wrapper to Keyhive's live `revokeMember` — the concap promise made real:
   * revocation is a CONVERGENT CRDT op (it fires REVOKED events into the event_handler/
   * EventStore that converge across replicas; offline peers stay authorized locally until
   * they sync the revocation — eventual, per concap, never synchronous). `retain_all_other_
   * members=true` revokes ONLY this audience's membership, leaving the rest intact.
   */
  async revoke(delegationId: string): Promise<{ bytes: Uint8Array }> {
    if (!this.delegations.has(delegationId)) {
      throw new Error(`unknown delegationId: ${delegationId}`);
    }
    const audience = this.delegationAudience.get(delegationId);
    const bagUrl   = this.delegationBag.get(delegationId);
    if (!audience || !bagUrl) {
      throw new Error(`revoke(): no audience/bag tracked for delegationId ${delegationId.slice(0, 16)}…`);
    }
    const docIdHex = this.bagToDocId.get(bagUrl);
    if (!docIdHex) throw new Error(`revoke(): bag not registered: ${bagUrl}`);
    const docId = new KH.DocumentId(hexToBytes(docIdHex));
    const doc   = await this.requireKh().getDocument(docId);
    if (!doc) throw new Error(`revoke(): document not in scope: ${bagUrl}`);

    const audienceId    = new KH.Identifier(hexToBytes(audience));
    const audienceAgent = await this.requireKh().getAgent(audienceId);
    if (!audienceAgent) throw new Error(`revoke(): audience agent not known: ${audience.slice(0, 16)}…`);

    const revocations = await this.requireKh().revokeMember(audienceAgent, true, doc.toMembered());
    if (!revocations || revocations.length === 0) {
      throw new Error("revoke(): revokeMember produced no revocation events");
    }
    // Mirror delegate()'s "signature as id"; the events themselves ride the event_handler → EventStore.
    const bytes = revocations[0]!.signature;
    // This delegation is revoked — drop local tracking so a re-revoke fails loud rather than re-firing.
    this.delegations.delete(delegationId);
    this.delegationAudience.delete(delegationId);
    this.delegationBag.delete(delegationId);
    return { bytes };
  }

  async verify(args: VerifyArgs): Promise<VerifyResult> {
    const docIdHex = this.bagToDocId.get(args.bagUrl);
    if (!docIdHex) {
      return { ok: false, reason: `bag not registered: ${args.bagUrl}` };
    }
    const docId = new KH.DocumentId(hexToBytes(docIdHex));
    const presenterId = new KH.Identifier(hexToBytes(args.presenter));

    const granted = await this.requireKh().accessForDoc(presenterId, docId);
    if (!granted) {
      return { ok: false, reason: "no access granted" };
    }
    const grantedStr = granted.toString().toLowerCase();
    // admin satisfies read; read does NOT satisfy admin.
    if (args.access === "read")  return { ok: true };
    if (args.access === "admin" && grantedStr === "admin") return { ok: true };
    return { ok: false, reason: `granted=${grantedStr}, required=${args.access}` };
  }

  /**
   * Create a sentinel Document used as a membership principal.
   *
   * NOTE: Keyhive's Group primitive is the semantically correct vehicle for
   * membership cabals (Person-Group, Mesh adminCabal). However, GroupId has a
   * private constructor in alpha.56c — no round-trip from stored bytes. We
   * use Document here because DocumentId has a public constructor, enabling
   * hex-in-tiddler persistence. Migrate to Group when the API exposes
   * GroupId serialization or a getGroup(Identifier) path.
   *
   * Returns both the DocumentId hex (for bag-level accessForDoc checks) and
   * the Document's agent Identifier hex (for adding this sentinel as a member
   * of another sentinel via addMember).
   */
  async createSentinelDoc(sentinelUri: string): Promise<{ docIdHex: string; agentIdHex: string }> {
    const cid = await changeIdForBag(sentinelUri);
    const doc = await this.requireKh().generateDocument([], cid, []);
    const docIdHex   = bytesToHex(doc.doc_id.toBytes());
    const agentIdHex = bytesToHex(doc.id.toBytes());
    return { docIdHex, agentIdHex };
  }

  /**
   * Add an agent (by its Identifier hex) as an Daemon member of a sentinel Document.
   * Used during the founding ceremony to wire vessel Individual → PersonaGroup
   * and PersonaGroup → MeshCabal chains.
   */
  async addSentinelMember(
    memberIdentifierHex: string,
    sentinelDocIdHex:    string,
  ): Promise<void> {
    const docId  = new KH.DocumentId(hexToBytes(sentinelDocIdHex));
    const doc    = await this.requireKh().getDocument(docId);
    if (!doc) throw new Error(`[keyhive] sentinel doc not found: ${sentinelDocIdHex.slice(0, 16)}…`);

    const agentId = new KH.Identifier(hexToBytes(memberIdentifierHex));
    const agent   = await this.requireKh().getAgent(agentId);
    if (!agent) throw new Error(`[keyhive] agent not found for sentinel addMember: ${memberIdentifierHex.slice(0, 16)}…`);

    const access  = KH.Access.tryFromString("admin");
    if (!access) throw new Error("[keyhive] Access.tryFromString('admin') returned undefined");

    await this.requireKh().addMember(agent, doc.toMembered(), access, []);
  }

  /**
   * Revoke an agent's (by Identifier hex) membership on a sentinel Document — the
   * symmetric close of the sentinel trio (createSentinelDoc / addSentinelMember /
   * verifySentinelMembership → +revokeSentinelMember). The public `revoke()` only
   * serves a `delegate()`-tracked delegationId; a sentinel member added via
   * `addSentinelMember` produces no such id, so it needs this audience+doc path.
   *
   * CONVERGENT-REMOVAL (canon cabal-place#the-tie-break — "malice rides Keyhive
   * convergent-removal, never the counter"): `retain_all_other_members=true`
   * revokes ONLY this audience, leaving the rest intact; the REVOKED events fire
   * into the event_handler/EventStore and converge across replicas (eventual, per
   * concap — an offline peer stays authorized locally until it syncs the tombstone).
   */
  async revokeSentinelMember(
    memberIdentifierHex: string,
    sentinelDocIdHex:    string,
  ): Promise<{ bytes: Uint8Array }> {
    const docId = new KH.DocumentId(hexToBytes(sentinelDocIdHex));
    const doc   = await this.requireKh().getDocument(docId);
    if (!doc) throw new Error(`[keyhive] sentinel doc not found for revoke: ${sentinelDocIdHex.slice(0, 16)}…`);

    const agentId = new KH.Identifier(hexToBytes(memberIdentifierHex));
    const agent   = await this.requireKh().getAgent(agentId);
    if (!agent) throw new Error(`[keyhive] agent not found for sentinel revoke: ${memberIdentifierHex.slice(0, 16)}…`);

    const revocations = await this.requireKh().revokeMember(agent, true, doc.toMembered());
    if (!revocations || revocations.length === 0) {
      throw new Error("[keyhive] revokeSentinelMember produced no revocation events");
    }
    return { bytes: revocations[0]!.signature };
  }

  /**
   * Verify that an agent (by Identifier hex) holds any access on a sentinel Document.
   * Gate B: vesselIndividualHex vs personaGroupDocIdHex
   * Gate C: personaGroupAgentIdHex vs meshCabalDocIdHex
   *
   * Returns VerifyResult shape for consistency with verify().
   */
  async verifySentinelMembership(
    agentIdentifierHex: string,
    sentinelDocIdHex:   string,
  ): Promise<{ ok: boolean; reason?: string }> {
    const docId      = new KH.DocumentId(hexToBytes(sentinelDocIdHex));
    const identifier = new KH.Identifier(hexToBytes(agentIdentifierHex));
    const access     = await this.requireKh().accessForDoc(identifier, docId);
    if (!access) return { ok: false, reason: "no access granted in sentinel" };
    return { ok: true };
  }

  /**
   * Return the operator vessel's IndividualId as a hex Identifier string.
   * Used during init to wire the founding vessel into the PersonaGroup sentinel.
   */
  async vesselIdentifierHex(): Promise<string> {
    const individual = await this.requireKh().individual;
    return bytesToHex(individual.id.toBytes());
  }

  async hydrateFromEventStore(): Promise<{ ingested: number }> {
    if (!this.eventStore) return { ingested: 0 };
    const records = await this.eventStore.list();
    if (records.length === 0) return { ingested: 0 };
    const eventsArray = records.map((r) => r.bytes);
    await this.requireKh().ingestEventsBytes(eventsArray);
    return { ingested: records.length };
  }

  async dispose(): Promise<void> {
    // Keyhive WASM types support Symbol.dispose; rely on JS GC otherwise.
    this.kh = null;
    this.bagToDocId.clear();
    this.docIdToBag.clear();
    this.delegations.clear();
    this.delegationAudience.clear();
    this.delegationBag.clear();
  }
}
