/**
 * KeyhiveProvider — CapabilityProvider implementation atop @keyhive/keyhive
 * (0.1.0-alpha.6).
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

/** Content-addressed ChangeId — names one encrypted chunk by its own bytes. A real Automerge integration
 *  passes the change's actual hash; absent one, the content hash keeps the ref stable and unique per chunk. */
async function changeIdForContent(content: Uint8Array): Promise<KH.ChangeId> {
  const hashBuf = await crypto.subtle.digest("SHA-256", content.slice());
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

    // Documents carry the CGKA predecessor key chain, so a LATER-admitted device derives the doc key by
    // replaying events (the multi-vessel admit path / Model-B) — replayable access, the right default for
    // one operator's own device swarm (threat model = the operator's devices). keyhive fixes this behavior;
    // it retains secrecy of concurrent and future chunks without a per-init forward-secrecy toggle.
    //
    // RESTORE-OR-FRESH: keyhive prekeys generate per-init, so a joinee that was admitted (its membership
    // sealed to its earlier prekeys) MUST restore from its Archive — which carries the prekey SECRETS and the
    // stable card — or a fresh init orphans them and the shared content reads "Key not found". Absent an
    // archive, mint a fresh identity (the founding path, and every not-yet-admitted vessel).
    this.kh = opts.archiveBytes
      ? await new KH.Archive(opts.archiveBytes).tryToKeyhive(store, signer, handler)
      : await KH.Keyhive.init(signer, store, handler);
  }

  /**
   * Serialize this vessel's WHOLE keyhive identity — prekey secrets, membership/CGKA state, and the stable
   * contact card — for durable restore across reboots (feed the bytes back via `init({ archiveBytes })`).
   *
   * The bytes carry RAW SECRET key material; persist them ENCRYPTED-AT-REST, never in the clear. A joinee
   * exports right after generating the card it hands the founder, so the identity the founder mints-to is the
   * identity that boots. The canonical whole-identity path (probe: `prekey-persist-reboot` — restore keeps
   * both decrypt AND the same card, where `exportPrekeySecrets` alone loses the card).
   */
  async exportArchive(): Promise<Uint8Array> {
    return (await this.requireKh().toArchive()).toBytes();
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

  /**
   * Adopt a bag's document minted by a PEER — the joinee records the founder's `docId` for a shared bag URL
   * instead of generating its own (`registerBag` mints a NEW doc, which would never match). The founder ships
   * the docId; after the joinee ingests the membership events, `requireDoc` resolves it and content decrypts.
   */
  adoptBag(bagUrl: string, docIdHex: string): void {
    this.bagToDocId.set(bagUrl, docIdHex);
    this.docIdToBag.set(docIdHex, bagUrl);
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

    // addMember returns the SignedDelegation directly (the group re-keys to the new reader's own prekey).
    const signedDelegation = await this.requireKh().addMember(
      audienceAgent, doc.toMembered(), access, [],
    );

    // SignedDelegation exposes .signature: Uint8Array (unique per delegation) — we use
    // its hex as a stable delegationId for revocation. The transport bytes for the
    // audience peer flow through the event_handler (DELEGATED + the CGKA ops addMember
    // also fires) into the EventStore; callers ship those to admit a peer.
    const sigBytes = signedDelegation.signature;
    const delegationId = bytesToHex(sigBytes);
    this.delegations.set(delegationId, sigBytes);
    // Track audience+bag+access for revoke().
    this.delegationAudience.set(delegationId, args.audience);
    this.delegationBag.set(delegationId, args.bagUrl);
    return { delegationId, bytes: sigBytes };
  }

  /** Resolve a registered bag to its live Keyhive Document, or throw with the bag named. */
  private async requireDoc(bagUrl: string): Promise<KH.Document> {
    const docIdHex = this.bagToDocId.get(bagUrl);
    if (!docIdHex) throw new Error(`bag not registered: ${bagUrl} (call registerBag first)`);
    const doc = await this.requireKh().getDocument(new KH.DocumentId(hexToBytes(docIdHex)));
    if (!doc) throw new Error(`document not in scope (lost from local state?): ${bagUrl}`);
    return doc;
  }

  /**
   * Encrypt content INTO a bag's document — the CGKA keys it to every current member's leaf.
   *
   * ORDER IS LOAD-BEARING: keyhive read runs FORWARD-ONLY, so a member reads only content encrypted AT OR
   * AFTER its own `delegate()`/add. Call `registerBag` then `delegate` (add every reader vessel) BEFORE this,
   * or the fresh reader will hit `Key not found` on `decryptContent`. Granting a member PRE-EXISTING content
   * means re-encrypting each chunk here after the add (the same public-ops path, no secret leaves).
   *
   * `contentRef` names the chunk (a real Automerge integration passes the change hash); absent, the content
   * hashes to its own ref. The returned bytes are the ciphertext blob to ship — E2E, safe on any relay.
   */
  async encryptContent(bagUrl: string, content: Uint8Array, opts?: {
    readonly contentRef?: Uint8Array; readonly predRefs?: readonly Uint8Array[];
  }): Promise<Uint8Array> {
    const doc = await this.requireDoc(bagUrl);
    const cid = opts?.contentRef ? new KH.ChangeId(opts.contentRef) : await changeIdForContent(content);
    const preds = (opts?.predRefs ?? []).map((r) => new KH.ChangeId(r));
    const result = await this.requireKh().tryEncrypt(doc, cid, preds, content);
    return result.encrypted_content().serialize();
  }

  /**
   * Decrypt a ciphertext blob a peer shipped for a bag's document. Succeeds only when this vessel already
   * holds membership reaching the chunk's CGKA epoch (it decrypts with its OWN prekey secret — nothing
   * secret ever crossed the wire). A member added AFTER the chunk was encrypted reads `Key not found`.
   */
  async decryptContent(bagUrl: string, encryptedBytes: Uint8Array): Promise<Uint8Array> {
    const doc = await this.requireDoc(bagUrl);
    return this.requireKh().tryDecrypt(doc, KH.Encrypted.fromBytes(encryptedBytes));
  }

  /**
   * The PUBLIC events keyhive routes to a specific peer — the membership + CGKA ops a joinee ingests to
   * reach the group key. Capture this AFTER `encryptContent`, so it carries the PCS update op that keyed the
   * content to the joinee's leaf. Every element is public (encrypted-to-prekey CGKA path ciphertext); no
   * prekey secret, no archive, no application key rides here — the joinee holds only its own prekey secret.
   */
  async eventsForPeer(peerAgentIdHex: string): Promise<Uint8Array[]> {
    const agent = await this.requireKh().getAgent(new KH.Identifier(hexToBytes(peerAgentIdHex)));
    if (!agent) throw new Error(`peer not known to this provider — exchange contact cards first: ${peerAgentIdHex.slice(0, 16)}…`);
    const map = await this.requireKh().eventsForAgent(agent);
    return [...(map as Map<unknown, unknown>).values()] as Uint8Array[];
  }

  /** Ingest the public events a peer shipped (from their `eventsForPeer`) — establishes membership/CGKA state. */
  async ingestPeerEvents(events: readonly Uint8Array[]): Promise<void> {
    await this.requireKh().ingestEventsBytes(events as Uint8Array[]);
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
