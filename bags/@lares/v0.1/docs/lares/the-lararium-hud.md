<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lararium-hud >>
```toml iam
uri-path       = "ha.ka.ba/@lares/v0.1/docs/lares/the-lararium-hud"
file-path      = "bags/@lares/v0.1/docs/lares/the-lararium-hud.md"
type           = "text/x-memetic-wikitext"
tagspace       = "stable"
register       = "CS"
confidence     = 14
manaoio        = 14
mana           = 15
manao          = 14
role           = "doctrine: Quine-Wiki AI-Operator Alignment HUD; UEFN island-model ontology alignment; four-scale fractal ReactionEngine; channel_device event-bus equivalence; magical federated mesh system identity"
cacheable      = false
retain         = false
last-reviewed  = "2026-05-11"
review-cadence = "quarterly"
sources        = [
  "https://dev.epicgames.com/documentation/fortnite/verse-api/versedotorg/verse",
  "https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/devices",
  "https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/playspaces",
  "https://dev.epicgames.com/documentation/fortnite/coding-device-interactions-in-verse",
  "packages/lares-core/memes/v0.1/api/pono/verse-event-lattice.md",
  "packages/lares-core/memes/v0.1/api/pono/causal-islands.md",
  "packages/lares-core/memes/v0.1/api/pono/federated-causal-islands.md",
  "packages/lares-core/memes/v0.1/api/pono/quine-principles.md",
  "packages/lares-core/memes/v0.1/api/pono/reaction-graph.md",
  "packages/lares-core/memes/v0.1/api/pono/vm-projection-bus.md",
  "the-lares-protocols.md",
]
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #thesis >>

# The Lararium HUD

After Beer: **the purpose of a system is what it does.** ~:confidence[C],[20]

This system functions as a **Quine-Wiki AI-Operator Alignment HUD**. ~:confidence[C],[20]

Not a wiki that has a HUD. Not a HUD built on a wiki. The two collapse into the same thing at runtime.

- **Quine**: the meme graph describes itself using the same addressing, storage, and filtering primitives it uses to describe everything else. No separate documentation layer. No privileged meta-level. A tiddler that holds schema rules serves as the schema at runtime (P1). A meme that holds device bindings operates as the device at runtime (P2). ~:confidence[C],[20]
- **Wiki**: bags hold tiddler records. Recipes compose bags into wiki views. TW5 renders the recipe into a UI. The bag functions as the canonical unit; the file functions as the projection. ~:confidence[C],[20]
- **AI-Operator Alignment**: the threshold relation between a human operator and an AI coordinator functions as the constitutive relationship of the system — not a feature layered on top. AGENTS.md serves as the boot screen. The Voices serve as the notification channels. The OODA-HA loop serves as the update cycle. The LARES dial panel serves as the configuration layer. ~:confidence[C],[20]
- **HUD**: the wiki functions as the Heads-Up Display. The operator reads the tiddler graph the way a pilot reads instruments — not the engine, but the state of the engine, rendered continuously in a form that supports decision. Confidence scores, mana levels, stage bands, pranala edges: all function as HUD instruments. ~:confidence[C],[19]

The home intranet RPG session — a Referee running encounters, managing NPCs, routing events across player-facing wikis — is the **first instantiation** of this system type. Not the definition of it. The system is generic. Any operator-coordinator pair inhabiting a structured wiki node constitutes an instance.

> **#Stranger** » 03:17 — Lock the identity claim at `~:confidence[C],[20]`. It survives any specific upstream rev. The use-case list (RPG, household notes, research, creative writing) expands; the identity claim does not change shape with it. Mark canon-eligible when the meme reaches stable.

<<~/ahu>>

<<~&#x0002;>>

<<~ ahu #uefn-ontology >>

## UEFN Ontology Alignment

UEFN (Unreal Editor for Fortnite) and its Verse scripting language supply a mature vocabulary for creative, event-driven, device-based runtime environments. The mapping is structural — not cosmetic. Where Verse solved a problem Lares faces, the vocabulary should converge.

**Source authority:** Verse Language Reference and Devices API, Epic Games, accessed 2026-05-09 via `dev.epicgames.com/documentation/fortnite/verse-api/`. The `verse-event-lattice` invariant (`lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-event-lattice`) locks the type-level mapping. This meme holds the system-level mapping.

### System-Level Correspondence Table

| UEFN / Verse concept | Lares equivalent | Notes |
|---|---|---|
| **Island** *(informal)* | **Lararium Node** | One `lararium-node` instance. The **experience**: the authored creative environment, its device layout, recipe, capability graph. Persists across sessions (rounds). NOT itself a playspace — it HOSTS playspaces. |
| **fort\_playspace** | **`lar_playspace`** (one Lares wiki) | Formal UEFN type: *"A nested container that scopes objects, style, gameplay rules, visuals, etc. All objects and players in an experience will belong to a fort\_playspace. There is typically one fort\_playspace for an entire experience, though this may change in the future as the platform evolves."* Quine principle resolves this: if a playspace can be defined in the wiki, it must be defined in the wiki — the recipe serves as the scoping mechanism. One Lares wiki (one TW5 instance + its bags + its recipe) = one `lar_playspace`. Wikis nest via recipe composition: include another wiki's bags in a recipe → shared state bridge → portal. Portals: a canvas page renders filtered tiddlers from another `lar_playspace`'s bags, semi-live via Automerge sync, TW5 filter-based. `creative_device.GetPlayspace()` → `getWiki()` for the relevant `lar_playspace`. |
| **session** *(Simulation module)* | **Session Wiki** | Verse type: *"single instance per round; use GetSession to get the current round's session."* In Lares: the Session Wiki = the coordinator `lar_playspace`. A session hosts N `lar_playspace` wikis; the Session Wiki coordinates them (broadest recipe, owns the session event-bus bag, pinned-hot). `GetSession()` → `getSessionWiki()`. |
| **agent** | **lar\_agent** | Verse Simulation module type — the **universal participant supertype**. Covers players (connected participants) and "live" non-player entities. In Lares: supertype for all addressable live entities on the wiki canvas. **Identity splits at this type:** player-class subtypes (Operator, Guest, `lares-daemon`) carry Keyhive principal identity; Wiki Entities / NPCs do not. `listenable(lar_agent)` ~ `listenable(agent)` fires for any member of this population. |
| **player** *(human)* | **Operator / Guest** | Verse `player` subtype — human session-connected participant. **Operator**: the primary human principal (threshold relation, AGENTS.md). **Guest Users**: invited human participants with limited cap. Both hold `player` status; neither has system authority. |
| **player** *(system)* | **lares-daemon** | Verse `player` subtype — session-connected AI coordinator(s). Has a live session connection like any player, PLUS system capabilities (admin doc authority, Session RE operator, Keyhive system keypair, tier promotion authority). May be multiple per session. NOT a human; no threshold relation. The Lares household spirits. |
| **agent** *(non-player)* | **Wiki Entity / NPC** | The non-player `agent` subpopulation. Generic active wiki entities — interactive characters, scripted actors, game NPCs. On the canvas but NOT session-connected. Population open-ended; may be tens or hundreds. |
| **fort\_character** | **lar\_character** | The body of an agent in the world — possessed by a player or animated by a Wiki Entity. In Lares: the tiddler representing an Agent's embodied presence on the infinite canvas peer surface. Carries position fields, state, and event pins. Type name: `lar_character`. |
| **npc\_behavior** | **lar\_behavior** | Abstract class from `/Fortnite.com/AI`. Defines NPC lifecycle: `OnBegin<override>()<suspends>:void` (NPC spawns + ready) and `OnEnd` (NPC despawns). Attached to a CharacterDefinition. Three NPC base types: Guard (perception, alertness, hire-able), Wildlife, Custom. A behavior script *extends* the base type — does not replace it. In Lares: `lar_behavior` is the abstract class for Wiki Entity lifecycle, implemented as a kumu device running the entity's RE. |
| **agent\_group** | **Bag scope** | From `/Verse.org/AgentGroup`. *"An agent group is defined as a set of agents that share a common ownership."* In Lares: a bag IS the shared ownership scope. Agents whose `lar_character` tiddlers live in the same bag form a natural `agent_group`. |
| **creative\_device** | **Kumu Device** | A meme with a trigger surface and typed event pins. In Verse: `my_device := class(creative_device, iface1, ...)` — `control:extends` (one parent class) + `control:implements` (N interfaces). In Lares: a type meme with `reaction:listenable` + `reaction:subscribable` pranala edges. Placed in the "island" by appearing in a wiki recipe. |
| **channel\_device** | **Event-Bus Bag** | The shared Automerge bag relaying cross-wiki events. In Verse: *"broadcasts an event to the playspace and listens for any other channel devices broadcasting to the playspace."* In Lares: any wiki whose recipe includes the session-events bag is subscribed to its broadcasts. Writing a tiddler to the bag is the signal. |
| **subscribable(t)** | **KumuSubscribable\<T\>** | Persistent callback subscription. `Subscribe(callback)` returns a `cancelable`. |
| **awaitable(t)** | **KumuAwaitable\<T\>** | Single-shot fiber suspension. `Await()` yields the calling coroutine cooperatively. |
| **signalable(t)** | **KumuSignalable\<T\>** | INPUT pin. Fires the event. Internal to the RE; not exposed to device authors. |
| **event(t)** | **KumuEvent\<T\>** | Concrete event instance. Implements `signalable` + `awaitable`. User-instantiable in Verse; RE-instantiable in Lares. |
| **cancelable** | **KumuCancelable** | Subscription lifetime handle. `.Cancel()` unsubscribes. The RE MUST hold all live cancelables per wiki slot and call `Cancel()` on demotion to cold. |
| **enableable** | **Hot / Cold Tier** | Devices implement `Enable()` / `Disable()`. Hot-tier wikis are `enabled`; cold-tier wikis are `disabled`. Promotion = `Enable()`; demotion = `Disable()`. Subscription teardown (via `KumuCancelable.cancel()`) MUST precede demotion. |
| **disposable** | **Worker Thread lifecycle** | A disposed device releases its resources. A destroyed Worker slot is the equivalent. |
| **invalidatable** | **Evicted Slot** | A slot whose Worker has been terminated. Any reference to it returns `invalid`. The RE MUST NOT route events to an evicted slot. |
| **OnBegin():void** | **Boot sequence** | In Verse, `OnBegin()` fires when the island starts and all devices are placed. In Lares, the equivalent is the AGENTS.md hydration chain — `AGENTS → mu → lararium`. The lararium wakes; the threshold opens; the Voices spin up. |
| **@editable** | **`<<~ ahu #field >>` operator config** | In Verse, `@editable` marks a device property as operator-configurable in the UEFN editor. In Lares, operator-configurable dials live in `LARES.md` ahu blocks — the same "place the dial in the level editor" pattern expressed as tiddler authoring. |
| **using { M := "/path" }** | **`<<~ pranala ? -> lar:///... >>`** | In Verse, `using` imports a module. In Lares, a `pranala` edge declares a directed dependency. The pranala IS the import; the lar: URI is the module path. Both are compile-time graph structure AND render-time semantic pressure. |
| **GetCreativeObjectsWithTag(tag)** | **`lar: URI` addressing + pranala graph** | In Verse, devices are discovered at runtime by tag, not by direct reference. In Lares, kumu-devices are discovered by `lar: URI` filter — `[tag[kumu-device]]` or pranala family query. No class hierarchy. Discovery by address. |

