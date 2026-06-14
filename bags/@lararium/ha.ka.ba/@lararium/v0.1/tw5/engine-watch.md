<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/engine-watch >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/tw5/engine-watch.md"
mana        = 12
manao       = 12
register    = "Synthesis"
retain      = true
role        = "engine-watch — island-side engine-epoch drift detection; a waiting engine surfaces as an alert the island writes itself"
source-file = "packages/lararium-tw5/src/engine-watch.ts"
l-space     = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/engine-watch"
```

<<~ &#x0002; >>

<<~ ahu #change-classes >>

## The two change classes

A causal island reconciles **synced data** forever; it can never reconcile the
**code it already executed**, because the running engine interprets the sync.
TW5 core draws the same line (since v5.1.22): wikitext-only plugins hot-load;
JS-module plugins demand a reload — swapping a running module corrupts.

| Class | Examples | Path |
|---|---|---|
| **Composition** | recipe membership, bag content, oracle moves | sync — LIVE via recipe-watch |
| **Epoch** | TW5 core re-pack, JS plugin upgrade, bootstrap rewiring | alert → operator reboots |

The reboot-pending alert and this watch together hold the **epoch half** of the
protocol — permanent mechanism, not interim UX.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

The sovereign kernel **witnesses** the engine it boots: it hashes the core
bytes it eval's (never trusting the blob entry's self-claim), faults on a
manifest `coreHash` mismatch, and lifts `{ sha256, version }` into
`IslandContext.engine`.

`startEngineWatch(ctx)` then subscribes to the island's own `@lararium`
handle. When a new genesis merges into that live doc under the running island
(`reconcileIslandFromGenesis` on a vessel carrying a newer artifact — the
CRDT carries the change to every peer "as of my last sync"), the watch
compares `blobs[tiddlywikicore].sha256` against the booted engine and writes
`$:/temp/lares/alert/engine-waiting` tagged `$:/tags/Alert` — TW5's native
alert area renders it; `@temp` volatility clears it on the reboot that adopts
the epoch. Both island behaviors (wiki and admin) run the watch; demote
unsubscribes.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**EW-1 — Offer, never push.** The pointer arrives as synced data; the island
verifies locally; the operator holds the reboot capability. The watch raises
no enforcement and triggers no restart. "Waiting" names readiness, not
coercion (Service-Worker vocabulary).

**EW-2 — Reboot re-verifies.** Adoption never patches the running engine; the
reboot re-runs genesis verification from the CID, so the new engine proves
itself the way the first one did.

**EW-3 — Rollback named.** An incoming version that compares LOWER than the
booted one gets called BACKWARD in the alert body — never presented as an
upgrade.

**EW-4 — One alert per epoch.** A stable title coalesces; repeated change
events for the same waiting sha write once.

**EW-5 — Authority held open.** Who may move the engine pointer (signing,
threshold, cabal capability) stays undecided until the wiki-mesh lives; the
watch trusts the `@lararium` doc's write-capability story as it stands.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/sovereign-kernel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/genesis-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/node/epoch-handlers >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/memory-store >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
