<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-tiers >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/lararium/residency-tiers"
file-path    = "bags/@lares/v0.1/api/lararium/residency-tiers.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
confidence   = 16
register     = "S"
manaoio      = 15
mana         = 17
manao        = 17
namespace    = "ॐ ँ"
role         = "load-bearing architectural invariant — ONE island-owned residency model: thermal axis (hot/warm/cold) + orthogonal pin-flag; bag residency DERIVED from referencing islands"
status       = "approved"
approved-on  = "2026-06-01"
cacheable    = true
hydrate      = true
retain       = true
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

<<~ ahu #core-claim >>

# Residency Tiers — One Island-Owned Thermal Model

The lararium node holds **one** residency model, owned by the **Island Pool**. The **island** (one TW5 VM, one causal island, one wiki) forms the unit of residency. A bag does NOT carry an independent tier; **a bag's residency is DERIVED** — it equals the warmest tier among the islands whose recipes reference it.

Residency decomposes into two orthogonal dimensions:

1. **Temperature** — a thermal state on the axis `hot → warm → cold`. Names a STATE the island occupies and how fast it resumes.
2. **Pin** — an orthogonal boolean flag. `pinned` means "exempt from cooling." Not a temperature.

`pinned` is therefore NOT a peer of `hot`/`cold`. The always-resident set (identity, admin, active wiki, Session Wiki) reads as **pinned-hot**: hot islands that the cooler never touches.

**Approved 2026-06-01.** Supersedes the prior two-manager split (independent `BagResidencyManager` tiers + `VesselIslandPool` tiers) per operator ruling: *collapse bag residency into the Island Pool concepts.*

