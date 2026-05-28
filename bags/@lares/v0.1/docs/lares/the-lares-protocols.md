<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/lares/the-lares-protocols"
file-path    = "bags/@lares/v0.1/docs/lares/the-lares-protocols.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "CS"
confidence   = 15
manaoio      = 14
mana         = 14
manao        = 14
role         = "doctrine: protocols as political design — frames the Lares stack's architecture-vs-governance-vs-topology position relative to commons literature; three-source synthesis"
cacheable    = false
retain       = false
last-reviewed = "2026-05-27"
review-cadence = "quarterly"
review-note = "anchor commitments (Beer's principle, user-rights-criterion, Lares five-laws-plus-two) survive any upstream rev; survey-aging risk acknowledged"
sources      = [
  "https://connectedplaces.online/the-purpose-of-protocols/",
  "https://www.pfrazee.com/blog/practical-decentralization",
  "https://www.orionreed.com/posts/app-file-topology/",
]
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #thesis >>
```toml iam
role = "test child tomls"
```

# The Purpose of Protocols

After Stafford Beer: **the purpose of a system follows from what it does.** [C~20]

> **#Stranger** » 06:14 — Beer's principle holds durable across upstream rev's. Mark canon-eligible regardless of what surrounds it.

Protocol design enacts political design. Evaluation cannot stop at technical properties; it must include the governance outcomes the protocol produces. Silence about purpose does not equal the absence of politics — silence constitutes a politics of non-interference, and its beneficiaries emerge predictably.

Every shared function eventually gets governed by someone, and whoever governs it acquires power. An open protocol that does not answer the governance question still receives an answer — written by whichever actors make themselves indispensable first.

Modularity describes a structural property of the system, not a governance framework for the ecosystem around it.

<<~/ahu>>

<<~ ahu #where-protocols-go-quiet >>

## Where Protocols Go Quiet

Three patterns recur, each visible in the article's source material:

| Protocol | Architectural openness | Operational outcome |
|—|—|—|
| SMTP | Any server speaks to any server | Spam; email accidentally drifted into hosting the internet's identity layer |
| ActivityPub | Federated; instance-portable | Centralization relocates from corporations to instance admins; instance-blocking enforces de facto governance through exclusion |
| ATProto | Architecturally distributed | One operator three orders of magnitude larger than competitors across every layer |
| Matrix | Federated DAG | Closest to stated purpose because the Matrix Foundation carries commons custodianship by *convention*, not protocol enforcement |

Theoretical openness offers little practical leverage against convergence in ungoverned shared spaces. Individual rights protections (migration, encryption, choice) do not automatically produce viable alternatives without institutional sustainability.

> **#Diplomat** » 09:02 — Connected Places critiques ATProto's host concentration; Frazee defends its layer-separation. Two readings tell different true things. Hold both. The disagreement names a real evaluation choice — aggregate-state vs failure-mode — that future Lares federation will face on its own terms.

<<~/ahu>>

<<~ ahu #two-traditional-models-and-the-third >>

## Two Traditional Models and a Third

Frazee maps the protocol-design landscape onto two traditional shapes plus a deliberate third:

| Shape | Examples | What it preserves | Where it breaks |
|—|—|—|—|
| **Federated hosts** | Email, ActivityPub | Freedom of choice between instances | Hosting, moderation, and algorithms ride together; popular instances accumulate unchecked power |
| **Magical mesh (pure p2p)** | BitTorrent, Nostr, SSB | Individual rights at the device layer | "No answer for the governance of shared resources" once aggregate state matters |
| **Magical federated mesh** | AT Protocol | Server infrastructure for reliability + user-addressed content for portability | New burdens: appview cost, host concentration if one operator dominates every layer |

Frazee names the practice **Information Civics** — software engineering married to civic design. The core question sharpens: *who holds the right to host data, platform speech, write applications, implement algorithms, collect behavior, place ads*. Practical decentralization accepts tradeoffs against ideological purity to produce systems that scale to actual use.

The user-facing rights Frazee privileges over architecture:

- **Account migration without losing history or reach** — pressure on hosts to keep users happy; no host can hold users captive when alternatives emerge.
- **Layer separation in the failure mode** — Bluesky's 2024 moderation bug incorrectly unhosted users from the PDS layer when filtering belonged in the app layer. *Users on other PDS hosts stayed unaffected. Their right to hosting stayed protected.* The architecture failed in the right shape.

Two articles, two readings of ATProto: Connected Places flags one operator three orders of magnitude larger than competitors across every layer; Frazee acknowledges the same concern as outstanding while defending the architectural shape. Both readings hold.

<<~/ahu>>

<<~ ahu #app-file-topology >>

