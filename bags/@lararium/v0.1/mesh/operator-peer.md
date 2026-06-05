<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/mesh/operator-peer"
file-path    = "bags/@lararium/v0.1/mesh/operator-peer.md"
type         = "text/x-memetic-wikitext"
register     = "Synthesis"
mana         = 19
manao        = 19
manaoio      = 18
role         = "Canonical operator-vessel contract: two-lane VM pool law, shared command/receipt surface, ea sovereignty model"
tagspace     = "lararium"
cacheable    = true
retain       = true
hydrate      = true
```

<<~ &#x0002; >>

# Operator-Vessel Contract

The shared law that governs every operator vessel — node, browser, and any future vessel type.
Runtime affordances may differ; the authority shape does not.

This document carries the load. `lar-vessel.md` and `open-vessel.md` carry
implementation notes. The two-lane topology and ea sovereignty law described here
sit above any single vessel implementation.

<<~ ahu #vocabulary >>

## Vocabulary

| Term | Meaning |
|---|---|
| **Vessel** | A lararium identity-and-runtime unit. One operator keypair. One admin VM lane. Zero or more active wiki VM lanes. |
| **Peer** | An Automerge-layer sync participant. A vessel participates in the mesh as a peer; this word names only the sync role, never the vessel's identity. |
| **Ea** | Breath. Sovereignty. A vessel's right to hold, author, and sync its own causal state without asking permission from any authority above the operator's root key. A vessel either breathes or it does not. |
| **Admin lane** | The always-present TW5 VM lane that carries command intake, receipt write-back, capability verification, and operator-private session state. |
| **Active wiki lane** | A TW5 VM lane carrying a corpus-facing wiki. One or more may run concurrently; the pool manages residency. |
| **Command tiddler** | The durable intent record authored by an operator ceremony (CLI, browser UX, or future surface). Lives in the admin doc. |
| **Receipt tiddler** | The durable outcome record written after a ceremony resolves: accept, reject, apply, or defer. Lives in the admin doc. |

<<~/ahu >>

<<~ ahu #two-lane-law >>

## Two-Lane Law

Every operator vessel carries one admin VM lane and zero or more active wiki VM lanes.

**OP-1 — Admin lane breathes first.**
The admin lane boots at vessel open and closes at vessel close. It does not suspend
between ceremonies. It carries the operator's capability context continuously.

**OP-2 — Active wiki lanes serve corpus work.**
Each active wiki lane carries one wiki URI and its recipe stack. The pool manages
residency (pinned, hot, cold). Active lanes may pause or evict under memory pressure;
the admin lane does not.

**OP-3 — Lanes do not share authority.**
The admin lane does not expose its internal state to active wiki lanes. Active wiki
lanes do not read admin doc tiddlers directly. Cross-lane coordination travels through
the command/receipt record surface.

**OP-4 — VM law applies within each lane.**
TW5 as VM applies independently inside each lane. Neither lane imports tiddlywiki
as a TS/ESM dependency. Both lanes carry the plugin blob at boot.

**OP-5 — Ceremony meaning belongs to the VM pool.**
If a ceremony can run inside the VM (capability planning, tiddler authoring, receipt
writing), it stays there. Edge code (filesystem, network transport, process control)
handles only resource-local side effects.

<<~/ahu >>

<<~ ahu #ea-law >>

## Ea Law — Vessel Sovereignty

**OP-E1 — Local keys, local truth.**
The operator keypair lives on the vessel's local storage (disk at 0o600 for node,
WebCrypto non-extractable for browser). It MUST NOT enter any Automerge doc.
It MUST NOT sync over the mesh. Identity derives from local keys — no server confers it.

**OP-E2 — Three gates at boot.**
Gate A: Keyhive DID matches local verifying key — throws hard on mismatch.
Gate B: vessel ∈ PersonGroup sentinel doc.
Gate C: PersonGroup ∈ MeshCabal sentinel doc.
All three gates pass before the vessel opens its wiki VM lanes.

**OP-E3 — Vessel does not act as authority over other vessels.**
A vessel may verify claims made by other vessels. It MUST NOT grant or revoke
membership in a causal island it does not own. Delegation flows from the operator
root key outward, never inward from a relay or server.

**OP-E4 — Ea at the admin ingress.**
Admin-doc WebSocket ingress gates on `cap=admin` proof. Non-operator
vessels receive no admin state. The proof check happens on the receiving vessel
before any doc change applies.

<<~/ahu >>

<<~ ahu #command-receipt-surface >>

## Command / Receipt Surface

CLI, browser UX, and future operator surfaces all author the same command tiddler
records and consume the same receipt tiddler records. The surface type does not
change the record shape.

**OP-CR1 — Command tiddlers carry intent.**
A command tiddler records what the operator intends: MOVE, admit, invite, revoke.
It carries: `id` (lar: URI), `type`, `payload`, `authoredAt`, and a `capProof` reference
or inline token. It lives in the admin doc. It does not disappear on receipt.

**OP-CR2 — Receipt tiddlers carry outcome.**
A receipt tiddler records what happened: accepted, rejected, applied, deferred.
It carries: `id`, `commandId`, `outcome`, `resolvedAt`, and any error or diff reference.
It lives in the admin doc. The mesh carries it to every operator vessel.

**OP-CR3 — Bridge code transports envelopes.**
`stdio`, Unix socket, and WebSocket are envelope carriers for the command/receipt
surface. They transport; they do not own ceremony meaning. Changing the bridge
does not change the record contract.

**OP-CR4 — Local capability check precedes edge work.**
Before any command reaches an edge adaptor (filesystem, network, process), the
invoking vessel verifies the capability context locally. Edge adaptors may re-check
before side effects. No round-trip to a server gates local intent.

<<~/ahu >>

<<~ ahu #vessel-parity >>

## Vessel Parity

Browser vessel and node vessel share this contract fully. Runtime differences are
budget choices, not architectural forks.

| Concern | Node vessel | Browser vessel |
|---|---|---|
| Storage adapter | `NodeFSStorageAdapter` (disk) | IndexedDB adapter |
| Operator keypair | Ed25519 on disk at 0o600 | WebCrypto non-extractable |
| VM island | `worker_threads` island | `DedicatedWorkerGlobalScope` island |
| Tick source | `setInterval(16)` | `requestAnimationFrame` + `setTimeout(16)` fallback |
| Admin lane | ✅ boots at open | ✅ boots at open |
| Active wiki lanes | pool-managed, piscina for stateless parse | pool-managed, dedicated islands |
| Founding ceremony | `runFoundingCeremony(repo, seed)` via `@lararium/keyhive` | same |
| Ea gates A/B/C | ✅ passes at boot | ✅ same ceremony, same gates |

Where the node vessel does more (disk projection, persistent relay, process control),
that counts as edge adaptation, not authority. The browser vessel breathes with
identical ea rights.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/vm-pool >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/browser/pono-charter >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/keyhive/keyhive-provider >>
<<~ pranala #implements-vessel-law ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-vessel family:control role:implements >>
<<~ pranala #implements-ea-law ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/causal-island family:control role:implements >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
