# Kowloon Bridge — Local-First + ActivityPub Coexistence

> Created: 2026-05-05
> Updated: 2026-05-05 (four-layer stack clarified; Federated Social tiga named)
> Branch: feature/lararium-node-3
> Status: Design doc — governs S8 sprint scope
> Context: Research synthesis — ActivityPub/CRDT bridge patterns, AT Protocol distribution layer, Replicache outbox, Electric SQL shapes

---

## Four-Layer Stack

```
elyncia.app               — public domain; reverse proxy routing web2 (Kowloon) vs web3 (Lares)
  ├── DreamDeck           — first app on the DreamNet; memetic-wikitext wiki; mobile Lares node
  │     ├── Lares         — Agent alignment + HUD layer; personal workspace (MemeStoreDoc)
  │     └── Lararium      — "where the lares lives"; isomorphic identity + TW5/Automerge quine
  └── Kowloon Node        — web2 ActivityPub gateway; Node.js + MongoDB; @user@elyncia.app
```

DreamDeck is **not** Lares and **not** Lararium — it is the first *application* built on both. Other node types on the DreamNet are possible. "On Elyncia, DreamDecks serve as one type of mobile Lares node on the DreamNet."

---

## Three Social Tiga Layers

The social plane has three ha-ka-ba layers operating at different authority levels:

```
Local Social Tiga    (keypair-authoritative, never federates)
  ha  IdentitiesDoc    — WHO you are: device keys, delegation proofs
  ka  CirclesDoc        — HOW you organize: circles, membership, capability grants
  ba  SessionsDoc       — WHAT you're doing: live session registry + EventLog children

Federated Social Tiga  (server-authoritative at publish boundary, elyncia.app)
  ha  KowloonProfile    — your authorial voice going OUT: drafts → published activities
  ka  KowloonFeed       — collective signal coming IN: discovery, followed servers, catalog
  ba  KowloonActivity   — operational live state: notifications, mentions, pending invites

Content Tiga         (genesis-artifact-authoritative)
  ha  LarariumDoc       — system island, genesis artifact
  ka  CatalogDoc        — corpus/room index
  ba  MemeStoreDoc      — personal workspace (lares)
```

The Local Social tiga is pure Automerge / UCAN. It never touches a server. The Federated Social tiga intentionally crosses the authority boundary at the publish step — the user's keypair authorizes the draft; the server's keypair signs the federation activity. These are sequential, not concurrent.

---

## The Tension

The Lararium/Lares stack is entirely web3 / local-first / keypair-authoritative (UCAN/DID/Automerge). We also want to run a Kowloon node (`elyncia.app`) so DreamDeck users can draft and publish social posts to a fediverse-compatible network.

**Structural conflict:**

| Layer | Authority model |
|---|---|
| Lares / DreamDeck | **User keypair** is root of authority. Servers are untrusted infrastructure. |
| Kowloon (ActivityPub) | **Server** is the actor. `@user@elyncia.app` is signed by the server's key (HTTP Signatures RFC 9421). User cannot prove authorship independent of home server. |

These are not compatible at the protocol level. They coexist with a clear boundary — the publish step is a deliberate authority handoff, not a transparent sync.

---

## Resolution: Layered Authority

From grjte's AT Protocol + local-first research (WhiteWind, 2024–2025) and Bain Capital Crypto analysis:

> Treat the remote protocol as a one-way **publish surface**, not a sync peer. Locally, Automerge is the source of truth. The remote server (ActivityPub outbox) receives *committed snapshots*, not live CRDT changes. The draft → publish boundary is explicit and intentional.

The ActivityPub layer can revoke *discovery* (deplatform, defederate) without touching the local-first data. This is a feature, not a bug — the user's content lives in their Automerge docs regardless of what `elyncia.app` does.

---

## Decision: Option B — Separate Bridge Docs, Social Tiga Stays Clean

**Do NOT make `ba` a mirror of Kowloon server state.** The content tiga and social tiga must remain entirely local-first authoritative. Automerge guarantees conflict-free merge across peers; Kowloon's server state is not a peer — it is the authoritative source for anything published. Mixing server-authoritative data into the `ha/ka/ba` tiga introduces a category violation.

**The right shape: two separate bridge Automerge docs alongside the social tiga.**

---

## KowloonProfile (ha) — Draft Queue Doc

One Automerge doc per user, storing unpublished drafts and pending mutations.

```ts
interface KowloonOutbox extends LarDoc {
  // tiddler-first: one tiddler per draft at kow://outbox/{draftId}
  tiddlers: Record<string, MutableLarRecord>;
}

// Draft tiddler fields:
interface DraftTiddler {
  readonly draftId:       string;           // local UUID
  readonly content:       string;           // post body (Kowloon format)
  readonly targetServer:  string;           // "https://elyncia.app" or user's own node
  readonly circleIds:     string;           // TW5 list of circle IDs to address (to/canReply/canReact)
  readonly status:        "draft" | "pending" | "published" | "failed";
  readonly remoteRef?:    string;           // Kowloon activityId after publish
  readonly publishedAt?:  string;           // ISO 8601
}
```

**Replicache outbox pattern** (Replicache / Zero docs, 2024–2025): the queue is the doc, not the projected state. Local mutations are applied optimistically; on reconnect the adapter POSTs to Kowloon's API, gets back an `activityId`, marks the draft `published` with `remoteRef`.