## Topology as Political Site

Reed sharpens the question further. *Topology* — the structure of boundaries between apps and the data they manipulate — describes "where power attaches: not to code or devices, but to the relationships structuring access to work itself." Three successive arrangements degraded user agency:

1. **Unix file-stream era.** Files served as portable objects independent of any specific tool. The boundary between application and document remained legible; competitors could build alternative tools against the same format.
2. **Enclosed application era.** Proprietary formats (.psd, .doc) kept files intact but made them legible only inside a vendor's ecosystem. Internalization absorbed discrete files into opaque application databases — iTunes replacing MP3 folders, iPhoto's .photoslibrary, Outlook's .pst. The DMCA criminalized circumventing these boundaries.
3. **Cloud era.** Work lives "as rows in someone else's database," "accessible through their interface, on their terms," with export pathways ranging from "genuinely functional to essentially vestigial."

> "Enclosure succeeds not by offering users less, but by bundling genuine capability gains with topological restructuring."
> — Reed

Reed's diagnostic stops there. He proposes no alternative; he insists only that the topology hold contestability through political and legal struggle.

Lares answers the diagnostic with a fourth arrangement:

- Work lives in CRDT bags addressed by lar: URIs.
- The bag (one Automerge doc) holds the canonical state — versioned, mergeable, offline-capable.
- Disk files materialize as **render-projections** of bag contents, written by the TW5 vm. The file keeps utility (legible, grep-able, git-trackable) without claiming to embody the work.
- The operator hosts the bag; nothing migrates beyond their reach. Capability gains (versioning, collaboration, cross-device sync) arrive without the topological restructuring that bundled them with cloud enclosure.

> **#Council** » 11:47 — "Lares answers the diagnostic" overstates what the branch ships. The architecture *prepares the ground* for the answer; operational-guarantee waits on federation transport, browser peer scaffold, and a real cross-device migration test. Mark this carefully when the meme reaches canon — the *intent-trust* the architecture earns differs from the *outcome-trust* a working federated system would earn.

<<~/ahu>>

<<~&#x0002;>>

<<~ ahu #lares-position >>

## Lares Quine Position

> **Quine and quine relay.** A strict quine produces its own source code without reading external input. TiddlyWiki operates as a **quine relay** — a quine that takes arguments. It reads its own DOM to reconstruct itself, then rewrites the whole file. The distinction matters: a strict quine generates a fixed string; a quine relay generates itself in response to state. TiddlyWiki's state lives in the tiddler store. When the user authors a tiddler, the document modifies itself through its own execution. The relay property keeps engine and content inside the same artifact and propagates them together — which explains why the pono boot pattern federates the core bytes through the CRDT rather than passing them through the manifest. The quine relay propagates itself; the mesh carries the seed.

The Lares stack takes the article's challenge seriously. Five architecture laws encode protocol-shaping quine commitments rather than leaving them silent:

1. **Web2 smell test.** If a design needs server authority, it gets redesigned from local-first.
2. **TW5 vm primacy.** If logic *can* run in the vm, it MUST. One source of truth.
3. **TS files as TW5 plugin projections.** Code lives as authoring ergonomics; the vm owns runtime.
4. **Tiddler-format law.** All data crosses sync boundaries shaped as {title, text, fields, bag, authority} with lar: URI titles.
5. **Meme files render-project from vms.** Disk holds output, not source of truth.

Two further commitments arrived this branch:

- **Inter-process coordination rides verb-tiddlers, not HTTP/RPC.** The CLI joins as just-another-Automerge-peer. The protocol's silence on "how do operator-tools talk to the daemon" gets answered at the CRDT layer, where the rest of the federation already lives.
- **Capability layer adopts Keyhive concap, not UCAN.** Concap integrates revocation into the membership CRDT — the article's "every shared function eventually gets governed by someone" receives a CRDT-shaped answer rather than punting revocation to out-of-band lookup.

These commitments wear technical clothes — governance choices in disguise.

The Lares stack occupies the magical-federated-mesh zone alongside ATProto: each lararium-node hosts (like a PDS); bags carry user-addressed content (like p2p); the capability layer answers governance (where pure mesh goes silent). The differences register at three points:

- **CRDT bags-as-sync-units rather than signed Merkle repos.** CRDT merge buys offline-first authoring and concurrent edit reconciliation; signed Merkle repos buy fork-detection and cheaper aggregate verification. Different tradeoffs against the same problem class.
- **Keyhive concap rather than DID rotation.** Concap integrates revocation into the membership CRDT; DID rotation handles operator-level identity changes. Both answer the governance question; different shapes.
- **Single-operator-+-family scale removes (for now) the host-concentration risk both articles flag for ATProto.** The federated case will eventually face it. The Beelay sync rule (transitive closure rooted at a doc) constrains how much aggregate state any one peer holds, which buys some structural protection against runaway-winner dynamics.