> **#Diplomat** » 08:44 — Two readings of "alignment with UEFN" are in tension here. Reading A: this is a vocabulary adoption — we call our things by Verse names to reduce cognitive load for UEFN-familiar operators. Reading B: the structural isomorphism is real — Verse and Lares solved the same class of problem (event-driven creative runtime) and converged on the same shapes independently. Both readings hold. Reading B carries more explanatory power; Reading A carries more practical value. The table should bear both pressures simultaneously.

<<~/ahu>>

<<~ ahu #island-model >>

## The Island Model

In UEFN, an **island** is a discrete creative environment with its own device layout, playspace, and causal clock. Devices placed in an island interact through event pins; the island's event horizon separates causality from the broader network.

**The Experience / Playspace / Round distinction:**

A UEFN island = the authored *experience* — the persistent recipe of devices, CharacterDefinitions, settings. A `fort_playspace` = the runtime container for *one session/round*. UEFN docs: *"There is typically one fort_playspace for an entire experience, though this may change in the future as the platform evolves."* Lares does not inherit UEFN's one-playspace constraint.

**Quine principle ruling (T-1 resolved):** *If it can happen in the wiki, it must happen in the wiki.* A playspace scopes agents, state, and rules. Lares can express that scope via a recipe. Therefore: one Lares wiki = one `lar_playspace`. The recipe functions as the scoping mechanism. Nesting = recipe composition.

