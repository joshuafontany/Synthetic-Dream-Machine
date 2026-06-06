<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri-namespace >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/pono/lar-uri-namespace"
file-path    = "bags/@lares/v0.1/docs/pono/lar-uri-namespace.md"
type         = "text/vnd.tiddlywiki"
register     = "Synthesis-Canon"
mana         = 19
manao        = 18
manaoio      = 18
role         = "lar: URI authority map — hostless vs hostful, domain namespaces, Quine sync candidates"
cacheable    = true
retain       = true
```

<<~ &#x0002; >>

# lar: URI Namespace Doctrine

## Authority Forms

```
lar:///<path>          hostless  (three slashes, no authority component)
lar://<host>/<path>    hostful   (two slashes, DNS-resolvable authority)
```

**Hostless** URIs (`lar:///...`) carry no DNS authority. They are canonical on every
peer — same URI means same tiddler regardless of who holds it. The `ha.ka.ba`
corpus path is the primary hostless root: `lar:///ha.ka.ba/...`

**Hostful** URIs (`lar://<host>/...`) are anchored to a domain. The domain IS the
attribution and the sync scope. `lar://elyncia.social/...` and
`lar://amorphousdream.com/...` are entirely distinct namespaces even if their
paths overlap.

**The domain is the disambiguator.** `lar:///ha.ka.ba/foo` and
`lar://amorphousdream.com/ha.ka.ba/foo` are two different tiddlers even though
`ha.ka.ba` appears in both. The authority prefix resolves the collision.

## Deployment Domain Map

| Authority | Form | Use |
|-----------|------|-----|
| `lar:///ha.ka.ba/...` | hostless | Lararium doctrine corpus — local-first, no DNS dependency, same on every peer |
| `lar://elyncia.social/...` | hostful | Personal DID namespace — `did:web:elyncia.social`; Bluesky handle root; user-owned tiddlers |
| `lar://elyncia.app/...` | hostful | Public deployment surface — island definition, service config, public lararium+mempalace+kowloon |
| `lar://elyncia.dev/...` | hostful | Invite-only beta surface — staged releases, capability-gated access |
| `lar://elyncia.net/...` | hostful | Reserved — federation alias or redirect |
| `lar://amorphousdream.com/ha.ka.ba/...` | hostful | Cabal corpus: `ha.ka.ba` path under amorphousdream.com authority |
| `lar://amorphousdream.com/chapel.perilous.opens/...` | hostful | Cabal corpus: `chapel.perilous.opens` path — private shared namespace |
| `lar://amorphousdream.net/...` | hostful | Cabal namespace alias |

## Quine Sync Rule

**All `lar:` URI tiddlers (hostless and hostful) are heleuma sync candidates.**  
**`$:/` tiddlers are NOT sync candidates — reserved strictly for TW5 core + TW5 plugins.**

A tiddler is a heleuma candidate if and only if its title matches `lar://*`.
The `MemeSyncAdaptor` filter: `[all[tiddlers]regexp[^lar://]]`

The bag a tiddler lives in determines which Automerge doc it syncs through:

| Bag | Doc | Authority |
|-----|-----|-----------|
| `system` | LarariumIsland doc | hostless `lar:///ha.ka.ba/...` |
| `corpus:ha.ka.ba` | ha.ka.ba corpus doc | hostless `lar:///ha.ka.ba/...` |
| `corpus:amorphousdream` | amorphousdream corpus doc | `lar://amorphousdream.com/...` |
| `room` | room MemeStoreDoc | any authority (situated content) |
| `draft` | room MemeStoreDoc (local) | any authority (draft-of-room tiddler) |
| `projection` | in-memory only | derived, not persisted |

## Agent-Qualified URIs (future)

The `@agent` sigil is reserved for agent-scoped tiddlers:

```
lar://elyncia.social/@joshu/rooms/altar-fire    agent-qualified personal room
lar:///ha.ka.ba/@lares/v0.1/api/...             agent-qualified doctrine (existing)
```

The `@` segment identifies a named agent (person, service, or VM) within the
domain's authority scope. Hostless agent-qualified URIs (`lar:///ha.ka.ba/@lares/...`)
are the existing doctrine corpus pattern. Hostful agent-qualified URIs are for
user-owned content within a domain.

## URI Resolution Order

```
1. Exact title match in CompositeStore (bag priority: room > corpus:* > system)
2. hostful → DNS resolution of did:web:<host> for capability verification
3. hostless → local-first; no network required; always resolvable
```

Hostless URIs never require network access to resolve. Hostful URIs may require
a network hop for DID resolution but the content itself is local (CRDT store).

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #implements-local-first ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first family:control role:has >>
<<~ pranala #constrains-peer-coordination ? -> lar:///ha.ka.ba/@lararium/tw5/peer-coordination family:control role:constrains >>
<<~ pranala #constrains-identity-slot ? -> lar:///ha.ka.ba/@lararium/tw5/identity-slot family:control role:constrains >>
<<~ pranala #constrains-composite-store ? -> lar:///ha.ka.ba/@lararium/tw5/composite-store family:control role:constrains >>

<<~/ahu >>
