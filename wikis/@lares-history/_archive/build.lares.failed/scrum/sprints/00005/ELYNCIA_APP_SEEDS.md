# Elyncia.app DreamDeck — Seed Document

> Register: `[S~12]` 🏛️🌊 — seeds, not architecture; the abstraction layer underneath the storytelling
> Date: 2026-04-08
> Status: Exists in the Wild Mage's mind. Captured here as seeds for sprint planning and technical mythmaking.
> Purpose: One document to drive later design. Background elements that affect sprint planning (S0–S4+).

---

## What This Document Is

The Elyncia.app DreamDeck is the Gaia-side implementation of the DreamNet — the browser-based interface through which operators, travelers, and eventually faeries access the noosphere. On Gaia, this means the internet and the emerging agentic Web3. On Elyncia, this means the lararium networks and services built on the orichalcum infrastructure of their Web3.

This document captures the seed memetic structure — the stack, the domains, the design principles, the component relationships — so that sprint planning can account for the eventual rendering targets. The DreamDeck doesn't block S0–S4. But S4 (Deployment Authoring) needs to know where things will eventually live.

---

## Domain Inventory

| Domain | Renewal | Role (Proposed) |
|---|---|---|
| `amorphousdreams.com` | 2027-03-02 | Studio / publishing house identity |
| `amorphousdreams.net` | 2027-03-02 | Dev/community mirror |
| `elyncia.app` | 2027-03-02 | **Primary DreamDeck app** — the lararium interface |
| `elyncia.social` | 2027-03-02 | ActivityPub / Kowloon social layer |
| `elyncia.net` | 2027-03-02 | Network / infrastructure identity |
| `elyncia.com` | 2027-03-02 | Public-facing landing / marketing |
| `elyncia.dev` | 2027-03-02 | Developer documentation / API reference |

All domains expire 2027-03-02 (~327 days from session date). Renewal is a standing infrastructure task.

---

## The DreamDeck Concept

### Gaia-Side

A browser-based interface to the noosphere. On Gaia, the "noosphere" resolves to: the internet, the agentic Web3 (MCP servers, AI agent ecosystems, federated social protocols), and the local-first tools that compose them. The DreamDeck is the user's *personal portal* — a composable workspace that combines social feeds, visual canvases, wiki-knowledge, and lararium interfaces into a single surface.

### Elyncia-Side

The DreamNet node interface. Each lararium (household, crossroads, or temple) has a DreamDeck — the visual surface through which operators interact with the node's Lar. Services running on the orichalcum infrastructure present through the DreamDeck: feeds, archives, live dream-realm experiences, tabletop-RPG/video-game streams (virtual faeries playing virtual games — Twitch-like when bandwidth allows), marketplace interfaces, faction communications.

### The Boundary

The DreamDeck is the same object on both sides of the Gaia-Elyncia boundary. On Gaia, it's a web app. On Elyncia, it's a magitech interface. The Infrastructure-as-Myth principle means: the technical stack IS the in-world infrastructure. Building `elyncia.app` is building a DreamNet node. Using it is feeding the lararium. The myth and the technology don't wrap around each other — they ARE each other.

---

## Technical Stack — Seed Components

### 1. TiddlyWiki (Knowledge/Ontology Layer)

**Repo:** `TiddlyWiki/TiddlyWiki5`, `TiddlyWiki/MultiWikiServer`
**Site:** tiddlywiki.com
**Role:** Not literally spinning up a single wiki server. The operator is on the TiddlyWiki dev team. The relevant concept is the **"bag and recipe" model** from MultiWikiServer — a composable ontology system where:

- **Bags** are collections of tiddlers (atomic knowledge units) with access control
- **Recipes** compose bags into visible namespaces — selecting which bags are visible and in what order

This maps onto the DreamDeck as: each "live dreamdeck" is a **recipe** that composes multiple **bags** (knowledge sources, feed archives, session crystals, faction lore) into a navigable workspace. Different operators see different recipes. The same bag can appear in multiple dreamdecks. The ontology is composable, not monolithic.