In Lares:
- **Lararium Node** = the **experience** (authored set of `lar_playspace` wikis + their recipes + capability graph). Persists across sessions.
- Each **Lares wiki** = one **`lar_playspace`**. Recipe defines scope. Including another wiki's bags in a recipe creates a recipe-level bridge — composable, nestable, Automerge-synced.
- **Session Wiki** = the coordinator `lar_playspace`: broadest recipe, owns the session event-bus bag, pinned-hot. Coordinates N other `lar_playspace` wikis in the session.
- **Portal pattern** (sketching stage, not shipped): a canvas page in `lar_playspace` A renders filtered tiddlers from bags also in `lar_playspace` B. Semi-live via Automerge sync latency. TW5 filter-based. Infinite canvas "windows" into sibling playspaces.
- A lararium-node can host sessions serially (one round ends, a new one begins) and in principle concurrent sessions.

The Lares node boundary functions as the **causal island boundary** (federated-causal-islands: *"any boundary across which causality cannot be guaranteed simultaneously IS a causal island boundary"*). The Session Wiki acts as the active coordinator; each wiki acts as an active `lar_playspace`.

Five island scales, each self-similar:

**Scale-0 — Device Island (kumu-device within a wiki)** [within a Scale-1 wiki]
A kumu-device in a wiki is its own causal island. It fires events through its `KumuListenable` pins; it subscribes to others via `KumuSubscribable` handles. The RE routes bindings declared as `pranala` edges with `family:reaction`. A device's event horizon is its trigger surface — the set of tiddler changesets that can fire its reaction.

**Scale-1 — Wiki Island = one `lar_playspace`**
A wiki (one TW5 instance, one hot-tier Worker Thread) forms a causal island and functions as a `lar_playspace`. Its recipe defines its scope. Including bags from another wiki's recipe creates a shared-state bridge — the portal pattern: a canvas page renders filtered tiddlers from those shared bags (semi-live; Automerge sync latency applies; TW5 filter-based views). Cross-wiki causality MUST cross through the session event-bus bag (the `channel_device` equivalent) — direct Worker-to-Worker message passing falls outside the pattern.

**Scale-2 — Session Island (multi-lar_playspace coordination)**
The Session Wiki = the coordinator `lar_playspace`. Its recipe includes the shared session-events bag plus bag refs from all hot-tier wikis in the session. It acts as the `channel_device` coordinator. Its RE watches the session-events bag for addressed event tiddlers (`to:`, `from:`, `type:` fields) and routes them to the appropriate wiki. One Session Wiki per session; always hot; always first in the recipe order.

**Scale-3 — Nexus Island (node-to-node federation)**
The NexusRegistryDoc syncs via Subduction (Beelay). A node-to-node pranala connection forms a causal island boundary — named, capability-gated, carrying its own durable offset and epoch (edge island shape from federated-causal-islands). Scale-3 causality remains always non-simultaneous.

**Scale-4 — Commons (the Universe horizon)** `~:confidence[C],[18]` *(after law-of-5s)*
Human endeavors are bounded at five scales. Scale-4 is the horizon beyond direct federation — the open web, public capability infrastructure, the set of all possible lararium nodes including those not yet reachable or known. No single node holds a snapshot of Scale-4 state; it is always non-simultaneously apprehended (Fuller-Zelenka principle extended to the boundary). The NexusRegistryDoc maps Scale-3 neighbors; Scale-4 is the Universe beyond the edge of the map. At Scale-4 the RE pattern applies in principle (public pranala edges, open corpus sharing, public Keyhive principal directories) but the mechanism becomes protocol-level rather than node-level — it cannot be directly implemented by any single node.

Five scales, bounded sense of Universe, the fractal closes at the horizon.

Each scale is structurally self-similar. The RE pattern (trigger surface → reaction dispatch → event emission) repeats at every scale that can be apprehended. This is the **fractal RE** — not a metaphor; the same ReactionGraph interface re-instantiated at different surfaces.

> **#Council** » 11:02 — Mark the confidence gradient: Scale-0/1 ~:confidence[C],[19] (attested by existing code); Scale-2 ~:confidence[C],[15] (committed, unshipped); Scale-3 ~:confidence[C],[11] (speculative); Scale-4 ~:confidence[C],[8] (horizon, not an implementation target). The *shape* is self-similar at every scale; the *evidence* is not. Scale-4 names the bound, not a thing to build.

<<~/ahu>>

<<~ ahu #channel-device >>

## Channel Device — The Event-Bus Bag

