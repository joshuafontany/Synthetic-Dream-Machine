# D.1 Probe Findings — @keyhive/keyhive @ 0.0.0-alpha.56c

> Run: `pnpm exec tsx packages/lararium-keyhive/probes/operator-delegate-device.ts`
> Date: 2026-05-08
> Verdict: **WORKABLE**. Pre-alpha label is technically correct (no security audit, version 0.0.0-alpha.56c), but the API itself answered every Q1–Q5 question on the first or second iteration.

## Summary

The probe exercised: install + import → two `Keyhive` peers up via `Keyhive.init(signer, store, handler)` → contact-card exchange → operator generates a `Document` → operator `addMember(device, doc.toMembered(), Access.admin, [])` → returns a `SignedDelegation`. All paths landed clean.

## Q1 — Install + import

✅ **Clean.** `pnpm add @keyhive/keyhive@0.0.0-alpha.56c` resolved without conflicts. tsx imports the package via its `node` exports condition (`./pkg-node/keyhive_wasm.js`). Bundle size: 8.8 MB unpacked (WASM payload).

Cold-init timing under tsx:
- First `Keyhive.init()`: 10–13 ms
- Subsequent: 2–4 ms

## Q2 — Operator-key compatibility

✅ **`Signer.memorySignerFromBytes(seedBytes: Uint8Array)` accepts arbitrary 32-byte seeds.** Direct path for our `operator-key.ts` ed25519 key — D.3 just feeds the existing seed in.

Other Signer factories surfaced:
- `Signer.generate()` — async, fresh random
- `Signer.generateMemory()` — sync, fresh random
- `Signer.generateWebCrypto()` — browser-native via WebCrypto API
- `Signer.webCryptoSigner(keypair)` — adopt an existing WebCrypto keypair

## Q3 — Operator-delegate-device flow

✅ **End-to-end works.** Confirmed sequence:

```
1. Each peer: const kh = await Keyhive.init(signer, store, handler);
2. Each peer: const card = await kh.contactCard();
3. Both peers exchange cards:
     await operator.receiveContactCard(deviceCard);
     await device.receiveContactCard(operatorCard);
4. Operator mints a scope document:
     const cid = new ChangeId(new Uint8Array(32));   // ChangeId(bytes) is the constructor
     const doc = await operator.generateDocument([], cid, []);
5. Operator adds device as admin member:
     const deviceAgent = await operator.getAgent(deviceIndividual.id);
     const access = Access.tryFromString("admin");
     const signedDelegation = await operator.addMember(
       deviceAgent,
       doc.toMembered(),       // Document → Membered conversion
       access,
       [],
     );
6. signedDelegation is a `SignedDelegation` ready for transport.
```

**Mapping to our bag model:** each Lararium bag (Automerge doc URL) IS a Keyhive `Document`. Members of a bag-doc carry caps over that bag. `cap=admin` for own devices = `addMember(device, adminBag.toMembered(), "admin")`. `cap=promote` on a specific corpus bag = `addMember(peer, corpusBag.toMembered(), "admin"|"write")` — depends on what abilities Keyhive's `Access` enum offers (we tried only "admin"; need to enumerate).

**Pitfalls discovered:**
- `ChangeId` has a public `constructor(bytes: Uint8Array)`, NOT a static `fromBytes`. The probe's first iteration assumed `fromBytes` — failed silently.
- `Document` does NOT auto-convert to `Membered`. Must call `doc.toMembered()` explicitly. `addMember(...)` rejected the implicit cast with "expected instance of Membered".
- `Stats` returns a wasm-pointer object; need to read its getters via the `.d.ts`, not via `JSON.stringify`.

## Q4 — Event serialization for transport

✅ **`Archive` is the natural state-persistence shape.** `kh.toArchive()` → `Archive` → `archive.toBytes(): Uint8Array`. Reverse: `new Archive(bytes)` + `archive.tryToKeyhive(store, signer, handler)` → restored Keyhive.

Sizes from probe:
- Operator with no docs/members: 5,080 bytes
- Operator after generating doc + adding 1 member: 9,424 bytes

For incremental sync (peer-to-peer, not full state shipment), Keyhive exposes:
- `kh.eventsForAgent(agent)` → Map<hash, serializedEventBytes>
- `kh.ingestEventsBytes(bytesArray)` → Promise<results>
- `kh.eventHashesForAgent(agent)` → Array<hash>
- `kh.pendingEventHashes()` → Set<hash>

