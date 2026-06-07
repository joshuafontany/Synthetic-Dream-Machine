# Epic — Task/Receipt Ontology Migration (cmd/log → UCAN-pono task graph)

> Opened: 2026-06-07
> Branch: `feature/lararium-node-4`
> Decision record: agent memory `project_ipvm_adoption`, `project_task_graph_geometry`, `project_asymmetric_peer_handoff`
> Status: **SEED landed; migration queued.**

## Why

The verb/outcome surface already wears the capability-native task shape, but its
vocabulary and identity model lag the pono ontology the research firmed (UCAN
Invocation/Receipt/Task/Effect — the living lineage we already hold via Keyhive,
same Ink&Switch roof; see `project_ipvm_adoption`). The operator named the web2
latent freight in "cmd"/"log" and approved the new ontology (A), the provisional
`aud` audience field (B), and the change-hash content-address (C).

We do NOT reimplement IPVM/Homestar (abandoned, Rust daemon, Wasm-task-centric).
We reuse the MODELS over our own verb-tiddler surface + Automerge + Keyhive.

## The pono lar: URI model (approved)

```
lar:///ha.ka.ba/@<bag>/<kind>/<cid>
        │         │       │      └ change-hash content-address (C) — Automerge-native, no IPFS
        │         │       └ kind: task · receipt · ledger/residency
        │         └ the BAG carries the addressing geometry (its keyhive ring)
        └ stable root — permanent protocol surface
```

- **task** (invocation) — `cid` = `taskContentId({subject, command, args, nonce})`. subject = bag/resource URI; command = verb; empty nonce → idempotent, random → fresh.
- **receipt** — keyed by the task's cid (`@<bag>/receipt/<task-cid>` = UCAN `ran`).
- **ledger/residency/<event-id>** — the indelible archival ledger (landed; "log"→"ledger" 2026-06-07).
- volatile scratch stays off-disk at `lararium.local.vm/…`.

**Protocol-not-app invariant:** one scheme across the whole persona ladder —
user(anon)=one vessel/no personGroup · user=a personGroup of vessels ·
operator=personGroup + local infra · operator(admin)=personGroup + local+remote
infra + time-bound elevated caps. The ladder = WHICH bags a holder's caps reach,
NEVER a URI branch. The bag's ring carries the addressing geometry; an optional
`aud` narrows a task to ONE vessel for the mint-once shape (B).

## SEED landed (2026-06-07) — `packages/lararium-mesh/src/verb-tiddler.ts`

- `TASK_KIND` / `RECEIPT_KIND`, `taskUri(bag, cid)`, `receiptUri(bag, taskCid)`.
- `taskContentId({subject, command, args, nonce})` — async change-hash (sha256 over canonical JSON; crypto-provider routed).
- `aud?` field threaded through `VerbInvocation` + `buildVerbInvocation` + `buildVerbSummons` + `parseVerbInvocation` (provisional).
- Tests: `tests/verb-tiddler-ontology.test.ts`.
- These compose ALONGSIDE the running verb/summons/outcome path — they do not replace it yet (prop up the running system first).
- "log" → "ledger" excised from effect-record; stale `@admin/log/` CLI string → `@admin/outcomes/`.
- **signal → summons (2026-06-07, landed):** the Frame-2 task-transport renamed — `VERB_SUMMONS_URI_PREFIX` (`@admin/summons/`), `buildVerbSummons`, `emitVerbSummons`, `verb-signal.ts → verb-summons.ts` (10 files, green). "signal" freed for the Agent↔Operator HUD/legibility frame (Frame 1) by research verdict; the task-transport noun reads `summons` (grammar register, no compute-runtime freight).

## Naming frame (DECIDED 2026-06-07): LANGUAGE-protocol, not compute-runtime

The system reads as a **language/protocol**. The internal task layer keeps the **house grammar — verb · summons · outcome** (locked). The nakama's ocap/compute register (UCAN Invocation/Receipt/Task) lives as **lineage + a possible BOUNDARY PROJECTION for interop**, never internal canon — projected where the wire meets another peer (like Kowloon=web2.5 behind the causal-island seam).

**OPEN (operator's call — surfaced 2026-06-07):** the SEED's content-addressed kinds use the UCAN nouns (`TASK_KIND="task"`, `RECEIPT_KIND="receipt"`, `taskUri`/`receiptUri`). Under the language frame, the *internal* content-addressed surface may instead want house-grammar kinds (`@<bag>/verb/<cid>`, `@<bag>/outcome/<cid>`), reserving `task`/`receipt` for the boundary projection. OR: treat the content-addressed surface as itself the interop-aligned layer where UCAN nouns rightly sit. Not resolved — the kind-noun home (house grammar vs UCAN) at the content-addressed layer is the next naming fork.

## Migration cleanup (queued — each its own OODA-HA loop, green per step)

1. **Identity: requestId → content-id.** Swap `newRequestId()` (UUID-ish) for `taskContentId(...)` on the live path. Merges with the durable-idempotency keystone (`lar:///verb.replayed.dedups`) — the dedup key becomes the content-hash; cross-peer memoization falls out. (Touches `buildVerbInvocation`/`buildVerbSignal`/dispatcher; sync→async ripple — stage carefully.)
2. **Receipt keying: `@admin/outcomes/<requestId>` → `@<bag>/receipt/<task-cid>`.** Move the outcome to the receipt URI keyed by the task it answers; update the dedup `getLive` probe + `buildVerbOutcome` + draft.ts string.
3. **~~Kind nouns: verb → task, outcome → receipt~~ — SUPERSEDED by the 2026-06-07 language-frame decision.** No internal rename to UCAN nouns. The internal register stays **verb · summons · outcome**. Instead: build the UCAN **boundary projection** (verb↔Invocation, outcome↔Receipt, work-unit↔Task) at the peer edge IF/WHEN cross-peer interop lands. Pending the open kind-noun fork above (house-grammar vs UCAN at the content-addressed layer).
4. **Forward-effects: outcome `fx{fork, join}`.** Let a receipt enqueue successor tasks (fan-out/continuation) as signed facts — the outcome becomes a dataflow node.
5. **Promise pipelining: `await/ok | await/error | await/ptr`.** A task's args referencing a prior result by cid.
6. **`aud` finalization + execution honoring.** The verify-then-delegate gate (`project_verification_placement`) honors `aud` — a task with `aud` runs only on the named vessel (mint-once); without, the bag-ring carries it. Lease + fence for the mint-once concurrent-claim corner (`project_asymmetric_peer_handoff`, shape-scoped).
7. **Determinism / managed-effect boundary.** Quarantine non-determinism (disk/net/time/sends) behind a managed-effect descriptor returning its own receipt → "signed receipt = verifiable" holds.

## Exit criteria

- The live path keys tasks by content-address and receipts by task-cid.
- One ontology (task/receipt) in code; "verb"/"outcome" retired; "signal" kept as the transport noun.
- The persona ladder rides the scheme with zero URI branches.
- No web2 "cmd"/"log" latent freight anywhere in the task surface.