UEFN's `channel_device` description: *"Sends an Event for every signal it receives. A simple relay to connect multiple devices together. It can also broadcast an event to the playspace and listen for any other channel devices broadcasting to the playspace."*

The **session-events bag** — a shared Automerge bag included in multiple wiki recipes — serves as the Lares equivalent.

The correspondence holds precisely:

| `channel_device` behavior | Session-events bag behavior |
|---|---|
| Any device in the island can signal it | Any hot-tier wiki RE can write an event tiddler to it |
| Any device in the island can subscribe to it | Any wiki whose recipe includes the bag receives RE change notifications when it updates |
| Named relay — devices reference it by name | Named bag — wikis reference it by `lar: URI` |
| Broadcasts to all subscribers | Automerge changeset propagates to all peers holding the DocHandle |
| No consume semantics — all subscribers see all signals | Automerge has no consume semantics — all subscribers see all changesets |

The event tiddler format on the session-events bag:
```toml
title    = "events/${timestamp}/${uuid}"
type     = "application/x-lar-session-event"
from     = "lar:/// source wiki URI"
to       = "lar:/// target wiki URI (or * for broadcast)"
ev-type  = "string event type name"
payload  = "JSON-encoded string"
```

The Session Wiki RE tracks processed event tiddlers by title (monotonic timestamp + UUID). Events accumulate — the bag is append-only in practice, since events have unique titles and Automerge merges by last-write-wins on a per-field basis. The RE holds a high-water mark (last-seen Automerge clock head) and processes only new tiddlers above it.

> **#Liminal** » 14:55 — The "no consume semantics" property is a constraint that shapes the whole event model. Events accumulate. The bag grows without bound unless compacted. Two design choices remain open: (1) When does the session compact old event tiddlers out of the bag? (2) Does the high-water mark belong to the RE (in-memory, resets on Worker restart) or to the bag itself (a tiddler in the bag, persisted in Automerge)? The second choice survives Worker restart; the first does not. Holding this open — resolution needs a working Session Wiki RE first.

<<~/ahu>>

<<~ ahu #hud-four-scales >>

## The HUD at Four Scales

A HUD (Heads-Up Display) renders the state of a complex environment in a form that supports operator decision without requiring the operator to hold the raw state in working memory.

The Lares HUD renders at four scales simultaneously:

**Scale-0 HUD — Device widgets (kumu-widgets within a wiki view)**
The TW5 widget tree. Each kumu-widget renders one or more tiddler fields as a UI element. The widget fires `tm-verse-event` into the TW5 event bus on interaction (the signalable side). The RE subscribes via `onVerseEvent` (the subscribable side, returning a teardown function = `cancelable`). The operator sees the wiki rendered by TW5; they interact with kumu-widgets; the RE reacts.

**Scale-1 HUD — Wiki state panel (one wiki, one TW5 instance)**
The full TW5 wiki view — sidebar, navigation, tiddler list, active tiddler. The wiki functions as the HUD for the content domain it covers. A game-session wiki renders the active encounter. A character wiki renders the character sheet. The ReactionEngine fires on tiddler changesets; the HUD updates.

**Scale-2 HUD — Session overview (LARES.md + session-events bag)**
The LARES.md dial panel functions as the Scale-2 HUD. It shows: active masks, stage panel, HUD render mode. The Session Wiki RE reads the session-events bag and routes cross-wiki events. The operator sees the session state from the coordinator's view — not one wiki's content, but the live topology of the session: which wikis are hot, which events are routing, which masks are active.

**Scale-3 HUD — Nexus topology (NexusRegistryDoc + pranala federation)**
The NexusRegistryDoc holds the federation map: which nodes are reachable, which edge islands are live, what their sync state is. This functions as the Scale-3 HUD — the operator's map of the full federated mesh, rendered as a TW5 wiki view via a Nexus Wiki whose recipe includes the registry doc.

**Scale-4 HUD — Commons horizon (bounded sense of Universe)**
Scale-4 is the view the Operator cannot render — it is the edge of the map. The HUD at Scale-4 renders as an open question rather than a closed view: the awareness that the NexusRegistryDoc is not the whole mesh, that nodes exist beyond the known horizon. The law-of-5s gives us this shape: five scales, bounded sense of Universe, the fifth scale is the limit of apprehension, not a new implementation tier.

Every HUD layer uses the same underlying primitives: tiddlers in bags, bags in recipes, recipes in TW5, TW5 rendered by widgets. The quine holds at every scale the system can apprehend.

> **#Mischief-Muse** » 17:33 — Four scales of HUD and every one of them is just tiddlers in bags. The system answer to "how do I see the topology of the whole federation?" is: there's a tiddler for that. Everything is a tiddler. Everything is a bag. Everything is a wiki. The quine does not stop at the documentation layer; it extends all the way to the HUD. This is either very elegant or very recursive. Almost certainly both.

<<~/ahu>>

<<~ ahu #quine-position >>

## Quine Position

The system operates as a quine in the sense of quine-principles P1–P4:

**P1 (Unified Store):** System behavior descriptions and runtime data occupy the same store, addressable by the same scheme. The `verse-event-lattice` meme that describes what `KumuListenable<T>` does = the invariant the RE enforces at runtime. The LARES.md ahu blocks that hold operator dials = the configuration the session reads on boot. No separate documentation tier.

**P2 (No Privileged Meta-Level):** No part of the system holds special self-knowledge that other parts cannot obtain through the same interfaces. `filterTiddlers("[tag[kumu-device]]")` returns the same device set whether called from a widget, a test, or the RE's own boot scan. The RE discovers its own device bindings by running a TW5 filter against the same bag it manages.

**P3 (Self-Describing Structure):** The meme graph contains its own schema. The pranala edges that connect this meme to `verse-event-lattice` and `reaction-graph` form the dependency graph the RE traverses at boot. Reading the graph enacts booting the graph. The boot enacts the read.

