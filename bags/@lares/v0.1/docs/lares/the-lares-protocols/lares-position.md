<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols#lares-position >>
```toml iam
file-path = "bags/@lares/v0.1/docs/lares/the-lares-protocols/lares-position.md"
uri-path = "ha.ka.ba/docs/lares/the-lares-protocols#lares-position"
```

<<~&#x0002;>>

## Lares Quine Position

> **Quine and quine relay.** A strict quine produces its own source code without reading external input. TiddlyWiki operates as a **quine relay** — a quine that takes arguments. It reads its own DOM to reconstruct itself, then rewrites the whole file. The distinction matters: a strict quine generates a fixed string; a quine relay generates itself in response to state. TiddlyWiki's state is the tiddler store. When the user authors a tiddler, the document modifies itself through its own execution. The relay property means the engine and the content stay inside the same artifact and propagate together — which is why the pono boot pattern federates the core bytes through the CRDT rather than passing them through the manifest. The quine relay propagates itself; the mesh carries the seed.

The Lares stack takes the article's challenge seriously. Five architecture laws encode protocol-shaping quine commitments rather than leaving them silent:

1. **Web2 smell test.** If a design needs server authority, it gets redesigned from local-first.
2. **TW5 vm primacy.** If logic *can* run in the vm, it MUST. One source of truth.
3. **TS files as TW5 plugin projections.** Code lives as authoring ergonomics; the vm owns runtime.
4. **Tiddler-format law.** All data crosses sync boundaries shaped as {title, text, fields, bag, authority} with lar: URI titles.
5. **Meme files render-project from vms.** Disk holds output, not source of truth.

Two further commitments arrived this branch:

- **Inter-process coordination rides command-tiddlers, not HTTP/RPC.** The CLI joins as just-another-Automerge-peer. The protocol's silence on "how do operator-tools talk to the daemon" gets answered at the CRDT layer, where the rest of the federation already lives.
- **Capability layer adopts Keyhive concap, not UCAN.** Concap integrates revocation into the membership CRDT — the article's "every shared function eventually gets governed by someone" gets a CRDT-shaped answer rather than punting revocation to out-of-band lookup.

These commitments wear technical clothes — governance choices in disguise.

The Lares stack occupies the magical-federated-mesh zone alongside ATProto: each lararium-node hosts (like a PDS); bags carry user-addressed content (like p2p); the capability layer answers governance (where pure mesh goes silent). The differences register at three points:

- **CRDT bags-as-sync-units rather than signed Merkle repos.** CRDT merge buys offline-first authoring and concurrent edit reconciliation; signed Merkle repos buy fork-detection and cheaper aggregate verification. Different tradeoffs against the same problem class.
- **Keyhive concap rather than DID rotation.** Concap integrates revocation into the membership CRDT; DID rotation handles operator-level identity changes. Both answer the governance question; different shapes.
- **Single-operator-+-family scale removes (for now) the host-concentration risk both articles flag for ATProto.** The federated case will eventually face it. The Beelay sync rule (transitive closure rooted at a doc) constrains how much aggregate state any one peer holds, which buys some structural protection against runaway-winner dynamics.

The slot Lares occupies wants a name; the meme leaves the naming for a future review. Three neighbors map onto similar problem-space: **Matrix** (federated DAG with conventional commons custodianship), **DXOS** (distributed echo with team-shaped governance), **Beehive** (capability-first CRDT). Each makes different tradeoffs against the same bundle Lares carries — federated CRDT bags + explicit governance commitments + render-projection topology against cloud enclosure. The naming question itself stays open. Lares may yet turn out to occupy a slot that already has a name in someone else's vocabulary.

> **#Mischief-Muse** » 14:23 — Survey the slot, not just the implementation, in a future meme. The neighbors deserve their own talk-story. Working title: **"the household-civic mesh"** — federated, CRDT-native, governance-explicit, operator-hosted, render-projecting. Five attributes, five fingers. The hand of the lararium.

<<~&#x0003;>>

<<~&#x0004; -> ? >>

