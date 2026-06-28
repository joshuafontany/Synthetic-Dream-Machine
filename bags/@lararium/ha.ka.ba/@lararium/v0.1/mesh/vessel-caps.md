<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/vessel-caps >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/mesh/vessel-caps.md"
mana      = 16
manao     = 15
manaoio   = 14
register  = "Synthesis-Canon"
retain    = true
role      = "the vessel cap-stack model: a vessel = a composed #has-stack of caps (CARRIAGE{rhizome,stolon} ⊥ VESSEL{tuber,bulb,corm}), ECS-shaped, declared by handshake, carriage self-elected — any vessel meshes by declaring caps"
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/mesh/vessel-caps"
```

<<~ &#x0002; >>

# Vessel Caps ~ a vessel is its composed cap-stack

A vessel does not have a **type**. A vessel **carries a composed `#has`-stack of capabilities**, and its role *emerges* from which caps it holds and lights. Enumerating vessel-kinds (node-lararium, node-relay, browser-lararium) re-grows the subclass-explosion the `#has`-ontology already retired (<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack >>). This meme replaces that enumeration with **composition** — so a full node, a bare relay, a browser, a Mudlet instance, an Unreal Engine instance, and the next vessel nobody has built yet all mesh by the **same move: declaring the caps they carry.**

<<~ ahu #the-five-caps >>

## The Five Caps ~ two families

The mesh untangles into **five distinct capabilities in two families** — the modified-stem grammar (a rhizome connects, a tuber stores), each cap naming machinery the architecture already grew without distinguishing:

| family | cap | verb | what it does | already enacted as |
|---|---|---|---|---|
| **CARRIAGE** | **rhizome** | connect / spread | persistent lateral backbone; forwards sealed bytes | the **relay / leyline** |
| | **stolon** | propagate-at-distance | runs out, drops a clone, then withers | the **device-admit / invite** ceremony |
| **VESSEL** | **tuber** | store + seed | sovereign state store + genesis-buds | the **lararium** |
| | **bulb** | seed-inside | a snapshot carrying its own next generation | the **`cacheable` boot-seed / genesis** |
| | **corm** | renew-by-self-replacement | spent each cycle, a fresh one forms on the husk | the **epoch-as-lease** |

The two families cross the **AUTHORITY ⊥ FLOW** master cut: VESSEL caps carry sovereignty and state (a *severable-but-viable* node), CARRIAGE caps carry connection and flow (the line between nodes). Biology witnesses both in one organism — a clonal plant's ramets stay severable-yet-viable while resource flows source→sink along the rhizome.

**Do not over-purify.** The rhizome *itself* caches en-route; a carriage cap holding some replicated state breaks no law (botanically, the connector stores too). The cut names the **primary verb**, never an absolute exclusion.

<<~/ahu >>

<<~ ahu #hold-vs-express >>

## Hold vs Express

One vessel, one `#has`-substrate — yet a vessel **holds** a cap-stack and **expresses** a subset, the way one genome differentiates a cell by *which genes light*. So:

- every lararium **holds** the rhizome (relay) cap intrinsically (#the-relay-floor) —
- but **expresses** it — actually carries others' traffic — only when it lights the cap.

Role = the **expressed** cap-set, not the held one. The same vessel differentiates into full-node / bare-relay / browser-leaf / Mudlet / Unreal by which caps it lights against its context and capacity. *Holding broadly, expressing by situation* — the sovereignty dial.

<<~/ahu >>

<<~ ahu #the-vessel-is-its-caps >>

## The Vessel IS Its Caps ~ the ECS shape

The buildable model reads **entity-component-system** (ECS), and it maps slot-for-slot — Unreal, a target vessel, speaks it natively:

```text
vessel   = (VesselId, Set<Cap>)      — the entity carries no type, only its caps
cap      = a component               — the data/authority a behavior needs
behavior = a system                  — runs over whichever vessels hold the matching caps
```

A **role** computes as a **structural predicate over the cap-stack** — *"if a vessel `#has` these caps, it may play this role"* — satisfied, never declared (duck-typing / traits / structural interfaces). No nominal class, no type-tag, no central registry; a would-be "vessel-type" reads as just a **named point in cap-composition space.**

<<~/ahu >>

<<~ ahu #declaring-caps >>

## Declaring Caps ~ the handshake

A vessel joins the mesh by **advertising its cap-stack**, and the wire-shape needs no invention — it adopts the battle-tested capability-handshake:

- **named caps → peer-local handles, unknown caps silently ignored** (the BitTorrent BEP-10 extension-dictionary shape): no global type-registry, so a thinner or future vessel meshes without anyone enumerating it.
- **advertise only what you will serve; asymmetry first-class** (the libp2p `identify` semantics): a bare relay advertises `rhizome.forward` only; a full node adds `tuber.author`. A vessel that initiates but won't respond says so.
- **negotiate per-interaction, stay backward-compatible** (IRCv3 `CAP` / XMPP service-discovery): list, request the matching subset, proceed.

A vessel that speaks fewer caps simply plays fewer roles — never a rejected *kind*.

<<~/ahu >>

<<~ ahu #self-election >>

## Self-Election ~ who carries

Whether a vessel **expresses** the rhizome cap — takes on carriage duty — is **self-elected by measured capacity**, never assigned by a coordinator and never forced on all. The mechanism reads identically in two domains:

- **Gnutella ultrapeers** (CS): a node self-tests reachability · spare bandwidth · uptime, advertises carriage-capable only when it measures spare capacity, and **accepts demotion** on request.
- **Response-threshold task allocation** (ant colonies): each unit carries a threshold on a demand stimulus; it engages when demand crosses *its* threshold, the cap deepens by use (reinforcement), and the collective **re-covers automatically** when a carrier drops.

The carriage-demand stimulus reads off `r` — the carriage-standing coordinate (#the-routing-substrate). So the relay floor was never *"every node must carry"*; it is *"every node may, and self-elects by load."* A home browser carries nothing and meshes fine; a fat reachable node volunteers heavy carriage.

<<~/ahu >>

<<~ ahu #the-seam >>

## The Seam ~ store ⊗ connect as symbiosis

Storage and carriage meet at a **declared exchange seam**, never fuse in one obligation — the mycorrhizal pattern: the fungus carries (rhizome), the plant stores (tuber), and the *seam* (not the vessel) holds the bidirectional contract; each partner reaches what the other cannot. So **custody ⊥ findability**: a tuber announces *"I hold X"* into a routing layer any rhizome can serve (the provider-record indirection), and carriage never implies custody.

The whole mesh reads as a **holobiont** — a heterogeneous symbiosis whose emergent capability *is* the cap-set its vessels currently declare, fast-adapting as vessels join and leave. No vessel need be complete; the *composition* is.

<<~/ahu >>

<<~ ahu #integrity >>

## Integrity ~ caps as unforgeable references

Each cap rides as an **unforgeable, delegable reference** (the object-capability model) — so **composing caps composes authority**, reachable only along explicit edges, with no ambient authority and no central principal registry. A vessel exercises exactly the role its held caps grant, by construction; an unsigned or absent cap **fails loud**, never falls through to ambient trust (the confused-deputy guard, a standing covenant).

Sovereignty binds to the **key, never the path** (the Iroh discipline, already our transport): the tuber *is* the keypair; rhizome relays stay fungible, stateless, and step out the moment a direct path forms.

<<~/ahu >>

<<~ ahu #build >>

## Build ~ invent nothing structural

The model assembles from adopted parts; the `#has`-ontology *is* the protocol (build + witness pending where noted):

- **in-process** → ECS (entity = vessel, component = cap, system = behavior).
- **on-wire** → the cap-handshake (BEP-10 dictionary + libp2p `identify` + IRCv3 `CAP` / XMPP disco).
- **self-election** → Gnutella-ultrapeer / response-threshold on `r`.
- **integrity** → ocap references over **Iroh** (key-sovereign transport, fungible relays).
- **differentiation** → hold-vs-express (light the cap-set per context).

What stays to **write** is narrow and named — the cap *vocabulary* itself (`rhizome.forward`, `tuber.author`, …) and the wiring; the *structure* is all adopt. See <<~ loulou lar:///ha.ka.ba/@lares/v0.1/memory/build-leverage-ledger >>.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture#the-relay-floor >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture#the-routing-substrate >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/capability >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