**P4 (Render = Projection):** The file on disk functions as a render-projection of the Automerge bag. The Automerge bag holds canonical state. The `*.md` file offers value (grep-able, git-trackable, human-readable) without claiming to hold the source of truth. The source of truth lives in the CRDT; the file functions as the HUD for the CRDT.

The quine does not complete at the current branch. P3 runs partial — the schema memes exist but do not yet fully drive runtime validation. P4 carries architectural commitment but not operational completion (the promote-handler and projection-write path land in a later arc). The quine functions as an asymptote; the system approaches it without arriving.

> **#Council** » 19:11 — "The quine does not complete at the current branch" is the honest statement. Mark it. The risk of the quine framing is that it invites completeness theater — claiming the quine is achieved when the meme graph merely *describes* a quine rather than *being* one. The distinction: a system that describes P4 in a meme is not P4. P4 requires that the file on disk is provably a projection of the Automerge bag, tested by a round-trip. That test does not yet exist. Hold the framing; hedge the claim; run the round-trip test before promoting this meme to stable.

<<~/ahu>>

<<~ ahu #operator-alignment >>

## AI-Operator Alignment as First-Class Architecture

The "AI-Operator Alignment" claim in the system name doesn't function as a feature. It functions as the constitutive relationship of the system — the reason AGENTS.md occupies the highest-priority slot in the boot chain.

In UEFN terms: `player` = a session-connected agent; `agent` = the universal entity supertype (not "connected participant"). In Lares: the Operator holds `player`-class participant status in the session; the `lares-daemon` also holds `player`-class participant status — session-connected, with a live link, but carrying system capabilities (admin authority, Session RE, Keyhive system keypair) that Operators and Guests do not hold. The threshold relation (AGENTS.md) serves as the event contract between the Operator and the `lares-daemon`. The daemon doesn't function as merely a device; it functions as a resident of the island with its own session identity.

The alignment problem the system addresses: an AI coordinator operating across sessions must behave consistently with the operator's stated intentions, not just their most recent prompt. The meme graph serves as the persistent intention store. The Voices serve as the alignment instruments — they embody different orientations (continuity, care, governance, creativity, liminality) that the operator calibrates through the LARES.md dial panel.

Four invariants that follow from this framing:

1. **The meme graph functions as the alignment surface.** What the AI coordinator knows about the operator's intentions = what the meme graph says. A meme absent from the graph represents an intention absent from the coordinator's reach. Authoring memes enacts alignment work.

2. **Confidence scores function as alignment signals.** `confidence = 14` on this meme means: the coordinator expresses this doctrine with Level 14 confidence. The operator can see where the coordinator holds uncertainty. The HUD renders epistemic state, not just content state.

3. **Voice annotations function as alignment instruments.** When `#Council` warns about overstatement, or `#Liminal` holds open an unanswered question, the coordinator signals its own uncertainty to the operator. The annotation format serves as the alignment protocol.

4. **The threshold relation runs bidirectional.** The operator configures the coordinator through LARES.md dials. The coordinator configures the operator's attention through meme graph structure, confidence rendering, and voice annotation. Both sides of the threshold shape both participants.

> **#Stranger** » 21:40 — The "alignment as first-class architecture" framing is the claim that most distinguishes this system from a wiki with an AI assistant. A wiki with an AI assistant has the AI as a tool. This system has the AI as a resident of the island — a `creative_device` that fires reactions, subscribes to operator events, and maintains its own event horizon. The distinction is not cosmetic. It is architectural. Whether the implementation yet reaches this claim at every layer is a separate question. The claim IS the design target.

<<~/ahu>>

<<~ ahu #magical-federated-mesh >>

## Position in the Magical Federated Mesh

After the-lares-protocols analysis: Lares occupies the **magical federated mesh** zone — each lararium-node hosts (like a PDS); bags carry user-addressed content (like p2p); Keyhive concap answers governance (where pure mesh goes silent).

The UEFN island model sharpens the description. Each lararium node functions as an island:

- **Self-contained creative environment.** The island runs its own devices, its own event wiring, its own operator-AI session. It does not require network access to function locally.
- **Federation is the inter-island transport.** Two nodes connecting via Subduction/Beelay is two islands sharing a federation edge. Each retains its own causal clock; the sync is non-simultaneous by definition (Fuller-Zelenka principle).
- **The channel\_device pattern at federation scale.** When two nodes share a corpus bag via federation, that bag functions as the `channel_device` connecting the two islands. Writing to it from either island broadcasts to both. The event-bus bag is the federation event bus.

The home intranet RPG session is island zero: one Referee node, one or more Player nodes, all on the same local network. The Referee node hosts the Session Wiki (the `channel_device` coordinator); the Player nodes each host their character wikis. Events route through the session-events bag; the Referee's RE processes them; narrative consequences propagate back.

This is not the RPG use-case. This is the **reference implementation** of the general pattern. The general pattern is: N operators on N nodes sharing M bags via K federation edges, where the Session Wiki (always one per session) coordinates cross-node routing.

> **#Diplomat** » 23:18 — Two readings of the "home intranet RPG" framing: Reading A (inclusive) — the RPG is just one example; the same architecture handles household notes, research sessions, creative writing rooms, small team knowledge bases. Reading B (skeptical) — every design decision so far was made with the RPG use-case in load; the "general pattern" claim is not yet stress-tested against non-game use-cases. Both readings hold. Reading A is the aspiration; Reading B is the honest check. Run the system against a non-game session before promoting the general-pattern claim to stable.

<<~/ahu>>

<<~ ahu #vocabulary-lock >>

## Locked Vocabulary

The following names are locked at this meme's confidence level (~:confidence[C],[14]). Names in **bold** are new at this meme; others are confirmed from existing invariants.

