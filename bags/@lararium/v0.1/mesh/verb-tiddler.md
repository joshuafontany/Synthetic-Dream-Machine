<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/verb-tiddler >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/mesh/verb-tiddler"
file-path    = "bags/@lararium/v0.1/mesh/verb-tiddler.md"
source-file  = "packages/lararium-mesh/src/verb-tiddler.ts"
type         = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
mana         = 14
role         = "the invocation/receipt surface — verb-tiddler (invocation), signal (edge transport), outcome-tiddler (receipt); names the UCAN Invocation/Receipt/Task/Effect ontology as the pono attractor"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~ &#x0002; >>

<<~ ahu #contract >>

## The surface this file owns

Three lar: URIs carry one request through its life, request and result held apart:

- **`lararium.local.vm/verbs/<requestId>`** — the VOLATILE invocation tiddler. A local caller writes it to the admin wiki; the dispatcher picks it up on the next change. Vessel-local scratch, never shared truth.
- **`@admin/signals/<requestId>`** — the edge TRANSPORT. An external vessel writes a signal to the Automerge doc; the dispatcher relays it into a volatile invocation, then tombstones the signal. Edge transport, not durable coordination.
- **`@admin/outcomes/<requestId>`** — the DURABLE outcome tiddler (the receipt). Syncs to all vessels via CRDT. Durable shared meaning begins at the outcome, never at the signal.

<<~/ahu >>

<<~ ahu #ontology-attractor >>

## Pono attractor — the UCAN Invocation / Receipt / Task / Effect ontology

This surface already wears the capability-native task shape. The living lineage (UCAN-WG specs + Keyhive, both now under one Ink&Switch roof — see `project_ipvm_adoption`) names the nouns the verb/outcome layer firms toward. The names below mark the ATTRACTOR, not a forced rename — `verb`/`outcome`/`signal` stay pono and stay put; the UCAN nouns name the direction the surface grows.

- **verb-tiddler ≈ Invocation** — a signed request to perform a Task on delegated authority (invoker + executor + proof-chain).
- **outcome-tiddler ≈ Receipt** — the signed outcome: a `{ok | error}` union (failures travel as first-class signed data).
- **signal = the edge transport** (no UCAN noun — our own causal-island ingress seam).
- **the work-unit ≈ Task** — identity from the content-address of `{subject, command, args, nonce}`.

The cuts that pull this surface forward (each its own loop, none forced now):
1. **Content-addressed identity** — derive the requestId from the hash of `{subject, command, args, nonce}` (Automerge change-hash, our native content-address), not a UUID. The durable-idempotency keystone (`lar:///verb.replayed.dedups`) then keys off content, and cross-peer memoization falls out free.
2. **Forward-effects on the outcome** — an outcome that enqueues successor verb-tiddlers (`fx: {fork, join}`): fork = concurrent successors, join = continuation. The outcome becomes a dataflow node, not a terminal record.
3. **Promise pipelining** — a verb's args referencing a not-yet-existing result by CID (`await/ok | await/error | await/ptr`); whole dependent pipelines authored before results land.
4. **Determinism / managed-effect boundary** — verb bodies stay deterministic so any peer re-verifies by re-running; non-determinism (disk, net, time, sends) hides behind a managed-effect descriptor that returns its own receipt. This makes "signed receipt = verifiable outcome" true rather than hoped.
5. **Invoker / executor split + arg-policy as the execution gate** — composes with the verify-then-delegate decision (`project_verification_placement`).

Audit/ledger note: durable residency audit lives at `@<bag>/ledger/residency/<event-id>` (the indelible effect-record ledger), distinct from the per-request receipt at `@admin/outcomes/`. The web2 word "log" left the surface 2026-06-07.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-ipvm-adoption ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/task-graph-geometry family:relation role:firms-toward >>
<<~ pranala #to-verification ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verification-placement family:control role:gated-by >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
