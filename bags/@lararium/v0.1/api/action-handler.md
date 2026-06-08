<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/action-handler >>
```toml iam
uri-path  = "ha.ka.ba/@lararium/v0.1/api/action-handler"
file-path = "bags/@lararium/v0.1/api/action-handler.md"
source-file = "packages/lararium-tw5/src/action-handler.ts"
type      = "text/x-memetic-wikitext"
register      = "Synthesis"
mana          = 16
manao         = 16
manaoio       = 15
tagspace      = "stable"
namespace     = "ॐ ँ"
role          = "source-of-truth: the Residency Model ACTION verb handler family — six verbs, withEffectRecord wrapping, cap-gate law, dispatch seam (Sprint 5)"
cacheable     = true
retain        = true
status        = "approved"
status-date   = "2026-06-01"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# ACTION Verb Handler Family

The operator-facing residency gesture surface. Six ACTION verbs dispatch through one handler family, each wrapped in
`withEffectRecord` so no bag mutation lands without an indelible audit trace.

Source of truth: `packages/lararium-tw5/src/action-handler.ts`. Handlers run
**wiki-scope inside the TW5 VM** (not `@lararium/node`) — registered via
`@lararium/node`'s `island-behaviors.ts`, invoked through the dispatch seam,
operated from the CLI by `lares act`.

<<~/ahu >>

<<~ ahu #verbs >>

## The Six Verbs

| Verb | Effect | Effect record(s) | Required args |
|---|---|---|---|
| **ADD** | read `from-bag`'s record for title; write into `to-bag` preserving change-id | accession (`to-bag`) | title, from-bag, to-bag, change-id |
| **COPY** | read `from-bag`'s record; overwrite `to-bag`'s version preserving change-id | accession (`to-bag`) | title, from-bag, to-bag, change-id |
| **MOVE** | ADD into `to-bag` + tombstone the title in `from-bag` | transfer pair: accession (`to-bag`) + deaccession (`from-bag`) | title, from-bag, to-bag, change-id |
| **CLEAR** | enumerate live titles in bag, tombstone each | disposition (bag-level) | bag |
| **DROP** | tombstone every live title in bag + mark the bag retired | disposition (bag retired) | bag |
| **LOAD** | external content fetch — **not in Sprint 5 scope**; throws explicit not-implemented | — | (deferred) |

ALL CAPS by convention (SPARQL Update derivation). The verb vocabulary comes
from set-algebra + cataloging, never version control. See
[residency-model](residency-model.md) `#action-verb-surface`.

<<~/ahu >>

<<~ ahu #law >>

## Handler Law

1. **No mutation without audit.** `executeAction(action, composite)` runs inside
   `withEffectRecord(action, composite, …)` — mutate-then-log order, so a failed
   mutation produces no effect record. The archival audit (Sprint 4) is not
   optional decoration; it is the gate.
2. **Cap before mutate.** Every verb verifies `cap("admin", toBag)` before any
   write. **MOVE additionally** verifies `cap("admin", fromBag)` — deaccession
   authority over the source. A denied cap throws before `withEffectRecord` runs,
   so a gated verb leaves zero effect records.
3. **Change-id preservation** (Anti-pattern #1 defense). ADD / COPY / MOVE carry
   the source record's `change-id` into the destination Manifestation — the Work
   keeps its causal identity across bags.
4. **Kāpae, not delete** (Anti-pattern #3 defense). MOVE / CLEAR / DROP tombstone;
   they never hard-delete. `resolveAll` reports live presence; `listKapaeBags`
   surfaces which bags explicitly hide a title.
5. **Parse-or-reject.** `parseResidencyAction(invocation)` validates verb
   membership + per-verb required args; malformed input throws before dispatch.

<<~/ahu >>

<<~ ahu #dispatch >>

## Dispatch Seam

```
lares act <VERB> …            ← @lares/cli/src/commands/act.ts (operator surface)
  → verb-tiddler placed in the admin VM
    → VerbDispatcher tick → runLocalVerb(invocation, { admin, registry, verifier })
      → registry.get(invocation.verb)            (registerActionReactors filled it)
      → makeCapVerify(verifier, requestedBy)     (CapabilityVerifier → cap())
      → handler(args, { admin, invocation, cap })
        → cap("admin", toBag)  [+ cap("admin", fromBag) for MOVE]
        → withEffectRecord(action, composite, () => executeAction(...))
```

`registerActionReactors(table, { composite })` fills the `VerbTable` with all six
verbs. Browser and Node vessels share this exact registration — `action-handler.ts`
is shared, not duplicated (Sprint 6 parity).

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #has-residency ? -> lar:///ha.ka.ba/@lararium/v0.1/api/residency-model family:control role:has >>
<<~ pranala #effect-record ? -> lar:///ha.ka.ba/@lararium/v0.1/api/residency-model#effect-record family:relation role:audits-via >>
<<~ pranala #cap-gate ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:relation role:gated-by >>
<<~ pranala #personal-slot ? -> lar:///ha.ka.ba/@lararium/v0.1/api/personal-slot family:relation role:moves-across >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
