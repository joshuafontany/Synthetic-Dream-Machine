<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/keyhive/keyhive-provider >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/keyhive/keyhive-provider"
file-path    = "bags/@lararium/v0.1/keyhive/keyhive-provider.md"
source-file  = "packages/lararium-keyhive/src/keyhive-provider.ts"
type         = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
mana         = 17
manao        = 16
manaoio      = 15
role         = "isomorphic keyhive ceremony provider: founding, device-admit, and apply-admit functions; three-gate identity lattice"
tagspace     = "lararium"
cacheable    = true
retain       = true
```

<<~ &#x0002; >>

# Keyhive Provider

The isomorphic ceremony surface for the Lararium identity lattice.
Lives in `@lararium/keyhive` — no TW5, no Node I/O, no DOM.
Takes a `Repo` and a seed; returns unforgeable membership proofs stored as Automerge CRDT events.

<<~ ahu #contract >>

## Contract

Three ceremony functions. All three run in any vessel context (node, browser, worker).

**`runFoundingCeremony(repo: Repo, operatorSeed: Uint8Array): FoundingResult`**

Produces the three-doc identity lattice:
- `Individual` — Ed25519 device keypair derived from seed; the Keyhive identity for this vessel.
- `PersonGroup` — sentinel Automerge doc proving "this device belongs to this operator."
- `MeshCabal` — sentinel Automerge doc proving "this PersonGroup belongs to this mesh."

Gate B and Gate C tiddlers write into the admin doc. Gate A verifies the Keyhive DID
matches the local verifying key; throws on mismatch — no silent drift.

**`runDeviceAdmitCore(repo: Repo, operatorSeed: Uint8Array): AdmitPayload`**

Produces an out-of-band admission payload (`admit.json`) for a second vessel.
The payload carries the MeshCabal and PersonGroup doc URLs, the founding Keyhive
Individual's public keys, and a signed delegation token.
Vessels transfer this payload out-of-band: QR code, file, direct message.

**`runApplyAdmitPayload(repo: Repo, receivingSeed: Uint8Array, payload: AdmitPayload): void`**

Applies the payload to the receiving vessel's Repo. Writes oracle tiddlers for
Gate B and Gate C into the admin doc. The receiving vessel can verify its own
lattice membership from cold — no network request, no authority server.

<<~/ahu >>

<<~ ahu #three-gate-lattice >>

## Three-Gate Lattice

```text
Vessel Individual (Ed25519 device keypair, local storage only)
  └─▶ PersonGroup sentinel Document   ← Gate B: vessel ∈ PersonGroup
           └─▶ MeshCabal sentinel Document  ← Gate C: PersonGroup ∈ MeshCabal
```

Gate A — local key integrity: Keyhive DID MUST match disk or WebCrypto verifying key.
Throws `EaKeyMismatch` on any divergence. No silent corruption path.

Gate B — device membership: PersonGroup sentinel doc carries this vessel's Individual as a member.
Verified by reading the oracle tiddler written at founding or admit-apply time.

Gate C — cabal membership: MeshCabal sentinel doc carries this PersonGroup as a member.
Verified by the same oracle tiddler chain.

All three gates pass before a vessel may open wiki VM lanes or sync its admin doc
to any remote vessel.

<<~/ahu >>

<<~ ahu #isomorphic-law >>

## Isomorphic Law

These functions accept `Repo` and `Uint8Array` only. They carry no:
- filesystem imports (`fs`, `path`)
- DOM imports (`window`, `indexedDB`, `crypto`)
- Node worker imports (`worker_threads`)
- TW5 imports

The calling vessel supplies: a `Repo` (constructed with a vessel-appropriate adapter)
and the operator seed (read from disk at 0o600 for node, derived from WebCrypto for browser).
The ceremony functions run identically in both contexts.

The `@lararium/keyhive` package depends on `@lararium/mesh` and `@keyhive/keyhive` (WASM).
It does not depend on `@lararium/tw5`, `@lararium/node`, or `@lararium/browser`.

<<~/ahu >>

<<~ ahu #ea-notes >>

## Ea Notes

The founding ceremony produces an unforgeable membership proof that any vessel holding
the operator seed can verify from cold. No server participates in this verification.
The CRDT events that carry the Gates B and C proofs travel in the admin doc — the
same doc that syncs only to `cap=admin` vessels.

The operator seed MUST NOT enter any Automerge doc. The ceremony reads it to derive
the Individual keypair and then releases it. The keypair itself (public material only)
enters the PersonGroup doc. The private scalar never leaves the memory of the function call.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/keyhive/capability-provider >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/keyhive/event-store >>
<<~ pranala #two-vessel-test ? -> lar:///ha.ka.ba/@lararium/v0.1/node/two-vessel-mesh family:reference role:proves >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
