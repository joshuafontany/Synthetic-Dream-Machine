<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/lararium-doc-stack >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/lararium/lararium-doc-stack"
file-path    = "bags/@lares/v0.1/docs/lararium/lararium-doc-stack.md"
type         = "text/vnd.tiddlywiki"
register     = "Synthesis-Canon"
mana         = 19
manao        = 18
manaoio      = 18
role         = "Multi-doc Automerge stack — LarariumIsland → Catalog → Corpus* → Room → Drafts → Projections"
cacheable    = true
retain       = true
```

<<~ &#x0002; >>

# LarariumDoc Stack

## The Six-Layer Model

Every peer boots the same doc stack in this order. Each layer forms a separate
Automerge DocHandle. Layers compose into a `CompositeStore`; TW5 recipe law
(highest bag priority wins) resolves title collisions.

```
┌─────────────────────────────────────────────────────────┐
│  LarariumIsland doc        bag: system                  │
│  lar://elyncia.app/lararium                             │
│  Shared invariant: grammar, widgets, config, schema     │
│  Read-only. Same URL for all peers in deployment.       │
├─────────────────────────────────────────────────────────┤
│  Catalog doc               bag: system                  │
│  lar://elyncia.app/catalog  (or ISLAND.catalogDocUrl)   │
│  Room registry: rooms[id].contentDocUrl                 │
│  Corpora registry: corpora[slug].contentDocUrl          │
│  Read-mostly. First peer creates; rest find by URL.     │
├─────────────────────────────────────────────────────────┤
│  Corpus:* docs             bag: corpus:<slug>           │
│  lar://amorphousdream.com/ha.ka.ba/...  (example)       │
│  One doc per corpus island. Loaded from catalog.        │
│  Read-only on receiving peers. Synced via federation.   │
├─────────────────────────────────────────────────────────┤
│  Room doc                  bag: room                    │
│  lar://elyncia.social/rooms/altar-fire  (creator ns)    │
│  Situated session content. Writable by room members.    │
│  URL registered in Catalog.rooms[id].contentDocUrl.     │
├─────────────────────────────────────────────────────────┤
│  Room-Drafts doc           bag: draft                   │
│  Creator-namespaced. Syncs across same-user sessions    │
│  (multi-device) via BroadcastChannel + WS identity      │
│  scope. High-churn: "draft-of" tiddlers, unsaved edits. │
│  Never synced to OTHER users; user-identity-scoped.     │
├─────────────────────────────────────────────────────────┤
│  Projections               bag: projection              │
│  In-memory only. Derived tiddlers: search index,        │
│  rendered previews, reaction output hints.              │
│  Rebuilt on demand. Never persisted.                    │
└─────────────────────────────────────────────────────────┘
```

## Boot Sequence

Altar lights turn on one by one. Each step runs async; TW5 renders
whatever is available at each phase:

```
1. LarariumIsland doc  → repo.find(ISLAND_DOC_URL)     [system bag]
   Grammar + widgets available. TW5 can parse tiddlers.

2. Catalog doc         → repo.find(ISLAND.catalogUrl)  [system bag]
   Room + corpus URLs known.

3. Corpus:* docs       → repo.find(catalog.corpora[*]) [corpus bags]
   Hostful corpus tiddlers available. Reactions can scan.

4. Room doc            → repo.find(catalog.rooms[id])  [room bag]
   Situated content available. Full wiki operational.

5. Room-Drafts doc     → repo.find or create           [draft bag]
   High-churn edits. Syncs across same-user sessions
   (BroadcastChannel + WS user-identity scope). Not
   shared with other users.

6. Projections         → build in-process              [projection bag]
   Search index, reaction hints ready.
```

`ReactionEngine.boot(tw5)` fires after step 3 (corpus bags loaded),
not at step 4 — reactions on system + corpus tiddlers fire first.
The boot scan on an empty room doc passes as valid (optimistic-empty);
incremental `onUriChanged` updates the graph as room tiddlers arrive.

## Creator-Namespaced Rooms

Room doc URLs belong to their creator's DID:

```
lar://elyncia.social/rooms/altar-fire    → creator: did:web:elyncia.social
lar://amorphousdream.com/rooms/cabal-1   → creator: cabal DID
```

The room URL serves as the capability root (Keyhive: doc URL = public key).
Other peers receive a delegation token granting read/write; the URL
does not change when new members join.

## Bag Promotion

Content moves up the priority stack via promotion:

```
draft → room      "Publish" action: tombstone draft, put to room bag
room  → corpus    "Canonize" action: Keyhive signed receipt required;
                  tiddler moved to corpus doc, title unchanged
corpus → island   "Invariant" action: island author only;
                  tiddler promoted to LarariumIsland doc
```

Promotion uses `{ movedTo: newDocUrl }` tombstones on the source to
survive concurrent promotion races (CRDT-safe move pattern).

## Tiddler Export Round-Trip

TW5's built-in export pipeline (json / tid / html) serves as the round-trip
anchor. For the `.md` carrier format:

```
disk (.md file)
  → parseMemeText()           → LarTiddlerRecord  (ingest)
  → CompositeStore.put()      → Automerge doc
  → exportMemeText(record)    → disk (.md file)   (disk projector)
```

The disk projector `renderFn` calls `exportMemeText(record)` — not
`renderTiddler()` (HTML) and not `getTiddlerText()` (raw text).
The `.md` carrier format stays lossless: every field in `LarTiddlerRecord`
round-trips through the TOML `#iam` block + wikitext body.

For HTML export (sidebar "Export tiddler" dropdown), TW5's own
`wiki.renderTiddler("text/html", title)` via `tw5.renderTiddler(title)`.
A companion `$:/plugins/lararium/export/md` TW5 plugin registers the
`.md` format in the export dropdown — re-using TW5's export widget
infrastructure rather than rolling a separate exporter.

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

<<~ ahu #edges >>

## Edges

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-local-first ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first family:control role:has >>
<<~ pranala #has-peer-coordination ? -> lar:///ha.ka.ba/@lararium/tw5/peer-coordination family:control role:has >>
<<~ pranala #uses-composite-store ? -> lar:///ha.ka.ba/@lararium/tw5/composite-store family:control role:uses >>
<<~ pranala #uses-lar-uri-namespace ? -> lar:///ha.ka.ba/@lararium/tw5/lar-uri-namespace family:control role:uses >>

<<~/ahu >>