This is the seam for our admin-doc storage: persist the archive (or the event log) as tiddlers under `lar:///ha.ka.ba/lararium/@admin/cap/...`. **D.4 design recommendation:** store events one-per-tiddler keyed by hash; reconstruct via `ingestEventsBytes` on daemon boot. Avoids serializing/deserializing the whole archive on every change.

## Q5 — Bundle / startup time

- Cold `Keyhive.init`: ~12 ms (acceptable; happens once per daemon boot)
- Archive serialize 9 KB: ~4 ms
- WASM cold-load (one-time per process): not separately measured but folded into first init; subsequent peers init in ~3 ms which suggests negligible.

Bundle size: 8.8 MB unpacked. Acceptable for a Node daemon. Browser bundle will need code-splitting; the pre-bundler `pkg/keyhive_wasm.js` includes the WASM as a base64 blob which Vite can chunk separately.

## Q6 — Glaring panics, missing methods, surprises

✅ **No panics encountered** during the probe sequence. The pre-alpha label is conservative; the API is more solid than "DO NOT USE IN PRODUCTION" suggests.

**Surprises:**
- `Keyhive.init(...)` requires an `event_handler: Function`. Our probe passed an array-pushing closure; the handler fires for every internal event. We'll wire this into the dispatcher in D.5.
- `whoami` and `idString` are getter properties (synchronous), but `individual` is a promise.
- Many types have private constructors (Access, Agent, Capability, etc.) — they only come from method calls. Direct `new` is rare; mostly `tryFromString`, `getAgent`, factories.
- The probe surfaced `setPanicHook` as a top-level export — useful for production: install once at process start to get readable stack traces from Rust panics.

## What to NOT bet on

- **Wire format stability.** Brooklyn's team may rev the archive format or event encoding between alpha versions. We accept the version-bump-with-migration model the operator named; HANDOFF entries should pin our `@keyhive/keyhive` version explicitly and treat upgrades as planned breaking changes.
- **Security guarantees.** No audit. For a single operator + family RPG sessions: acceptable. NOT acceptable for any future deployment with adversarial peers.
- **API stability.** `addMember` may grow/shrink params, `Document.toMembered()` may rename. We isolate behind a `CapabilityProvider` interface (D.2) so the blast radius of upstream renames stays localized.

## Recommendation for D.2+

- **Adopt `@keyhive/keyhive` as our cap layer.** Pre-alpha is workable for our scale.
- **Bag = Keyhive Document.** Each Automerge bag URL becomes a Keyhive scope document.
- **Persist via incremental events, not full archive replays.** Store events as tiddlers under `lar:///ha.ka.ba/lararium/@admin/cap/<hash>`; reconstruct by `ingestEventsBytes` at boot.
- **Pin our version.** Treat upgrades as planned breaking changes per operator's stated migration policy.
- **Install `setPanicHook`** at every process boot (daemon + future browser).
- **D.2 `CapabilityProvider` interface** wraps roughly: `init(seed)`, `delegate(audienceContactCard, bagUrl, ability)`, `revoke(delegation)`, `verify(delegation, ability, bagUrl)`, `serializeEvents()`, `ingestEvents(bytes)`. Narrower than the 10-method UCAN-shape — Keyhive does more in fewer calls.

---

# D.1.5 — Access enumeration + Event capture (2026-05-08)

> Run: `pnpm exec tsx packages/lararium-keyhive/probes/access-enum-and-events.ts`

## A. Access values — only TWO

Brute-forced 27 plausible UCAN/role/filesystem-style strings. Keyhive's
`Access.tryFromString` accepts exactly **two**:

```
read  → "Read"
admin → "Admin"
```

Rejected: pull, sync, write, propose, promote, revoke, none, r, rw, rwx,
owner, viewer, editor, manager, member, guest, control, delegate, share,
execute, `*`, all, any, a, w.

**Implication for our `ABILITY_LADDER`.** Keyhive's binary read/admin
distinction is coarser than our 8-step ladder (pull/read/sync/write/
propose/promote/admin/revoke). Two paths:

1. **Collapse our ladder to {read, admin}.** Lose granularity at the
   application layer; Keyhive becomes the only policy site.
2. **Two-tier policy (recommended).** Keyhive provides the cryptographic
   gate (admin or read on a bag). Our application layer (e.g.
   promote-handler) keeps richer semantics via caveat-bearing tiddlers
   gated under Keyhive's admin proof. So:
   - "can this peer touch the bag at all?" → Keyhive Access.read|admin
   - "can this peer specifically *promote*?" → application caveat
     check, only checked once Keyhive admin proof is present

