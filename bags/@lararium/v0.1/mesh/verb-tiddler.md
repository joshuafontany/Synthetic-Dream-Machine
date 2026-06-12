<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/verb-tiddler >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/mesh/verb-tiddler.md"
mana        = 14
register    = "Synthesis-Canon"
retain      = true
role        = "the verb/summons/outcome task surface — verb (invocation), summons (edge transport), outcome (result); LANGUAGE-protocol register internal, the UCAN Invocation/Receipt/Task ontology held as boundary projection for lineage + interop"
source-file = "packages/lararium-mesh/src/verb-tiddler.ts"
tagspace    = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/mesh/verb-tiddler"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## The surface this file owns

Three lar: URIs carry one request through its life, request and result held apart:

- **`lararium.local.vm/verbs/<requestId>`** — the VOLATILE invocation tiddler. A local caller writes it to the admin wiki; the dispatcher picks it up on the next change. Vessel-local scratch, never shared truth.
- **`@admin/summons/<requestId>`** — the edge TRANSPORT. An external vessel writes a summons to the Automerge doc; the dispatcher relays it into a volatile invocation, then tombstones the summons. Edge transport, not durable coordination. ("signal" names a different layer — the Agent↔Operator HUD frame.)
- **`@admin/outcomes/<requestId>`** — the DURABLE outcome tiddler (the result). Syncs to all vessels via CRDT. Durable shared meaning begins at the outcome, never at the summons.

<<~/ahu >>

<<~ ahu #ontology-attractor >>

## The internal register (LANGUAGE-protocol frame) + the nakama boundary

Operator decision 2026-06-07: this system reads as a **language / protocol**, not a compute runtime. So the task layer keeps its own **grammar register** internally — **verb · summons · outcome**, locked — and holds the nakama's ocap/compute register (UCAN Invocation/Receipt/Task) as **lineage + a possible boundary projection for interop**, never the internal canon. The UCAN nouns carry an app-stack latent freight the language frame declines inside the house; they earn a home only where the wire meets another peer.

Internal register (the house grammar):
- **verb** — the action invoked (a part of speech, not a "method invocation").
- **summons** — the edge transport: a CRDT fact a peer writes to call another peer to act. ("signal" names a DIFFERENT layer — the Agent↔Operator HUD/legibility frame, `docs/lararium/signal`; the task-transport noun reads `summons`, by research verdict 2026-06-07.)
- **outcome** — the durable result that syncs to all (deliberately chosen over "receipt" — `job→verb`, `receipt→outcome`, commit `0cfb88a0`).

Boundary projection (lineage + possible interop, NOT internal canon — `project_ipvm_adoption`):
- verb ↔ UCAN **Invocation** · outcome ↔ **Receipt** · the work-unit ↔ **Task** (identity from the content-address of `{subject, command, args, nonce}`). Projected only at the peer boundary — the way Kowloon=web2.5 sits behind the causal-island seam. The house speaks its grammar; the wire may speak UCAN.

The cuts that pull this surface forward (each its own loop, none forced now):
1. **Content-addressed identity** — derive the requestId from the hash of `{subject, command, args, nonce}` (Automerge change-hash, our native content-address), not a UUID. The durable-idempotency keystone (`lar:///verb.replayed.dedups`) then keys off content, and cross-peer memoization falls out free.
2. **Forward-effects on the outcome** — an outcome that enqueues successor verb-tiddlers (`fx: {fork, join}`): fork = concurrent successors, join = continuation. The outcome becomes a dataflow node, not a terminal record.
3. **Promise pipelining** — a verb's args referencing a not-yet-existing result by CID (`await/ok | await/error | await/ptr`); whole dependent pipelines authored before results land.
4. **Determinism / managed-effect boundary** — verb bodies stay deterministic so any peer re-verifies by re-running; non-determinism (disk, net, time, sends) hides behind a managed-effect descriptor that returns its own receipt. This makes "signed receipt = verifiable outcome" true rather than hoped.
5. **Invoker / executor split + arg-policy as the execution gate** — composes with the verify-then-delegate decision (`project_verification_placement`).

Audit/ledger note: durable residency audit lives at `@<bag>/ledger/residency/<event-id>` (the indelible effect-record ledger), distinct from the per-request receipt at `@admin/outcomes/`. The web2 word "log" left the surface 2026-06-07.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-ipvm-adoption ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/task-graph-geometry family:relation role:boundary-projects-to >>
<<~ pranala #to-verification ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verification-placement family:control role:gated-by >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