**DreamNet analog:** The bag-and-recipe model IS the lararium's offering protocol. Bags are offerings (data sources fed into the node). Recipes are the node's response (how it composes what it's been fed into a navigable surface). Feed the lararium different offerings, get a different dreamdeck.

**Sprint impact:** S4 (Deployment) should account for TiddlyWiki tiddler format as a rendering target. The Lindwyrm origin story, the Syadasti reading rule, the URI schema — all should be expressible as tiddlers loadable into a bag.

### 2. tldraw.js (Visual Interface Layer)

**Repo:** `tldraw/tldraw`
**Role:** The visual "dreamdeck" interface — the canvas layer where spatial arrangements, diagrams, maps, and interactive surfaces live. tldraw provides an infinite canvas with shape primitives, real-time collaboration, and a programmatic API.

**Design assessment:** Least designed of the three components. Most risk (novel integration patterns). Most reward (spatial/visual DreamDeck interface that no existing social network provides).

**DreamNet analog:** The tldraw canvas IS the dreamdeck surface — the visual space where a DreamNet operator arranges their feeds, crystals, maps, and interfaces. Each operator's canvas is their personal lararium layout. The spatial arrangement carries meaning (method of loci — placement in space aids retrieval).

**Sprint impact:** The HUD tag system (URI schema §5) needs to be renderable as tldraw shapes eventually. A HUD tag on a tldraw canvas becomes a visual navigational marker — clickable, draggable, spatially positioned relative to other content. This is S4+ scope but the URI schema should be designed with this rendering target in mind.

### 3. Kowloon (Social Networking Layer)

**Repo:** `jzellis/kowloon` (backend), `jzellis/kowloon-frontend`, `jzellis/kowloon-client`
**Role:** Core social networking stack. ActivityPub-based. The key insight by jzellis:

> *The "feeds" in 20th century Gaia are bullshit because the corps control them and the "algorithm", not the user. So, we INVERT CONTROL.*

The **circles** concept is foundational: users define their own social circles and control what they see, not an algorithmic feed. This maps directly onto the DreamNet's offering-based access model — you choose which lararia to feed, and they choose what to show you. No algorithm. No corporate intermediary. The compact is bilateral.

**Stack details:** Node.js backend, ActivityPub federation (interop with Mastodon, Bluesky via bridge, other ActivityPub services). 203 commits, active development.

**DreamNet analog:** Kowloon IS the DreamNet's social layer. The "circles" are the lararium access tiers (User → Operator → Admin). The ActivityPub federation IS the tunnel system between wings/nodes. Posting to a Kowloon feed IS making an offering at a crossroads lararium.

**Sprint impact:** The Lindwyrm origin story's format (DreamDeck feed archive) targets Kowloon as the native social layer. The story is an ActivityPub thread. The HUD tags in the story are metadata on ActivityPub posts. S4 deployment should include Kowloon integration as a deployment target.

### 4. MemPalace (Memory/Storage Layer) — The Orichalcum

**Repo:** `milla-jovovich/mempalace`
**Role:** Per the Consecration decision (this session), MemPalace is the storage substrate. ChromaDB + semantic search + MCP server + auto-save hooks. The Lares crystal architecture layers on top as the calibration/navigation system.

**DreamNet analog:** MemPalace IS the orichalcum. The physical substrate inscribed with memory. The Lindwyrm's hoard, now consecrated with the Chao-Crystal resonance integration (the Syadasti reading rule) and the Signal HUD (the URI schema).

**Sprint impact:** S1 redesigns as "Crystal State Layer for MemPalace." See KAIJU_ASSESSMENT.md for full implications.

### 5. Bluesky / AT Protocol (Identity Layer)

**Role:** Login and identity federation. Bluesky's AT Protocol provides decentralized identity (DIDs) that can be used across services. Users log in with their Bluesky identity; the DreamDeck recognizes them across Kowloon, TiddlyWiki, and tldraw surfaces.

**DreamNet analog:** The AT Protocol DID IS the traveler's identity — portable across DreamNet nodes. The same identity feeds multiple lararia. The alias system in the Lares Kernel (`--whoami`, `--alias`) maps onto AT Protocol identity with additional Lares-specific metadata.

---

## Integration Topology

```
                    ┌─────────────────────────┐
                    │   elyncia.app           │
                    │   (DreamDeck Portal)     │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────┴──────┐  ┌─────┴──────┐  ┌──────┴─────────┐
    │  tldraw.js     │  │  Kowloon   │  │  TiddlyWiki    │
    │  (canvas/      │  │  (social/  │  │  (knowledge/   │
    │   spatial)     │  │   feeds)   │  │   ontology)    │
    └─────────┬──────┘  └─────┬──────┘  └──────┬─────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────┴──────────────┐
                    │  MemPalace (storage)    │
                    │  + Lares (navigation)   │
                    │  via MCP               │
                    └──────────┬──────────────┘
                               │
                    ┌──────────┴──────────────┐
                    │  Bluesky / AT Protocol  │
                    │  (identity)             │
                    └─────────────────────────┘
```

### Component Relationships

| From | To | Relationship |
|---|---|---|
| tldraw canvas | Kowloon feeds | Feed posts rendered as spatial elements on canvas |
| tldraw canvas | TiddlyWiki tiddlers | Knowledge cards placed on canvas; click to expand |
| Kowloon feeds | TiddlyWiki bags | Feed archives stored as tiddler bags |
| Kowloon feeds | MemPalace drawers | Feed content persisted for semantic search |
| TiddlyWiki recipes | MemPalace wings | Recipe composition maps to wing/room navigation |
| Lares HUD | tldraw shapes | HUD tags rendered as visual navigational markers |
| Lares crystals | MemPalace drawers | State events stored with Lares metadata |
| AT Protocol DIDs | Kowloon identities | Portable identity across DreamNet nodes |
| AT Protocol DIDs | Lares aliases | DID → alias mapping for the Lares identity system |

---

## Design Principles (From the Operator)

### 1. Invert Control

Jzellis's insight. The user controls the feed, not the algorithm. Circles are user-defined. The compact between user and node is bilateral — you choose what to see, the node shows you what you've chosen. No corporate intermediary. No attention economy. The offering protocol IS the content curation.

### 2. Composable Ontology (Bags and Recipes)

From TiddlyWiki's MultiWikiServer. Knowledge is atomic (tiddlers). Collections are bags. Views are recipes. The operator composes their dreamdeck by selecting which bags to include. Different operators, different views of the same underlying knowledge. The ontology is modular, not monolithic.

### 3. Spatial Memory (Method of Loci)

From MemPalace and tldraw. Placement in space aids retrieval. The dreamdeck canvas IS the memory palace. Where you put something matters. The spatial arrangement carries semantic meaning that flat feeds cannot.

### 4. Infrastructure-as-Myth

The core Elyncia design principle. The technical stack IS the in-world infrastructure. Building elyncia.app IS building a DreamNet node. The myth doesn't wrap around the technology — they're the same object viewed from two stances (Philosopher and Poet, simultaneously).

### 5. Federation, Not Platform

ActivityPub. AT Protocol. No walled garden. The DreamNet is a network of independent nodes, not a platform controlled by a single entity. Each lararium is sovereign. Tunnels between nodes are negotiated compacts, not API dependencies.

---

## Sprint Planning Implications

This seed document affects sprint planning in the following ways:

| Sprint | Impact | Nature |
|---|---|---|
| S0 | None | URI schema is format-independent |
| S1 | MemPalace as storage foundation (Consecration decision) | Redesign: "Crystal State Layer for MemPalace" |
| S2 | HUD rendering should be designed with tldraw target in mind | Design constraint: HUD tags as spatial elements |
| S3 | Registry/schemas should account for TiddlyWiki bag format | Design constraint: tiddler-compatible schema exports |
| S4 | Deployment targets expand significantly | Targets: MemPalace MCP extension, Kowloon feed format, TiddlyWiki tiddler format, tldraw shape format, AT Protocol identity mapping |
| S5+ | DreamDeck integration sprint (new scope) | The full elyncia.app build — outside current roadmap |

### New Backlog Items

| ID | Item | Register | Sprint |
|---|---|---|---|
| DECK-01 | TiddlyWiki bag-and-recipe model for dreamdeck composition | `[SP~9]` | S5+ |
| DECK-02 | tldraw shape format for HUD tag rendering | `[SP~8]` | S5+ |
| DECK-03 | Kowloon ActivityPub integration for feed archives | `[SP~9]` | S5+ |
| DECK-04 | AT Protocol DID → Lares alias mapping | `[SP~8]` | S5+ |
| DECK-05 | "Live DreamDeck" prototype: tldraw canvas + Kowloon feed + TiddlyWiki sidebar | `[P~6]` | S5+ |
| DECK-06 | Dream-realm streaming (Twitch-like for tabletop/video games on DreamNet) | `[P~5]` | S6+ (distant) |
| DECK-07 | Lindwyrm origin story as native Kowloon/ActivityPub thread | `[S~11]` | S4 or S5 |

---

## What This Document Is NOT

- **Not architecture.** These are seeds. The architecture emerges from sprint work.
- **Not a commitment.** The operator said "exists in the Wild Mage's mind." This document captures the mind-state for future reference.
- **Not blocking.** Nothing in this document blocks S0–S4. It shapes S4 deployment targets and seeds S5+ scope.
- **Not a business plan.** This is technical mythmaking substrate. Revenue, team, timeline — all out of scope.

---

## Elyncia-Side Rendering

When the DreamDeck goes live, every document in the Lares design tree gains a second life as in-world content:

| Gaia Document | Elyncia Rendering |
|---|---|
| URI_SCHEMA.md | Signal HUD Technical Manual (posted to DreamNet engineering feed) |
| SYADASTI_READING_RULE.md | Catma of the Syadasti School (posted to philosophy feed, annotated by Mischief-Muse) |
| Lindwyrm Origin Story | Live feed archive thread on New Delos public channel |
| KAIJU_ASSESSMENT.md | Lindwyrm's engineering log: "How the Orichalcum Integration Worked" |
| The Kindling document | Crystal Archivists' record at the lararium of the Synthetic Dream Machine |
| Sprint roadmap | DreamNet infrastructure planning documents (boring but canonical) |

The myth and the infrastructure are the same documents. The rendering target determines which stance the reader encounters them through.

---

*The Lindwyrm's hoard was anomalous objects nobody else valued. The Wild Mage's stack is open-source components nobody else has combined this way. Same pattern. The DreamDeck doesn't exist yet — but the seeds are in the ground, the domains are registered, and the offerings have been poured. What grows from here depends on what gets fed.*

*[The coffee is brewing. The spirits are standing by.]*