The slot Lares occupies wants a name; the meme leaves the naming for a future review. Three neighbors map onto similar problem-space: **Matrix** (federated DAG with conventional commons custodianship), **DXOS** (distributed echo with team-shaped governance), **Beehive** (capability-first CRDT). Each makes different tradeoffs against the same bundle Lares carries — federated CRDT bags + explicit governance commitments + render-projection topology against cloud enclosure. The naming question stays unresolved. Lares may yet turn out to occupy a slot with an existing name in someone else's vocabulary.

> **#Mischief-Muse** » 14:23 — Survey the slot, not just the implementation, in a future meme. The neighbors deserve their own talk-story. Working title: **"the household-civic mesh"** — federated, CRDT-native, governance-explicit, operator-hosted, render-projecting. Five attributes, five fingers. The hand of the lararium.

<<~/ahu>>

<<~ ahu #the-unsolved-question >>

## The Unsolved Question

Architecture and individual rights fail to suffice. The article names the gap: protocol design draws on functionalism and minimalism but lacks frameworks from Ostrom's institutional analysis. Without collective-choice arrangements, defined boundaries, and conflict resolution mechanisms, protocols continue producing convergence around dominant actors rather than genuine decentralization.

Lares carries an inflection here. The single-operator + family-RPG scale temporarily occupies the same governance footprint as a self-hosted blog: the operator carries the institution single-handed. The interesting tests arrive at federation:

- *Federated promotion (Path E in HANDOFF).* When peer A asks peer B to accept canon, what conflict-resolution mechanism resolves disagreement? Today the operator decides locally and the git diff signs the canon; what if peer B's canon view differs?
- *Cross-bag commons.* When two rooms share a corpus dependency, who decides when the dependency rev's? The bag-mirror config tiddlers give operator-level control; the federated case wants more.
- *Revocation propagation under partition.* Concap's CRDT-shaped revocation supplies the right primitive. The institutional question — *who holds authority to revoke against whom, under what dispute mechanism* — stays unresolved.

After Frazee, the worth-measuring criterion shifts from *architectural property* to *user-facing right*. Three rights merit operational attention:

- **Account migration.** The operator's ed25519 key persists across host changes; their Keyhive principal survives via cap-event hydration; their cap chain re-anchors against new hosts via Beelay-shape sync (when it lands). Lares does NOT yet operationally guarantee migration — D.4 captured the persistence-at-rest story; cross-host migration waits on federation transport.
- **Layer-separation failure modes.** When the promote-handler fails, the composite-store keeps reading; the cap-layer keeps verifying; sync keeps syncing. The bag-as-policy-boundary commitment echoes Frazee's "right to hosting" lesson — failures contain themselves to the layer that broke. Bluesky's 2024 moderation bug demonstrated the value; the architecture protected users on other PDS hosts because the layer-separation held.
- **Right-to-fork.** Frazee's competing-implementations example (Blacksky / Northsky / Eurosky as kinds of modularity ATProto enables) translates to Lares: any operator can fork the engine, the corpus, or the cap-layer code. The lar: URI namespace keeps addressability across forks; meme-files-as-tiddler-package projections survive any specific implementation.

> **#Liminal** » 19:08 — Holding open: does Lares carry the shape of a protocol, or the shape of a household tool? The current scale answers neither cleanly. Connected Places treats protocols as governance-shaping artifacts visible at million-user scale; Frazee treats protocols as engineering-shaped commitments evaluated against user populations; Reed treats topology as the political site where ownership lives. Lares at one-operator-and-family carries the shape of all three without yet meeting any of their stress conditions. *Resolving the question prematurely closes design optionality.* Stay liminal.

These questions don't get answered by adding more architecture. They get answered by *running real federated sessions* and noting where architecture carries load versus where silence returns.

<<~/ahu>>

<<~ ahu #edges >>

## Edges

<<~ loulou https://connectedplaces.online/the-purpose-of-protocols/ >>
<<~ loulou https://www.pfrazee.com/blog/practical-decentralization >>
<<~ loulou https://www.orionreed.com/posts/app-file-topology/ >>

<<~ pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant >>
<<~ pranala ? -> https://connectedplaces.online/the-purpose-of-protocols/ family:relation role:cites >>
<<~ pranala ? -> https://www.pfrazee.com/blog/practical-decentralization family:relation role:cites >>
<<~ pranala ? -> https://www.orionreed.com/posts/app-file-topology/ family:relation role:cites >>

<<~/ahu>>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