**Flow:**
1. User drafts in DreamDeck → `KowloonOutbox` tiddler at `status: "draft"`
2. User hits publish → adapter POSTs to `targetServer/api/posts` (Kowloon API)
3. On success → tiddler updated to `status: "published"`, `remoteRef` set
4. On failure → `status: "failed"`, retry on next online window
5. Published drafts can be pruned after `remoteRef` confirmation

---

## KowloonFeed (ka) — Feed Mirror (Read-Only)

A lightweight Automerge doc (or in-memory store) caching notifications and recent feed items for display in DreamDeck. Refreshed on demand from Kowloon's pull endpoint (`/.well-known/kowloon/pull`).

```ts
interface KowloonInbox extends LarDoc {
  tiddlers: Record<string, MutableLarRecord>; // one tiddler per activity
}
```

This doc does **not** need CRDT merge semantics — it is always replaced from the server, not merged. It can be a plain Automerge doc for tiddler-first consistency, but its merge policy is "server wins on refresh" (last-write-wins per activity tiddler). It is never a sync peer with any other Automerge repo.

**Electric SQL shape pattern** (electric-next, 2024): a "shape" is a server-defined subset that the client subscribes to. Writes go back via HTTP POST. KowloonInbox is exactly this — a shape of the user's Kowloon feed.

---

## Elyncia.app Architecture

```
┌──────────────────────────────────────────────────────────┐
│  elyncia.app                                              │
│  ┌─────────────────────────────┐  ┌────────────────────┐ │
│  │  Lares / DreamDeck          │  │  Kowloon Node      │ │
│  │  (local-first, Automerge)   │  │  (ActivityPub,     │ │
│  │                             │  │   Node.js+MongoDB) │ │
│  │  Content tiga (ha/ka/ba)    │  │                    │ │
│  │  Social tiga (ha/ka/ba)     │  │  @user@elyncia.app │ │
│  │                             │  │  signs with server │ │
│  │  KowloonOutbox ─────────────┼──┼──► POST /api/posts │ │
│  │  KowloonInbox  ◄────────────┼──┼──  GET /.well-known│ │
│  └─────────────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

The Kowloon node and Lares node run on the same domain. They are separate services. The bridge is two HTTP calls (one POST to publish, one GET to refresh inbox). No shared database, no shared auth.

---

## What Kowloon Circles Mean for CirclesDoc

DreamDeck's local `CirclesDoc` and Kowloon's server-side Circles are **parallel, not synced**. When a user addresses a draft to one of their local circles, the DreamDeck adapter resolves the circle's `memberDids` and translates them to Kowloon user IDs for the `to` field in the Kowloon post. The local circles are the source of truth; the server never writes back to `CirclesDoc`.

This preserves the Kowloon inversion: circle membership never federates. DreamDeck holds the canonical membership list locally; the Kowloon server receives addressed deliveries but cannot query the list.

---

## URI Scheme

```
kow://outbox/{draftId}     — KowloonOutbox draft tiddlers
kow://inbox/{activityId}   — KowloonInbox feed tiddlers
```

Oracle tiddlers in the island doc point to both bridge docs' `AutomergeUrl`s via `reconcileWellKnownTiddlers` (or a new `reconcileKowloonTiddlers` variant).

---

## Sprint S8 Scope

- [ ] Add `KowloonOutbox` doc type + `DraftTiddler` fields to `social-doc.ts` (or new `kowloon-doc.ts`)
- [ ] Add `seedKowloonOutbox(repo)` + `seedKowloonInbox(repo)` in `genesis-island.ts`
- [ ] Write Kowloon HTTP adapter (`packages/lararium-node/src/kowloon-adapter.ts`) — POST draft, GET feed shape
- [ ] Add `KowloonOutbox`/`KowloonInbox` URLs to oracle tiddlers in `reconcileWellKnownTiddlers`
- [ ] `elyncia.app` deployment: Lares node + Kowloon node on same domain, separate services

**Prerequisite:** S5 (quine) + S6 (SessionEventLog) complete. S7 (capability layer) not required for S8.

---

## Primary Sources

| Topic | Source |
|---|---|
| AT Protocol as local-first distribution layer | [grjte / WhiteWind](https://whtwnd.com/grjte.sh/3lndb5weupc2r) |
| AT Protocol as legibility layer | [grjte / WhiteWind](https://whtwnd.com/grjte.sh/3lndyhyvqdc2w) |
| ATProto for local-first legibility | [Bain Capital Crypto](https://baincapitalcrypto.com/atproto-for-local-first-legibility/) |
| Outbox mutation-queue pattern | [Replicache / How It Works](https://doc.replicache.dev/concepts/how-it-works) |
| Central server architectures (intent log) | [Matthew Weidner, 2024](https://mattweidner.com/2024/06/04/server-architectures.html) |
| Local-first with existing API (shape sync) | [Electric SQL, 2024](https://electric-sql.com/blog/2024/11/21/local-first-with-your-existing-api) |
| ActivityPub HTTP Signatures | [SWICG spec](https://swicg.github.io/activitypub-http-signature/) |
| Kowloon — Circles + Federation model | [github.com/jzellis/kowloon](https://github.com/jzellis/kowloon/) |