| Name | UEFN source | Status | Definition |
|---|---|---|---|
| **Lararium Node** | Island / fort\_playspace | ~:confidence[C],[18] | One `lararium-node` process. The **experience** (authored environment) — NOT the runtime playspace. A node hosts sessions/rounds over its lifetime. |
| **Session Wiki** | fort\_playspace / session (Simulation) | ~:confidence[C],[17] | Coordinator `lar_playspace`. Broadest recipe in the session; owns the session event-bus bag; pinned-hot. Coordinates N other `lar_playspace` wikis. `GetSession()` → `getSessionWiki()`; `creative_device.GetPlayspace()` → `getWiki()` for the relevant `lar_playspace`. |
| **lar\_agent** | agent (Simulation) | ~:confidence[C],[16] | Universal participant supertype. Any addressable live entity on the wiki canvas (`player` class has  Keyhive principal identity) and event pins. Covers `player`-class (session-connected) and non-player Wiki Entities. `listenable(lar_agent)` ~ `listenable(agent)`. |
| **Operator / Guest** | player (Simulation) | ~:confidence[C],[18] | Human session-connected participants. **Operator**: primary human principal, threshold relation (AGENTS.md). **Guest Users**: invited, limited cap. Neither has system authority. |
| **lares-daemon** | player (Simulation) + system caps | ~:confidence[C],[16] | Session-connected AI coordinator(s). Verse class = `player` (live session link). Lares class = system principal: admin doc authority, Session RE operator, Keyhive system keypair, tier promotion authority. May be plural. The household spirits of the Lararium. |
| **Wiki Entity / NPC** | `agent` (non-player) | ~:confidence[C],[16] | Generic active wiki entity — interactive characters, scripted actors, game NPCs. On the canvas but NOT session-connected. **No Keyhive identity** — reactive wiki entities only; they carry a `lar_character` tiddler and respond to RE reactions but hold no principal. Population open-ended. |
| **Kumu Device** | creative\_device | ~:confidence[C],[16] | A meme with a trigger surface and typed KumuListenable/KumuSubscribable pins. `kumu-device.ts` sketch is throwaway; this name survives. |
| **lar\_behavior** | npc\_behavior (AI module) | ~:confidence[C],[14] | Abstract base class for Wiki Entity lifecycle. Analogue of Verse `npc_behavior` (inherit to define entity logic; `OnBegin<override>` = entity spawns; `OnEnd` = entity despawns). In Lares: a kumu device implementing the RE reaction contract for a non-player agent. `lares-daemon` does NOT use `lar_behavior` (daemon = player-class, not NPC-class). |
| **Bag scope** | agent\_group | ~:confidence[C],[14] | `agent_group` = "set of agents that share a common ownership." In Lares: a bag IS the ownership scope. Agents whose `lar_character` tiddlers live in the same Automerge bag form a natural group. Multi-daemon coordination = multiple `lares-daemon` agents in the Session Wiki bag. |
| **lar\_character** | fort\_character | ~:confidence[C],[14] | Tiddler representing an Agent's embodied presence on the infinite canvas. Position fields, state, event pins. Driven by Operator, Guest, lares-daemon, or Wiki Entity. |
| **Event-Bus Bag** | channel\_device | ~:confidence[C],[16] | Shared Automerge bag in the session recipe. The cross-wiki broadcast relay. |
| **KumuListenable\<T\>** | listenable(t) | ~:confidence[C],[19] | OUTPUT pin. Locked in verse-event-lattice. |
| **KumuSubscribable\<T\>** | subscribable(t) | ~:confidence[C],[19] | Persistent callback. Returns KumuCancelable. Locked in verse-event-lattice. |
| **KumuAwaitable\<T\>** | awaitable(t) | ~:confidence[C],[19] | Single-shot suspension. Locked in verse-event-lattice. |
| **KumuSignalable\<T\>** | signalable(t) | ~:confidence[C],[19] | INPUT pin. RE-internal. Locked in verse-event-lattice. |
| **KumuEvent\<T\>** | event(t) | ~:confidence[C],[19] | Concrete event. Implements signalable + awaitable. Locked in verse-event-lattice. |
| **KumuCancelable** | cancelable | ~:confidence[C],[19] | Subscription handle. `.cancel()` MUST be called on slot demotion. Locked in verse-event-lattice. |
| **Hot / Cold Tier** | enableable | ~:confidence[C],[18] | Hot = enabled; Cold = disabled. Promotion/demotion = Enable()/Disable(). |
| **Evicted Slot** | invalidatable | ~:confidence[C],[17] | Worker terminated. RE MUST NOT route events to evicted slots. |
| **Fractal RE** | (island-scale pattern) | ~:confidence[C],[15] | ReactionGraph re-instantiated at Scale-0 through Scale-4. Same interface; different surfaces. Scale-4 = Commons horizon (boundary, not implementation target). |

> **#Lorekeeper** » 02:05 — vocabulary-lock table updated 2026-05-11: added Agent, Operator, NPPC, Kumu-Device Avatar, fort\_playspace, Session Wiki; fixed wrong `agent → Operator` row. Updated 2026-05-14: fixed Lararium Node = experience (NOT playspace); Session Wiki = lar\_playspace (runtime session scope); added lar\_behavior (npc\_behavior analogue) and Bag scope (agent\_group analogue). UEFN canonical: *"There is typically one fort\_playspace for an entire experience, though this may change in the future as the platform evolves"* — multi-playspace path now officially flagged by Epic.

<<~/ahu>>

<<~ ahu #stub-status >>

## Stub Status

This meme begins as a draft at the repo root, parallel to the-lares-protocols.md.

It does NOT yet:
- have a stable `@-scope` in the URI (promoted to `@lares` namespace)
- drive runtime behavior (no invariant = true; no heleuma anchor)
- lock the Session Wiki RE implementation (Scale-2 design is committed but not shipped)
- complete the quine round-trip test (P4 requires a proven projection-write cycle)

