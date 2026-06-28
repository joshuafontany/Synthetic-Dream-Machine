<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/local-first >>
```toml iam
cacheable   = true
file-path   = "bags/@lares/api/pono/local-first.md"
mana        = 18
manao       = 18
manaoio     = 17
namespace   = "&#x2299;"
register    = "Synthesis-Canon"
retain      = true
role        = "invariant doctrine: 7 local-first ideals (Ink & Switch) + Keyhive/Beelay alignment matrix; server-as-peer law; Fuller non-simultaneous Universe = causal island"
status-date = "2026-05-02"
tags      = ["api/pono/meme"]
l-space     = "stable"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lares/api/pono/local-first"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Local-First Software

The seven ideals from Kleppmann et al. (Ink & Switch, 2019) define the design target.
Keyhive (convergent capabilities + BeeKEM) and Beelay (RIBLT sync + sedimentree) are
the current prior-art stack closest to satisfying all seven simultaneously.

**Scale ladder (canonical 2026-05-06):**
- **Lararium** — one operator's infrastructure: a `lararium-node` process + browser peers + devices.
- **Nexus** — a confederation of Lararia sharing a stable internal mesh. Named by community + place.
- **DreamNet** — the super-mesh of all Nexuses (allied + oppositional). Within-Nexus = reliable CRDT sync. Cross-Nexus = explicitly brokered, degraded-state-tolerant.

**Core law:** a `lararium-node` operates as a peer, not an authority — it functions as one Lararium in a Nexus confederation. The server holds no privilege over the content it relays. "The sync server is just another member in the system." (Brooklyn Zelenka, localfirst.fm ep. 19)

<<~/ahu >>

<<~ ahu #seven-ideals >>

## The Seven Ideals

### Ideal 1 — Fast

No server round-trips for reading or writing. Local state is always available.
UX MUST stay off the network-latency critical path.

**Lararium:** SATISFIED. TW5Engine runs entirely in-process; tiddler store is local;
`filterTiddlers` and `renderTiddler` are synchronous.

**Law:** Any projection or filter that requires a network call before returning VIOLATES
this ideal. Cache locally; sync asynchronously.

---

### Ideal 2 — Multi-Device

Data lives on all devices, not just in a cloud. Sync is automatic and bidirectional.
A device holds first-class standing; the cloud serves as an optional relay.

**Lararium:** GAP. No cross-device sync architecture implemented. Automerge + Beelay
is the target stack. Beelay's RIBLT-based set reconciliation (nested Rateless Invertible
Bloom Lookup Tables) handles the "what does this peer need?" question without a
central coordinator.

**Sprint 6 target:** `BrowserLarPeer` wires `IndexedDBStorageAdapter` +
`BroadcastChannelNetworkAdapter` from `@automerge/automerge-repo`.

---

### Ideal 3 — Offline

Full read/write capability without a network connection. The system treats offline as the normal mode,
not a degraded fallback.

**Lararium:** PARTIALLY SATISFIED. TW5 works offline by construction (in-process VM).
Lararium Node server mode adds a network dependency for initial content load.

**Law:** The browser peer MUST be able to boot, read, and write from IndexedDB without
any server present. The server functions as a sync accelerator, not a boot requirement.

---

### Ideal 4 — Collaboration

Real-time and asynchronous collaboration with conflict-free concurrent edits.
CRDTs provide the enabling mechanism — not operational transforms, not last-write-wins.

**Lararium:** GAP. Automerge is chosen (CRDT); MemeProvider / MemeStoreDoc define
the change model. Active integration incomplete.

**Law:** Concurrent edits to the same meme from two peers MUST converge to the same
state on both peers without manual conflict resolution. CRDTs enforce this mechanically.

---

### Ideal 5 — Longevity

Software created today remains accessible without the vendor. Data in open formats,
readable independently of the application.

**Lararium:** SATISFIED. TW5 format — HTML + JS in a single file or tiddler store —
remains readable today from 2004 archives. The `text/x-memetic-wikitext` format is
plain text with TOML headers; readable by any text editor.

**Law:** No binary-only storage for meme content. `MutableLarRecord.text` is always
UTF-8 string. Blobs (`LarariumDoc.blobs`) are reserved for truly binary assets
(TW5 core JS, plugin bundles) — never for meme content.

---

### Ideal 6 — Privacy

The service provider cannot read user data. End-to-end encryption by default.
Servers hold only encrypted bytes; they see membership info but not document content.

**Lararium:** GAP. Content is plaintext at rest and in transit (TLS only at transport).

**Keyhive target stack:**
```
Layer 1 — Convergent Capabilities (concap tokens):
  Self-certifying capability chains. "Documents identify themselves via public
  keys and delegate control over themselves to other public keys." Partition-tolerant.

Layer 2 — Group CRDT:
  Coordination-free group membership with revocation. Devices as leaves; users
  as groups of devices. Revocation by blanking tree paths.

Layer 3 — BeeKEM:
  MLS-inspired binary tree key agreement. DH key exchange along leaf-to-root paths.
  Concurrent membership changes via "blanking" and "conflict keys."
  Requires only causal order — no total order needed. (Fuller-consistent.)