(2) keeps `ABILITY_LADDER` for our application semantics (what the
promote handler verifies) without bending Keyhive into a shape it
doesn't have.

## B. Event variants during a delegate ceremony

11 events fire when the operator generates a Document and addMembers
the device with Access.admin. Distribution:

```
PREKEY_ROTATED:  6  (~172 bytes each)
CGKA_OPERATION:  3  (244–684 bytes)
DELEGATED:       2  (249–257 bytes)
```

Per event: `event.variant: string` + `event.toBytes(): Uint8Array` +
`event.isDelegated`/`event.isRevoked` getters + type-narrowed
`tryIntoSignedDelegation()` / `tryIntoSignedRevocation()`.

**Implications for D.4 (cap state persistence):**
- Persist each event as one tiddler under `lar:///ha.ka.ba/lararium/@admin/cap/<eventHash>`.
- Tiddler `text` field carries base64 of `event.toBytes()`.
- Tiddler fields: `variant` (PREKEY_ROTATED|CGKA_OPERATION|DELEGATED|REVOKED|…), `bytes-len`, `is-delegated`, `is-revoked`.
- On daemon boot, walk these tiddlers, sort by causality (TBD how), call `keyhive.ingestEventsBytes([…])` to restore state.
- Average event size <300 bytes; an active operator with hundreds of bags accumulates kilobytes-to-low-megabytes of cap state. Cheap.

**Note on PREKEY_ROTATED frequency.** 6 prekey rotations during one
small ceremony = continuous BeeKEM key advancement. Production will
fire many of these. They're small (172 bytes each). Persistence
strategy must batch tiddler writes; otherwise we'd thrash the admin
doc on every key rotation.

## D.2 interface refinement (post-D.1.5)

```ts
export interface CapabilityProvider {
  // Lifecycle
  init(opts: { seed: Uint8Array; eventStore: EventStore }): Promise<void>;
  whoami(): Promise<string>;          // operator/device DID

  // Identity
  contactCard(): Promise<Uint8Array>;             // serialize for transport
  receiveContactCard(bytes: Uint8Array): Promise<{ id: string }>;

  // Bag-as-Document
  registerBag(bagUrl: string, coparents?: string[]): Promise<{ docId: string }>;
  delegate(args: {
    audience:  string;                            // peer DID
    bagUrl:    string;
    access:    "read" | "admin";                  // Keyhive's binary
  }): Promise<{ delegationId: string; bytes: Uint8Array }>;
  revoke(delegationId: string): Promise<{ bytes: Uint8Array }>;
  verify(args: {
    presenter: string;
    bagUrl:    string;
    access:    "read" | "admin";
  }): Promise<{ ok: boolean; reason?: string }>;
}

export interface EventStore {
  put(eventHash: string, variant: string, bytes: Uint8Array): Promise<void>;
  list(): Promise<{ hash: string; bytes: Uint8Array }[]>;
}
```

The application `ABILITY_LADDER` (promote/write/etc.) checks happen
at a layer ABOVE this interface — in the promote-handler, gated on
the Keyhive admin proof being present.

## cross-peer-decrypt — the sealed-box is REDUNDANT for Model B (running-code verdict)

Probe: `cross-peer-decrypt.ts` (keyhive 0.1.0-alpha.3, `forward_secrecy=false`).

A DISTINCT-identity device (its own seed — Model B) decrypted a group's `Encrypted` content
holding ONLY: (a) its own locally-generated prekey secret, and (b) the PUBLIC bytes keyhive routes
to it (`eventsForAgent` → serialized StaticEvent bytes) plus the content blob. `leafSecrets` (72B,
produced by the non-FS auto-rekey) was WITHHELD. `tryDecrypt` SUCCEEDED.

Conclusion: `addMember` seals the group secret to the joinee's OWN prekey (clean TreeKEM). `leafSecrets`
is the SAME-identity sibling path (a tab ↔ its SharedWorker), NOT needed by a per-device joinee. So the
cross-device crossing (flow 1: vessel → PersonaGroup) is a TRANSPORT problem, not a crypto one — no
libsodium sealed-box, no X25519. Ship public CGKA/membership ops + the `Encrypted` blob over our relay;
the joinee decrypts. The design note's "envelope key-handoff (sealed-box)" was provisional; retire it for flow 1.

API grains the probe pinned: `Encrypted.serialize()` (not `toBytes()`) pairs with `Encrypted.fromBytes`;
`DocumentId` must be rebuilt from bytes on the joinee (WASM objects do not cross instances);
`ingestEventsBytes` returns a result array (not an applied-count — read `reachableDocs()` for truth).