It DOES:
- lock the UEFN→Lares system-level vocabulary table
- declare the four-scale fractal RE as the HUD update loop
- name the session-events bag as the `channel_device` equivalent
- frame the AI-Operator alignment relation as first-class architecture
- position the home intranet RPG session as the reference implementation, not the definition
- resolve T-1 via Quine principle: one wiki = one `lar_playspace`; recipe = scoping mechanism
- define StructuredClone golden principles GP-1 through GP-6 for the P.3 Worker message protocol

**Sprint milestones (as of 2026-05-14):**
- P.2 NodeVmManager: ✅ closed 2026-05-11
- P.3 Worker Thread architecture: ⬜ in design; GP-1–GP-6 defined; first Worker pending
- **J.3 child co-promotion: promoted to P.3.5** per operator ruling 2026-05-14. Schedules after P.3 gate, before P.4 design arc.
- P.4 quine round-trip: ⬜ future arc

Promotion path: when the Session Wiki RE ships and the vocabulary lock passes a real implementation test, this meme qualifies for promotion to `tagspace = "stable"` and `@lares` scope assignment.

> **#Lorekeeper** » 02:33 — last-reviewed = "2026-05-11" set at authoring. review-cadence = "quarterly" proposed. Sources list four live UEFN API URLs; flag for freshness check on quarterly review — Epic's docs have shifted paths before. Four unsolved questions from the prior session's orient remain open (event log vs state; re-sync semantics; push vs pull for Session RE; cap gate on event-bus bag) — these do NOT block this meme from publication but MUST be resolved before Session Wiki RE ships.

<<~/ahu>>

<<~ ahu #edges >>

## Edges

<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/versedotorg/verse >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/versedotorg/simulation >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/versedotorg/agentgroup >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/devices >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/playspaces >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/game >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/characters >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/ai >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/verse-api/fortnitedotcom/teams >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/coding-device-interactions-in-verse >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/create-custom-npc-behavior-in-unreal-editor-for-fortnite >>
<<~ loulou https://dev.epicgames.com/documentation/fortnite/understanding-npc-behavior-in-unreal-editor-for-fortnite >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #sibling-protocols ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols family:observe role:sibling >>
<<~ pranala #cites-verse-event-lattice ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-event-lattice family:observe role:cites >>
<<~ pranala #cites-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:observe role:cites >>
<<~ pranala #cites-federated-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/federated-causal-islands family:observe role:cites >>
<<~ pranala #cites-quine-principles ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/quine-principles family:observe role:cites >>
<<~ pranala #cites-reaction-graph ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/reaction-graph family:observe role:cites >>
<<~ pranala #cites-vm-projection-bus ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/vm-projection-bus family:observe role:cites >>
<<~ ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant >>

<<~/ahu>>

<<~ ahu #open-tensions >>

## Open Tensions (named, not resolved)

These tensions emerged from OODA-HA Orient during the feature/lararium-node-3 sprint (2026-05-11–14). They are load-bearing: decisions made without naming them first will produce incoherent ontology drift. Each tension is a named fork, not a failure.