```

**Sprint 6 scope:** `LarPeer.keyhive` slot typed to accept the three-layer interface
as optional depth. Interface designed now; implementations fill in as Keyhive API
stabilizes. Browser agent: `SubtleCrypto` non-exportable keys. Node agent: filesystem.

---

### Ideal 7 — User Control

Users can move, copy, inspect, and modify their data. No lock-in. The application is
a tool, not a custodian.

**Lararium:** SATISFIED for single-user. The `lar:` URI namespace is an open addressing
scheme; the tiddler store is inspectable and exportable.

**Multi-user gap:** shared lararium-node wiki islands need a capability model for access
control. The Orichalcum `ABILITY_LADDER` provides the vocabulary;
Keyhive provides the cryptographic enforcement.

<<~/ahu >>

<<~ ahu #server-as-peer >>

## Server-as-Peer Law

A lararium-node operates as a peer with extra capabilities:
- Acts as multiple peers simultaneously (one per open wiki island)
- Disk access (LarDiskProjector)
- CORS-hop web calls
- Persistent relay (stays online when browser peers sleep)

It does NOT have:
- Special authority over content truth
- Ability to decrypt content it relays (Ideal 6 target)
- Override capability for user-controlled data

**Law:** A lararium-node MUST keep its decisions within its peer role.
Routing, relay, and projection are peer capabilities; adjudication is not.

**Readiness reads local (corollary, 2026-06-10):** a vessel declares its own
readiness from local state (the server listens; the port stands open) — it MUST
NOT gate readiness on a peer's arrival, which imports a global-now dependency
and deadlocks every storage-miss resolve while the vessel sits peerless.
(Witnessed: upstream's WS *server* adapter waits for a first connection;
its *client* adapter force-readies on a timer — the vessel corrects the server
side with `ListeningWSServerAdapter`.)

The VmPool model enforces this isomorphically: the browser peer and the node peer
run the same VmPool interface. The browser boots pool slot 0 (local wiki); additional
slots serve cross-realm projections. The node boots multiple slots simultaneously —
one per wiki island, one per connected realm. Same model, different capability set.

<<~/ahu >>

<<~ ahu #fuller-universe >>

## Fuller's Non-Simultaneous Universe = Causal Island Doctrine

Fuller (Synergetics §301): *"the aggregate of all humanity's consciously apprehended
and communicated nonsimultaneous and only partially overlapping experiences."*

**Universe has no global now.** Events have finite durations; they partially overlap;
no single simultaneous snapshot of the whole is coherent or necessary.

This is the theoretical grounding for causal island doctrine:
- The lararium mesh has no global clock, no global state.
- Each island has a causal history (partially-ordered event log).
- Islands overlap "only partially" — they share some events (via sync), not all.

**Operational consequence:**
Sync protocols requiring total order (a single source of truth for "current state")
violate Fuller's Universe model. CRDT-based sync (Automerge + Beelay) requires
only **causal order** — Fuller-consistent by construction. BeeKEM's
"only a causal order of operations" requirement is the cryptographic expression
of Fuller's non-simultaneous Universe.

**The UI MUST reflect this:** content is "current as of my last sync with peer X,"
not "current globally." A lararium-node MUST present its view as local — current as of last sync.

<<~/ahu >>

<<~ ahu #beelay-sedimentree >>

## Beelay Sync Model

Beelay provides the sync protocol for Automerge repos. Key mechanisms:

**RIBLT (Rateless Invertible Bloom Lookup Tables):**
Nested set reconciliation at three levels — membership operations, document states,
per-document CGKA operations. Peers exchange RIBLT digests; the difference is the
sync payload. No central coordinator; no round-trip to determine "what do you need?"

**Sedimentree:**
The commit DAG compressed with geological layering: older chunks compressed more
aggressively ("deeper = older = denser"). Solves the long-document history problem.
A fresh peer can sync efficiently even against a document with years of history.

**Lararium integration point:** `AutomergeDocStore` (base class for `NodeLarPeer` and
`BrowserLarPeer`) wires the `DocHandle.on("change", ...)` event into `MemeProvider.handleChange()`.
Beelay's sync protocol operates below this boundary — transparent to the meme layer.

<<~/ahu >>

<<~ ahu #alignment-matrix >>

## Alignment Matrix (current)

| Ideal | State | Blocker |
|---|---|---|
| Fast | ✓ SATISFIED | — |
| Multi-device | ✗ GAP | Beelay sync + `AutomergeDocStore` |
| Offline | ⚠ PARTIAL | IndexedDB boot path |
| Collaboration | ✗ GAP | Automerge integration |
| Longevity | ✓ SATISFIED | — |
| Privacy | ✗ GAP | Keyhive `LarPeer.keyhive` slot |
| User control | ✓ / ⚠ | Multi-user needs Orichalcum + Keyhive |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/api/mu/pattern-integrity >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/orichalcum-capabilities >>
<<~ loulou lar:///ha.ka.ba/@lares/docs/pono/research-streams >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/quine-principles >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