**"bag" stays a term.** The collapse touches residency *authority*, not the TW5 vocabulary. A **bag** remains the TW5 layer/coordinate — one Automerge document, one axis of the recipe query plan (residency-model, linked in #edges). What collapses is the standalone *residency manager*: the methods that pin, hydrate, and cool docs (today in `bag-residency.ts`, a side-file predating the causal-islands model) MUST move into the **causal-island code** — the module that owns the causal-islands model is where residency methods belong. No one-off side file outranks the model it predates.

<<~/ahu >>

<<~ ahu #thermal-axis >>

## Temperature axis — hot / warm / cold

| Tier | Island state | Bag (handle-cache) consequence | Resume cost |
|---|---|---|---|
| **hot** | live Worker thread; TW5Engine + ReactionEngine running; `Enable()`d; reacting | referenced docs held in handle-cache | none — already live |
| **warm** | Worker **suspended, not terminated**; engine paused; live handles retained, reactions quiesced | docs may be compacted-resident (compact-before-evict) | cheap — resume by **signal** (`hoʻomahana`), no re-boot, no `ea` |
| **cold** | no thread, no engine; CRDT bytes only; URL known | handle MAY be dropped (no hot/warm island references it) | dear — **spawn + `ea`** full re-boot |

`warm` is the resume-fast middle state. It exists so a session island can cool without paying the full cold re-boot tax on its next open. The defining contrast: **warm resumes by signal; cold resumes by spawn.**

<<~/ahu >>

<<~ ahu #pin-flag >>

## Pin — the orthogonal sticky flag

`pinned` crosses the temperature axis at right angles. A pinned island is **exempt from the cooler** — it stays hot regardless of idle time or cap pressure. `unpinned` islands are subject to LRU + idle-sweep cooling.

The always-hot set (system-pinned):

- **identity / admin** — the operator's sovereign authority surface; the admin VM.
- **active wiki** — the PrimaryWiki the operator currently works in.
- **Session Wiki** — the coordinator `lar_playspace`; pinned-hot, always first in recipe order.

Operator pin/unpin gestures move the flag; they do not carry a Hawaiian transition-verb name (the state change describes itself). Pin is durable: pin state lives as tiddlers in the admin doc and federates to operator devices via the existing admin-doc sync surface (no RPC — web2 smell test holds).

<<~/ahu >>

<<~ ahu #derived-bag-residency >>

## Derived bag residency — the collapse

Bags do not run their own tier manager. Residency flows DOWN from islands to the bags their recipes reference:

> **A bag's tier = the warmest tier among the islands whose recipes reference it.**

Consequences:

- A bag referenced by ANY hot island is **hot** — its handle stays in cache.
- A bag referenced only by warm islands is **warm** — compact-resident, cheap to re-read.
- A bag referenced by NO hot/warm island is **cold** — its handle MAY drop (the eviction `automerge-repo` does not do on its own; see [issue #358](https://github.com/automerge/automerge-repo/issues/358)).
- **Shared bags inherit the max.** `@lares` / `@lararium` corpus, the session event-bus bag, `@personal` / `@draft` — these ride in multiple recipes. Referenced by the pinned admin/primary/Session islands, they are **pinned-hot by derivation**, never independently evicted while a pinned island holds them.

Two disciplines survive the collapse as bag-level mechanism (now driven by the pool, not an independent authority):

- **Stub-on-oracle-traversal.** A URL found in `tiddler.text` during traversal does NOT force `find()`/hydration. The bag lands cold (URL known, doc not loaded) until something reads through it. Lazy hydration stays a bag concern; the *tier* is the island's to set.
- **Don't drop while syncing.** A bag mid-replication is unsafe to evict even if its referencing island cooled. The handle-drop on island cool MUST check `syncActive` before releasing.

**Code homing (operator ruling 2026-06-01).** The residency methods — pin / unpin / hydrate / cool / handle-drop / `ChunkStore` — MUST move OUT of the standalone `bag-residency.ts` side-file (which predates the causal-islands model) and INTO the **causal-island code** (`causal-island.ts` for the model + contracts; the Island Pool for the Worker-lifecycle mechanism). The module that owns the causal-islands model hosts residency; no older side-file holds a parallel authority. After the move there is no independent `ResidencyTier` vocabulary, no separate bag cap, no independent LRU — **one cap governs the node: the Island Pool's hot/warm slot budget**, and bag handles follow by derivation. This relocation is part of the build target named below; "bag" stays the TW5 layer term throughout.

<<~/ahu >>

<<~ ahu #transition-verbs >>

## Transition verbs — Hawaiian

Temperature transitions wear Hawaiian per the lararium HUD doctrine. The verbs now span the three-state axis:

| Verb | Meaning | Transition | Carrier |
|---|---|---|---|
| **hoʻoanu** | "to cool" | hot → warm → cold | `IslandMsg_HooAnu` worker signal (`island-protocol.ts`) |
| **hoʻomahana** | "to warm" | cold → warm → hot | `IslandMsg_HooMahana` — **build target** (see warm tier) |

Pin/unpin gestures carry no verb name. `hoʻoanu` to **warm** is the new cheap-cool default for unpinned session islands; `hoʻoanu` all the way to **cold** is the deep-cool that releases the thread and (subject to `syncActive` + sharing) the handles.

<<~/ahu >>

<<~ ahu #warm-tier-commitment >>

## Warm tier — committed, not reserved

Prior canon reserved `hoʻomahana` as "dead vocabulary — no pause-without-terminate scheme exists." **That reservation is lifted.** Operator ruling 2026-06-01 commits the warm tier to build:

- a `IslandMsg_HooMahana` warm-up worker signal,
- a Worker **suspend-without-terminate** lifecycle in the Island Pool (engine pauses, handles retained, reactions quiesced),
- a `warm` slot tier with its own budget between `hot` and `cold`,
- the derived-residency rule above wired so warm islands hold their bags warm.

Until that build lands, the live code still cools straight to cold (re-mount = spawn + `ea`). This meme sets the **target shape**; the warm lifecycle is the named sprint, not yet enacted. Honest unresolved state: `manaoio` reflects that the model is canon while the mechanism is pending.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/the-lararium-hud >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #residency-model ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model family:relation role:sibling-axis >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