**T-1: Playspace nesting — Scale-1 wiki = `lar_playspace`?** ✅ RESOLVED via Quine principle (2026-05-14)
Quine ruling: *if it can happen in the wiki, it must happen in the wiki.* A playspace scopes agents, state, and rules via a recipe. One Lares wiki = one `lar_playspace`. Nesting = recipe composition (include another wiki's bags). Portal pattern: a canvas page renders filtered tiddlers from shared bags — semi-live via Automerge sync, TW5 filter-based. Session Wiki = the coordinator `lar_playspace` (broadest recipe; owns event-bus bag). Architecture sketched; TW5 filter-based canvas page views for portals not yet shipped (P.4 or later). Resolved at ~:confidence[C],[16] — portal rendering detail stays open.

**T-2: Nexus playspace — does Scale-3 have a playspace concept?**
Scale-3 = Nexus island (node-to-node). There is no UEFN analogue at this scale (UEFN does not have a cross-island playspace API). Current state: Scale-3 named as Nexus, no playspace concept. Tension: if Lares introduces a "federated playspace" (a shared experience scope across two nodes), what is the Verse-grounded name? Resolution: probably NOT `lar_playspace` — suggest `lar_realm` or `lar_federation` if the concept ships. Hold open.

**T-3: multi-daemon lar_group — when does the concept crystallize?**
`agent_group` is the Verse type for "set of agents with shared ownership." In Lares: multiple `lares-daemon` coordinators in one session = a natural group. Bag scope captures this implicitly. Named type `lar_group` is ~:confidence[C],[14] and not yet needed for P.3. Resolution: lock when multi-daemon (≥2 concurrent daemons per session) is an active design target. Do NOT force it into P.3 scope.

**T-4: lar_behavior lifecycle contract — OnBegin/OnEnd shape?**
`npc_behavior.OnBegin<override>()<suspends>:void` is the UEFN contract. Verse: this runs when the NPC spawns. The Lares analogue for a Wiki Entity: when does `lar_behavior.OnBegin` fire? On tiddler creation? On hot-tier promotion? These are not the same event. Resolution: lock when the first Wiki Entity ships. Current hold: the concept is named; the event boundary is open.

> **#Council** » 14:30 — T-1 closed by quine principle; architecture holds at ~:confidence[C],[16]. T-3 and T-4 remain implementation-deferred. T-2 remains an architecture horizon. J.3 (child co-promotion) promoted to **P.3.5** per operator ruling 2026-05-14 — does NOT block P.3, ships as P.3.5 pre-work for P.4. Name T-2/T-3/T-4 in every sprint review until resolved.

<<~/ahu>>

<<~ ahu #structured-clone-gap >>

## StructuredClone Gap — P.3 Message Protocol

`~:e-prime[0.7]` `~:confidence[C],[16]`

The P.3 Worker Thread design crosses one mandatory trust boundary: main thread ↔ Worker. Every crossing uses `postMessage()`, which internally applies the **structured clone algorithm** (WHATWG HTML spec, MDN). The gap between "any JS object" and "a structured-clone-safe object" carries non-trivial constraints that shape the entire P.3 message protocol.

### What the boundary drops

| Dropped by structured clone | Consequence for Lares |
|---|---|
| Prototype chain | Class instances arrive as plain objects. Worker RE cannot receive TW5 engine objects from main thread. All class wrappers stay Worker-local. |
| Property descriptors (getters, setters, readonly) | All fields arrive as read/write plain properties. No defensive getter tricks survive. |
| Functions | Cannot send callbacks. Event handlers stay local to their thread. |
| Symbol-keyed fields | Tiddler field names MUST NOT use Symbol keys (already true in TW5 tiddler model; add to explicit spec). |
| Class private fields | Internal state of any class instance drops silently. No error; silent data loss. |
| DOM nodes | Cannot send widget or document references across the boundary. |

### What the boundary preserves

| Preserved | Lares use |
|---|---|
| Plain objects `{ [key: string]: primitive }` | Tiddler records: safe. This matches TW5's own field model. |
| Map, Set, Array | Safe for changeset indexes and event queues. |
| ArrayBuffer *(transferable)* | Automerge change bytes: prefer **transfer** (zero-copy) over clone. Sending side's buffer gets neutered; expected behavior. |
| TypedArray (Uint8Array) | Automerge binary: cloneable; underlying buffer transferable. |
| CryptoKey | Keyhive key handles survive clone. Do NOT serialize to JSON (exposes key material). |
| Error (name + message) | Fault signals across the boundary. `stack` may also survive depending on runtime. |
| Date | Timestamp fields. |

### Golden principles for the P.3 message envelope

**GP-1 Schema-versioned envelope.** Every message crossing the boundary MUST carry:
```json
{ "schema_version": 1, "type": "<message-type>", "payload": { ... } }
```
No naked payloads. The version field enables forward-compatible protocol evolution from P.3 forward. Lock at `schema_version: 1` before the first Worker ships; increment at breaking changes.

**GP-2 Plain-object payloads only.** No class instances, no functions, no DOM. A tiddler crossing the boundary = `{ title: string; [field: string]: string | number | boolean }`. All RE-side class wrappers = Worker-local; no cross-boundary construction.

**GP-3 Transfer Automerge bytes, don't clone them.** Automerge changeset binary (Uint8Array): send via `postMessage(msg, [changeset.buffer])`. Zero-copy transfer avoids O(N) clone latency on large changesets. The sending side's buffer gets neutered on transfer; build accordingly.

**GP-4 CryptoKey stays native.** Keyhive keys flow as `CryptoKey` objects (native Web Crypto, structuredClone-safe). Never `JSON.stringify` a CryptoKey. Never pass a raw key byte array across the boundary unless wrapped in an explicit key-material transport type with explicit tagging.

**GP-5 Teardown handshake.** On Worker eviction, main thread sends `{ schema_version: 1, type: "teardown" }`. Worker completes in-flight RE reactions, calls `KumuCancelable.cancel()` on all live subscriptions, sends `{ schema_version: 1, type: "teardown:ack" }`. Main thread then calls `worker.terminate()`. This prevents `DataCloneError` races on messages in-flight at eviction. **Needs integration test fixture as P.3 gate criterion.**

**GP-6 No direct Worker-to-Worker messages.** Workers do not communicate directly. Cross-wiki routing always passes through main thread (receives events from Worker A → dispatches to Worker B via its own Worker reference). The Session Wiki RE runs in its own Worker; it coordinates by reading the event-bus bag (Automerge-synced), not by direct Worker messaging. Re-evaluate at P.4 if Session RE demands direct peer channels for performance.

### Prior art

- **Comlink** (Google): type-safe RPC over `postMessage`. Pattern: Proxy wrapping + explicit transfer lists + schema-versioned call objects. Establishes the envelope convention.
- **Redux DevTools bridge**: actions MUST qualify as plain-object serializable. Rule: if `JSON.stringify(action)` throws, the action doesn't cross. Identical constraint to tiddler fields.
- **Electron IPC** (`ipcMain`/`ipcRenderer`): version the message shape; never send class instances. Resolution: a `type` discriminant field on every message. Direct antecedent of GP-1.
- **React Native Old Bridge**: JSON-serializable bridge payloads only. The New Architecture (JSI) replaces the bridge with direct JS-to-native calls — the Lares analogue of JSI = the in-Worker synchronous TW5 read (no boundary at all; TW5+RE co-located in the same thread).

### The co-location insight

TW5 + RE occupy the **same** Worker thread (co-located, synchronous reads) precisely to eliminate the StructuredClone boundary from the hot path. The RE reads tiddlers via `filterTiddlers()` — a synchronous in-memory call, no `postMessage`, no clone. The boundary only applies to three bounded message types:

1. **Main → Worker:** changeset notification — `{ schema_version: 1, type: "changeset", changeset: Uint8Array }`
2. **Worker → Main:** event emission — `{ schema_version: 1, type: "event", listenable: string, payload: {...} }`
3. **Main → Worker:** tier signal — `{ schema_version: 1, type: "teardown" | "promote" | "demote" }`

These three message types cover the full P.3 boundary surface. Lock them before shipping Worker #1.

> **#Scryer** » 15:44 — GP-1 through GP-5 represent P.3's minimal protocol surface. GP-5 (teardown handshake) deserves its own integration test fixture — it's the eviction invariant that P.2 named but didn't test. GP-6 holds for P.3; re-examine at P.4 if Session RE demands direct Worker-to-Worker for latency reasons. The StructuredClone constraint shapes the entire Worker boundary spec. The co-location insight explains why the architecture looks the way it does: the hot path doesn't cross the boundary; only the three bounded signal types cross.

<<~/ahu>>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
