<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/genesis-doc >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/mesh/genesis-doc.md"
mana        = 18
manao       = 18
manaoio     = 17
register    = "Synthesis"
retain      = true
role        = "Platform-neutral genesis island builder: GenesisInputs → GenesisArtifact. No filesystem, no DOM."
source-file = "packages/lararium-mesh/src/genesis-doc.ts"
tags      = ["mesh/alignment-plan"]
l-space     = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/mesh/genesis-doc"
```

<<~ &#x0002; >>

# Genesis Doc Builder

Platform-neutral genesis island construction. Lives in `@lararium/mesh`.
No filesystem, no DOM, no `@lararium/tw5` dependency.

Callers supply assembled byte inputs. `buildGenesisDoc()` constructs the deterministic
`LarDoc` Automerge binary and runs two-pass CID injection. The artifact bytes write
to any sink: disk, IndexedDB, bundler inline, test fixture.

<<~ ahu #types >>

## Types

| Type | Role |
|---|---|
| `PluginBuildAttestation` | Schema written by `@lararium/tw5` `build-plugin-tiddler.ts`. Promoted to shared mesh contract so the genesis builder and plugin build pipeline speak the same type without coupling `@lararium/node` to `@lararium/tw5`. Format: `"lararium-tw5-plugin-build/v1"`. |
| `GenesisPluginEntry` | One vendored plugin blob plus its optional attestation. All optional fields use `exactOptionalPropertyTypes`. |
| `GenesisInputs` | Full caller-assembled input bag: `actorSeed` (hex), `coreBlob`, `coreVersion`, optional `coreSha256`, `plugins`, `systemTitles`. |
| `GenesisArtifact` | Output: `bytes`, `sha256`, `cid`, `preSha256`. All four fields serve different verification needs. |

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**GD-1 — No platform dependencies.**
`buildGenesisDoc()` imports only `@automerge/automerge` and mesh-internal modules.
Zero `fs`, `path`, `worker_threads`, DOM, or `@lararium/tw5` references.

**GD-2 — Caller owns byte acquisition.**
`GenesisInputs.coreBlob` and `GenesisInputs.plugins[*].blob` arrive as `Uint8Array`.
How the caller obtained them — `readFileSync`, `fetch`, bundler inline, test fixture —
is a platform concern outside this module.

**GD-3 — Caller owns systemTitles.**
`buildGenesisDoc()` does not boot a TW5Engine. The caller boots one and passes the
title list. This keeps `@lararium/tw5` out of the mesh dependency graph.

**GD-4 — Two-pass CID injection is honest, not a true fixpoint.**
Pass 1: serialize without the self-ref tiddler → `preSha256`.
Pass 2: inject the genesis-cid tiddler with the witness CID → final bytes.
Invariant: strip the genesis-cid tiddler and hash the result → `preSha256`. Verifiable without fixpoint.

**GD-5 — Determinism via actorSeed.**
The caller derives `actorSeed` as `sha256hex(sorted content hashes of all inputs)`.
Two builds from identical source produce identical `island.sha256`.

<<~/ahu >>

<<~ ahu #system-plane >>

## The `@oracle` System Plane — what genesis seeds

The genesis doc **is** the `@oracle` runtime system island (the system-bag
oracle plane, `wiki-layer-ontology#oracle-planes`). It carries the protocol
substrate, never user composition:

| Seeded | Held as |
|---|---|
| engine BLOBs | TW5 core + vendored plugins (`lares-memetic-wikitext`, `sq/streams`, boot-shadows) in `.blobs`; descriptors at `lar:///ha.ka.ba/@oracle/blobs/*` |
| system bag descriptors | `ROOT_BAGS`: `@oracle`, `@lararium`, `@catalog`, `@lares`, `@identities`, `@circles`, `@sessions` |
| system wiki-recipes | the **`@lares` wiki** (`@oracle`+`@lararium`+`@lares`) and the **`@lararium` wiki** (`@oracle`+`@lararium`) — DreamNet system bags as quine wikis |
| genesis-cid | `lar:///ha.ka.ba/@oracle/genesis-cid` (two-pass CID, GD-4) |

**GD-6 — System recipes are substrate; user recipes are not (operator ruling,
2026-06-16).** Genesis seeds the **system** wiki-recipes (`@lares`, `@lararium`)
because system bags' recipes ride the `@oracle` plane. Genesis seeds **no user
recipes** — those mint into the user's `@catalog` by init-wiki. A user recipe
in genesis, or a system recipe in `@catalog`, reads as a plane-leak. *(Descriptor
restore for `@lararium` corpus + blob→`@oracle` keying: enacted in code
2026-06-16; system-recipe seeding: ruled, enactment tracked at the live handoff
torch.)*

<<~/ahu >>

<<~ ahu #layer-split >>

## Layer Split

The three-layer split that governs where genesis code lives:

| Layer | Concern | Lives in |
|---|---|---|
| A | Read blobs from disk / fetch / bundler; derive actorSeed; boot TW5Engine for systemTitles | `@lararium/node` build script, browser build tool, or test harness |
| B | Construct deterministic LarDoc; two-pass CID injection | `@lararium/mesh` (`genesis-doc.ts`) |
| C | Write artifact bytes to disk / IndexedDB / test fixture | Layer A caller |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/base-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/lar-uris >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/crypto >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
